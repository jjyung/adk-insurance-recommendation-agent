import React from 'react';

export function WaveformVisualizer({
  isSpeaking,
  isListening,
}: {
  isSpeaking: boolean;
  isListening: boolean;
}) {
  return (
    <div className='waveform'>
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className='waveform__bar'
          style={{
            animationDelay: `${i * 0.1}s`,
            backgroundColor: isSpeaking ? '#10b981' : isListening ? '#f08a24' : '#6c5d4e',
            animationPlayState: isSpeaking || isListening ? 'running' : 'paused',
          }}
        />
      ))}
    </div>
  );
}
