"use client";

import { useState } from "react";
import {
  ChordConfig, NOTE_NAMES, CHORD_TYPES, CHORD_SUFFIXES, makeChord,
  NoteName, ChordType,
} from "../hooks/useChordConfig";

type Props = {
  chords: ChordConfig[];
  onChange: (chords: ChordConfig[]) => void;
  onClose: () => void;
};

const CHORD_TYPE_LABELS: Record<ChordType, string> = {
  maj: "Major", min: "Minor", maj7: "Maj7", min7: "Min7",
  dom7: "Dom7", sus2: "Sus2", sus4: "Sus4",
};

const sel: React.CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  color: "white",
  padding: "5px 8px",
  fontSize: 13,
  cursor: "pointer",
};

export default function ChordEditor({ chords, onChange, onClose }: Props) {
  const [root, setRoot] = useState<NoteName>("C");
  const [type, setType] = useState<ChordType>("maj");
  const [octave, setOctave] = useState(4);

  const add = () => onChange([...chords, makeChord(root, type, octave)]);
  const remove = (id: string) => onChange(chords.filter(c => c.id !== id));

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, width: 270, zIndex: 100,
      background: "rgba(12, 12, 22, 0.92)", backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
      color: "white", fontFamily: "sans-serif", padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.02em" }}>Chord Wheel</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
      </div>

      {/* Chord list */}
      <div style={{ marginBottom: 14, minHeight: 20 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
          Chords ({chords.length})
        </div>
        {chords.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>No chords — add one below</div>
        )}
        {chords.map((chord, i) => (
          <div key={chord.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: `hsl(${(i / Math.max(chords.length, 1)) * 300 + 200}, 70%, 55%)`,
              }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{chord.label}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>oct {chord.octave}</span>
            </div>
            <button onClick={() => remove(chord.id)} style={{ background: "none", border: "none", color: "rgba(255,80,80,0.7)", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
          Add chord
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <select value={root} onChange={e => setRoot(e.target.value as NoteName)} style={sel}>
            {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value as ChordType)} style={sel}>
            {CHORD_TYPES.map(t => <option key={t} value={t}>{CHORD_TYPE_LABELS[t]}</option>)}
          </select>
          <select value={octave} onChange={e => setOctave(Number(e.target.value))} style={sel}>
            {[2, 3, 4, 5, 6].map(o => <option key={o} value={o}>Oct {o}</option>)}
          </select>
          <button onClick={add} style={{
            background: "rgba(80, 120, 255, 0.85)", border: "none", borderRadius: 6,
            color: "white", padding: "5px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>
            Add
          </button>
        </div>
        {root && type && (
          <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            Preview: {root}{CHORD_SUFFIXES[type]} (oct {octave})
          </div>
        )}
      </div>
    </div>
  );
}
