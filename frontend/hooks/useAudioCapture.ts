import { useCallback, useRef, useState } from 'react';

export function useAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = useCallback(async (onAudioData: (pcmData: Int16Array) => void) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('此環境不支援麥克風存取，請確認是否為 HTTPS 連線或 localhost');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            if (inputs.length > 0 && inputs[0].length > 0) {
              const inputChannel = inputs[0][0];
              const inputCopy = new Float32Array(inputChannel);
              this.port.postMessage(inputCopy);
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(workletUrl);

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e) => {
        const inputData = e.data as Float32Array;
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = inputData[i] * 0x7fff;
        }
        onAudioData(pcm16);
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      setIsCapturing(true);

      URL.revokeObjectURL(workletUrl);
    } catch (error) {
      console.error('Error starting audio capture:', error);
      throw error;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  return { isCapturing, startCapture, stopCapture };
}
