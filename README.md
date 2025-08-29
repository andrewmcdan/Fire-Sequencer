# Fire Sequencer

Fire Sequencer is a Node.js driven music sequencer that targets the Akai Fire controller.  It watches for a connected Fire device and, once detected, spawns the main `FireSequencer.js` process which drives the step sequencer, encoder menus and MIDI/CV output.

## Features

- Monitors USB for an Akai Fire and starts the sequencer automatically.
- Sequencing engine implemented in JavaScript with support for multiple tracks, MIDI and CV control.
- Uses IPC to communicate between the main launcher and sequencer processes.
- Includes fonts and bitmap assets for rendering to the Fire's display.

## Installation

Fire Sequencer depends on native modules and requires a build step.  Install Node.js and then run:

```bash
npm install
```

This invokes `node-gyp` to compile the required dependencies.

## Usage

Launch the watcher script which waits for the controller and starts the sequencer:

```bash
node main.js
```

When an Akai Fire is connected, `FireSequencer.js` is executed automatically.  Disconnecting the controller stops the sequencer.

## Development

The project exposes a placeholder `npm test` script which currently exits with an error.  Contributions are welcome to add real tests and improve documentation.

## License

This project is licensed under the ISC license.

