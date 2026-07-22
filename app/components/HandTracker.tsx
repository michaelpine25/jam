"use client";

import { useRef, useCallback } from "react";
import { useHandTracker, Landmark } from "../hooks/useHandTracker";
import CameraView, { DrawContext } from "./CameraView";
import { useChordAudio, CHORDS } from "../hooks/useChordAudio";

function isHandClosed(landmarks: Landmark[]): boolean {
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  const curled = tips.filter((tip, i) => landmarks[tip].y > landmarks[pips[i]].y);
  return curled.length >= 3;
}

const TWO_PI = Math.PI * 2;
const START_ANGLE = -Math.PI / 2;
const SLICE = TWO_PI / CHORDS.length;

function hitSegment(px: number, py: number, cx: number, cy: number, r: number): number {
  const dx = px - cx;
  const dy = py - cy;
  if (dx * dx + dy * dy > r * r) return -1;
  const angle = Math.atan2(dy, dx);
  const normalized = ((angle - START_ANGLE) % TWO_PI + TWO_PI) % TWO_PI;
  return Math.floor(normalized / SLICE);
}

export default function HandTracker() {
  const handClosedRef = useRef<boolean[]>([false, false]);
  const { play, stop } = useChordAudio();

  const { videoRef, landmarksRef } = useHandTracker({
    onResults(landmarks) {
      landmarks.forEach((hand, i) => {
        const closed = isHandClosed(hand);
        if (closed && !handClosedRef.current[i]) console.log("hand closed");
        handClosedRef.current[i] = closed;
      });
    },
  });

  const onDraw = useCallback(({ ctx, landmarks, toCanvas, width: w, height: h }: DrawContext) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.28;

    // Find which chord segment the index finger tip (landmark 8) is pointing at
    let activeSegment = -1;
    for (const hand of landmarks) {
      const [tx, ty] = toCanvas(hand[8].x, hand[8].y);
      const seg = hitSegment(tx, ty, cx, cy, r);
      if (seg >= 0) { activeSegment = seg; break; }
    }

    if (activeSegment >= 0) play(activeSegment);
    else stop();

    // Chord wheel
    CHORDS.forEach(({ label }, i) => {
      const startAngle = START_ANGLE + i * SLICE;
      const endAngle = startAngle + SLICE;
      const isActive = i === activeSegment;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = isActive ? "rgba(255, 210, 0, 0.8)" : "rgba(30, 60, 200, 0.45)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const mid = startAngle + SLICE / 2;
      ctx.font = "bold 28px sans-serif";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx + r * 0.65 * Math.cos(mid), cy + r * 0.65 * Math.sin(mid));
    });

    // Hand landmark dots
    for (const hand of landmarks) {
      for (const { x, y } of hand) {
        const [px, py] = toCanvas(x, y);
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, TWO_PI);
        ctx.fillStyle = "lime";
        ctx.fill();
      }
    }
  }, [play, stop]);

  return <CameraView videoRef={videoRef} landmarksRef={landmarksRef} onDraw={onDraw} />;
}
