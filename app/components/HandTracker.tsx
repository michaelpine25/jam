"use client";

import { useRef, useCallback, useState } from "react";
import { useHandTracker, Landmark } from "../hooks/useHandTracker";
import CameraView, { DrawContext } from "./CameraView";
import { useChordAudio } from "../hooks/useChordAudio";
import { useChordConfig } from "../hooks/useChordConfig";
import ChordEditor from "./ChordEditor";

function isHandClosed(landmarks: Landmark[]): boolean {
  if (landmarks.length < 21) return false;
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  return tips.filter((tip, i) => landmarks[tip].y > landmarks[pips[i]].y).length >= 3;
}

const TWO_PI = Math.PI * 2;
const START_ANGLE = -Math.PI / 2;
const MIN_CUTOFF = 200;
const MAX_CUTOFF = 8000;

function hitSegment(px: number, py: number, cx: number, cy: number, r: number, count: number): number {
  const dx = px - cx;
  const dy = py - cy;
  if (dx * dx + dy * dy > r * r) return -1;
  const slice = TWO_PI / count;
  const angle = Math.atan2(dy, dx);
  const normalized = ((angle - START_ANGLE) % TWO_PI + TWO_PI) % TWO_PI;
  return Math.floor(normalized / slice);
}

function drawDots(ctx: CanvasRenderingContext2D, hand: Landmark[], toCanvas: (x: number, y: number) => [number, number], color: string) {
  for (const { x, y } of hand) {
    const [px, py] = toCanvas(x, y);
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, TWO_PI);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawFilterMeter(ctx: CanvasRenderingContext2D, wx: number, wy: number, level: number) {
  const barH = 90;
  const barW = 10;
  const bx = wx + 22;
  const by = wy - barH / 2;

  // Track
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(bx, by, barW, barH);

  // Fill with brightness gradient
  const fillH = barH * level;
  const grad = ctx.createLinearGradient(bx, by, bx, by + barH);
  grad.addColorStop(0, "#fbbf24");
  grad.addColorStop(1, "#1e40af");
  ctx.fillStyle = grad;
  ctx.fillRect(bx, by + barH - fillH, barW, fillH);

  // Label
  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("FILTER", bx + barW / 2, by + barH + 4);
}

export default function HandTracker() {
  const handClosedRef = useRef<boolean[]>([false, false]);
  const [chords, setChords] = useChordConfig();
  const [editorOpen, setEditorOpen] = useState(false);
  const { play, stop, setFilterCutoff } = useChordAudio();

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

    const cx = w * 0.7;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.28;
    const slice = TWO_PI / Math.max(chords.length, 1);

    // Assign roles: first hand inside the wheel = chord, any other = filter
    let activeSegment = -1;
    let chordHand: Landmark[] | null = null;
    let filterHand: Landmark[] | null = null;

    for (const hand of landmarks) {
      if (hand.length < 21) continue;
      const [tx, ty] = toCanvas(hand[8].x, hand[8].y);
      const seg = chords.length > 0 ? hitSegment(tx, ty, cx, cy, r, chords.length) : -1;
      if (seg >= 0 && chordHand === null) {
        activeSegment = seg;
        chordHand = hand;
      } else if (filterHand === null) {
        filterHand = hand;
      }
    }

    // Chord audio
    if (activeSegment >= 0) play(activeSegment, chords[activeSegment].notes);
    else stop();

    // Filter control: map free hand's wrist Y (0=top→bright, 1=bottom→dark)
    if (filterHand) {
      const level = 1 - Math.max(0, Math.min(1, filterHand[0].y));
      setFilterCutoff(MIN_CUTOFF * Math.pow(MAX_CUTOFF / MIN_CUTOFF, level));
    } else {
      setFilterCutoff(5000); // default when no filter hand
    }

    // Draw chord wheel
    if (chords.length > 0) {
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
    }

    // Draw hand dots + filter meter
    if (chordHand) drawDots(ctx, chordHand, toCanvas, "#4ade80");
    if (filterHand) {
      drawDots(ctx, filterHand, toCanvas, "#22d3ee");
      const [wx, wy] = toCanvas(filterHand[0].x, filterHand[0].y);
      const level = 1 - Math.max(0, Math.min(1, filterHand[0].y));
      drawFilterMeter(ctx, wx, wy, level);
    }
    // Hands not assigned a role yet (e.g., both outside wheel) get neutral dots
    for (const hand of landmarks) {
      if (hand !== chordHand && hand !== filterHand) {
        drawDots(ctx, hand, toCanvas, "#a3a3a3");
      }
    }
  }, [play, stop, setFilterCutoff]);

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
        <ChordEditor chords={chords} onChange={setChords} onClose={() => setEditorOpen(false)} />
      )}
    </>
  );
}
