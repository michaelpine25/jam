# Jam

Play music with your hands — no instruments required.

Jam uses your webcam and hand tracking to turn gesture into sound. Pick your chords, hold them up, and play.

## How it works

- **Right hand** — controls the chords. Position and movement trigger the notes you've selected.
- **Left hand** — controls the filter. Move it to shape the sound in real time.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), allow camera access, and start playing.

## Built with

- [Next.js](https://nextjs.org)
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) — real-time hand tracking
- Web Audio API
