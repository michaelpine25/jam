"use client";

import { useState, useEffect } from "react";

export const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;
export type NoteName = (typeof NOTE_NAMES)[number];

export const CHORD_TYPES = ["maj", "min", "maj7", "min7", "dom7", "sus2", "sus4"] as const;
export type ChordType = (typeof CHORD_TYPES)[number];

export const CHORD_SUFFIXES: Record<ChordType, string> = {
  maj: "", min: "m", maj7: "maj7", min7: "m7", dom7: "7", sus2: "sus2", sus4: "sus4",
};

const INTERVALS: Record<ChordType, number[]> = {
  maj:  [0, 4, 7],
  min:  [0, 3, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

const NOTE_SEMITONES: Record<NoteName, number> = {
  "C": 0, "C#": 1, "D": 2, "Eb": 3, "E": 4, "F": 5,
  "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11,
};

const C4 = 261.63;

function computeNotes(root: NoteName, type: ChordType, octave: number): number[] {
  const rootSemi = NOTE_SEMITONES[root];
  return INTERVALS[type].map(i => C4 * Math.pow(2, (rootSemi + i + (octave - 4) * 12) / 12));
}

export type ChordConfig = {
  id: string;
  root: NoteName;
  type: ChordType;
  octave: number;
  label: string;
  notes: number[];
};

let _counter = 0;

export function makeChord(root: NoteName, type: ChordType, octave: number, id?: string): ChordConfig {
  return {
    id: id ?? `${root}-${type}-${octave}-${++_counter}`,
    root, type, octave,
    label: root + CHORD_SUFFIXES[type],
    notes: computeNotes(root, type, octave),
  };
}

const DEFAULT_CHORDS: ChordConfig[] = [
  makeChord("F",  "maj", 4, "d0"),
  makeChord("C",  "maj", 4, "d1"),
  makeChord("Bb", "maj", 3, "d2"),
  makeChord("F",  "maj", 4, "d3"),
  makeChord("D",  "min", 4, "d4"),
];

type Stored = { id: string; root: NoteName; type: ChordType; octave: number };
const STORAGE_KEY = "jam-chord-wheel";

function load(): ChordConfig[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: Stored[] = JSON.parse(raw);
    if (!stored.length) return null;
    return stored.map(({ id, root, type, octave }) => makeChord(root, type, octave, id));
  } catch {
    return null;
  }
}

function save(chords: ChordConfig[]): void {
  const stored: Stored[] = chords.map(({ id, root, type, octave }) => ({ id, root, type, octave }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function useChordConfig() {
  const [chords, setChords] = useState<ChordConfig[]>(DEFAULT_CHORDS);

  useEffect(() => {
    const loaded = load();
    if (loaded) setChords(loaded);
  }, []);

  const update = (next: ChordConfig[]) => {
    setChords(next);
    save(next);
  };

  return [chords, update] as const;
}
