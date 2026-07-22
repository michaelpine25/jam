"use client";

import { useRef, useCallback } from "react";

function buildReverb(ac: AudioContext): ConvolverNode {
  const sampleRate = ac.sampleRate;
  const length = Math.floor(sampleRate * 2.8);
  const buffer = ac.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2);
    }
  }
  const node = ac.createConvolver();
  node.buffer = buffer;
  return node;
}

// Lazily built once on first play: oscs → gain → filter → dry+wet → destination
function buildGraph(ac: AudioContext) {
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 5000;
  filter.Q.value = 1.2;

  const reverb = buildReverb(ac);

  const dry = ac.createGain();
  dry.gain.value = 0.55;
  const wet = ac.createGain();
  wet.gain.value = 0.45;

  filter.connect(dry);
  filter.connect(reverb);
  reverb.connect(wet);
  dry.connect(ac.destination);
  wet.connect(ac.destination);

  return { filter };
}

export function useChordAudio() {
  const acRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
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

    if (!acRef.current) {
      const ac = new AudioContext();
      const { filter } = buildGraph(ac);
      filterRef.current = filter;
      acRef.current = ac;
    }
    const ac = acRef.current;
    const filter = filterRef.current!;
    if (ac.state === "suspended") ac.resume();

    activeRef.current = index;
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const t = ac.currentTime + i * 0.05; // 50ms stagger = strum effect
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.06);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(t);
      oscsRef.current.push(osc);
    });
  }, [stop]);

  const setFilterCutoff = useCallback((hz: number) => {
    const filter = filterRef.current;
    const ac = acRef.current;
    if (!filter || !ac) return;
    // smooth glide so 60fps calls don't cause clicks
    filter.frequency.setTargetAtTime(hz, ac.currentTime, 0.04);
  }, []);

  return { play, stop, setFilterCutoff };
}
