import type { ChatMessage, TimelineEvent } from './mock-data';

/** Dev / User Mode 共用的 localStorage 對話歷史前綴 */
export const HISTORY_LS_PREFIX = 'ins-agent:history:';

/** User Mode 用來記住「我這台機器上次用哪個 sessionId」的 key */
export const USER_MODE_SESSION_KEY = 'ins-agent:user-mode:session-id';

/** 最多保留幾筆對話歷史；超過則依 updatedTs 淘汰最舊的 */
const MAX_HISTORY_ENTRIES = 30;
/** 對話歷史保留時間（毫秒），超過視為過期可淘汰 */
const MAX_HISTORY_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface PersistedHistory {
  messages: ChatMessage[];
  events: TimelineEvent[];
  updatedTs: number;
}

interface HistoryEntryMeta {
  key: string;
  sessionId: string;
  updatedTs: number;
}

/** 掃出所有 history entry 的 meta（壞掉或缺 updatedTs 的視為 0，會優先被淘汰） */
function listHistoryEntries(): HistoryEntryMeta[] {
  const entries: HistoryEntryMeta[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(HISTORY_LS_PREFIX)) continue;
    let updatedTs = 0;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '{}') as {
        updatedTs?: number;
      };
      updatedTs = typeof parsed.updatedTs === 'number' ? parsed.updatedTs : 0;
    } catch {
      // 壞掉的 entry → updatedTs 0
    }
    entries.push({
      key,
      sessionId: key.slice(HISTORY_LS_PREFIX.length),
      updatedTs,
    });
  }
  return entries;
}

/** 淘汰最舊的 n 筆（quota 撐爆時的緊急釋放），回傳實際刪掉幾筆 */
function evictOldest(count: number, protect: Set<string>): number {
  const removable = listHistoryEntries()
    .filter((e) => !protect.has(e.sessionId))
    .sort((a, b) => a.updatedTs - b.updatedTs);
  let removed = 0;
  for (let i = 0; i < count && i < removable.length; i++) {
    localStorage.removeItem(removable[i].key);
    removed++;
  }
  return removed;
}

/**
 * 依「過期」與「總筆數上限」清掉舊對話歷史，避免 localStorage 無限累積。
 * protectIds 內的 session 永不淘汰（例如使用者當前正在用的那個）。
 */
export function pruneSessionHistory(protectIds: string[] = []): void {
  try {
    const protect = new Set(protectIds);
    const now = Date.now();
    const fresh: HistoryEntryMeta[] = [];

    for (const e of listHistoryEntries()) {
      if (
        !protect.has(e.sessionId) &&
        e.updatedTs > 0 &&
        now - e.updatedTs > MAX_HISTORY_AGE_MS
      ) {
        localStorage.removeItem(e.key);
      } else {
        fresh.push(e);
      }
    }

    if (fresh.length > MAX_HISTORY_ENTRIES) {
      evictOldest(fresh.length - MAX_HISTORY_ENTRIES, protect);
    }
  } catch {
    // localStorage 不可用 (SSR / private mode)
  }
}

export function saveSessionHistory(
  sessionId: string,
  messages: ChatMessage[],
  events: TimelineEvent[],
): void {
  const key = HISTORY_LS_PREFIX + sessionId;
  const serialized = JSON.stringify({
    messages: messages.filter((m) => m.status === 'final'),
    events,
    updatedTs: Date.now(),
  });
  try {
    localStorage.setItem(key, serialized);
  } catch {
    // 多半是 QuotaExceededError：刪掉最舊的幾筆（保留當前 session）再試一次，
    // 而不是靜默放棄、讓使用者「以為有存其實沒存」。
    try {
      if (evictOldest(5, new Set([sessionId])) > 0) {
        localStorage.setItem(key, serialized);
      }
    } catch {
      // 還是不行就放棄 (SSR / private mode / 真的塞不下)
    }
  }
}

export function loadSessionHistory(
  sessionId: string,
): PersistedHistory | null {
  try {
    const raw = localStorage.getItem(HISTORY_LS_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      messages: ChatMessage[];
      events: TimelineEvent[];
      updatedTs?: number;
    };
    return {
      messages: parsed.messages,
      events: parsed.events,
      updatedTs: parsed.updatedTs ?? 0,
    };
  } catch {
    return null;
  }
}

export function removeSessionHistory(sessionId: string): void {
  try {
    localStorage.removeItem(HISTORY_LS_PREFIX + sessionId);
  } catch {
    // 靜默忽略
  }
}

export function getStoredUserModeSessionId(): string | null {
  try {
    return localStorage.getItem(USER_MODE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredUserModeSessionId(sessionId: string): void {
  try {
    localStorage.setItem(USER_MODE_SESSION_KEY, sessionId);
  } catch {
    // 靜默忽略
  }
}

export function clearStoredUserModeSessionId(): void {
  try {
    localStorage.removeItem(USER_MODE_SESSION_KEY);
  } catch {
    // 靜默忽略
  }
}

/**
 * 監聽「其他分頁」對某個 session 歷史的寫入（cross-tab 同步）。
 * `storage` 事件只在『別的』分頁改動 localStorage 時觸發，不會被自己的寫入打到，
 * 所以同一個 session 開兩個分頁時，閒置的那個能跟上另一個的進度。
 * 回傳 unsubscribe。
 */
export function subscribeSessionHistory(
  sessionId: string,
  onChange: (history: PersistedHistory | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const targetKey = HISTORY_LS_PREFIX + sessionId;
  const handler = (e: StorageEvent) => {
    if (e.key !== targetKey) return;
    onChange(e.newValue === null ? null : loadSessionHistory(sessionId));
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
