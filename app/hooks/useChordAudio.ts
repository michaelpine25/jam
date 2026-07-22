"use client";

import { useRef, useCallback } from "react";

export function useChordAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscsRef = useRef<OscillatorNode[]>([]);
  const activeRef = useRef<number>(-1);

  const stop = useCallback(() => {
    oscsRef.current.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
    oscsRef.current = [];
    activeRef.current = -1;
  }, []);

  const play = useCallback((index: number, notes: number[]) => {
    if (index === activeRef.current) return;
    stop();

    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ac = ctxRef.current;
    if (ac.state === "suspended") ac.resume();

    activeRef.current = index;
    notes.forEach(freq => {
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
