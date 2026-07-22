"use client";

import { useEffect, useRef, RefObject } from "react";
import { Landmark } from "../hooks/useHandTracker";

export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  landmarks: Landmark[][];
  toCanvas: (x: number, y: number) => [number, number];
  width: number;
  height: number;
  dpr: number;
};

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarksRef: RefObject<Landmark[][]>;
  onDraw?: (drawCtx: DrawContext) => void;
};

export default function CameraView({ videoRef, landmarksRef, onDraw }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onDrawRef = useRef(onDraw);
  onDrawRef.current = onDraw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const onResize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    onResize();
    window.addEventListener("resize", onResize);

    let animationFrameId: number;

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.scale(dpr, dpr);

        // Mirror video in canvas so text drawn later renders correctly
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -w, 0, w, h);
        ctx.restore();

        onDrawRef.current?.({
          ctx,
          landmarks: landmarksRef.current,
          toCanvas: (x, y) => [(1 - x) * w, y * h],
          width: w,
          height: h,
          dpr,
        });

        ctx.restore();
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
    };
  }, [videoRef, landmarksRef]);

  return (
    <div style={{ margin: 0, padding: 0, overflow: "hidden" }}>
      <video ref={videoRef} playsInline style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}
      />
    </div>
  );
}
