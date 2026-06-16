import { useCallback, useRef } from 'react';

export function useAudioPlayback() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const initWorklet = async () => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return audioContextRef.current;
    }

    const audioContext = new AudioContext({ sampleRate: 24000 });
    audioContextRef.current = audioContext;

    const workletCode = `
      class PCMPlayerProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.bufferSize = 24000 * 180;
          this.buffer = new Float32Array(this.bufferSize);
          this.writeIndex = 0;
          this.readIndex = 0;
          // Anti-Jitter 機制：初始預載緩衝區大小 (約 100ms)
          this.minBufferFrames = 24000 * 0.1;
          this.isBuffering = true;

          this.port.onmessage = (event) => {
            if (event.data.command === 'endOfAudio') {
              this.readIndex = this.writeIndex;
              this.isBuffering = true;
              return;
            }

            const int16Samples = new Int16Array(event.data);
            this._enqueue(int16Samples);
          };
        }

        _enqueue(int16Samples) {
          for (let i = 0; i < int16Samples.length; i++) {
            const floatVal = int16Samples[i] / 32768;
            this.buffer[this.writeIndex] = floatVal;
            this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

            if (this.writeIndex === this.readIndex) {
              this.readIndex = (this.readIndex + 1) % this.bufferSize;
            }
          }
        }

        _getFramesAvailable() {
          if (this.writeIndex >= this.readIndex) {
            return this.writeIndex - this.readIndex;
          } else {
            return this.bufferSize - this.readIndex + this.writeIndex;
          }
        }

        process(inputs, outputs, parameters) {
          const output = outputs[0];
          const framesPerBlock = output[0].length;
          const framesAvailable = this._getFramesAvailable();

          // 若在緩衝狀態，檢查是否達到最低預載量
          if (this.isBuffering) {
            if (framesAvailable >= this.minBufferFrames) {
              this.isBuffering = false;
            } else {
              // 不足緩衝量，輸出靜音
              for (let frame = 0; frame < framesPerBlock; frame++) {
                output[0][frame] = 0;
                if (output.length > 1) {
                  output[1][frame] = 0;
                }
              }
              return true;
            }
          }

          for (let frame = 0; frame < framesPerBlock; frame++) {
            if (this.readIndex !== this.writeIndex) {
              output[0][frame] = this.buffer[this.readIndex];
              if (output.length > 1) {
                output[1][frame] = this.buffer[this.readIndex];
              }
              this.readIndex = (this.readIndex + 1) % this.bufferSize;
            } else {
              // Buffer 沒資料了 (Underrun)，輸出靜音並重新進入緩衝狀態
              output[0][frame] = 0;
              if (output.length > 1) {
                output[1][frame] = 0;
              }
              this.isBuffering = true;
            }
          }

          return true;
        }
      }
      registerProcessor('player-processor', PCMPlayerProcessor);
    `;

    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(workletUrl);

    const workletNode = new AudioWorkletNode(audioContext, 'player-processor');
    workletNode.connect(audioContext.destination);
    workletNodeRef.current = workletNode;

    URL.revokeObjectURL(workletUrl);
    return audioContext;
  };

  const playAudioChunk = useCallback((base64Data: string) => {
    initWorklet().then(() => {
      let standardBase64 = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      while (standardBase64.length % 4) {
        standardBase64 += '=';
      }

      const binaryString = window.atob(standardBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (workletNodeRef.current) {
        workletNodeRef.current.port.postMessage(bytes.buffer);
      }
    }).catch(console.error);
  }, []);

  const stopPlayback = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ command: 'endOfAudio' });
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, []);

  return { initPlayback: initWorklet, playAudioChunk, stopPlayback };
}
