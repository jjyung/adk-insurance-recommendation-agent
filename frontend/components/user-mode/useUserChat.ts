import { useCallback, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  ProxyStreamEnvelope,
  formatClock,
  parseProxyEnvelope,
} from '../../lib/proxy-stream';
import type { ChatMessage, TimelineEvent } from '../../lib/mock-data';
import { handleAuthExpired, isUnauthorized } from '../../lib/auth-recovery';

interface UseUserChatOptions {
  sessionId: string;
  userId: string;
  initialMessages?: ChatMessage[];
  initialEvents?: TimelineEvent[];
  onTimelineEvent?: (event: TimelineEvent) => void;
  onError?: (message: string) => void;
}

export interface UserChatAPI {
  messages: ChatMessage[];
  events: TimelineEvent[];
  pending: boolean;
  send: (prompt: string) => Promise<void>;
  reset: (
    next?: { messages?: ChatMessage[]; events?: TimelineEvent[] },
  ) => void;
}

function makeId(prefix: string) {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as any).randomUUID === 'function'
  ) {
    return `${prefix}-${(crypto as any).randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useUserChat({
  sessionId,
  userId,
  initialMessages,
  initialEvents,
  onTimelineEvent,
  onError,
}: UseUserChatOptions): UserChatAPI {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;

  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages ?? [],
  );
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents ?? []);
  const [pending, setPending] = useState(false);

  const onTimelineEventRef = useRef(onTimelineEvent);
  onTimelineEventRef.current = onTimelineEvent;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const stateRef = useRef<Record<string, string>>({});

  const reset = useCallback<UserChatAPI['reset']>((next) => {
    setMessages(next?.messages ?? []);
    setEvents(next?.events ?? []);
    stateRef.current = {};
  }, []);

  const pushEvent = useCallback((event: TimelineEvent) => {
    setEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [...prev, event];
    });
    onTimelineEventRef.current?.(event);
  }, []);

  const applyEnvelope = useCallback(
    (envelope: ProxyStreamEnvelope, streamMessageId: string) => {
      if (envelope.type === 'timeline') {
        pushEvent(envelope.event);
        return;
      }
      if (envelope.type === 'state') {
        stateRef.current = { ...stateRef.current, ...envelope.patch };
        return;
      }
      if (envelope.type === 'message') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamMessageId
              ? {
                  ...m,
                  text:
                    envelope.mode === 'append'
                      ? `${m.text}${envelope.text}`
                      : envelope.text,
                  timestamp: formatClock(),
                  status: envelope.final ? 'final' : 'streaming',
                }
              : m,
          ),
        );
        return;
      }
      if (envelope.type === 'done') {
        stateRef.current = { ...stateRef.current, ...envelope.state };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamMessageId
              ? {
                  ...m,
                  text: envelope.finalText || m.text,
                  timestamp: formatClock(),
                  status: 'final',
                }
              : m,
          ),
        );
        return;
      }
      if (envelope.type === 'error') {
        onErrorRef.current?.(envelope.message);
      }
    },
    [pushEvent],
  );

  const send = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || pending) return;

      const userMessage: ChatMessage = {
        id: makeId('msg-u'),
        role: 'user',
        text: trimmed,
        timestamp: formatClock(),
        status: 'final',
      };
      const streamMessageId = makeId('msg-a');
      const placeholder: ChatMessage = {
        id: streamMessageId,
        role: 'agent',
        text: '',
        timestamp: formatClock(),
        status: 'streaming',
      };

      setMessages((prev) => [...prev, userMessage, placeholder]);
      pushEvent({
        id: `evt-user-${userMessage.id}`,
        kind: 'user',
        title: 'user_message',
        summary: trimmed,
        timestamp: userMessage.timestamp,
        payload: ['author: user'],
      });
      setPending(true);

      try {
        const response = await fetch('/api/agent/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            prompt: trimmed,
            sessionId,
            userId,
            // 跟 Dev Mode 一樣寫入 _ui_title / _ui_subtitle，
            // 讓 session 在 sidebar 顯示「新對話」+「使用者第一句話」
            sessionState: {
              ...stateRef.current,
              _ui_title: '新對話',
              _ui_subtitle:
                trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed,
            },
          }),
        });

        if (!response.ok) {
          if (isUnauthorized(response.status)) {
            handleAuthExpired();
            throw new Error('登入已過期，正在帶你重新登入…');
          }
          const payload = (await response
            .json()
            .catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? '系統忙線中，請稍後再試。');
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('text/event-stream') || !response.body) {
          const payload = await response.json();
          const finalText =
            payload?.finalText ||
            '已收到回覆，請查看右側商品建議。';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamMessageId
                ? { ...m, text: finalText, status: 'final' }
                : m,
            ),
          );
          if (Array.isArray(payload?.events)) {
            for (const evt of payload.events) pushEvent(evt);
          }
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() ?? '';
          for (const frame of frames) {
            const envelope = parseProxyEnvelope(frame);
            if (envelope) applyEnvelope(envelope, streamMessageId);
          }
        }
        if (buffer.trim()) {
          const envelope = parseProxyEnvelope(buffer);
          if (envelope) applyEnvelope(envelope, streamMessageId);
        }

        // Ensure placeholder finalized even if no done envelope was seen.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamMessageId && m.status === 'streaming'
              ? { ...m, status: 'final' }
              : m,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        onErrorRef.current?.(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamMessageId
              ? {
                  ...m,
                  text: `抱歉，發生錯誤：${message}`,
                  status: 'final',
                }
              : m,
          ),
        );
      } finally {
        setPending(false);
      }
    },
    [accessToken, applyEnvelope, pending, pushEvent, sessionId, userId],
  );

  return useMemo(
    () => ({ messages, events, pending, send, reset }),
    [messages, events, pending, send, reset],
  );
}
