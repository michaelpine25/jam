"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Hands: any;
  }
}

function isHandClosed(landmarks: any[]): boolean {
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  const curled = tips.filter((tip, i) => landmarks[tip].y > landmarks[pips[i]].y);
  return curled.length >= 3;
}

export default function HandTracker() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handClosedRef = useRef<boolean[]>([false, false]);

  useEffect(() => {
    let animationFrameId: number;
    let onResize: (() => void) | null = null;

    const setup = async () => {
      if (!videoRef.current || !canvasRef.current || !window.Hands) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      video.srcObject = stream;
      await video.play();

      const dpr = window.devicePixelRatio || 1;

      onResize = () => {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
      };
      onResize();
      window.addEventListener("resize", onResize);

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
        const cw = canvas.width;
        const ch = canvas.height;

        // Cover-fit: crop the video to fill the canvas without stretching
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = cw / ch;
        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
        if (videoAspect > canvasAspect) {
          sw = video.videoHeight * canvasAspect;
          sx = (video.videoWidth - sw) / 2;
        } else {
          sh = video.videoWidth / canvasAspect;
          sy = (video.videoHeight - sh) / 2;
        }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);

        if (results.multiHandLandmarks) {
          results.multiHandLandmarks.forEach((landmarks: any[], i: number) => {
            const closed = isHandClosed(landmarks);
            if (closed && !handClosedRef.current[i]) {
              console.log("hand closed");
            }
            handClosedRef.current[i] = closed;
          });

          for (const landmarks of results.multiHandLandmarks) {
            for (const point of landmarks) {
              // Remap landmark coords to match the cropped region
              const lx = ((point.x * video.videoWidth - sx) / sw) * cw;
              const ly = ((point.y * video.videoHeight - sy) / sh) * ch;
              ctx.beginPath();
              ctx.arc(lx, ly, 5 * dpr, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        }
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
      if (onResize) window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div style={{ margin: 0, padding: 0, overflow: "hidden" }}>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          transform: "scaleX(-1)",
        }}
      />
    </div>
  );
}
