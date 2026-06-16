import React, { useEffect, useRef } from 'react';

export function CameraPreview({
  stream,
  onConfirm,
  onCancel,
}: {
  stream: MediaStream;
  onConfirm: (base64: string, type: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      onConfirm(base64, 'image/jpeg');
    }
  };

  return (
    <div className='camera-preview'>
      <div className='camera-preview__header'>
        <span className='camera-preview__title'>拍攝照片</span>
        <button type='button' className='camera-preview__close' onClick={onCancel}>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            width='16'
            height='16'
          >
            <path d='M18 6L6 18M6 6l12 12' />
          </svg>
        </button>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className='camera-preview__video'
      />
      <div className='camera-preview__footer'>
        <button
          type='button'
          className='camera-btn camera-btn--cancel'
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type='button'
          className='camera-btn camera-btn--confirm'
          onClick={handleCapture}
        >
          確認拍攝
        </button>
      </div>
    </div>
  );
}
