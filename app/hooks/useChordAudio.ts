"use client";

import { useRef, useCallback } from "react";

export type Chord = { label: string; notes: number[] };

export const CHORDS: Chord[] = [
  { label: "F/A", notes: [220.00, 349.23, 440.00] },
  { label: "C",   notes: [261.63, 329.63, 392.00] }, // C4 E4 G4
  { label: "Bb",  notes: [233.08, 293.66, 349.23] }, // Bb3 D4 F4
  { label: "F",   notes: [261.63, 349.23, 440.00] }, // C4 F4 A4
  { label: "Dm",  notes: [293.66, 349.23, 440.00] }, // D4 F4 A4
];

export function useChordAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscsRef = useRef<OscillatorNode[]>([]);
  const activeRef = useRef<number>(-1);

  const stop = useCallback(() => {
    oscsRef.current.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
    oscsRef.current = [];
    activeRef.current = -1;
  }, []);

  const play = useCallback((index: number) => {
    if (index === activeRef.current) return;
    stop();

    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ac = ctxRef.current;
    if (ac.state === "suspended") ac.resume();

    activeRef.current = index;
    CHORDS[index].notes.forEach(freq => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ac.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ac.currentTime + 0.02);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      oscsRef.current.push(osc);
    });
  }, [stop]);

  return { play, stop };
}
