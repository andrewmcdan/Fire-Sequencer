# Fire Sequencer Project Overview

This repo is a Node.js step sequencer for the Akai Fire controller. It uses a
multi-process setup for device detection, UI, and timing.

## Runtime flow
1. `main.js` polls USB for the Fire (VID 2536, PID 67). When detected, it
   spawns `node FireSequencer.js` and kills it on disconnect.
2. `FireSequencer.js` opens the Fire MIDI ports, manages UI state, and renders
   LEDs/OLED content. It runs the main IPC server (`nodeMidi`).
3. `main.js` also spawns `seq_loop.js`, which drives timing and emits step/note
   events to `FireSequencer.js` via IPC.
4. `wifiControl.js` is optional; it listens for IPC requests to scan/connect
   WiFi (intended for Raspberry Pi setups).

## Key files
- `main.js`: USB watcher + process launcher, plus shutdown/reboot IPC handlers.
- `FireSequencer.js`: core sequencer, UI modes (step/note/drum/perform),
  MIDI routing, LED/OLED rendering, save/load, and IPC server.
- `seq_loop.js`: high-frequency scheduler that advances steps and emits
  `play-note` and `step` events.
- `bitmaps.js`: bitmap byte arrays for OLED icons and UI graphics.
- `constants.js`: menu template JSON (not referenced elsewhere).
- `midi.js`, `midi0.js`, `midi1.js`, `midi2.js`: older/prototype MIDI and
  sequencing logic; not imported by the current entry points.
- `polyrythm.js`: experimental polyrhythm generator that talks to `seq_loop.js`.
- `wifiControl.js`: WiFi management via `pi-wifi`.
- `wifiTest.js`: ad-hoc WiFi test harness.
- `emitter.js`: JS wrapper around the Rust Neon module (not referenced elsewhere).

## Sequencer data model (high level)
- Tracks contain patterns; patterns contain step events.
- Each event stores note data, length, velocity, and an enabled flag.
- `seq_loop.js` computes step timing from BPM and steps-per-beat, then emits
  events for enabled steps.

## Persistence and project files
- `globalSave`: global settings (encoder banks, MIDI clock, etc).
- `saveFile`: list of saved projects with name/uuid/timestamps.
- `projects/`: expected output folder for project files. Each file is three
  JSON lines: state object, settings/project object, and track array.
- `dataObjFile` and `dataObjFile.json`: older snapshots of track/pattern data.
- `timingLog.json`: debug timing log output (currently empty).

## Assets
- `font/` and `fontData16pt/`, `fontData24px/`, `fontData32px/`: pre-rendered
  glyphs and font metadata for the Fire OLED.
- `ARIAL*.TTF`, `DEJAVUSANSMONO.TTF`, `FIGUBM__.TTF`: source fonts used for
  display assets.
- `266d.png`, `test.json`, `processed1.txt`: asset or test artifacts related to
  display/bitmap work.
- `bitmaps.json`: empty placeholder.

## Native and Rust experiments
- `binding.gyp` + `build/`: node-gyp configuration and outputs for the `midi`
  native module. The referenced `src/` files are not present in this repo.
- `rust-fire-lib/`: Neon-based Rust addon (exports `hello`, `between`,
  `fibonacci`, `sock_it`); `emitter.js` provides a polling wrapper.
- `rust_seq/`: Rust IPC test app using `unix_ipc`; not wired into the JS runtime.

## Notes and TODOs
- `FireSequencer.js` has a large TODO list (step-per-beat menu, external MIDI
  pattern triggers, CV gate output, etc).
- WiFi control in `FireSequencer.js` auto-sends scan/list/connect on IPC
  connect and includes hardcoded credentials.
- `package.json` lists dependencies that are unused or commented out in the
  current code (for example `osc`, `javascript-state-machine`).
