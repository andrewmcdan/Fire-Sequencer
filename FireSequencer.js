// process.env.UV_THREADPOOL_SIZE = 30;

const os = require('os');
const ipc = require('node-ipc');

// This code spawns the seq_loop node process. In testing, we manually spawn
// sequence looper so that we can bedug it.

// const spawn = require('child_process').spawn;
// const path = require('path');
// const command = 'node';
// const parameters = [path.resolve('seq_loop.js')];
// const child = spawn(command, parameters, {
//   stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
// });
const bitmaps = require('./bitmaps.js');
// const consts = require('./constants');
var fs = require('fs');
// const lineReader = require('line-reader');
const midi = require('midi');
const {
  log
} = require('node-ipc');
const {
  v4: uuidv4
} = require('uuid');
// console.log(uuidv4());
var settings = {};
var timingLog = [];
var fireOLED_pixelMemMap = new Array(128);
for (let i = 0; i < 128; i++) {
  fireOLED_pixelMemMap[i] = new Array(64);
  for (let p = 0; p < 64; p++) {
    fireOLED_pixelMemMap[i][p] = 0;
  }
}

settings.osType = os.type();

console.log(settings.osType);

settings.flushedInput = false;
debug("Flushing MIDI input buffers...");
setTimeout(function () {
  settings.flushedInput = true;
  debug("MIDI input buffer flush complete.");
}, 500);

/*
if (settings.osType != "Windows_NT") { // virtual midi port not supported on Windows
  console.log("Creating virtual MIDI interface...");
  // setup virtual interface to software midi
  var virInput = new midi.Input();
  virInput.openVirtualPort("Akai Fire Sequencer Input");
  virInput.ignoreTypes(false, false, false);

  var virOutput = new midi.Output();
  virOutput.openVirtualPort("Akai Fire Sequencer Output");

  // callback for incoming messages from virtual input port
  virInput.on('message', (deltaTime, message) => {
    if (!settings.flushedInput) {
      debug("virinpout");
      debug(`m: ${message} d: ${deltaTime}`);
    }
  });
}
*/

// Set up a new input.
const fireMidiIn = new midi.Input(),
  fireMidiOut = new midi.Output();
var midiInputDevices = [],
  midiInputDevicesNames = [],
  midiInputDevicesEnabled = [],
  midiOutputDevices = [],
  midiOutputDevicesNames = [],
  midiOutputDevicesEnabled = [],
  midiInputDevicesHidden = [],
  midiOutputDevicesHidden = [];

// find out open Akai Fire MIDI input port
// Also create array of all ports and open them.
// console.log("");
// console.log("Midi Inputs:");
for (let step = 0; step < fireMidiIn.getPortCount(); step++) {
  if (settings.osType == "Windows_NT") {
    if (fireMidiIn.getPortName(step).search("FL STUDIO FIRE") != -1) {
      fireMidiIn.openPort(step);
    }
  }
  if (fireMidiIn.getPortName(step).search("FL STUDIO FIRE:FL STUDIO FIRE MIDI 1") != -1) {
    fireMidiIn.openPort(step);
  } else if (settings.osType != "Windows_NT") {
    midiInputDevices[step] = new midi.Input();
    midiInputDevices[step].openPort(step);
    midiInputDevicesNames[step] = midiInputDevices[step].getPortName(step);
    midiInputDevicesEnabled[step] = true;
    // console.log(midiInputDevicesNames[step]);
    if (midiInputDevicesNames[step].includes("RtMidi Output Client:RtMidi Output Client") || midiInputDevicesNames[step].includes("Midi Through:Midi Through Port") || midiInputDevicesNames[step].includes("FL STUDIO FIRE:FL STUDIO FIRE MIDI")) {
      midiInputDevicesHidden[step] = true;
    } else {
      midiInputDevicesHidden[step] = false;
    }
  }
}

fireMidiIn.ignoreTypes(false, false, false);

// find out open Akai Fire MIDI output port and open it under "fireMidiOut"
// Also create array of all ports and open them.
// console.log("");
// console.log("Midi Outputs:");
for (let step = 0; step < fireMidiOut.getPortCount(); step++) {
  if (settings.osType == "Windows_NT") {
    if (fireMidiOut.getPortName(step).search("FL STUDIO FIRE") != -1) {
      fireMidiOut.openPort(step);
    }
  }
  if (fireMidiOut.getPortName(step).search("FL STUDIO FIRE:FL STUDIO FIRE MIDI 1") != -1) {
    fireMidiOut.openPort(step);
  } else if (settings.osType != "Windows_NT") {
    midiOutputDevices[step] = new midi.Output();
    midiOutputDevices[step].openPort(step);
    midiOutputDevicesNames[step] = midiOutputDevices[step].getPortName(step);
    midiOutputDevicesEnabled[step] = true;
    // console.log(midiOutputDevicesNames[step]);
    if (midiOutputDevicesNames[step].includes("RtMidi Input Client:RtMidi Input Client") || midiOutputDevicesNames[step].includes("Midi Through:Midi Through Port") || midiOutputDevicesNames[step].includes("FL STUDIO FIRE:FL STUDIO FIRE MIDI")) {
      midiOutputDevicesHidden[step] = true;
    } else {
      midiOutputDevicesHidden[step] = false;
    }
  }
}

// console.log(midiOutputDevicesNames);


// for(i=0;i<midiOutputDevices.length;i++){
//   midiOutputDevices[i].sendMessage([0x90,60,100]);
// }

var btnLEDSysEx = [0xf0, 0x47, 0x7f, 0x43, 0x65, 0x00, 0x04, 0, 0, 0, 0, 0xF7];
var gridBtnLEDcolor = JSON.parse('{"btn":[{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0}]}');

/* #region   */
const BTN_LED_OFF = 0,
  PATTERN_BROWSER_GRID_DIMRED = 0x01,
  PATTERN_BROWSER_GRID_RED = 0x02,
  SOLO_DIMGREEN = 0x01,
  SOLO_GREEN = 0x02,
  ALT_STOP_DIMYELLOW = 0x01,
  ALT_STOP_YELLOW = 0x02,
  STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW = 0x02,
  STEP_NOTE_DRUM_PERF_SHIFT_REC_YELLOW = 0x04,
  STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMRED = 0x01,
  STEP_NOTE_DRUM_PERF_SHIFT_REC_RED = 0x03,
  PATSONG_PLAY_DIMYELLOW = 0x02,
  PATSONG_PLAY_YELLOW = 0x04,
  PATSONG_PLAY_DIMGREEN = 0x01,
  PATSONG_PLAY_GREEN = 0x03,
  TRACK_SELECTED_GREEN = 4,
  TRACK_SELECTED_DIMGREEN = 2,
  TRACK_SELECTED_RED = 3,
  TRACK_SELECTED_DIMRED = 1,
  //////////////////////////////////////////////////
  PATTERN_UP_BTN_LED = 0,
  PATTERN_DWN_BTN_LED = 1,
  BROWSER_BTN_LED = 2,
  GRID_LEFT_BTN_LED = 3,
  GRID_RIGHT_BTN_LED = 4,
  TRACK_ONE_MUTE_SOLO_BTN_LED = 5,
  TRACK_TWO_MUTE_SOLO_BTN_LED = 6,
  TRACK_THREE_MUTE_SOLO_BTN_LED = 7,
  TRACK_FOUR_MUTE_SOLO_BTN_LED = 8,
  TRACK_ONE_SELECT_LED = 9,
  TRACK_TWO_SELECT_LED = 10,
  TRACK_THREE_SELECT_LED = 11,
  TRACK_FOUR_SELECT_LED = 12,
  STEP_BTN_LED = 13,
  NOTE_BTN_LED = 14,
  DRUM_BTN_LED = 15,
  PERFORM_BTN_LED = 16,
  SHIFT_BTN_LED = 17,
  ALT_BTN_LED = 18,
  PAT_SONG_BTN_LED = 19,
  PLAY_BTN_LED = 20,
  STOP_BTN_LED = 21,
  REC_BTN_LED = 22,
  CHANNEL_MIXER_USER_USER_BTN_LED = 23;
/* #endregion */

/* #region   */
var notGridBtnLEDS = [
  PATTERN_BROWSER_GRID_DIMRED, // pattern up btn LED      0
  PATTERN_BROWSER_GRID_DIMRED, // pattern dwn btn LED     1
  BTN_LED_OFF, // browser btn LED         2
  PATTERN_BROWSER_GRID_DIMRED, // grid left btn LED       3
  PATTERN_BROWSER_GRID_DIMRED, // grid right btn LED      4

  SOLO_GREEN, // track 1 btn LED         5
  SOLO_GREEN, // track 2 btn LED         6
  SOLO_GREEN, // track 3 btn LED         7
  SOLO_GREEN, // track 4 btn LED         8

  TRACK_SELECTED_GREEN, // track 1 selected LED    9
  BTN_LED_OFF, // track 2 selected LED    10
  BTN_LED_OFF, // track 3 selected LED    11
  BTN_LED_OFF, // track 4 selected LED    12

  STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW, // step btn LED            13
  STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW, // note btn LED            14
  STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW, // drum btn LED            15
  STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW, // perform btn LED         16

  STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW, // shift btn LED           17
  ALT_STOP_DIMYELLOW, // alt btn LED             18
  BTN_LED_OFF, // pat/song btn LED        19

  PATSONG_PLAY_DIMYELLOW, // play btn LED            20
  ALT_STOP_DIMYELLOW, // stop btn LED            21
  BTN_LED_OFF, // rec btn LED             22
  17 // channel/mixer/user1/user2 LEDs    23
];

/* #endregion */

/* #region   */
const DIM_VAL = 10,
  LED_COLOR_WHITE = (127 << 17) | (127 << 9) | (127 << 1),
  LED_COLOR_WHITE_DIM = (DIM_VAL << 17) | (DIM_VAL << 9) | (DIM_VAL << 1),
  LED_COLOR_RED = (127 << 17) | (0 << 9) | (0 << 1),
  LED_COLOR_RED_DIM = (DIM_VAL << 17) | (0 << 9) | (0 << 1),
  LED_COLOR_GREEN = (0 << 17) | (127 << 9) | (0 << 1),
  LED_COLOR_GREEN_DIM = (0 << 17) | (DIM_VAL << 9) | (0 << 1),
  LED_COLOR_BLUE = (0 << 17) | (0 << 9) | (127 << 1),
  LED_COLOR_BLUE_DIM = (0 << 17) | (0 << 9) | (DIM_VAL << 1),
  LED_COLOR_AQUA = (0 << 17) | (127 << 9) | (127 << 1),
  LED_COLOR_AQUA_DIM = (0 << 17) | (DIM_VAL << 9) | (DIM_VAL << 1),
  LED_COLOR_YELLOW = (127 << 17) | (127 << 9) | (0 << 1),
  LED_COLOR_YELLOW_DIM = (DIM_VAL << 17) | (DIM_VAL << 9) | (0 << 1),
  LED_COLOR_MAGENTA = (127 << 17) | (0 << 9) | (127 << 1),
  LED_COLOR_MAGENTA_DIM = (DIM_VAL << 17) | (0 << 9) | (DIM_VAL << 1),
  LED_COLOR_ORANGE = (127 << 17) | (65 << 9) | (0 << 1),
  LED_COLOR_OFF = (0 << 17) | (0 << 9) | (0 << 1),
  CHARCODE_UPARROW1 = 0x7f,
  CHARCODE_DOWNARROW1 = 0x80,
  CHARCODE_UPARROW_SMALL = 0x81,
  CHARCODE_DOWNARROW_SMALL = 0x82,
  CHARCODE_UPARROW = 0x83,
  CHARCODE_RIGHTARROW = 0x84,
  CHARCODE_DOWNARROW = 0x85,
  CHARCODE_LEFTARROW = 0x86,
  CHARCODE_25_SHADE = 0x87,
  CHARCODE_50_SHADE = 0x88,
  CHARCODE_75_SHADE = 0x89,
  CHARCODE_FLAT_SYMBOL = 0x8a;
/* #endregion */

/* #region   */
const LED_COLORS = [
  LED_COLOR_OFF,
  LED_COLOR_WHITE,
  LED_COLOR_WHITE_DIM,
  LED_COLOR_RED,
  LED_COLOR_RED_DIM,
  LED_COLOR_GREEN,
  LED_COLOR_GREEN_DIM,
  LED_COLOR_BLUE,
  LED_COLOR_BLUE_DIM,
  LED_COLOR_AQUA,
  LED_COLOR_AQUA_DIM,
  LED_COLOR_YELLOW,
  LED_COLOR_YELLOW_DIM,
  LED_COLOR_MAGENTA,
  LED_COLOR_MAGENTA_DIM,
  LED_COLOR_ORANGE
];
/* #endregion */

const LED_COLORS_NAMES = ["Off", "White", "White (dim)", "Red", "Red (dim)", "Green", "Green (dim)", "Blue", "Blue (dim)", "Aqua", "Aqua (dim)", "Yellow", "Yellow (dim)", "Magenta", "Magenta (dim)", "Orange"];

/* #region   */
var noteColors = {};
noteColors.C = LED_COLOR_WHITE;
noteColors.Csharp = LED_COLOR_ORANGE;
noteColors.Dflat = noteColors.Csharp;
noteColors.D = LED_COLOR_WHITE;
noteColors.Dsharp = LED_COLOR_ORANGE;
noteColors.Eflat = noteColors.Dsharp;
noteColors.E = LED_COLOR_WHITE;
noteColors.F = LED_COLOR_WHITE;
noteColors.Fsharp = LED_COLOR_ORANGE;
noteColors.Gflat = noteColors.Fsharp;
noteColors.G = LED_COLOR_WHITE;
noteColors.Gsharp = LED_COLOR_ORANGE;
noteColors.Aflat = noteColors.Gsharp;
noteColors.A = LED_COLOR_WHITE;
noteColors.Asharp = LED_COLOR_ORANGE;
noteColors.Bflat = noteColors.Asharp;
noteColors.B = LED_COLOR_WHITE;
/* #endregion */

// Piano, chromatic, major, harmonic minor, melodic minor, Whole tone, diminished,
// major pentatonic, minor pentatonic, Japanese In Sen, Major bebop,
// dominant bebop, blues, arabic, Enigmatic, Neopolitan, Neopolitan minor,
// Hungarian minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian
/* #region   */
var scales = {};
scales.indexNames = ["chromatic", "major", "harmMajor", "harmMinor", "melMinor", "wholeTone", "majorPent", "minorPent", "japInSen", "majBebop", "domBebop", "blues", "arabic", "enigmatic", "neoplitan", "neoplitanMinor", "hungarianMinor", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"];
scales.text = ["Chromatic", "Major", "Harmonic Major", "Harmonic Minor", "Melodic Minor", "Whole Tone", "Major Pentatonic", "Minor Pentatonic", "Japanese InSen", "Major Bebop", "Dominant Bebop", "Blues", "Arabic", "Enigmatic", "Neoplitan", "Neoplitan Minor", "Hungarian Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
scales.noteColorIndexes = ["C", "Csharp", "D", "Dsharp", "E", "F", "Fsharp", "G", "Gsharp", "A", "Asharp", "B"];
scales.noteNamesSharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
scales.noteNamesFlats = ["C", "D" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "D", "E" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "E", "F", "G" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "G", "A" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "A", "B" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "B"];
scales.chromatic = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
scales.major = [2, 2, 1, 2, 2, 2];
scales.harmMinor = [2, 1, 2, 2, 1, 3];
scales.harmMajor = [2, 2, 1, 2, 1, 3];
scales.melMinor = [2, 1, 2, 2, 2, 2];
scales.wholeTone = [2, 2, 2, 2, 2];
scales.majorPent = [2, 2, 3, 2];
scales.minorPent = [3, 2, 2, 3];
scales.japInSen = [1, 4, 2, 4, 2];
scales.majBebop = [2, 2, 1, 2, 1, 2];
scales.domBebop = [2, 2, 1, 2, 2, 1, 1];
scales.blues = [3, 2, 1, 1, 3];
scales.arabic = [1, 3, 1, 2, 1, 3];
scales.enigmatic = [1, 3, 2, 2, 2, 1];
scales.neoplitanMinor = [1, 2, 2, 2, 1, 3];
scales.neoplitan = [1, 2, 2, 2, 2, 2];
scales.hungarianMinor = [2, 1, 3, 1, 1, 3];
scales.dorian = [2, 1, 2, 2, 2, 1];
scales.phrygian = [1, 2, 2, 2, 1, 2];
scales.lydian = [2, 2, 2, 1, 2, 2];
scales.mixolydian = [2, 2, 1, 2, 2, 1];
scales.aeolian = [2, 1, 2, 2, 1, 2];
scales.locrian = [1, 2, 2, 1, 2, 2];
/* #endregion */
// console.log(scales);


/// Build the "track" object
var trackNumIndex = 0;

// @note track building functions
function patternEvent(data, eventIdIndex, time = 0) {
  this.startTimePatternOffset = time;
  this.data = data;
  this.length = 50; // 0-100, percent of the time between this notes start time and the next note start time
  this.velocity = 100; // 0-127
  this.id = eventIdIndex;
  this.idText = "id_" + eventIdIndex;
  this.enabled = false;
  if (typeof this.data == "object") {
    // console.log("was object");
    this.length = this.data.noteLength;
    this.velocity = this.data.noteVelocity;
    this.startTimePatternOffset = this.data.noteOffset;
    this.data = this.data.noteData;
  }
}

function trackPattern(patLength = 16, bpm = 120, beats = 4) {
  this.eventIdIndex = 0;
  this.patIsStepBased = true; // is pattern based on steps or can events happen at any time
  this.events = {};
  this.patLength = patLength;
  this.originalLengthSteps = patLength;
  this.originalBPM = bpm;
  this.currentStep = 0;
  this.beatsInPattern = beats;
  this.viewArea = 0;
  this.color = {};
  this.color.red = 127;
  this.color.grn = 0;
  this.color.blu = 127;
  this.color.mode = "preset"; // other option is "preset"
  this.color.preset = 5;
  this.defaults = {};
  this.defaults.noteData = 60;
  this.defaults.noteLength = 50;
  this.defaults.noteOffset = 0;
  this.defaults.noteVelocity = 100;
  this.addEventByTime = function (data = this.defaults.noteData, timeOffset = this.defaults.noteOffset) {
    this.events["id_" + this.eventIdIndex] = new patternEvent(data, this.eventIdIndex, timeOffset);
    this.eventIdIndex++;
  }
  this.addEventByStep = function (data, stepNum) {
    this.events["id_" + stepNum] = new patternEvent(data, stepNum);
  }
  this.removeEvent = function (id) {
    if (typeof id === 'number') {
      delete this.events["id_" + id];
      this.patLength--;
    } else if (typeof id === 'string' && id.substring(0, 3) == "id_") {
      delete this.events[id];
      this.patLength--;
    }
  }
  this.addEventsAtEndOfPattern = function (numOfEventsToAdd) {
    for (let i = 0; i < numOfEventsToAdd; i++) {
      let newEventId = this.patLength + i;
      this.events["id_" + newEventId] = new patternEvent(this.defaults, newEventId)
    }
    this.patLength = this.patLength + numOfEventsToAdd;
  }
}

function defaultTrack(stepMode = true) { // if called with first argument as false, will create time based pattern with no events. Otherwise, default pattern is stepbased.
  this.patternIdIndex = 0;
  this.patterns = {};
  this.num = trackNumIndex++;
  this.currentPattern = 0;
  this.mute = false;
  this.solo = false;
  this.defaultColor = 127;
  this.outputType = "midi"; // "midi" for MIDI device output. "cv" for control voltage output
  this.outputName = "MIDI Translator MIDI 5 ";
  this.outputIndex = "0";
  this.midiChannel = 0;
  this.trackName = "Track" + (this.num < 10 ? "0" + (this.num + 1) : (this.num + 1));
  this.channel = 0;
  this.CVportNum = 0;
  this.addPattern = function (patLength, bpm, beats) {
    this.patterns["id_" + this.patternIdIndex] = new trackPattern(patLength, bpm, beats);
    if (stepMode) {
      for (var i = 0; i < patLength; i++) {
        this.patterns["id_" + this.patternIdIndex].addEventByStep(60, i);
      }
    }
    return "id_" + this.patternIdIndex++;
  }
  this.updateOutputIndex = function () {
    if (this.outputType == "midi") {
      let midiDevice = false;
      let found = false;
      for (let i = 0; i < midiOutputDevices.length; i++) {
        if (typeof midiOutputDevicesNames[i] == "string") {
          if (midiOutputDevicesNames[i].includes(this.outputName)) {
            this.outputIndex = i;
            found = true;
          }
        }
      }
      if (!found) {
        this.outputIndex = null;
      }
      return found;
    } else {
      /** TODO: **/
      return true;
    }
  }
  this.getNumberOfPatterns = function () {
    return Object.keys(this.patterns).length;
  }
}

var seq = {}; // object to hold state of things

// seq.track = [new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack(), new defaultTrack()];

seq.track = [];
for (let i = 0; i < 4; i++) {
  seq.track.push(new defaultTrack());
}
seq.track.forEach(function (track, index) {
  track.addPattern(16, 110, 4);
  // track.addPattern(16, 110, 4);
  track.updateOutputIndex();
})


seq.mode = {};
seq.mode.current = 0;
seq.mode.names = ["Step", "Note", "Drum", "Perform", "Alt-Step"];

// Step Mode
// In this mode, device is a basic step sequencer. Each row of grid buttons
// represents a track and each button in that row is a step.
// Each track sends its step data to which ever midi deivice is selected for
// that that track in the settings menu.
seq.mode.Step = function () {
  console.log("Step Mode");
  seq.mode.current = 0;
  // load btn colors into gridBtnLEDcolor using track pattern info.
  // set step button to red, others to orange
  notGridBtnLEDS[13] = STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW;
  notGridBtnLEDS[14] = LED_COLOR_OFF;
  notGridBtnLEDS[15] = LED_COLOR_OFF;
  notGridBtnLEDS[16] = LED_COLOR_OFF;
  updateAllNotGridBtnLEDS();
  updateAllGridBtnLEDs();
  clearOLEDmemMap();
  PlotStringToPixelMemMap("Step", 0, 0, 32);
  PlotStringToPixelMemMap("MODE", 0, 36, 16);
  FireOLED_SendMemMap(0);
  seq.state.OLEDmemMapContents = "stepMode";
};

// Alt Step MODE
// In alternate step mode, the selectd track not longer acts like a normal step
// sequencer. Instead, the sequence progress through the steps based on the counts
// set in the Alt-Step mode. It's a polyrythmic step generator using counts set
// in the grid. The settings menu can be used to send data to gate outputs.
seq.mode.altStep = function () {
  console.log("Alt-Step Mode");
  seq.mode.current = 4;
  notGridBtnLEDS[13] = STEP_NOTE_DRUM_PERF_SHIFT_REC_RED;
  notGridBtnLEDS[14] = LED_COLOR_OFF;
  notGridBtnLEDS[15] = LED_COLOR_OFF;
  notGridBtnLEDS[16] = LED_COLOR_OFF;
  updateAllNotGridBtnLEDS();
  updateAllGridBtnLEDs();
  clearOLEDmemMap();
  PlotStringToPixelMemMap("Step", 0, 0, 32);
  PlotStringToPixelMemMap("ALT-MODE", 0, 36, 16);
  FireOLED_SendMemMap(0);
  seq.state.OLEDmemMapContents = "altStepMode";
};

// Note Mode
// In note mode the grid buttons act as a midi keyboard with the buttons lit
// to indicate white or black notes and root notes. Layout of notes can be
// changed to various scales using the "select" encoder. Layouts shall include
// Piano, chromatic, major, harmonic minor, melodic minor, Whole tone, diminished,
// major pentatonic, minor pentatonic. Japanese In Sen, Major bebop,
// dominant bebop, blues. arabic, Enigmatic, Neopolitan, Neopolitan minor,
// Hungarian minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian
//
// Notes played will be sent the midi device and channel associated with the
// currently selected track.
seq.mode.Note = function () {
  console.log("Note Mode");
  seq.mode.current = 1;
  notGridBtnLEDS[13] = LED_COLOR_OFF;
  notGridBtnLEDS[14] = STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW;
  notGridBtnLEDS[15] = LED_COLOR_OFF;
  notGridBtnLEDS[16] = LED_COLOR_OFF;
  updateAllNotGridBtnLEDS();
  updateAllGridBtnLEDs();
  clearOLEDmemMap();
  PlotStringToPixelMemMap("Note", 0, 0, 32);
  PlotStringToPixelMemMap("MODE", 0, 36, 16);
  FireOLED_SendMemMap(0);
  seq.state.OLEDmemMapContents = "noteMode";

  /** TODO: **/
  // load piano roll btn colors
};

// Drum mode
// In drum mode, each grid button can be mapped to a particular note or CC and
// sent to any midi device / channel. This allows the entire grid to be used as
// drums pads for any device connected.
seq.mode.Drum = function () {
  console.log("Drum Mode");
  seq.mode.current = 2;
  notGridBtnLEDS[13] = LED_COLOR_OFF;
  notGridBtnLEDS[14] = LED_COLOR_OFF;
  notGridBtnLEDS[15] = STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW;
  notGridBtnLEDS[16] = LED_COLOR_OFF;
  updateAllNotGridBtnLEDS();
  updateAllGridBtnLEDs();
  clearOLEDmemMap();
  PlotStringToPixelMemMap("Drum", 0, 0, 32);
  PlotStringToPixelMemMap("MODE", 0, 36, 16);
  FireOLED_SendMemMap(0);
  seq.state.OLEDmemMapContents = "drumMode";
};

/**************************************************************************************
Perform Mode
When placed into perform mode, the grid buttons can be assisgned to any pattern
in the track on which they appear. Each pattern can then be set to loop or to
play the next pattern that is enabled. Grid buttons enable/disable the associated
patterns. This allows the creation on songs on the fly. By default, every pattern
shall be set to loop unless changed. 
**************************************************************************************/

seq.mode.Perform = function () {
  console.log("Perform Mode");
  seq.mode.current = 3;
  notGridBtnLEDS[13] = LED_COLOR_OFF;
  notGridBtnLEDS[14] = LED_COLOR_OFF;
  notGridBtnLEDS[15] = LED_COLOR_OFF;
  notGridBtnLEDS[16] = STEP_NOTE_DRUM_PERF_SHIFT_REC_DIMYELLOW;
  updateAllNotGridBtnLEDS();
  updateAllGridBtnLEDs();
  clearOLEDmemMap();
  PlotStringToPixelMemMap("Perform", 0, 0, 32);
  PlotStringToPixelMemMap("MODE", 0, 36, 16);
  FireOLED_SendMemMap(0);
  seq.state.OLEDmemMapContents = "performMode";
};

// console.log(track[3].patterns.id_0);

seq.state = {};
seq.state.immediateTrackUpdates = true;
seq.state.playEnabled = false;
seq.state.playing = false;
seq.state.recEnabled = false;
seq.state.recording = false;
seq.state.mute = 0; // bit coded, B0001 - track one, B0010 - track 2, B0100 - track 3, B1000 track 4
seq.state.solo = 0;
seq.state.recArmed = 0;
seq.state.selectedTrack = 0; // selected track is 0-3 for the 4 tracks on the FIRE
seq.state.selectedTrackRange = 0; // index of first track of a group of four. i.e. "0" - is tracks 1,2,3,4
seq.state.selectedPatternIndex = 0;
seq.state.encoderBank = 0;
seq.state.shiftPressed = false;
seq.state.altPressed = false;
seq.state.encBeingTouched = 0;
seq.state.encLastTouched = 0;
seq.state.lastOLEDupdateTime = Date.now();
seq.state.OLEDmemMapContents = "";
seq.state.OLEDclearTimeout = setTimeout(function () {
  clearOLEDmemMap();
  FireOLED_SendMemMap();
}, 1000);
seq.state.firstLoopIteration = true;
seq.state.loopTimeMillis = Date.now();
seq.state.currentBPM = 120;
seq.state.currentBeatsPerMeasure = 4;
seq.state.gridBtnsPressedUpper = 0;
seq.state.gridBtnsPressedLower = 0;
seq.state.gridBtnsPressedLast = 0;

seq.state.menu = {};
seq.state.menu.entered = false;
seq.state.menu.currentLevel = 0;
seq.state.menu.timeOut = 0;
seq.state.menu.selectEncoderMode = 0;

seq.settings = {};
seq.settings.general = {};
seq.settings.general.OLEDtimeout = 5; // number of seconds to wait before clearing the OLED
seq.settings.midi = {};
seq.settings.midi.clockInEnabled = false;
seq.settings.midi.clockInSource = null;
seq.settings.encoders = {};
seq.settings.encoders.banks = "4BankMode";
seq.settings.encoders.global = true;
seq.settings.encoders.control = new Array(16);
let count = 1;
for (let q = 0; q < 16; q++) {
  seq.settings.encoders.control[q] = new Array(4);
  for (let r = 0; r < 4; r++) {
    seq.settings.encoders.control[q][r] = {};
    seq.settings.encoders.control[q][r].name = "CC# " + count;
    seq.settings.encoders.control[q][r].midiCC = count++;
    seq.settings.encoders.control[q][r].value = 0;
    seq.settings.encoders.control[q][r].midiCCtype = "rel1"; // abs, rel1 (127 = -1, 1 = +1), rel2 (63 = -1, 65 = +1), rel1Inv, rel2Inv
    seq.settings.encoders.control[q][r].midiOutPort = 5;
    seq.settings.encoders.control[q][r].midiOutChannel = 1;
    seq.settings.encoders.control[q][r].midiOutPortName = "MIDI Translator MIDI 7 ";
  }
}

seq.project = {};
seq.project.encoders = {};
seq.project.encoders.banks = "4BankMode";
seq.project.encoders.control = new Array(16);
count = 1;
for (let q = 0; q < 16; q++) {
  seq.project.encoders.control[q] = new Array(4);
  for (let r = 0; r < 4; r++) {
    seq.project.encoders.control[q][r] = {};
    seq.project.encoders.control[q][r].name = "CC# " + count;
    seq.project.encoders.control[q][r].midiCC = count++;
    seq.project.encoders.control[q][r].value = 0;
    seq.project.encoders.control[q][r].midiCCtype = "rel1"; // abs, rel1 (127 = -1, 1 = +1), rel2 (63 = -1, 65 = +1), rel1Inv, rel2Inv
    seq.project.encoders.control[q][r].midiOutPort = 5;
    seq.project.encoders.control[q][r].midiOutChannel = 1;
    seq.project.encoders.control[q][r].midiOutPortName = "MIDI Translator MIDI 7 ";
  }
}

/* #region  updateEncoderOutputPortIndexesByName() */
function updateEncoderOutputPortIndexesByName() {
  for (let w = 0; w < 16; w++) {
    for (let m = 0; m < 4; m++) {
      let foundGlobal = false;
      let foundProject = false;
      for (let i = 0; i < midiOutputDevices.length; i++) {
        if (typeof midiOutputDevicesNames[i] == "string") {
          if (midiOutputDevicesNames[i].includes(seq.settings.encoders.control[w][m].midiOutPortName)) {
            seq.settings.encoders.control[w][m].midiOutPort = i;
            foundGlobal = true;
          }
          if (midiOutputDevicesNames[i].includes(seq.project.encoders.control[w][m].midiOutPortName)) {
            seq.project.encoders.control[w][m].midiOutPort = i;
            foundProject = true;
          }
        }
      }
      if (!foundGlobal) {
        seq.settings.encoders.control[w][m].midiOutPort = null;
      }
      if (!foundProject) {
        seq.settings.encoders.control[w][m].midiOutPort = null;
      }
    }
  }
}
/* #endregion */


var yOffset = 0,
  xOffset = 0;

if ((process.argv[2] && process.argv[2] === '--debugLevel') && (process.argv[3])) {
  settings.debugLevel = parseInt(process.argv[3]);
} else if ((process.argv[2] && process.argv[2] === '-d') && (process.argv[3])) {
  settings.debugLevel = parseInt(process.argv[3]);
} else {
  settings.debugLevel = 0;
}


updateAllGridBtnLEDs();
updateAllNotGridBtnLEDS();

// By default, the device goes into Step Mode.
seq.mode.Step();
// fs.writeFileSync('dataObjFile.json', JSON.stringify(seq.track));
// loadGlobalData();

/**************************************************************************************
          Inter-Process Communications
**************************************************************************************/
ipc.config.id = 'nodeMidi';
ipc.config.retry = 1500;
ipc.config.silent = true;
var seqLoop_ipcSocket; // ipc socket for the seq_loop.js process.
var seqLoop_ipcIsEstablished = false;
var wifiControl = {
  ipcSocket: null,
  isEstablished: false
};

/* #region  ipc.serve(... */
ipc.serve(
  function () {
    ipc.server.on(
      'get-seq.track-Var',
      function (data, socket) {
        seqLoop_ipcSocket = socket;
        seqLoop_ipcIsEstablished = true;
        seq.state.playEnabled = true;
        ipc.server.emit(seqLoop_ipcSocket, 'seq.trackVar', seq.track);
        ipc.server.emit(seqLoop_ipcSocket, 'tempoChange', seq.state.currentBPM);
        console.log("SeqLoop client has connected.");
      }
    );
    ipc.server.on('wifiControlConnected', function (data, socket) {
      wifiControl.ipcSocket = socket;
      wifiControl.isEstablished = true;
      console.log("WiFi Control client has connected.");
      ipc.server.emit(wifiControl.ipcSocket,'scanForNetworks');
    })
    ipc.server.on('play-note', playNote);
    ipc.server.on('step', stepHighlight);
    ipc.server.on(
      'socket.disconnected',
      function (socket, destroyedSocketID) {
        if (socket == wifiControl.ipcSocket) {
          wifiControl.isEstablished = false;
          console.log("WiFi Control client disconnected.");
        } else if (socket == seqLoop_ipcSocket) {
          seqLoop_ipcIsEstablished = false;
          console.log("SeqLoop client disconnected.");
        }
      }
    );
  }
);

ipc.server.start();
/* #endregion */

/**************************************************************************************
@note playNote
**************************************************************************************/
/* #region   */
function playNote(eventData, socket = NULL) {
  // newTimingLogEntry("playnote : " + JSON.stringify(eventData));
  // console.log(eventData);

  if (settings.osType != "Windows_NT") {
    // console.log("playnote");
    let midiDevice = false;
    if (seq.track[eventData.track].outputIndex != null) {
      if (seq.track[eventData.track].outputType == "midi") {
        midiDevice = midiOutputDevices[seq.track[eventData.track].outputIndex];
      } else {
        // do thing for CV GATE output /** TODO: **/
      }
    } else {
      // do not output anything since outputIndex is null. This would mean that a device has not been selected.
      return;
    }
    // parse eventData and generate midi data
    let newMidiMessage = [0, 0, 0];
    newMidiMessage[0] = 0x90 + seq.track[eventData.track].channel;
    newMidiMessage[1] = eventData.event.data;
    newMidiMessage[2] = eventData.event.velocity;
    // send midi data to device associated with track
    if (midiDevice != false) {
      midiDevice.sendMessage(newMidiMessage);
    }
    newMidiMessage[0] = 0x80 + seq.track[eventData.track].channel;
    setTimeout(function () {
      if (midiDevice != false) {
        midiDevice.sendMessage(newMidiMessage);
      }
    }, eventData.lengthTime * 1000);
  }
  // newTimingLogEntry("playnote : '" + JSON.stringify(eventData) + "' : done");
}
/* #endregion */

/* #region  midiOutCC(...) */
function midiOutCC(midiDeviceIndex, channel, ccNum, ccData) {
  let midiDevice = false;
  if (midiDeviceIndex != null && midiDeviceIndex != false) {
    midiDevice = midiOutputDevices[midiDeviceIndex];
  } else {
    return false;
  }
  let newMidiMessage = [0, 0, 0];
  newMidiMessage[0] = 0xb0 + channel - 1;
  newMidiMessage[1] = ccNum;
  newMidiMessage[2] = ccData;
  if (midiDevice != false) {
    midiDevice.sendMessage(newMidiMessage);
  } else {
    return false;
  }
  return true;
}
/* #endregion */

let oldBtn = new Array(4);
for (let k = 0; k < 4; k++) {
  oldBtn[k] = 0;
}
// highlight the current step in the grid
/* #region  stepHighlight(stepNumber) */
function stepHighlight(stepNumber) {
  seq.state.playing = true;
  // console.log({
  //   stepNumber
  // });

  // need  to set grid button led colors to white for the step seq is on.
  // this should only be done for tracks whose patterns are in view of the current step.
  // i.e., if a track is 32 steps long and currentl showing steps 17-32, then that track
  // should get the step highligh when those steps would be playing. if a pattern is 8 steps,
  // it will be shown twice.
  if (seq.mode.current == 0) {

    for (let i = seq.state.selectedTrackRange; i < seq.state.selectedTrackRange + 4; i++) { // for each track in the slected range of tracks...
      let patternLengthForITrack = seq.track[i].patterns["id_" + seq.track[i].currentPattern].patLength; // alias for pat length
      let viewAreaForITrack = seq.track[i].patterns["id_" + seq.track[i].currentPattern].viewArea; // alias for viewArea
      let patternStep = stepNumber % patternLengthForITrack; // surrent with the current track's current pattern
      // patternIsViewable_16 is true if the current pattern step is greater than the lower limit and less than te upper limit od the viewale range.
      let patternIsViewable_16 = (patternStep < (16 * (viewAreaForITrack + 1))) && (patternStep >= (16 * viewAreaForITrack));
      // btn: between 0 and 63 inclusive for the button associated with the track / step we are on
      if (oldBtn[i] >= 0 && oldBtn[i] <= 63) { // if the current step is vieeabwle within the current pattern...
        // build a sysex message and send it to turn this btn white
        let sysEx = btnLEDSysEx;
        sysEx[7] = oldBtn[i];
        sysEx[8] = gridBtnLEDcolor.btn[oldBtn[i]].red;
        sysEx[9] = gridBtnLEDcolor.btn[oldBtn[i]].grn;
        sysEx[10] = gridBtnLEDcolor.btn[oldBtn[i]].blu;
        fireMidiOut.sendMessage(sysEx);
      }
      let btn = ((i - seq.state.selectedTrackRange) * 16) + (patternStep % 16);
      oldBtn[i] = btn;
      if (patternIsViewable_16) { // if the current step is vieeabwle within the current pattern...
        // build a sysex message and send it to turn this btn white
        let sysEx = btnLEDSysEx;
        sysEx[7] = btn;
        sysEx[8] = 127;
        sysEx[9] = 127;
        sysEx[10] = 127;
        fireMidiOut.sendMessage(sysEx);
      }
    }
  }
}
/* #endregion */

/***************************************************************************************

"on 'message' function"
"deltaTime" is the time since the last 'message'
"message" is an array of three byte that the message contained.
  message[0] - Midi event type (note-on, note-off, CC, etc.)
  message[1] - Midi data1 (note or CC number)
  message[2] - Midi data2 (velocity or CC data)

***************************************************************************************/

fireMidiIn.on('message', async function (deltaTime, message) {
  let selTrack = seq.track[seq.state.selectedTrack];
  let curPat = selTrack.patterns["id_" + selTrack.currentPattern];
  if (settings.flushedInput) { // make sure we ignore incoming messages until the input butffers have been flushed.
    // console.log(`m: ${message} d: ${deltaTime}`);
    // console.log({
    //   message
    // });
    // console.log({
    //   deltaTime
    // });
    // console.log(Date.now());
    // var hrTime = process.hrtime();
    // debug(hrTime[0] * 1000000 + hrTime[1] / 1000);
    switch (message[0]) {
      case 144: // note-on event
        if (message[1] >= 54 && message[1] <= 117) { // grid button
          let btnIndex = message[1] - 54; // 0 indexed id of button that was pressed
          // keep track of which button(s) gets pressed for use later
          if (btnIndex < 32) {
            seq.state.gridBtnsPressedLower |= 1 << btnIndex;
          } else {
            seq.state.gridBtnsPressedUpper |= 1 << (btnIndex - 32);
          }
          seq.state.gridBtnsPressedLast = btnIndex;
          if (seq.mode.current != 0) {
            // Dim the LED's of gridbutton when it is pressed.
            // create new dimmed values
            let dimColor = {};
            dimColor.red = gridBtnLEDcolor.btn[btnIndex].red / 15;
            dimColor.grn = gridBtnLEDcolor.btn[btnIndex].grn / 15;
            dimColor.blu = gridBtnLEDcolor.btn[btnIndex].blu / 15;
            dimColor.red &= 0x7f;
            dimColor.grn &= 0x7f;
            dimColor.blu &= 0x7f;
            // build sysex message
            btnLEDSysEx[7] = btnIndex;
            btnLEDSysEx[8] = dimColor.red;
            btnLEDSysEx[9] = dimColor.grn;
            btnLEDSysEx[10] = dimColor.blu;
            // send it to the Fire
            fireMidiOut.sendMessage(btnLEDSysEx);
            // This get undone when the note-off event is called.
          }
          // need to process note-on's from grid based upon the current sequencer mode.
          // seq.mode.current = 0;
          // seq.mode.names = ["Step", "Note", "Drum", "Perform", "Alt-Step"];
          switch (seq.mode.current) {
            case 0: // step mode
              let track = seq.track[seq.state.selectedTrackRange + ((btnIndex / 16) & 0xff)]; // determine which track is associated with row the button is on.
              if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                step = (btnIndex % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                  track.patterns["id_" + track.currentPattern].events["id_" + step].enabled = !track.patterns["id_" + track.currentPattern].events["id_" + step].enabled;
                }
                if (seqLoop_ipcIsEstablished) {
                  ipc.server.emit(seqLoop_ipcSocket, 'seq.trackVar', seq.track);
                }
              }
              updateAllGridBtnLEDs();
              displayTrackAndPatInfo(track, track.patterns["id_" + track.currentPattern]);
              seq.state.menu.selectEncoderMode = 10;
              break;
            case 1: // note mode
              /** TODO: **/
              break;
            case 2: // drum mode
              /** TODO: **/
              break;
            case 3: // perform mode
              /** TODO: **/
              break;
            case 4: // alt-step mode
              /** TODO: **/
              break;
          }
        }
        // let newMessage = [0xB0, 0, 0];
        switch (message[1]) {
          case 53: // rec button
            clearOLEDmemMap();
            PlotStringToPixelMemMap("REC", 0, 0, 32, 2);

            /** TODO: **/
            // make rec mode work

            PlotStringToPixelMemMap("Not working.", 0, 35, 16, 1);
            seq.state.OLEDmemMapContents = "REC";
            FireOLED_SendMemMap();
            if (seqLoop_ipcIsEstablished) {
              ipc.server.emit(seqLoop_ipcSocket, 'seqRec');
            }
            break;
          case 52: // stop button
            seq.state.playing = false;
            clearOLEDmemMap();
            PlotStringToPixelMemMap("STOP", 0, 0, 32, 2);
            seq.state.OLEDmemMapContents = "STOP";
            FireOLED_SendMemMap(0);
            notGridBtnLEDS[PLAY_BTN_LED] = PATSONG_PLAY_DIMYELLOW;
            updateAllNotGridBtnLEDS();
            if (seqLoop_ipcIsEstablished) {
              ipc.server.emit(seqLoop_ipcSocket, 'seqStop');
            }
            updateAllGridBtnLEDs();
            break;
          case 51: // play button
            clearOLEDmemMap();
            PlotStringToPixelMemMap("PLAY", 0, 0, 32, 2);
            seq.state.OLEDmemMapContents = "PLAY";
            FireOLED_SendMemMap(0);
            notGridBtnLEDS[PLAY_BTN_LED] = PATSONG_PLAY_GREEN;
            updateAllNotGridBtnLEDS();
            if (seqLoop_ipcIsEstablished && seq.state.playEnabled) {
              ipc.server.emit(seqLoop_ipcSocket, 'seqPlay', seq.state.currentBeatsPerMeasure);
            }else if(!seqLoop_ipcIsEstablished){
              console.log("Cannot play because the SeqLoop client is not connectd.");
            }else if(!seq.state.playEnabled){
              console.log("Cannot play because the play function has been disabled.");
            }
            break;
          case 50: // pat/song button
            // PlotStringToPixelMemMap(String.fromCharCode(CHARCODE_LEFTARROW, CHARCODE_RIGHTARROW), PlotStringToPixelMemMap(String.fromCharCode(CHARCODE_UPARROW, CHARCODE_DOWNARROW), 0, 0, 16, 2, 0), 0, 16, 2, 0);
            // FireOLED_SendMemMap(0);
            break;
          case 49: // alt button
            // when rpeseed, set alt flag
            seq.state.altPressed = true;

            /** TODO: **/
            // Need to light up only the buttons that have alt function
            break;
          case 48: // shift button
            // when pressed, set shift flag
            seq.state.shiftPressed = true;

            /** TODO: **/
            // Need to light up only the buttons that have shift function
            break;
          case 47: // Perform button
            seq.mode.Perform();
            break;
          case 46: // Drum button
            seq.mode.Drum();
            break;
          case 45: // Note button
            seq.mode.Note();
            break;
          case 44: // step button
            if (seq.state.altPressed) {
              seq.mode.altStep();
            } else {
              seq.mode.Step();
            }
            break;
          case 39: // track four mute/solo button
          case 38: // track three mute/solo button
          case 37: // track two mute/solo button
          case 36: // track one mute/solo button
            soloMuteTrackSelectUpdate(message[1] - 36);
            break;
          case 35: // grid right /** TODO: **/
            // non-shift, non-alt  
            // shift grid right by 16 steps for current selected track and pattern, unless it is at the end of the pattern.
            selTrack = seq.track[seq.state.selectedTrack];
            curPat = selTrack.patterns["id_" + selTrack.currentPattern];
            // console.log(selTrack.patterns["id_"+selTrack.currentPattern]);
            if (!seq.state.shiftPressed && !seq.state.altPressed) {
              if (curPat.patLength / 16 > curPat.viewArea + 1) {
                curPat.viewArea++;
              }
            } else if (seq.state.shiftPressed && !seq.state.altPressed) { // +shift
              // add one step to the selected pattern for the selected track
              curPat.addEventsAtEndOfPattern(1);
              if (curPat.patLength / 16 > curPat.viewArea + 1) {
                curPat.viewArea++;
              }
            } else if (seq.state.altPressed && !seq.state.shiftPressed) { // +alt
              // add 4 steps (one beat) to the sel pat and sel track
              curPat.addEventsAtEndOfPattern(4);
              if (curPat.patLength / 16 > curPat.viewArea + 1) {
                curPat.viewArea++;
              }
            } else {

            }
            updateAllGridBtnLEDs();
            displayTrackAndPatInfo(seq.track[seq.state.selectedTrack], seq.track[seq.state.selectedTrack].patterns["id_" + seq.track[seq.state.selectedTrack].currentPattern]);
            break;
          case 34: // grid left /** TODO: **/
            // non-shift, non-alt  
            // shift grid left by 16 steps for current selected track and pattern, unless it is at the end of the pattern.
            selTrack = seq.track[seq.state.selectedTrack];
            curPat = selTrack.patterns["id_" + selTrack.currentPattern];
            // console.log(selTrack.patterns["id_"+selTrack.currentPattern]);
            if (!seq.state.shiftPressed && !seq.state.altPressed) {
              if (curPat.viewArea > 0) {
                curPat.viewArea--;
              }
            } else if (seq.state.shiftPressed && !seq.state.altPressed && curPat.patLength > 1) { // +shift
              // remove one step from the selected pattern for the selected track
              curPat.removeEvent(curPat.patLength - 1);
            } else if (seq.state.altPressed && !seq.state.shiftPressed && curPat.patLength > 4) { // +alt
              // remove 4 steps (one beat) from the sel pat and sel track
              curPat.removeEvent(curPat.patLength - 1);
              curPat.removeEvent(curPat.patLength - 1);
              curPat.removeEvent(curPat.patLength - 1);
              curPat.removeEvent(curPat.patLength - 1);
            }
            if (curPat.viewArea >= curPat.patLength / 16) {
              curPat.viewArea--;
            }
            updateAllGridBtnLEDs();
            displayTrackAndPatInfo(seq.track[seq.state.selectedTrack], seq.track[seq.state.selectedTrack].patterns["id_" + seq.track[seq.state.selectedTrack].currentPattern]);
            break;
          case 33: // browser button 
            // seq.state.immediateTrackUpdates = !seq.state.immediateTrackUpdates;
            // ipc.server.emit(seqLoop_ipcSocket,'setITU', seq.state.immediateTrackUpdates);

            /** TODO: **/
            // figure out somethig to use this button for
            // no seriously, what can it be used for?
            // writeTimingLogToFile();

            break;
          case 32: // pattern down button /** TODO: **/
            selTrack = seq.track[seq.state.selectedTrack];
            curPat = selTrack.patterns["id_" + selTrack.currentPattern];
            // non-shift, non-alt
            // change selected pattern for selected track to -1
            if (!seq.state.shiftPressed && !seq.state.altPressed && selTrack.currentPattern > 0) {
              selTrack.currentPattern--;
            } else if (seq.state.shiftPressed && !seq.state.altPressed) { // +shift
              // change selected pat for all track to -1
            } else if (seq.state.altPressed && seq.state.shiftPressed) { // +alt + shift
              // remove current pattern from selcted track

            }

            // Need to display the selected pattern number when it changes
            displayTrackAndPatInfo(selTrack, selTrack.patterns["id_" + selTrack.currentPattern]);
            updateAllGridBtnLEDs();
            break;
          case 31: // pattern up button
            selTrack = seq.track[seq.state.selectedTrack];
            curPat = selTrack.patterns["id_" + selTrack.currentPattern];
            // non-shift, non-alt
            // change selected pattern for selected track to +1
            // if (!seq.state.shiftPressed && !seq.state.altPressed && selTrack.currentPattern < selTrack.patternIdIndex - 1) {
            if (!seq.state.shiftPressed && !seq.state.altPressed && selTrack.currentPattern < selTrack.getNumberOfPatterns() - 1) {
              selTrack.currentPattern++;
            } else if (seq.state.shiftPressed && !seq.state.altPressed) { // +shift
              // change selected pat for all track to +1
            } else if (seq.state.altPressed && seq.state.shiftPressed) { // +alt + shift
              // add pattern to current selected track
              selTrack.addPattern(16, seq.state.currentBPM, 4);
              selTrack.currentPattern = selTrack.getNumberOfPatterns() - 1;
            }

            // Need to display the selected pattern number when it changes
            displayTrackAndPatInfo(selTrack, selTrack.patterns["id_" + selTrack.currentPattern]);
            updateAllGridBtnLEDs();
            break;
          case 26: // encoder bank button
            // timout to reset back to bank 0 or 1
            seq.state.encoderBank++;
            setEncoderBankLEDs();
            break;
          case 25: // @note Select button

            /** TODO: **/
            /** 
             * 
             * needs logic to determine if grid btn is pressed, or encoder is touched and to activate the appropriate menu
             * should only do grid btn logic when in step mode
             * 
             * when pressed with no other buttons pressed, should do menu for changing things like
             * tempo, viewable track range, etc when in step mode
             * note layout, steps viewable, etc when in note mode
             * 
             */

            // console.log(seq.state.menu.selectEncoderMode);

            if (seq.state.shiftPressed && !seq.state.menu.entered) { // enter the main menu
              // enter the menu
              console.log("Entering main menu");
              seq.state.menu.entered = true;
              clearTimeout(seq.state.menu.timeOut);
              seq.state.menu.timeOut = setTimeout(() => {
                clearOLEDmemMap();
                FireOLED_SendMemMap();
                seq.state.menu.entered = false;
              }, 5000);
              settingsMenu(0, 16, settingsMainMenu);
            } else if (seq.state.shiftPressed && seq.state.menu.entered) {
              seq.state.menu.timeOut.refresh();
              settingsMenu(4, 16);
            } else if (seq.state.menu.entered) {
              seq.state.menu.timeOut.refresh();
              settingsMenu(3, 16);
            } else {
              if (seq.state.encBeingTouched != 0) {
                // console.log("Entering encders menu");

                seq.state.menu.entered = true;;
                seq.state.menu.timeOut = setTimeout(() => {
                  clearOLEDmemMap();
                  FireOLED_SendMemMap();
                  seq.state.menu.entered = false;
                }, 5000);
                // console.log(typeof encodersMenu);

                settingsMenu(0, 16, encodersMenu);
              } else {
                // cycle through non menu options
                seq.state.menu.selectEncoderMode++;
                if (seq.state.menu.selectEncoderMode >= 0 && seq.state.menu.selectEncoderMode < 10) {
                  if (seq.state.menu.selectEncoderMode >= 3) {
                    seq.state.menu.selectEncoderMode = 0;
                  }
                  clearOLEDmemMap();
                  PlotStringToPixelMemMap("Encoder:", 0, 0, 24, 1);
                  if (seq.state.menu.selectEncoderMode == 0) {
                    PlotStringToPixelMemMap("TrackRange", 0, 26, 24, 1);
                  } else if (seq.state.menu.selectEncoderMode == 1) {
                    PlotStringToPixelMemMap("BPM", 0, 26, 24, 1);
                  } else if (seq.state.menu.selectEncoderMode == 2) {
                    PlotStringToPixelMemMap("Beat/Measure", 0, 26, 24, 1);
                  }
                  FireOLED_SendMemMap();
                } else if (seq.state.menu.selectEncoderMode >= 10 && seq.state.menu.selectEncoderMode < 20) {
                  if (seq.state.menu.selectEncoderMode > 14) { ///////////
                    seq.state.menu.selectEncoderMode = 11;
                  }
                  clearOLEDmemMap();
                  let track = seq.track[seq.state.selectedTrackRange + ((seq.state.gridBtnsPressedLast / 16) & 0xff)]; // determine which track is associated with row the button is on.
                  if (seq.state.menu.selectEncoderMode == 11) {
                    let noteVal = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        noteVal = track.patterns["id_" + track.currentPattern].events["id_" + step].data;
                        PlotStringToPixelMemMap("Note Value: " + noteVal.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(scales.noteNamesFlats[noteVal % 12] + (Math.ceil((noteVal - 20) / 12)), 0, 20, 32, 2);
                  } else if (seq.state.menu.selectEncoderMode == 12) {
                    let noteVelocity = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        noteVelocity = track.patterns["id_" + track.currentPattern].events["id_" + step].velocity;
                        PlotStringToPixelMemMap("Note Velocity: " + noteVelocity.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteVelocity.toString(), 0, 20, 32, 2);
                  } else if (seq.state.menu.selectEncoderMode == 13) {
                    let noteLength = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        noteLength = track.patterns["id_" + track.currentPattern].events["id_" + step].length;
                        PlotStringToPixelMemMap("Note Length: " + noteLength.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteLength.toString(), 0, 20, 32, 2);
                  } else if (seq.state.menu.selectEncoderMode == 14) {
                    let noteStartOffset = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        noteStartOffset = track.patterns["id_" + track.currentPattern].events["id_" + step].startTimePatternOffset;
                        PlotStringToPixelMemMap("Note Start Offset: " + noteStartOffset.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteStartOffset.toString(), 0, 20, 32, 2);
                  } else {
                    seq.state.menu.selectEncoderMode = 10;
                  }
                  FireOLED_SendMemMap();
                }
              }
            }
            break;
          case 19: // @note encoder 4 touch
          case 18: // encoder 3 touch
          case 17: // encoder 2 touch
          case 16: // encoder 1 touch
            if (seq.state.encBeingTouched == 0 || seq.state.encBeingTouched == message[1]) {
              seq.state.encBeingTouched = message[1];
              seq.state.encLastTouched = message[1];
              encoderTouch(message[1] - 16);
            }
            break;
        }
        break;
      case 128: // @note note-off event
        if (message[1] >= 54 && message[1] <= 117) { // grid button
          let btnIndex = message[1] - 54;

          if (btnIndex < 32) {
            seq.state.gridBtnsPressedLower &= ~(1 << btnIndex);
          } else {
            seq.state.gridBtnsPressedUpper &= ~(1 << (btnIndex - 32));
          }
          btnLEDSysEx[7] = btnIndex;
          btnLEDSysEx[8] = (gridBtnLEDcolor.btn[btnIndex].red) & 0x7F;
          btnLEDSysEx[9] = (gridBtnLEDcolor.btn[btnIndex].grn) & 0x7F;
          btnLEDSysEx[10] = (gridBtnLEDcolor.btn[btnIndex].blu) & 0x7F;
          fireMidiOut.sendMessage(btnLEDSysEx);
          seq.state.menu.selectEncoderMode = 0;
        }
        switch (message[1]) {
          /** TODO: **/
          // add necessary logic for tracking currently pressed buttons

          case 53: // rec button
            break;
          case 52: // stop button
            break;
          case 51: // play button
            break;
          case 50: // pat/song button
            break;
          case 49: // alt button
            // when rpeseed, set alt flag and highlight button leds that have alt function
            seq.state.altPressed = false;
            updateAllNotGridBtnLEDS();
            break;
          case 48: // shift button
            // when pressed, set shift flag and highlight button LEDs that have shift function
            seq.state.shiftPressed = false;
            updateAllNotGridBtnLEDS();
            break;
          case 47: // Perform button
            break;
          case 46: // Drum button
            break;
          case 45: // Note button
            break;
          case 44: // step button
            break;
          case 39: // track four mute/solo button
            break;
          case 38: // track three mute/solo button
            break;
          case 37: // track two mute/solo button
            break;
          case 36: // track one mute/solo button
            break;
          case 35: // grid right
            break;
          case 34: // grid left
            break;
          case 33: // browser button
            break;
          case 32: // pattern down button
            break;
          case 31: // pattern up button
            break;
          case 26: // encoder bank button
            break;
          case 25: // Select button
            break;
          case 19: // encoder 4 touch
          case 18: // encoder 3 touch
          case 17: // encoder 2 touch
          case 16: // encoder 1 touch
            if (seq.state.encBeingTouched == message[1]) {
              seq.state.encBeingTouched = 0;
            }
            break;
        }
        break;
      case 176: // @note CC event
        switch (message[1]) {
          case 118: // select encoder
            if (message[2] == 127) {
              // @note select encoder down
              // console.log("down");
              if (seq.state.menu.entered && seq.state.encBeingTouched == 0) {
                // draw the menu items
                seq.state.menu.timeOut.refresh();
                settingsMenu(1, 16);
              } else if (seq.state.menu.entered && seq.state.encBeingTouched != 0) {
                seq.state.menu.timeOut.refresh();
                settingsMenu(1, 16);
              } else {
                // console.log("display track range + down");
                // console.log(seq.state.selectedTrackRange);
                if (seq.state.menu.selectEncoderMode == 0) {
                  if (seq.state.selectedTrackRange < seq.track.length - 4) {
                    seq.state.selectedTrackRange++;
                    seq.state.selectedTrack++;
                  }
                  updateAllNotGridBtnLEDS();
                  updateAllGridBtnLEDs();
                  selTrack = seq.track[seq.state.selectedTrack];
                  curPat = selTrack.patterns["id_" + selTrack.currentPattern];
                  displayTrackAndPatInfo(selTrack, curPat);
                } else if (seq.state.menu.selectEncoderMode == 1) {
                  if (seq.state.currentBPM > 20) {
                    seq.state.currentBPM--;
                  }
                  // console.log(seq.state.currentBPM);
                  if (seqLoop_ipcIsEstablished) {
                    ipc.server.emit(seqLoop_ipcSocket, 'tempoChange', seq.state.currentBPM);
                  }
                  clearOLEDmemMap();
                  PlotStringToPixelMemMap("BPM:", 0, 0, 32, 2);
                  PlotStringToPixelMemMap(seq.state.currentBPM.toString(), 0, 36, 24, 2);
                  FireOLED_SendMemMap();
                } else if (seq.state.menu.selectEncoderMode == 2) {
                  if (seq.state.currentBeatsPerMeasure > 2) {
                    seq.state.currentBeatsPerMeasure--;
                  }
                  // console.log(seq.state.currentBPM);
                  // ipc.server.emit(seqLoop_ipcSocket, 'tempoChange', seq.state.currentBPM);
                  clearOLEDmemMap();
                  PlotStringToPixelMemMap("Beats / Measure:", 0, 0, 24, 2);
                  PlotStringToPixelMemMap(seq.state.currentBeatsPerMeasure.toString(), 0, 36, 24, 2);
                  FireOLED_SendMemMap();
                } else if (seq.state.menu.selectEncoderMode >= 10 && seq.state.menu.selectEncoderMode < 20) {
                  clearOLEDmemMap();
                  let track = seq.track[seq.state.selectedTrackRange + ((seq.state.gridBtnsPressedLast / 16) & 0xff)]; // determine which track is associated with row the button is on.
                  if (seq.state.menu.selectEncoderMode == 11) {
                    let noteVal = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        if (track.patterns["id_" + track.currentPattern].events["id_" + step].data > 0) {
                          noteVal = --track.patterns["id_" + track.currentPattern].events["id_" + step].data;
                        } else {
                          noteVal = track.patterns["id_" + track.currentPattern].events["id_" + step].data;
                        }
                        PlotStringToPixelMemMap("Note Value: " + noteVal.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(scales.noteNamesFlats[noteVal % 12] + (Math.ceil((noteVal - 20) / 12)), 0, 20, 32, 2);
                  } else if (seq.state.menu.selectEncoderMode == 12) { // change note velocity
                    let noteVelocity = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        if (track.patterns["id_" + track.currentPattern].events["id_" + step].velocity > 0) {
                          noteVelocity = --track.patterns["id_" + track.currentPattern].events["id_" + step].velocity;
                        } else {
                          noteVelocity = track.patterns["id_" + track.currentPattern].events["id_" + step].velocity;
                        }
                        PlotStringToPixelMemMap("Note Velocity: " + noteVelocity.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteVelocity.toString(), 0, 20, 32, 2);
                  } else if (seq.state.menu.selectEncoderMode == 13) { // change note length
                    let noteLength = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        if (track.patterns["id_" + track.currentPattern].events["id_" + step].length > 0) {
                          track.patterns["id_" + track.currentPattern].events["id_" + step].length -= 5;
                          noteLength = track.patterns["id_" + track.currentPattern].events["id_" + step].length;
                        } else {
                          noteLength = track.patterns["id_" + track.currentPattern].events["id_" + step].length;
                        }
                        PlotStringToPixelMemMap("Note Length: " + noteLength.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteLength.toString(), 0, 20, 32, 2);

                  } else if (seq.state.menu.selectEncoderMode == 14) { // change note starttime offset
                    let noteStartOffset = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        noteStartOffset = --track.patterns["id_" + track.currentPattern].events["id_" + step].startTimePatternOffset;
                        PlotStringToPixelMemMap("Note Start Offset: " + noteStartOffset.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteStartOffset.toString(), 0, 20, 32, 2);

                  }
                  FireOLED_SendMemMap();
                }
                if (seq.state.menu.selectEncoderMode < 10 && seq.state.altPressed) {
                  seq.track.push(new defaultTrack());
                  seq.track[seq.track.length - 1].addPattern(16, 110, 4);
                  seq.track[seq.track.length - 1].updateOutputIndex();
                }

              }
            } else if (message[2] == 1) {


              // @note select encoder up
              // console.log("up");
              if (seq.state.menu.entered && seq.state.encBeingTouched == 0) {
                seq.state.menu.timeOut.refresh();
                settingsMenu(2, 16);
              } else if (seq.state.menu.entered && seq.state.encBeingTouched != 0) {
                seq.state.menu.timeOut.refresh();
                settingsMenu(2, 16);
              } else {
                // console.log("display track range + up");
                if (seq.state.menu.selectEncoderMode == 0) { // selected track range up
                  if (seq.state.selectedTrackRange > 0) {
                    seq.state.selectedTrackRange--;
                    seq.state.selectedTrack--;
                  }
                  updateAllNotGridBtnLEDS();
                  updateAllGridBtnLEDs();
                  selTrack = seq.track[seq.state.selectedTrack];
                  curPat = selTrack.patterns["id_" + selTrack.currentPattern];
                  displayTrackAndPatInfo(selTrack, curPat);
                } else if (seq.state.menu.selectEncoderMode == 1) { // BPM up
                  if (seq.state.currentBPM < 280) {
                    seq.state.currentBPM++;
                  }
                  // console.log(seq.state.currentBPM);
                  if (seqLoop_ipcIsEstablished) {
                    ipc.server.emit(seqLoop_ipcSocket, 'tempoChange', seq.state.currentBPM);
                  }
                  clearOLEDmemMap();
                  PlotStringToPixelMemMap("BPM:", 0, 0, 32, 2);
                  PlotStringToPixelMemMap(seq.state.currentBPM.toString(), 0, 36, 24, 2);
                  FireOLED_SendMemMap();
                } else if (seq.state.menu.selectEncoderMode == 2) {
                  if (seq.state.currentBeatsPerMeasure < 16) {
                    seq.state.currentBeatsPerMeasure++;
                  }
                  // console.log(seq.state.currentBPM);
                  // ipc.server.emit(seqLoop_ipcSocket, 'tempoChange', seq.state.currentBPM);
                  clearOLEDmemMap();
                  PlotStringToPixelMemMap("Beats / Measure:", 0, 0, 24, 2);
                  PlotStringToPixelMemMap(seq.state.currentBeatsPerMeasure.toString(), 0, 36, 24, 2);
                  FireOLED_SendMemMap();
                } else if (seq.state.menu.selectEncoderMode >= 10 && seq.state.menu.selectEncoderMode < 20) {
                  clearOLEDmemMap();
                  let track = seq.track[seq.state.selectedTrackRange + ((seq.state.gridBtnsPressedLast / 16) & 0xff)]; // determine which track is associated with row the button is on.
                  if (seq.state.menu.selectEncoderMode == 11) { // change note value
                    let noteVal = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        if (track.patterns["id_" + track.currentPattern].events["id_" + step].data < 127) {
                          noteVal = ++track.patterns["id_" + track.currentPattern].events["id_" + step].data;
                        } else {
                          noteVal = track.patterns["id_" + track.currentPattern].events["id_" + step].data;
                        }
                        PlotStringToPixelMemMap("Note Value: " + noteVal.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(scales.noteNamesFlats[noteVal % 12] + (Math.ceil((noteVal - 20) / 12)), 0, 20, 32, 2);
                  } else if (seq.state.menu.selectEncoderMode == 12) { // change note velocity
                    let noteVelocity = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        if (track.patterns["id_" + track.currentPattern].events["id_" + step].velocity < 127) {
                          noteVelocity = ++track.patterns["id_" + track.currentPattern].events["id_" + step].velocity;
                        } else {
                          noteVelocity = track.patterns["id_" + track.currentPattern].events["id_" + step].velocity;
                        }
                        PlotStringToPixelMemMap("Note Velocity: " + noteVelocity.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteVelocity.toString(), 0, 20, 32, 2);
                  } else if (seq.state.menu.selectEncoderMode == 13) { // change note length
                    let noteLength = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        if (track.patterns["id_" + track.currentPattern].events["id_" + step].length < 500) {
                          track.patterns["id_" + track.currentPattern].events["id_" + step].length += 5;
                          noteLength = track.patterns["id_" + track.currentPattern].events["id_" + step].length;
                        } else {
                          noteLength = track.patterns["id_" + track.currentPattern].events["id_" + step].length;
                        }
                        PlotStringToPixelMemMap("Note Length: " + noteLength.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteLength.toString(), 0, 20, 32, 2);
                  } else if (seq.state.menu.selectEncoderMode == 14) { // change note starttime offset
                    let noteStartOffset = 0;
                    if (track.patterns["id_" + track.currentPattern].patIsStepBased) {
                      step = (seq.state.gridBtnsPressedLast % 16) + (track.patterns["id_" + track.currentPattern].viewArea * 16); // step in the row
                      if (track.patterns["id_" + track.currentPattern].events["id_" + step] != undefined) {
                        noteStartOffset = ++track.patterns["id_" + track.currentPattern].events["id_" + step].startTimePatternOffset;
                        PlotStringToPixelMemMap("Note Start Offset: " + noteStartOffset.toString(), 0, 0, 16, 1);
                      }
                    }
                    PlotStringToPixelMemMap(noteStartOffset.toString(), 0, 20, 32, 2);
                  }
                  FireOLED_SendMemMap();
                }
              }
            } else {
              // non useful
            }
            sendTrackUpdateToSeqLoop();
            break;
          case 19: // @note encBank #4
            encBankUpdate(3, message[2]);
            break;
          case 18: // @note encBank #3
            encBankUpdate(2, message[2]);
            break;
          case 17: // @note encBank #2
            encBankUpdate(1, message[2]);
            break;
          case 16: // @note encBank #1
            encBankUpdate(0, message[2]);
            break;
        }
        break;
      default:
        console.log("event not recognised");
    }
  }
});

function soloMuteTrackSelectUpdate(buttonIdex = null) {
  let selTrack = seq.track[seq.state.selectedTrack];
  let curPat = selTrack.patterns["id_" + selTrack.currentPattern];
  if (seq.state.altPressed) {
    seq.state.selectedTrack = buttonIdex + seq.state.selectedTrackRange;
  } else if (seq.state.shiftPressed) {
    if (!seq.track[seq.state.selectedTrackRange + buttonIdex].solo) {
      seq.track.forEach(function (track, i) {
        if (i != seq.state.selectedTrackRange + buttonIdex) {
          track.mute = true;
          track.solo = false;
        } else {
          track.mute = false;
          track.solo = true;
        }
      });
    } else {
      seq.track.forEach(function (track, i) {
        track.mute = false;
        track.solo = false;
      });
    }
  } else {
    seq.track[seq.state.selectedTrackRange + buttonIdex].mute = !seq.track[seq.state.selectedTrackRange + buttonIdex].mute;
  }
  // ipc.server.emit(seqLoop_ipcSocket, 'seq.trackVar', seq.track);
  sendTrackUpdateToSeqLoop();
  updateAllNotGridBtnLEDS();
  selTrack = seq.track[seq.state.selectedTrack];
  curPat = selTrack.patterns["id_" + selTrack.currentPattern];
  displayTrackAndPatInfo(selTrack, curPat);
}

function sendTrackUpdateToSeqLoop() {
  if (sendTrackUpdateToSeqLoop.lastUpdate === "undefined") {
    sendTrackUpdateToSeqLoop.lastUpdate = Date.now();
  }
  let timeMillis = Date.now();
  if (timeMillis - sendTrackUpdateToSeqLoop.lastUpdate < 250) {
    return;
  }
  sendTrackUpdateToSeqLoop.lastUpdate = Date.now();
  setTimeout(() => {
    ipc.server.emit(seqLoop_ipcSocket, 'seq.trackVar', seq.track);
  }, 250);
}

function encoderTouch(encIndex = null) {
  let globalOrProject = seq.settings.encoders.global ? "settings" : "project";
  clearOLEDmemMap();
  // }
  name = seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].name;
  // console.log(name);
  PlotStringToPixelMemMap(seq.settings.encoders.global ? "Glbl Ctrl Name:" : "Controller Name:", 0, 0, 16);
  PlotStringToPixelMemMap(name, 0, 20, 16);
  if (typeof seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value == "string") {
    PlotStringToPixelMemMap(seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value + "    ", 0, 40, 16);
  } else {
    PlotStringToPixelMemMap(seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value.toString() + "    ", 0, 40, 16);
  }
  FireOLED_SendMemMap(0);
  seq.state.OLEDmemMapContents = "encoder" + (encIndex + 16);
}


function encBankUpdate(encIndex = null, mesTwo = null) {
  if (encIndex != null && mesTwo != null) {
    let globalOrProject = seq.settings.encoders.global ? "settings" : "project";
    selEnc = seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex];
    // abs, rel1 (127 = -1, 1 = +1), rel2 (63 = -1, 65 = +1), rel1Inv, rel2Inv
    switch (seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].midiCCtype) {
      case "abs":
        if (mesTwo >= 1 && mesTwo < 10) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value += mesTwo;
          if (seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value > 127) {
            seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = 127;
          }
          // send value to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, selEnc.value);
        } else if (mesTwo <= 127 && mesTwo > 100) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value -= (128 - mesTwo);
          if (seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value < 0) {
            seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = 0;
          }
          // send value to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, selEnc.value);
        }
        break;
      case "rel1":
        if (mesTwo >= 1 && mesTwo < 10) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = "CC Up    ";
          // send value of 1 to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, 1);
        } else if (mesTwo <= 127 && mesTwo > 100) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = "CC Down";
          // send value of 127 to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, 127);
        }
        break;
      case "rel2":
        if (mesTwo >= 1 && mesTwo < 10) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = "CC Up    ";
          // send value of 65 to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, 65);
        } else if (mesTwo <= 127 && mesTwo > 100) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = "CC Down";
          // send value of 63 to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, 63);
        }
        break;
      case "rel1Inv":
        if (mesTwo >= 1 && mesTwo < 10) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = "CC Up    ";
          // send value of 127 to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, 127);
        } else if (mesTwo <= 127 && mesTwo > 100) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = "CC Down";
          // send value of 1 to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, 1);
        }
        break;
      case "rel2Inv":
        if (mesTwo >= 1 && mesTwo < 10) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = "CC Up    ";
          // send value of 63 to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, 63);
        } else if (mesTwo <= 127 && mesTwo > 100) {
          seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value = "CC Down";
          // send value of 65 to CC
          midiOutCC(selEnc.midiOutPort, selEnc.midiOutChannel, selEnc.midiCC, 65);
        }
        break;
      default:
    }
    if (seq.state.encBeingTouched == encIndex + 16 && !seq.state.menu.entered) {
      if (typeof seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value == "string") {
        PlotStringToPixelMemMap(seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value + "    ", 0, 40, 16);
      } else {
        PlotStringToPixelMemMap(seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value.toString() + "    ", 0, 40, 16);
      }
      FireOLED_SendMemMap(8);
    }
  }
}

function displayTrackAndPatInfo(track, pat) {
  // newTimingLogEntry("displaying track and pat info");
  clearOLEDmemMap();
  PlotStringToPixelMemMap("Track #: " + (track.num + 1), 0, 0, 16);
  PlotStringToPixelMemMap(track.trackName, 0, 16, 16);
  PlotStringToPixelMemMap("Pattern #: " + (track.currentPattern + 1), 0, 32, 16);
  PlotStringToPixelMemMap("Pattern length: " + pat.patLength, 0, 48, 16);
  FireOLED_SendMemMap(0);
  // newTimingLogEntry("displaying track and pat info : done"); // 27ms
}

function setEncoderBankLEDs() {
  if (seq.settings.encoders.global) {
    if (seq.settings.encoders.banks == "4BankMode") {
      if (seq.state.encoderBank >= 4) {
        seq.state.encoderBank = 0;
      }
      notGridBtnLEDS[23] = seq.state.encoderBank;
    }
    if (seq.settings.encoders.banks == "16BankMode") {
      if (seq.state.encoderBank == 16) {
        seq.state.encoderBank = 0;
      }
      notGridBtnLEDS[23] = seq.state.encoderBank + 16;
    }
  } else {
    if (seq.project.encoders.banks == "4BankMode") {
      if (seq.state.encoderBank >= 4) {
        seq.state.encoderBank = 0;
      }
      notGridBtnLEDS[23] = seq.state.encoderBank;
    }
    if (seq.project.encoders.banks == "16BankMode") {
      if (seq.state.encoderBank == 16) {
        seq.state.encoderBank = 0;
      }
      notGridBtnLEDS[23] = seq.state.encoderBank + 16;
    }
  }
  updateAllNotGridBtnLEDS();
}

/**************************************************************************************************

     Plot a string of characters as glyphs into Bitmap Memory Map

     paramters:
      inString - string of character to plot
      xOrigin - x coordinate of starting point
      yOrigin - ^^^
      heightPx - Height in pixels that the text should be printed in. accepts 16, 24, or 32
      spacing - space in pixels between characters
      invert - 0 or none for normal, 1 for inverted color

    returns:
      cursor position on x-axis after plotting string

**************************************************************************************************/
function PlotStringToPixelMemMap(inString, xOrigin, yOrigin, heightPx, spacing = 1, invert = false) {
  // newTimingLogEntry("PlotStringToPixelMemMap : "+inString);
  let font;
  switch (heightPx) {
    case 16:
      font = bitmaps.font_16px;
      break;
    case 24:
      font = bitmaps.font_24px;
      break;
    case 32:
      font = bitmaps.font_32px;
      break;
    default:
      font = bitmaps.font_16px;
      heightPx = 16;
  }
  let cursor = xOrigin;
  for (let i = 0; i < inString.length; i++) {
    // get the width of the character from the array. Its the last value in each array.
    if (typeof inString != "string") {
      inString = inString.toString();
    }
    let currentCharWidth = font[inString.charCodeAt(i) - 32][font[inString.charCodeAt(i) - 32].length - 1];
    let currentCharData = font[inString.charCodeAt(i) - 32];
    PlotBitmapToPixelMemmap(currentCharData, cursor, yOrigin, currentCharWidth, heightPx, invert ? 1 : 0);
    cursor += currentCharWidth;
    if (font[inString.charCodeAt(i + 1) - 32] != undefined) { // If there are still characters in the string to plot
      if (cursor + spacing + (font[inString.charCodeAt(i + 1) - 32][font[inString.charCodeAt(i + 1) - 32].length - 1]) > 127) {
        break;
      }
    }
    if (spacing > 0) {
      let spaceBitmap = new Array(Math.ceil(spacing / 8) * heightPx);
      for (let g = 0; g < spaceBitmap.length; g++) {
        spaceBitmap[g] = 0;
      }
      PlotBitmapToPixelMemmap(spaceBitmap, cursor, yOrigin, spacing, heightPx, invert ? 1 : 0);
    }
    cursor += spacing;
  }
  // newTimingLogEntry("PlotStringToPixelMemMap : "+inString+" : Done");
  return cursor;
}

/*************************************************************************************************
        Update all of the grid button LED from the gridBtnLEDcolor object.
        This function sends the sysEx commands with a ~1ms delay between each.
*************************************************************************************************/
function updateAllGridBtnLEDs() {
  if (seq.mode.current == 0) {
    for (let i = seq.state.selectedTrackRange; i < seq.state.selectedTrackRange + 4; i++) {
      for (let y = 0; y < 16; y++) {
        if ((seq.track[i].patterns["id_" + seq.track[i].currentPattern].patLength < 16) && (y < seq.track[i].patterns["id_" + seq.track[i].currentPattern].patLength)) {
          if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].events["id_" + y] != undefined) {
            if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].events["id_" + y].enabled) {
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].red = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.red;
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].grn = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.grn;
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].blu = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.blu;
            } else {
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].red = 0;
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].grn = 0;
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].blu = 0;
            }
          } else {
            gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].red = 0;
            gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].grn = 0;
            gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].blu = 0;
          }
        } else if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].patLength < 16) {
          gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].red = 0;
          gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].grn = 0;
          gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].blu = 0;
        } else {
          if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].events["id_" + (y + (seq.track[i].patterns["id_" + seq.track[i].currentPattern].viewArea * 16))] != undefined) {
            if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].events["id_" + (y + (seq.track[i].patterns["id_" + seq.track[i].currentPattern].viewArea * 16))].enabled) {
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].red = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.red;
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].grn = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.grn;
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].blu = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.blu;
            } else {
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].red = 0;
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].grn = 0;
              gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].blu = 0;
            }
          } else {
            gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].red = 0;
            gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].grn = 0;
            gridBtnLEDcolor.btn[(i - seq.state.selectedTrackRange) * 16 + y].blu = 0;
          }
        }
      }
    }
  }
  let count = 0;
  let updateInterval = setInterval(function () {
    let sysEx = btnLEDSysEx;
    sysEx[7] = count;
    sysEx[8] = (gridBtnLEDcolor.btn[count].red) & 0x7f;
    sysEx[9] = (gridBtnLEDcolor.btn[count].grn) & 0x7f;
    sysEx[10] = (gridBtnLEDcolor.btn[count].blu) & 0x7f;
    fireMidiOut.sendMessage(sysEx);
    count++;
    if (count > 63) {
      clearInterval(updateInterval);
    }
  });
}

function updateAllNotGridBtnLEDS() {
  notGridBtnLEDS[9] = seq.state.selectedTrack - seq.state.selectedTrackRange == 0 ? 4 : 0;
  notGridBtnLEDS[10] = seq.state.selectedTrack - seq.state.selectedTrackRange == 1 ? 4 : 0;
  notGridBtnLEDS[11] = seq.state.selectedTrack - seq.state.selectedTrackRange == 2 ? 4 : 0;
  notGridBtnLEDS[12] = seq.state.selectedTrack - seq.state.selectedTrackRange == 3 ? 4 : 0;
  notGridBtnLEDS[8] = seq.track[seq.state.selectedTrackRange + 3].mute ? 0 : SOLO_GREEN;
  notGridBtnLEDS[7] = seq.track[seq.state.selectedTrackRange + 2].mute ? 0 : SOLO_GREEN;
  notGridBtnLEDS[6] = seq.track[seq.state.selectedTrackRange + 1].mute ? 0 : SOLO_GREEN;
  notGridBtnLEDS[5] = seq.track[seq.state.selectedTrackRange + 0].mute ? 0 : SOLO_GREEN;
  let message = [0xB0, 0, 0];
  var count = 0;
  let intVal = setInterval(function () {
    if (count < 23) { // button id's 31-53
      message[1] = count + 31;
      message[2] = notGridBtnLEDS[count];
      fireMidiOut.sendMessage(message);
    } else { //
      // channel/mixer/user1/user2 LEDs
      message[1] = 0x1b;
      message[2] = notGridBtnLEDS[23];
      fireMidiOut.sendMessage(message);
      clearInterval(intVal);
    }
    count++;
  });
}

/*
  Write a section or all of the OLED bitmap memory map to the device

  paramters:
    section - 0 or none: all
              1: rows 0,1,2
              2: rows 4,5,6
              3: rows 7,8
  returns:
    true if operation completed successfully
    false if there was a problem.
*/
function FireOLED_SendMemMap(section = 0) {
  clearTimeout(seq.state.OLEDclearTimeout);
  if (FireOLED_SendMemMap.caller.name != "") { // this prevents the timeout CB from running over and over.
    seq.state.OLEDclearTimeout = setTimeout(function () {
      clearOLEDmemMap();
      FireOLED_SendMemMap();
    }, seq.settings.general.OLEDtimeout * 1000);
  }


  let timeMillis = Date.now();
  if (timeMillis - seq.state.lastOLEDupdateTime < 50) {
    return;
  }
  seq.state.lastOLEDupdateTime = Date.now();

  let y;
  let x;
  let xOrigin = 0,
    yOrigin = 0,
    yHeight = 64;
  switch (section) {
    case 1: // lines / pages 0, 1
      yHeight = 16;
      break;
    case 2: // lines / pages 2, 3,
      yHeight = 16;
      yOrigin = 16;
      break;
    case 3: // lines / pages 4, 5
      yHeight = 16;
      yOrigin = 32;
      break;
    case 4: // lines / pages 6, 7
      yHeight = 16;
      yOrigin = 48;
      break;
    case 5: // lines / pages 0, 1, 2
      yHeight = 24;
      break;
    case 6: // lines / pages 3, 4, 5
      yHeight = 24;
      yOrigin = 24;
      break;
    case 7: // lines / pages 0, 1, 2, 3
      yHeight = 32;
      break;
    case 8: // lines / pages 4, 5, 6, 7
      yHeight = 32;
      yOrigin = 32;
      break;
  } // no "0" or default needed since values were set at declaration, writes all 8 lines

  let newArraySize = Math.ceil((128 * yHeight) / 7);
  var bit7_OLEDBitmap = new Uint8Array(newArraySize);
  for (x = 0; x < newArraySize; ++x) {
    bit7_OLEDBitmap[x] = 0;
  }
  for (x = 0; x < 128; x++) {
    for (y = yOrigin; y < (yOrigin + yHeight); y++) {
      let xUnwound = x + (128 * (((y - yOrigin) / 8) & 0xff));
      let bitByteMut = bitmaps.bitMutate_byteAddr[y % 8][xUnwound % 7];
      if (fireOLED_pixelMemMap[x][y] > 0) {
        bit7_OLEDBitmap[bitByteMut[1] + (((xUnwound / 7) & 0xff) * 8)] |= (1 << bitByteMut[0]);
      } else {
        bit7_OLEDBitmap[bitByteMut[1] + (((xUnwound / 7) & 0xff) * 8)] &= (~(1 << bitByteMut[0])) & 0xff;
      }
    }
  }

  let newSysEx = new Array(bit7_OLEDBitmap.length + 12);

  // calculate row start value, and return false if the bitmap overruns the OLED
  let rowStart = (yOrigin / 8) & 0xff;
  if (rowStart > 7) {
    return false;
  }
  let rowEnd = ((yHeight / 8) & 0xff) - 1 + rowStart;
  if (rowEnd > 7) {
    return false;
  }
  newSysEx[0] = 0xf0; // sys ex
  newSysEx[1] = 0x47; // Akai manufacturer ID
  newSysEx[2] = 0x7F; // All Call Address
  newSysEx[3] = 0x43; // Fire Sub-ID
  newSysEx[4] = 0x0E; // Write OLED command
  newSysEx[5] = (bit7_OLEDBitmap.length + 4) >>> 7; // payload length, btis 7-13
  newSysEx[6] = (bit7_OLEDBitmap.length + 4) & 0x7F; // payload length, bits 0-7
  newSysEx[7] = rowStart;
  newSysEx[8] = rowEnd;
  newSysEx[9] = xOrigin;
  newSysEx[10] = 127;
  let i = 0;
  while (i < bit7_OLEDBitmap.length) {
    newSysEx[i + 11] = bit7_OLEDBitmap[i];
    i++;
  }
  newSysEx[bit7_OLEDBitmap.length + 11] = 0xf7;
  fireMidiOut.sendMessage(newSysEx);
  return true;
}

/*
plot a bitmap to the OLED pixel memory map

paramters:
  inbitmap - array of bytes representing a glyph. generate at https://javl.github.io/image2cpp/
  xOrigin, yOrigin
  bmp_width, bmp_height - dimensions of incoming bitmap
  invert - 0 for normal, 1 for inverted colors, >1 for inversion of data in memMap

*/
function PlotBitmapToPixelMemmap(inBitmap, xOrigin, yOrigin, bmp_width, bmp_height, invert) {
  let x, y;
  for (x = 0; x < bmp_width; x++) {
    for (y = 0; y < bmp_height; y++) {
      let outBit = (inBitmap[(y * Math.ceil(bmp_width / 8)) + ((x / 8) & 0xff)]) & (0x80 >>> (x % 8));
      if (invert == 1) {
        fireOLED_pixelMemMap[x + xOrigin][y + yOrigin] = outBit > 0 ? 0 : 1;
      } else if (invert == 0) {
        fireOLED_pixelMemMap[x + xOrigin][y + yOrigin] = outBit > 0 ? 1 : 0;
      } else if (invert > 1) {
        fireOLED_pixelMemMap[x + xOrigin][y + yOrigin] = fireOLED_pixelMemMap[x + xOrigin][y + yOrigin] == 0 ? (outBit > 0 ? 1 : 0) : (outBit > 0 ? 0 : 1);
      }
    }
  }
}

function clearOLEDmemMap() {
  for (let i = 0; i < 128; i++) {
    for (let p = 0; p < 64; p++) {
      fireOLED_pixelMemMap[i][p] = 0;
    }
  }
  seq.state.OLEDmemMapContents = "";
}

/* #region  debug and exit functions */
async function debug(s, lvl, comment) {
  if (!lvl) {
    lvl = 5;
  }
  if (lvl <= settings.debugLevel) {
    console.log("______________________");
    console.log("|    DEBUG OUTPUT    |");
    if (comment) {
      console.log(comment);
    }
    console.log("----------------------");
    console.log(s);
    console.log("______________________");
    console.log("**********************");
    console.log(" ");
    console.log(" ");
  }
}

function exit() {
  fireMidiIn.closePort();
  fireMidiOut.closePort();
  if (settings.osType != "Windows_NT" && typeof virInput !== 'undefined') {
    virInput.closePort();
    virOutput.closePort();
  }
}


function exitHandler(options, exitCode) {
  exit();
  if (options.cleanup) debug('clean', 2);
  if (exitCode || exitCode === 0) debug(exitCode, 1);
  if (options.exit) process.exit();
  console.log({
    exitCode
  });
  console.log("Change debug logging level with '--debugLevel [0-5]'");
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {
  cleanup: true
}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
  exit: true
}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {
  exit: true
}));
process.on('SIGUSR2', exitHandler.bind(null, {
  exit: true
}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true
}));
/* #endregion */

function between(x, num1, num2, inclusive = true) {
  if (num1 > num2 && inclusive) {
    return x >= num2 && x <= num1;
  } else if (num1 > num2 && !inclusive) {
    return x > num2 && x < num1;
  } else if (num2 > num1 && inclusive) {
    return x >= num1 && x <= num2;
  } else if (num2 > num1 && !inclusive) {
    return x > num1 && x < num2;
  } else {
    return null;
  }
}



// 120 bpm, 16 steps,
// 60/120 = 0.5 sec/beat
// 16/4 = 4 steps/beats
// 4 * 0.5 = total pattern time

// (60/bpm)*(patternLength/stepPerBeat)




seq.settings.menu = {};
// seq.settings.menu.currentState = 0;
// seq.settings.menu.prevState = 0;
// seq.settings.menu.nextState = 0;
seq.settings.menu.currentMenu = 0;
// seq.settings.menu.itemDisplayOffset = 0;
// seq.settings.menu.itemSelectOffset = 0;



// @note settings menu 
/*************************************************************************************************
      This function handles all actions for menus.

      Params: action, menuToEnter

        action - number 0-4 indicating select encoder action
          0 - menu start
          1 - Down
          2 - Up
          3 - Select
          4 - Back
        menuToEnter - refernce to menu object. If no value given, function will default to
          entering main settings menu on action = 0. Otherwise, param is ignored.
*************************************************************************************************/
function settingsMenu(action, textSize, menuToEnter = null) {
  switch (action) {
    case 0: // begin menu
      console.log("menu start");
      if (menuToEnter != null) {
        seq.settings.menu.currentMenu = menuToEnter;
        // console.log("referenced menu");
      } else {
        seq.settings.menu.currentMenu = settingsMainMenu;
      }
      break;
    case 1: // selection down
      console.log("menu selection down");
      if (seq.settings.menu.currentMenu.isSubMenu) {
        if (seq.settings.menu.currentMenu.currentSelectedItem < seq.settings.menu.currentMenu.subMenuItems.length - 1) {
          seq.settings.menu.currentMenu.currentSelectedItem++;
          if (seq.settings.menu.currentMenu.currentSelectedItem > seq.settings.menu.currentMenu.currentDisplayRange + 3) {
            seq.settings.menu.currentMenu.currentDisplayRange++;
          }
        }
      } else if (seq.settings.menu.currentMenu.isMenuItem) {
        seq.settings.menu.currentMenu.downActionFn();
      }
      break;
    case 2: // selection up
      console.log("menu selection up");
      if (seq.settings.menu.currentMenu.isSubMenu) {
        if (seq.settings.menu.currentMenu.currentSelectedItem > 0) {
          seq.settings.menu.currentMenu.currentSelectedItem--;
          if (seq.settings.menu.currentMenu.currentSelectedItem < seq.settings.menu.currentMenu.currentDisplayRange) {
            seq.settings.menu.currentMenu.currentDisplayRange--;
          }
        }
      } else if (seq.settings.menu.currentMenu.isMenuItem) {
        seq.settings.menu.currentMenu.upActionFn();
      }
      break;
    case 3: // select
      console.log("menu select");
      // if (menuToEnter != null) {
      //   // console.log("setting menu to encoders");
      //   seq.settings.menu.currentMenu = menuToEnter;
      // }
      if (seq.settings.menu.currentMenu.isSubMenu) {
        seq.settings.menu.currentMenu = seq.settings.menu.currentMenu.subMenuItems[seq.settings.menu.currentMenu.currentSelectedItem];
      } else {
        seq.settings.menu.currentMenu.selectActionFn(seq.settings.menu.currentMenu.currentSelectedItem);
        if (seq.settings.menu.currentMenu.goBackOnSel) {
          seq.settings.menu.currentMenu = seq.settings.menu.currentMenu.parentMenu;
        }
      }
      break;
    case 4: // shift select
      console.log("menu back");
      // if (seq.settings.menu.currentMenu.isSubMenu && (seq.settings.menu.currentMenu.parentDisplayText == null) && (seq.settings.menu.currentMenu.parentMenu == null)) {
      if (seq.settings.menu.currentMenu.parentMenu == null) {
        console.log("leaving menu");
        seq.state.menu.timeOut = 0;
        seq.state.menu.entered = false;
        clearOLEDmemMap();
        FireOLED_SendMemMap();
      } else {
        seq.settings.menu.currentMenu = seq.settings.menu.currentMenu.parentMenu;
      }
      break;
    default:
  }

  if (seq.state.menu.entered) { // prevents re-rendering menu when exiting
    let displayStrings = [];
    if (seq.settings.menu.currentMenu.isSubMenu) {
      seq.settings.menu.currentMenu.subMenuItems.forEach(function (item, i) {
        if (typeof item.parentDisplayText == "function") {
          displayStrings.push(item.parentDisplayText());
        } else {
          displayStrings.push(item.parentDisplayText);
        }
      })
    } else if (seq.settings.menu.currentMenu.isMenuItem) {
      seq.settings.menu.currentMenu.displayFn(seq.settings.menu.currentMenu.generateFn()).forEach(function (item, i) {
        displayStrings.push(item);
      });
    }
    clearOLEDmemMap();

    // This value represents the number of display lines minus 1 for easy math later.
    let numLines = 1; // defaults to value for size 32 text
    if (textSize == 16) {
      numLines = 3;
    } else if (textSize == 24) {
      numLines = 2;
    }

    displayStrings.forEach(function (item, i) {
      let curSelection = seq.settings.menu.currentMenu.currentSelectedItem;
      let curDispRange = seq.settings.menu.currentMenu.currentDisplayRange;
      if (between(i, curDispRange, curDispRange + numLines)) {
        PlotStringToPixelMemMap(item, 0, (i - curDispRange) * textSize, textSize, textSize == 16 ? 1 : 0, i == curSelection ? 1 : 0);
      }
    })
    FireOLED_SendMemMap();
  } // end of re-rendering prevention
  // console.log("current menu at end of menu function");
  // console.log(seq.settings.menu.currentMenu);
  // console.log(" ");  
}

function menuItem(text, upFn, dwnFn, selFn, genFn, dispFn, parent, goBack = false) {
  this.isGeneratedList = false;
  this.upActionFn = upFn;
  this.downActionFn = dwnFn;
  this.selectActionFn = selFn;
  this.generateFn = genFn;
  this.parentDisplayText = text;
  this.generatedDisplayText = 0;
  this.isMenuItem = true;
  this.displayFn = dispFn;
  this.parentMenu = parent;
  this.currentSelectedItem = 0;
  this.currentDisplayRange = 0;
  this.goBackOnSel = goBack;
  this.tempVar = 0;
}

function subMenu(text, items, parent) {
  this.isSubMenu = true;
  this.parentDisplayText = text;
  this.subMenuItems = items;
  this.parentMenu = parent;
  this.currentSelectedItem = 0;
  this.currentDisplayRange = 0;
}

var encoderBankGlobalSettingsNumBanks = new menuItem(
  function () {
    return "# of banks: " + (seq.settings.encoders.banks == "4BankMode" ? 4 : 16);
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      // adjust display range not needed for 2 items
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < 1) {
      this.currentSelectedItem++;
      // adjust display range not needed for 2 items
    }
  },
  function (selection) { // selFn
    switch (selection) {
      case 0:
        seq.settings.encoders.banks = "4BankMode";
        setEncoderBankLEDs();
        // console.log("select action executed. bank mode set to: ");
        // console.log(seq.settings.encoders.banks);
        break;
      case 1:
        seq.settings.encoders.banks = "16BankMode";
        setEncoderBankLEDs();
        // console.log("select action executed. bank mode set to: ");
        // console.log(seq.settings.encoders.banks);
        break;
    }
  },
  function () { // genFn
    return true;
  },
  function (genReturn) { // dispFn  -  returns array of strings to render. each item get a line on the display. more than 4 items get renderd based on current selction.
    if (genReturn) {
      return ["4 Bank Mode", "16 Bank Mode"];
    }
  },
  null,
  true
);

var encoderBankGlobalSettingsGlobalEnable = new menuItem(
  function () {
    return "GlblCtrl: " + (seq.settings.encoders.global ? "Enabled" : "Disabled");
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < 1) {
      this.currentSelectedItem++;
    }
  },
  function (selection) { // selFn
    switch (selection) {
      case 0:
        seq.settings.encoders.global = true;
        break;
      case 1:
        seq.settings.encoders.global = false;
        break;
    }
  },
  function () { // genFn
    return true;
  },
  function (genReturn) { // dispFn  -  returns array of strings to render. each item get a line on the display. more than 4 items get renderd based on current selction.
    if (genReturn) {
      return ["Enabled", "Disabled"];
    }
  },
  null,
  true
);

var midiInDeviceEnable = new menuItem(
  function () {
    return "Midi In En/Disable";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < midiInputDevicesNames.length - 1) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < midiInputDevicesNames.length - 4) {
        this.currentDisplayRange++;
      }
    }
  },
  function (selection) { // selFn
    // console.log({selection});
    // console.log(midiInputDevicesEnabled);
    midiInputDevicesEnabled[selection] = !midiInputDevicesEnabled[selection];
    // console.log(midiInputDevicesEnabled);
  },
  function () { // generator fn
    // console.log("generator");
    let deviceNames = [];
    midiInputDevicesNames.forEach(function (name, i) {
      if (!midiInputDevicesHidden[i]) {
        if (name.length > 16) {
          // console.log(name);

          let devText = (midiInputDevicesEnabled[i] ? "EN:" : "DIS");
          devText = devText + name.substring(0, 5);
          devText = devText + "...";
          devText = devText + name.substring(name.length - 9);
          deviceNames.push(devText);
        } else {
          let devText = (midiInputDevicesEnabled[i] ? "EN:" : "DIS");
          devText = devText + name;
          deviceNames.push(devText);
        }
      } else {
        deviceNames.push("Hidden Midi Device");
      }
    })
    // console.log(midiInputDevicesNames);

    return deviceNames;
  },
  function (genReturn) {
    return genReturn;
  },
  null
)

var midiOutDeviceEnable = new menuItem(
  function () {
    return "Midi Out En/Disable";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < midiOutputDevicesNames.length - 1) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < midiOutputDevicesNames.length - 4) {
        this.currentDisplayRange++;
      }
    }
  },
  function (selection) { // selFn
    // console.log({selection});
    // console.log(midiOutputDevicesEnabled);
    midiOutputDevicesEnabled[selection] = !midiOutputDevicesEnabled[selection];
    // console.log(midiOutputDevicesEnabled);
  },
  function () { // generator fn
    // console.log("generator");
    let deviceNames = [];
    midiOutputDevicesNames.forEach(function (name, i) {
      if (!midiOutputDevicesHidden[i]) {
        if (name.length > 16) {
          // console.log(name);
          let devText = (midiOutputDevicesEnabled[i] ? "EN:" : "DIS");
          devText = devText + name.substring(0, 5);
          devText = devText + "...";
          devText = devText + name.substring(name.length - 9);
          deviceNames.push(devText);
        } else {
          let devText = (midiOutputDevicesEnabled[i] ? "EN:" : "DIS");
          devText = devText + name;
          deviceNames.push(devText);
        }
      } else {
        deviceNames.push("Hidden Midi Device");
      }
    })
    // console.log(midiOutputDevicesNames);

    return deviceNames;
  },
  function (genReturn) {
    return genReturn;
  },
  null
)

var midiClockInputDeviceSelect = new menuItem(
  function () {
    // seq.settings.midi.clockInSource
    // seq.settings.midi.clockInEnabled
    return "Midi Clock In Source";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < midiInputDevicesNames.length) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < midiInputDevicesNames.length - 3) {
        this.currentDisplayRange++;
      }
    }
  },
  function (selection) { // selFn
    if (selection != 0) {
      seq.settings.midi.clockInSource = midiInputDevicesNames[selection - 1].substring(0, midiInputDevicesNames[selection - 1].search(/([0-9]{1,3}:[0-9]{1,}$)/g));
      // console.log(midiInputDevicesNames[selection-1].search(/([0-9]{1,3}:[0-9]{1,}$)/g));

      seq.settings.midi.clockInEnabled = true;
    } else {
      seq.settings.midi.clockInSource = null;
      seq.settings.midi.clockInEnabled = false;
    }

    // console.log(seq.settings.midi.clockInSource);
    // console.log(seq.settings.midi.clockInEnabled);
  },
  function () { // genFn
    // console.log("generator");
    let deviceNames = ["Disable"];
    midiInputDevicesNames.forEach(function (name, i) {
      if (!midiOutputDevicesHidden[i]) {
        if (name.length > 16) {
          // console.log(name);
          let devText = name.substring(0, 5);
          devText = devText + "...";
          devText = devText + name.substring(name.length - 9);
          deviceNames.push(devText);
        } else {
          deviceNames.push(name);
        }
      } else {
        deviceNames.push("Hidden Midi Device");
      }
    })
    // console.log(midiOutputDevicesNames);

    return deviceNames;

  },
  function (genReturn) {
    return genReturn;
  },
  null,
  true
)

var trackColorPreset = new menuItem(
  function () {
    let text = "Preset: ";
    // seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.red
    // this.color = {};
    // this.color.red = 127;
    // this.color.grn = 0;
    // this.color.blu = 127;
    // this.color.mode = "rgb"; // other option is "preset"
    // this.color.preset = 0;
    let selTrack = seq.track[seq.state.selectedTrack];
    if (selTrack.patterns["id_" + selTrack.currentPattern].color.mode == "preset") {
      text = text + LED_COLORS_NAMES[selTrack.patterns["id_" + selTrack.currentPattern].color.preset];
    } else if (selTrack.patterns["id_" + selTrack.currentPattern].color.mode == "rgb") {
      text = text + "SELECT";
    } else {
      console.log("ERROR");
    }
    return text;
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
    let sysEx = btnLEDSysEx;
    sysEx[7] = (seq.state.selectedTrack - seq.state.selectedTrackRange) * 16;
    sysEx[8] = LED_COLORS[this.currentSelectedItem] >> 17 & 0x7f;
    sysEx[9] = LED_COLORS[this.currentSelectedItem] >> 9 & 0x7f;
    sysEx[10] = LED_COLORS[this.currentSelectedItem] >> 1 & 0x7f;
    fireMidiOut.sendMessage(sysEx);
  },
  function () { // dwnFn
    if (this.currentSelectedItem < LED_COLORS_NAMES.length - 1) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < LED_COLORS_NAMES.length - 4) {
        this.currentDisplayRange++;
      }
    }
    let sysEx = btnLEDSysEx;
    sysEx[7] = (seq.state.selectedTrack - seq.state.selectedTrackRange) * 16;
    sysEx[8] = LED_COLORS[this.currentSelectedItem] >> 17 & 0x7f;
    sysEx[9] = LED_COLORS[this.currentSelectedItem] >> 9 & 0x7f;
    sysEx[10] = LED_COLORS[this.currentSelectedItem] >> 1 & 0x7f;
    fireMidiOut.sendMessage(sysEx);
  },
  function (selection) { // selFn
    let selTrack = seq.track[seq.state.selectedTrack];
    selTrack.patterns["id_" + selTrack.currentPattern].color.mode = "preset";
    selTrack.patterns["id_" + selTrack.currentPattern].color.preset = selection;
    selTrack.patterns["id_" + selTrack.currentPattern].color.red = LED_COLORS[selection] >> 17 & 0x7f;
    selTrack.patterns["id_" + selTrack.currentPattern].color.grn = LED_COLORS[selection] >> 9 & 0x7f;
    selTrack.patterns["id_" + selTrack.currentPattern].color.blu = LED_COLORS[selection] >> 1 & 0x7f;
    updateAllGridBtnLEDs();
  },
  function () { // genFn
    return true;
  },
  function (genReturn) { // dispFn
    if (genReturn) {
      return LED_COLORS_NAMES;
    }
  }, null, true
);

var trackColorRed = new menuItem(
  function () {
    let selTrack = seq.track[seq.state.selectedTrack];
    let text = "Red: ";
    text = text + selTrack.patterns["id_" + selTrack.currentPattern].color.red;
    return text;
  },
  function () { // upFn
    let selTrack = seq.track[seq.state.selectedTrack];
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
    selTrack.patterns["id_" + selTrack.currentPattern].color.red = this.currentSelectedItem;
    let sysEx = btnLEDSysEx;
    sysEx[7] = (seq.state.selectedTrack - seq.state.selectedTrackRange) * 16;
    sysEx[8] = selTrack.patterns["id_" + selTrack.currentPattern].color.red;
    sysEx[9] = selTrack.patterns["id_" + selTrack.currentPattern].color.grn;
    sysEx[10] = selTrack.patterns["id_" + selTrack.currentPattern].color.blu;
    fireMidiOut.sendMessage(sysEx);

  },
  function () { // dwnFn
    let selTrack = seq.track[seq.state.selectedTrack];
    if (this.currentSelectedItem < 127) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < 124) {
        this.currentDisplayRange++;
      }
    }
    selTrack.patterns["id_" + selTrack.currentPattern].color.red = this.currentSelectedItem;
    let sysEx = btnLEDSysEx;
    sysEx[7] = (seq.state.selectedTrack - seq.state.selectedTrackRange) * 16;
    sysEx[8] = selTrack.patterns["id_" + selTrack.currentPattern].color.red;
    sysEx[9] = selTrack.patterns["id_" + selTrack.currentPattern].color.grn;
    sysEx[10] = selTrack.patterns["id_" + selTrack.currentPattern].color.blu;
    fireMidiOut.sendMessage(sysEx);
  },
  function () { // selFn
    let selTrack = seq.track[seq.state.selectedTrack];
    selTrack.patterns["id_" + selTrack.currentPattern].color.mode = "rgb";
    updateAllGridBtnLEDs();
  },
  function () { // genFn
    return true;
  },
  function () { // dispFn
    let dispText = [];
    for (let i = 0; i <= 127; i++) {
      dispText.push(i.toString());
    }
    return dispText;
  }, null, true
);

var trackColorGrn = new menuItem(
  function () {
    let selTrack = seq.track[seq.state.selectedTrack];
    let text = "Green: ";
    text = text + selTrack.patterns["id_" + selTrack.currentPattern].color.grn;
    return text;
  },
  function () { // upFn
    let selTrack = seq.track[seq.state.selectedTrack];
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
    selTrack.patterns["id_" + selTrack.currentPattern].color.grn = this.currentSelectedItem;
    let sysEx = btnLEDSysEx;
    sysEx[7] = seq.state.selectedTrack * 16;
    sysEx[8] = selTrack.patterns["id_" + selTrack.currentPattern].color.red;
    sysEx[9] = selTrack.patterns["id_" + selTrack.currentPattern].color.grn;
    sysEx[10] = selTrack.patterns["id_" + selTrack.currentPattern].color.blu;
    fireMidiOut.sendMessage(sysEx);

  },
  function () { // dwnFn
    let selTrack = seq.track[seq.state.selectedTrack];
    if (this.currentSelectedItem < 127) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < 124) {
        this.currentDisplayRange++;
      }
    }
    selTrack.patterns["id_" + selTrack.currentPattern].color.grn = this.currentSelectedItem;
    let sysEx = btnLEDSysEx;
    sysEx[7] = seq.state.selectedTrack * 16;
    sysEx[8] = selTrack.patterns["id_" + selTrack.currentPattern].color.red;
    sysEx[9] = selTrack.patterns["id_" + selTrack.currentPattern].color.grn;
    sysEx[10] = selTrack.patterns["id_" + selTrack.currentPattern].color.blu;
    fireMidiOut.sendMessage(sysEx);
  },
  function () { // selFn
    let selTrack = seq.track[seq.state.selectedTrack];
    selTrack.patterns["id_" + selTrack.currentPattern].color.mode = "rgb";
    updateAllGridBtnLEDs();
  },
  function () { // genFn
    return true;
  },
  function () { // dispFn
    let dispText = [];
    for (let i = 0; i <= 127; i++) {
      dispText.push(i.toString());
    }
    return dispText;
  }, null, true
);

var trackColorBlu = new menuItem(
  function () {
    let selTrack = seq.track[seq.state.selectedTrack];
    let text = "Blue: ";
    text = text + selTrack.patterns["id_" + selTrack.currentPattern].color.blu;
    return text;
  },
  function () { // upFn
    let selTrack = seq.track[seq.state.selectedTrack];
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
    selTrack.patterns["id_" + selTrack.currentPattern].color.blu = this.currentSelectedItem;
    let sysEx = btnLEDSysEx;
    sysEx[7] = seq.state.selectedTrack * 16;
    sysEx[8] = selTrack.patterns["id_" + selTrack.currentPattern].color.red;
    sysEx[9] = selTrack.patterns["id_" + selTrack.currentPattern].color.grn;
    sysEx[10] = selTrack.patterns["id_" + selTrack.currentPattern].color.blu;
    fireMidiOut.sendMessage(sysEx);

  },
  function () { // dwnFn
    let selTrack = seq.track[seq.state.selectedTrack];
    if (this.currentSelectedItem < 127) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < 124) {
        this.currentDisplayRange++;
      }
    }
    selTrack.patterns["id_" + selTrack.currentPattern].color.blu = this.currentSelectedItem;
    let sysEx = btnLEDSysEx;
    sysEx[7] = seq.state.selectedTrack * 16;
    sysEx[8] = selTrack.patterns["id_" + selTrack.currentPattern].color.red;
    sysEx[9] = selTrack.patterns["id_" + selTrack.currentPattern].color.grn;
    sysEx[10] = selTrack.patterns["id_" + selTrack.currentPattern].color.blu;
    fireMidiOut.sendMessage(sysEx);
  },
  function () { // selFn
    let selTrack = seq.track[seq.state.selectedTrack];
    selTrack.patterns["id_" + selTrack.currentPattern].color.mode = "rgb";
    updateAllGridBtnLEDs();
  },
  function () { // genFn
    return true;
  },
  function () { // dispFn
    let dispText = [];
    for (let i = 0; i <= 127; i++) {
      dispText.push(i.toString());
    }
    return dispText;
  }, null, true
); /////////////////////////////////////////////////////////////////////////////////////////////////

var trackColorRGB = new subMenu(
  "RGB Color",
  [trackColorRed, trackColorGrn, trackColorBlu],
  null
);

trackColorRed.parentMenu = trackColorRGB;
trackColorGrn.parentMenu = trackColorRGB;
trackColorBlu.parentMenu = trackColorRGB;

var trackColor = new subMenu(
  "Grid Color",
  [trackColorRGB, trackColorPreset],
  null
);

trackColorRGB.parentMenu = trackColor;
trackColorPreset.parentMenu = trackColor;

var trackOutputDevice = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    if (seq.track[seq.state.selectedTrack].outputType == "midi") {
      this.tempVar = 0;
      for (let i = 0; i < midiOutputDevicesNames.length; i++) {
        if (midiOutputDevicesEnabled[i] && !midiOutputDevicesHidden[i]) {
          this.tempVar++;
        }
      }
      return "Midi Out Device";
    } else {
      this.tempVar = 16;
      return "CV Out Port"
    }
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < this.tempVar - 1) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < this.tempVar - 4) {
        this.currentDisplayRange++;
      }
    }
  },
  function (selection) { // selFn
    if (seq.track[seq.state.selectedTrack].outputType == "midi") {
      let devCount = 0;
      for (let i = 0; i < midiOutputDevicesNames.length; i++) {
        if (midiOutputDevicesEnabled[i] && !midiOutputDevicesHidden[i]) {
          if (selection == devCount) {
            let selTrack = seq.track[seq.state.selectedTrack];
            selTrack.outputName = midiOutputDevicesNames[i].substring(0, midiOutputDevicesNames[i].search(/([0-9]{1,3}:[0-9]{1,}$)/g));
            selTrack.outputIndex = i;
          }
          devCount++;
        }
      }
    } else {
      seq.track[seq.state.selectedTrack].outputIndex = selection;
    }
  },
  function () { // genFn
    return true;
  },
  function (genReturn) { // dispFn
    let displayStrings = [];
    if (seq.track[seq.state.selectedTrack].outputType == "midi") {
      for (let i = 0; i < midiOutputDevicesNames.length; i++) {
        if (midiOutputDevicesEnabled[i] && !midiOutputDevicesHidden[i]) {
          if (midiOutputDevicesNames[i].length > 16) {
            // console.log(name);
            let devText = "";
            if (seq.track[seq.state.selectedTrack].outputIndex == i) {
              devText = String.fromCharCode(CHARCODE_RIGHTARROW);
            }
            devText = devText + midiOutputDevicesNames[i].substring(0, 9);
            devText = devText + "...";
            devText = devText + midiOutputDevicesNames[i].substring(midiOutputDevicesNames[i].search(/([0-9]{1,3}:[0-9]{1,}$)/g) - 9, midiOutputDevicesNames[i].search(/([0-9]{1,3}:[0-9]{1,}$)/g));
            displayStrings.push(devText);
          } else {
            displayStrings.push(midiOutputDevicesNames[i]);
          }
        }
      }
    } else {
      // create array of CV port names
      displayStrings = ["CV/Gate Port 1", "CV/Gate Port 2", "CV/Gate Port 3", "CV/Gate Port 4", "CV/Gate Port 5", "CV/Gate Port 6", "CV/Gate Port 7", "CV/Gate Port 8", "CV/Gate Port 9", "CV/Gate Port 10", "CV/Gate Port 11", "CV/Gate Port 12", "CV/Gate Port 13", "CV/Gate Port 14", "CV/Gate Port 15", "CV/Gate Port 16"];
      if (displayStrings[seq.track[seq.state.selectedTrack].outputIndex] != undefined) {
        displayStrings[seq.track[seq.state.selectedTrack].outputIndex] = String.fromCharCode(0x84) + displayStrings[seq.track[seq.state.selectedTrack].outputIndex];
      }
    }
    // console.log(displayStrings);
    return displayStrings;
  },
  null, true
);


var trackOutputType = new menuItem(
  function () {
    return "Type (MIDI/CV)";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < 2 - 1) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < 2 - 4) {
        this.currentDisplayRange++;
      }
    }
  },
  function (selection) { // selFn
    if (selection == 0) {
      seq.track[seq.state.selectedTrack].outputType = "midi";
    } else if (selection == 1) {
      seq.track[seq.state.selectedTrack].outputType = "cv";
    } else {
      console.log("Something went wrong");
    }
  },
  function () { // genFn
    return;
  },
  function (genReturn) { // dispFn
    return ["MIDI out", "CV/Gate out"];
  }, null, true
);


var trackName = new menuItem(
  function () {
    let selTrack = seq.track[seq.state.selectedTrack];
    selTrack.trackNameTemp = selTrack.trackName;
    return "Track Name";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < 107) {
      this.currentSelectedItem++;
    }
  },
  function (selection) { // selFn
    let selTrack = seq.track[seq.state.selectedTrack];
    switch (selection) {
      case 0:
        selTrack.trackName = selTrack.trackNameTemp;
        this.goBackOnSel = true;
        break;
      case 107:
        selTrack.trackNameTemp = "";
        break;
      default:
        selTrack.trackNameTemp = selTrack.trackNameTemp + String.fromCharCode(this.currentSelectedItem + 31);
    }

  },
  function () { // genFn
    return true;
  },
  function (genReturn) { // dispFn
    if (genReturn) {
      let selTrack = seq.track[seq.state.selectedTrack];
      if (this.currentSelectedItem == 0) {
        return [selTrack.trackNameTemp, "Press select", "to save"];
      } else if (this.currentSelectedItem == 107) {
        return [selTrack.trackNameTemp, "Press select", "to clear"];
      } else {
        return [selTrack.trackNameTemp + String.fromCharCode(this.currentSelectedItem + 31)];
      }
    }
  }, null
);

var trackMidiChannel = new menuItem(
  function () {
    this.currentSelectedItem = seq.track[seq.state.selectedTrack].midiChannel;
    return "Midi out Channel";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
      if (this.currentSelectedItem < this.currentDisplayRange) {
        this.currentDisplayRange = this.currentSelectedItem;
      }
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < 16) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < 13) {
        this.currentDisplayRange++;
      }
    }
  },
  function (selection) { // selFn
    seq.track[seq.state.selectedTrack].midiChannel = selection;
  },
  function () { // genFn

  },
  function () { // dispFn
    let dispText = [];
    for (let i = 0; i < 17; i++) {
      if (i == 0) {
        dispText.push("Omni");
      } else {
        dispText.push(i.toString());
      }
      if (seq.track[seq.state.selectedTrack].midiChannel == i) {
        dispText[i] = String.fromCharCode(CHARCODE_RIGHTARROW) + dispText[i];
      }
    }
    return dispText;
  },
  null,
  true
);

var encoderBankGlobalSettings = new subMenu(
  "Encoder Bank",
  [encoderBankGlobalSettingsNumBanks, encoderBankGlobalSettingsGlobalEnable],
  null
);

encoderBankGlobalSettingsNumBanks.parentMenu = encoderBankGlobalSettings;
encoderBankGlobalSettingsGlobalEnable.parentMenu = encoderBankGlobalSettings;


var settingsMidiMenu = new subMenu(
  "Midi Settings",
  [midiInDeviceEnable, midiOutDeviceEnable, midiClockInputDeviceSelect],
  null
);

midiInDeviceEnable.parentMenu = settingsMidiMenu;
midiOutDeviceEnable.parentMenu = settingsMidiMenu;
midiClockInputDeviceSelect.parentMenu = settingsMidiMenu;

var globalImmeiateTrackUpdatesMenu = new menuItem(
  function () {
    return "Immediate Track Updates";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
    }

  },
  function () { // dwnFn
    if (this.currentSelectedItem < 1) {
      this.currentSelectedItem++;
    }
  },
  function (selection) { // selFn
    seq.state.immediateTrackUpdates = selection == 0;
    if (seqLoop_ipcIsEstablished) {
      ipc.server.emit(seqLoop_ipcSocket, 'setITU', seq.state.immediateTrackUpdates);
    }
  },
  function () { // genFn
    return true;
  },
  function (uselessBool) { // dispFn
    let returnStrings = [];
    if (seq.state.immediateTrackUpdates) {
      returnStrings.push(String.fromCharCode(CHARCODE_RIGHTARROW) + "Enable");
    } else {
      returnStrings.push("Enable");
    }

    if (!seq.state.immediateTrackUpdates) {
      returnStrings.push(String.fromCharCode(CHARCODE_RIGHTARROW) + "Disable");
    } else {
      returnStrings.push("Disable");
    }

    return returnStrings;
  },
  null,
  true
)


var settingsGlobalMenu = new subMenu(
  "Global Settings",
  [encoderBankGlobalSettings, settingsMidiMenu, globalImmeiateTrackUpdatesMenu],
  null
);

encoderBankGlobalSettings.parentMenu = settingsGlobalMenu;
settingsMidiMenu.parentMenu = settingsGlobalMenu;
globalImmeiateTrackUpdatesMenu.parentMenu = settingsGlobalMenu;

var projectSave = new menuItem( /** TODO: **/
  function () {
    return "Save project";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn

  },
  null
)

var projectLoad = new menuItem( /** TODO: **/
  function () {
    return "Load project";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn

  },
  null
)

var projectNew = new menuItem( /** TODO: **/
  function () {
    return "New project";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn

  },
  null
);

var projectDeleteLine1 = new menuItem( /** TODO: **/
  function () {
    return "Be careful.";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn
    return ["project 1", "project 2"];
  },
  null
);

var projectDeleteLine2 = new menuItem( /** TODO: **/
  function () {
    return "This is permanent";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn
    return ["project 1", "project 2"];
  },
  null
);

var projectDeleteConfirm2 = new subMenu(
  "Really?  ...ok",
  [projectDeleteLine1, projectDeleteLine2],
  null
);

var projectDeleteConfirm1 = new subMenu(
  "Delete Project",
  [projectDeleteConfirm2],
  null
);

var settingsProjectMenu = new subMenu(
  "Project Settings",
  [projectSave, projectLoad, projectNew, projectDeleteConfirm1],
  null
);

projectSave.parentMenu = settingsProjectMenu;
projectLoad.parentMenu = settingsProjectMenu;
projectNew.parentMenu = settingsProjectMenu;
projectDeleteConfirm1.parentMenu = settingsProjectMenu;
projectDeleteConfirm2.parentMenu = projectDeleteConfirm1;
projectDeleteLine1.parentMenu = projectDeleteConfirm2;
projectDeleteLine2.parentMenu = projectDeleteConfirm2;

var settingsTrackMenu = new subMenu(
  function () {
    let text = "Track ";
    text = text + (seq.track[seq.state.selectedTrack].num + 1);
    text = text + " Settings";
    return text;
  },
  [trackColor, trackName, trackOutputType, trackOutputDevice, trackMidiChannel],
  null
);

trackColor.parentMenu = settingsTrackMenu;
trackName.parentMenu = settingsTrackMenu;
trackOutputDevice.parentMenu = settingsTrackMenu;
trackOutputType.parentMenu = settingsTrackMenu;
trackMidiChannel.parentMenu = settingsTrackMenu;


var settingsMainMenu = new subMenu(
  null,
  [settingsGlobalMenu, settingsProjectMenu, settingsTrackMenu],
  null
)

settingsGlobalMenu.parentMenu = settingsMainMenu;
settingsProjectMenu.parentMenu = settingsMainMenu;
settingsTrackMenu.parentMenu = settingsMainMenu;


var encodersMenuOutDevice = new menuItem( /** TODO: **/
  function () {
    return "Output Port";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn
    return ["list/midi&CV ports", "Encoder", "Line 3"];
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

var encodersMenuMidiChan = new menuItem( /** TODO: **/
  function () {
    return "Midi out channel";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn
    return ["list/midi&CV ports", "Encoder", "Line 3"];
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

var encodersMenuMidiCC = new menuItem( /** TODO: **/
  function () {
    return "Midi out CC#";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn
    return ["list/midi&CV ports", "Encoder", "Line 3"];
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

var encodersMenuName = new menuItem( /** TODO: **/ // make per project version
  function () {
    let selEnc = seq.settings.encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];
    selEnc.tempName = selEnc.name;
    this.goBackOnSel = false;
    return "Control Name";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < 107) {
      this.currentSelectedItem++;
    }
  },
  function (selection) { // selFn
    let selEnc = seq.settings.encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];
    if (seq.settings.encoders.global) {
      switch (selection) {
        case 0:
          selEnc.name = selEnc.tempName;
          saveGlobalData();
          this.goBackOnSel = true;
          break;
        case 107:
          selEnc.tempName = "";
          break;
        default:
          selEnc.tempName = selEnc.tempName + String.fromCharCode(this.currentSelectedItem + 31);
      }
    }
  },
  function () { // genFn
    return true;
  },
  function (genReturn) { // dispFn
    if (genReturn) {
      let selEnc = seq.settings.encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];
      if (this.currentSelectedItem == 0) {
        return [selEnc.tempName, "Press select", "to save"];
      } else if (this.currentSelectedItem == 107) {
        return [selEnc.tempName, "Press select", "to clear"];
      } else {
        return [selEnc.tempName + String.fromCharCode(this.currentSelectedItem + 31)];
      }
    }
  }, null
);

var encodersMenuCCType = new menuItem( /** TODO: **/
  function () {
    return "Midi CC Type";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn
    return ["Absolute", "Rel: 1 & 127", "Rel: "];
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
)

var encodersMenu = new subMenu(
  null,
  [encodersMenuName, encodersMenuOutDevice, encodersMenuMidiChan, encodersMenuMidiCC, encodersMenuCCType],
  null
);

encodersMenuOutDevice.parentMenu = encodersMenu;
encodersMenuMidiChan.parentMenu = encodersMenu;
encodersMenuMidiCC.parentMenu = encodersMenu;
encodersMenuName.parentMenu = encodersMenu;
encodersMenuCCType.parentMenu = encodersMenu;

/** TODO: **/
/* 
Main settings menu entries to make:
Wifi
  - view connected connection
  - view available networks
  - connect to wifi
  - disable wifi
rtpMidi
  - enable / disable
  - number of rtpMidi devices
Device control
  - power off
  - reboot
  - restart software
Midi
  - reload midi devices
  - Midi clock output device select
Project
  - New
  - Save
  - Load
  - Copy
Pattern
  - Copy
  - Reset
Track
  -̶ M̶i̶d̶i̶ d̶e̶v̶i̶c̶e̶ c̶h̶a̶n̶n̶e̶l̶

Note menu entries to make:
  - midi note value
  - midi velocity
  - note length
  - start time offset

Menu entries for when in step mode with no other buttons pressed
  - Tempo
  - Viewable Tracks
*/


// @note menuItemTemplate
var menuItemTemplate = new menuItem(
  function () {

  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn

  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

/** TODO: **/
// Create functions to serialize and de-serialize project data for saving/loading. Doing this as
// hand-written functions will make the save files much smaller as opposed to using a stringify
// module from npm. This way, we are only saving and loading the data neccesary for the project
// and not extra data associated only with runtime functions. 



function loadProject(IDuuid) {

}

function saveGlobalData() {
  // global stuff to save:
  //   global encoder settings
  let glob = {};
  glob.seqSettingsmidi = seq.settings.midi;
  glob.seqSettingsEncoders = seq.settings.encoders;
  // console.log({glob});
  fs.writeFileSync('globalSave', JSON.stringify(glob));
}

function loadGlobalData() {
  let anObjectToHoldData = JSON.parse(fs.readFileSync('globalSave'));
  // console.log(anObjectToHoldData);

  seq.settings.midi.clockInEnabled = anObjectToHoldData.seqSettingsmidi.clockInEnabled;
  seq.settings.midi.clockInSource = anObjectToHoldData.seqSettingsmidi.clockInSource;

  seq.settings.encoders.banks = anObjectToHoldData.seqSettingsEncoders.banks;
  seq.settings.encoders.global = anObjectToHoldData.seqSettingsEncoders.global;

  for (let q = 0; q < 16; q++) {
    for (let r = 0; r < 4; r++) {
      seq.settings.encoders.control[q][r].name = anObjectToHoldData.seqSettingsEncoders.control[q][r].name;
      seq.settings.encoders.control[q][r].midiCC = anObjectToHoldData.seqSettingsEncoders.control[q][r].midiCC;
      seq.settings.encoders.control[q][r].value = anObjectToHoldData.seqSettingsEncoders.control[q][r].value;
      seq.settings.encoders.control[q][r].midiCCtype = anObjectToHoldData.seqSettingsEncoders.control[q][r].midiCCtype;
      seq.settings.encoders.control[q][r].midiOutPort = anObjectToHoldData.seqSettingsEncoders.control[q][r].midiOutPort;
      seq.settings.encoders.control[q][r].midiOutChannel = anObjectToHoldData.seqSettingsEncoders.control[q][r].midiOutChannel;
      seq.settings.encoders.control[q][r].midiOutPortName = anObjectToHoldData.seqSettingsEncoders.control[q][r].midiOutPortName;
    }
  }
  updateEncoderOutputPortIndexesByName();
}

loadGlobalData();

function saveProject(IDuuid, nameString) {
  let tempObj = getProjectsFromSaveFile();
  let found = false;
  for (let i = 0; i < tempObj.length; i++) {
    if (IDuuid == tempObj[i].uuid) {
      console.log("entry already exists");
      tempObj[i].name = nameString;
      found = true;
    }
  }
  if (found) {
    fs.writeFileSync('saveFile', tempObj);
  } else {
    let lineData = {};
    lineData.name = nameString;
    lineData.uuid = IDuuid;
    tempObj.push(lineData);
    fs.writeFileSync('saveFile', tempObj);
  }

  let returnObj = {};

  returnObj.stateObj = {};
  returnObj.stateObj.currentBPM = seq.state.currentBPM;
  returnObj.stateObj.mute = seq.state.mute;
  returnObj.stateObj.selectedTrack = seq.state.selectedTrack;
  returnObj.stateObj.selectedTrackRange = seq.state.selectedTrackRange;
  returnObj.stateObj.solo = seq.state.solo;

  returnObj.settingsAndProjectObj = {};
  returnObj.settingsAndProjectObj.midiSettings = seq.settings.midi;
  returnObj.settingsAndProjectObj.encodersPerProject = seq.project.encoders;

  let returnString = "";

  returnString += JSON.stringify(returnObj.stateObj);
  returnString += "\r\n";
  returnString += JSON.stringify(returnObj.settingsAndProjectObj);
  returnString += "\r\n";
  returnString += JSON.stringify(seq.track);

  fs.writeFileSync("projects/" + IDuuid, returnString);
}

function getProjectsFromSaveFile() {
  return JSON.parse(fs.readFileSync('saveFile'));
}


// addEntryToSaveFile(uuidv4(),"The First Project");

function newTimingLogEntry(entryText) {
  let newEntry = {};
  newEntry.time = process.hrtime();
  newEntry.text = entryText;
  timingLog.push(newEntry);
}

function writeTimingLogToFile() {
  fs.writeFileSync('timingLog.json', JSON.stringify(timingLog));
}