import { useCallback, useRef, useState } from 'react';

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    videoRef.current = null;
    canvasRef.current = null;
    setIsCapturing(false);
  }, []);

  const startCapture = useCallback(async (onFrame: (base64Frame: string) => void) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('此環境不支援螢幕分享，請確認是否為 HTTPS 連線或 localhost');
      }
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = mediaStream;
      setStream(mediaStream);

      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.play();
      videoRef.current = video;

      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;

      intervalRef.current = window.setInterval(() => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const base64Frame = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            onFrame(base64Frame);
          }
        }
      }, 1000); // 1 fps

      // Handle user stopping screen share via browser UI
      mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopCapture();
      });

      setIsCapturing(true);
    } catch (error) {
      console.error('Error starting screen capture:', error);
      throw error;
    }
  }, [stopCapture]);

  return { isCapturing, stream, startCapture, stopCapture };
}
