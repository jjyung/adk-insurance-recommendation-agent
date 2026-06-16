import React, { useEffect, useRef } from 'react';

// @ts-ignore: Importing CSS for side effects in a non-typed module environment
import './ScreenPreview.css';

export function ScreenPreview({
  stream,
  onStop,
}: {
  stream: MediaStream;
  onStop: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className='screen-preview-floating'>
      <div className='screen-preview__header'>
        <span className='screen-preview__title'>目前分享的畫面</span>
        <button
          type='button'
          className='screen-preview__close'
          onClick={onStop}
          title='停止分享'
        >
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
        className='screen-preview__video'
      />
      <div className='screen-preview__footer'>
        <span className='screen-preview__status'>
          <span className='status-dot status-dot--live'></span> 正在分享
        </span>
        <button
          type='button'
          className='camera-btn camera-btn--cancel'
          onClick={onStop}
        >
          停止分享
        </button>
      </div>
    </div>
  );
}
