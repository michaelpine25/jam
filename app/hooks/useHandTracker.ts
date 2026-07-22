"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Hands: any;
  }
}

export type Landmark = { x: number; y: number; z: number };

type Options = {
  onResults?: (landmarks: Landmark[][]) => void;
};

export function useHandTracker({ onResults }: Options = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<Landmark[][]>([]);
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;

  useEffect(() => {
    let animationFrameId: number;

    const setup = async () => {
      if (!videoRef.current || !window.Hands) return;

      const video = videoRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      video.srcObject = stream;
      await video.play();

      const hands = new window.Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults((results: any) => {
        const landmarks: Landmark[][] = results.multiHandLandmarks ?? [];
        landmarksRef.current = landmarks;
        onResultsRef.current?.(landmarks);
      });

      const loop = async () => {
        await hands.send({ image: video });
        animationFrameId = requestAnimationFrame(loop);
      };

      loop();
    };

    setup();

    return () => {
      cancelAnimationFrame(animationFrameId);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, landmarksRef };
}
