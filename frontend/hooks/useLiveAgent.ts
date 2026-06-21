import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';
import { useCameraCapture } from './useCameraCapture';
import { useScreenCapture } from './useScreenCapture';

export type LiveStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface UseLiveAgentProps {
  sessionId: string;
  userId: string;
  proactivity?: boolean;
  affectiveDialog?: boolean;
  onEvent: (event: any) => void;
  onError: (error: string) => void;
}

export function useLiveAgent({ sessionId, userId, proactivity = false, affectiveDialog = false, onEvent, onError }: UseLiveAgentProps) {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  
  const [status, setStatus] = useState<LiveStatus>('disconnected');
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenEnabled, setIsScreenEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const isClosingRef = useRef(false);
  const isSoftReconnectingRef = useRef(false);
  const speakingTimeoutRef = useRef<number | null>(null);
  const { isCapturing: isMicCapturing, startCapture: startMic, stopCapture: stopMic } = useAudioCapture();
  const { initPlayback, playAudioChunk, stopPlayback } = useAudioPlayback();
  const { isCapturing: isCameraCapturing, stream: cameraStream, startCapture: startCamera, stopCapture: stopCamera } = useCameraCapture();
  const { isCapturing: isScreenCapturing, stream: screenStream, startCapture: startScreen, stopCapture: stopScreen } = useScreenCapture();

  const prevConfig = useRef({ proactivity, affectiveDialog });

  const toggleScreen = useCallback(async () => {
    if (!isScreenEnabled) {
      if (status !== 'connected') {
        onErrorRef.current('尚未連線到伺服器，無法開啟螢幕分享。');
        return;
      }
      setIsScreenEnabled(true);
      try {
        await startScreen((base64Frame) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'video_frame', data: base64Frame }));
          }
        });
      } catch (err: any) {
        setIsScreenEnabled(false);
        onErrorRef.current(`無法存取螢幕分享，請檢查權限設定。(${err.message || err})`);
      }
    } else {
      stopScreen();
      setIsScreenEnabled(false);
    }
  }, [isScreenEnabled, status, startScreen, stopScreen]);

  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    if (!isSoftReconnectingRef.current) {
      setStatus('connecting');
    }
    isClosingRef.current = false;

    // Determine target host and protocol dynamically to bypass Next.js standalone WebSocket proxy limitation
    const establishConnection = async () => {
      let backendUrl = process.env.NEXT_PUBLIC_API_URL;
      
      if (!backendUrl) {
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const config = await res.json();
            backendUrl = config.backendUrl;
          }
        } catch (err) {
          console.warn('Failed to fetch dynamic backend config from /api/config, falling back to relative proxy path:', err);
        }
      }

      let wsUrl: string;

      if (backendUrl && backendUrl.startsWith('http')) {
        // Direct connection to backend (Cloud Run)
        const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
        const cleanUrl = backendUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        wsUrl = `${wsProtocol}//${cleanUrl}/api/agent/live/ws/${sessionId}?user_id=${userId}&proactivity=${proactivity}&affective_dialog=${affectiveDialog}&token=${accessToken || ''}`;
      } else {
        // Local development or relative path via Next.js proxy
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/api/agent/live/ws/${sessionId}?user_id=${userId}&proactivity=${proactivity}&affective_dialog=${affectiveDialog}&token=${accessToken || ''}`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isClosingRef.current) {
          ws.close();
          return;
        }
        setStatus('connected');
        isSoftReconnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle audio output
          if (data.content?.parts) {
            let hasAudio = false;
            for (const part of data.content.parts) {
              const inlineData = part.inlineData || part.inline_data;
              const mimeType = inlineData?.mimeType || inlineData?.mime_type;

              if (mimeType?.startsWith('audio/') && inlineData?.data) {
                playAudioChunk(inlineData.data);
                hasAudio = true;
              }
            }
            if (hasAudio) {
              setIsSpeaking(true);
              if (speakingTimeoutRef.current) window.clearTimeout(speakingTimeoutRef.current);
              speakingTimeoutRef.current = window.setTimeout(() => setIsSpeaking(false), 2000);
            }
          }

          if (data.server_type === 'error') {
            const code = data.data?.code || 'ERROR';
            const message = data.data?.message || '發生未知錯誤';
            onErrorRef.current(`伺服器錯誤 [${code}]: ${message}`);
          }

          onEventRef.current(data);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onerror = (e) => {
        if (isClosingRef.current) return;
        // console.error('WebSocket connection error. This often happens if the server is down or returning a 502 Bad Gateway.', e);
        setStatus('error');
        isSoftReconnectingRef.current = false;
        onErrorRef.current('無法連線至語音伺服器 (可能為 502 Bad Gateway)，請確認後端服務已正常啟動且可供存取。');
      };

      ws.onclose = (event) => {
        if (isSoftReconnectingRef.current) {
          // Soft reconnecting - don't stop media streams
          return;
        }

        setStatus('disconnected');
        if (!isClosingRef.current && !event.wasClean) {
          console.warn(`WebSocket closed unexpectedly: code=${event.code}, reason=${event.reason || 'none'}`);
        }
        stopMic();
        stopCamera();
        stopScreen();
        stopPlayback();
      };
    };

    establishConnection();
  }, [sessionId, userId, proactivity, affectiveDialog, playAudioChunk, stopMic, stopCamera, stopScreen, stopPlayback]);

  // Effect to handle soft reconnect when config changes
  useEffect(() => {
    if (status === 'connected' && wsRef.current && (prevConfig.current.proactivity !== proactivity || prevConfig.current.affectiveDialog !== affectiveDialog)) {
      isSoftReconnectingRef.current = true;
      setStatus('reconnecting');
      wsRef.current.close();
      // Wait a bit for the previous socket to cleanup then connect again
      const timer = setTimeout(() => {
        connect();
      }, 300);
      return () => clearTimeout(timer);
    }
    prevConfig.current = { proactivity, affectiveDialog };
  }, [proactivity, affectiveDialog, status, connect]);

  const disconnect = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'close' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
    stopMic();
    stopCamera();
    stopScreen();
    stopPlayback();
  }, [stopMic, stopCamera, stopScreen, stopPlayback]);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
    }
  }, []);

  const sendImage = useCallback((base64Data: string, mimeType: string = 'image/jpeg', text?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'image', data: base64Data, mimeType, text }));
    }
  }, []);

  useEffect(() => {
    if (isMicEnabled && status === 'connected' && !isMicCapturing) {
      startMic((pcmData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(pcmData.buffer as ArrayBuffer);
        }
      }).catch((err) => {
        setIsMicEnabled(false);
        onErrorRef.current(`無法存取麥克風，請檢查權限設定。(${err.message || err})`);
      });
    } else if (!isMicEnabled && isMicCapturing) {
      stopMic();
    }
  }, [isMicEnabled, status, isMicCapturing, startMic, stopMic]);

  useEffect(() => {
    if (isCameraEnabled && status === 'connected' && !isCameraCapturing) {
      startCamera((base64Frame) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'video_frame', data: base64Frame }));
        }
      }).catch((err) => {
        setIsCameraEnabled(false);
        onErrorRef.current(`無法存取攝影機，請檢查權限設定。(${err.message || err})`);
      });
    } else if (!isCameraEnabled && isCameraCapturing) {
      stopCamera();
    }
  }, [isCameraEnabled, status, isCameraCapturing, startCamera, stopCamera]);

  // Sync isScreenEnabled with the actual capture status
  const prevIsScreenCapturing = useRef(isScreenCapturing);
  useEffect(() => {
    if (prevIsScreenCapturing.current && !isScreenCapturing) {
      // Transition from capturing to not capturing (e.g. user stopped via browser UI)
      setIsScreenEnabled(false);
    }
    prevIsScreenCapturing.current = isScreenCapturing;
  }, [isScreenCapturing]);

  return {
    status,
    connect,
    disconnect,
    sendText,
    sendImage,
    isMicEnabled,
    setIsMicEnabled,
    isCameraEnabled,
    setIsCameraEnabled,
    isScreenEnabled,
    setIsScreenEnabled,
    toggleScreen,
    isSpeaking,
    cameraStream,
    screenStream,
    initPlayback,
  };
}
