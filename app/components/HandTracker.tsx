"use client";

import { useRef, useCallback, useState } from "react";
import { useHandTracker, Landmark } from "../hooks/useHandTracker";
import CameraView, { DrawContext } from "./CameraView";
import { useChordAudio } from "../hooks/useChordAudio";
import { useChordConfig } from "../hooks/useChordConfig";
import ChordEditor from "./ChordEditor";

function isHandClosed(landmarks: Landmark[]): boolean {
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  return tips.filter((tip, i) => landmarks[tip].y > landmarks[pips[i]].y).length >= 3;
}

const TWO_PI = Math.PI * 2;
const START_ANGLE = -Math.PI / 2;

function hitSegment(px: number, py: number, cx: number, cy: number, r: number, count: number): number {
  const dx = px - cx;
  const dy = py - cy;
  if (dx * dx + dy * dy > r * r) return -1;
  const slice = TWO_PI / count;
  const angle = Math.atan2(dy, dx);
  const normalized = ((angle - START_ANGLE) % TWO_PI + TWO_PI) % TWO_PI;
  return Math.floor(normalized / slice);
}

export default function HandTracker() {
  const handClosedRef = useRef<boolean[]>([false, false]);
  const [chords, setChords] = useChordConfig();
  const [editorOpen, setEditorOpen] = useState(false);
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

  const chordsRef = useRef(chords);
  chordsRef.current = chords;

  const onDraw = useCallback(({ ctx, landmarks, toCanvas, width: w, height: h }: DrawContext) => {
    const chords = chordsRef.current;
    if (chords.length === 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.28;
    const slice = TWO_PI / chords.length;

    // Find active segment from any hand's index finger tip (landmark 8)
    let activeSegment = -1;
    for (const hand of landmarks) {
      const [tx, ty] = toCanvas(hand[8].x, hand[8].y);
      const seg = hitSegment(tx, ty, cx, cy, r, chords.length);
      if (seg >= 0) { activeSegment = seg; break; }
    }

    if (activeSegment >= 0) play(activeSegment, chords[activeSegment].notes);
    else stop();

    // Draw wheel segments
    chords.forEach(({ label }, i) => {
      const startAngle = START_ANGLE + i * slice;
      const endAngle = startAngle + slice;
      const isActive = i === activeSegment;
      const hue = (i / chords.length) * 300 + 200;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = isActive
        ? `hsla(${hue}, 85%, 62%, 0.88)`
        : `hsla(${hue}, 55%, 28%, 0.5)`;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const mid = startAngle + slice / 2;
      ctx.font = "bold 26px sans-serif";
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

  return (
    <>
      <CameraView videoRef={videoRef} landmarksRef={landmarksRef} onDraw={onDraw} />

      {!editorOpen && (
        <button
          onClick={() => setEditorOpen(true)}
          title="Edit chords"
          style={{
            position: "fixed", top: 16, right: 16, zIndex: 100,
            width: 38, height: 38, borderRadius: 8, cursor: "pointer",
            background: "rgba(12,12,22,0.75)", backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.15)", color: "white",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ⚙
        </button>
      )}

      {editorOpen && (
        <ChordEditor
          chords={chords}
          onChange={setChords}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}
