/** TODO: @todo list
 *  
 *  - Create menu for changing steps per beat
 *  - implement a way to trigger patterns using external midi
 *  - need to be able to set step note value by external controller
 *  - figure out somehting to use browser button for
 *  - figure out metronome / midi clock thing
 *  - drum mode
 *  - perform mode
 *  - song mode (maybe)
 *  - make functionality for encoders to be used for note value, velocity, length, & time offset in step mode
 *  - fix bug in encoder menu midi output type wher scrolling goes outside of list
 *  - CV gate implementation
 *̶  -̶ w̶h̶e̶n̶ c̶h̶a̶n̶g̶i̶n̶g̶ v̶a̶l̶u̶e̶s̶ i̶n̶ t̶h̶e̶ m̶e̶n̶u̶ f̶o̶r̶ a̶ s̶t̶e̶p̶,̶ n̶e̶e̶d̶ t̶o̶ n̶o̶t̶ t̶o̶g̶g̶l̶e̶ t̶h̶e̶ s̶t̶e̶p̶ o̶n̶/̶o̶f̶f̶.̶
 *̶  -̶ r̶e̶w̶o̶r̶k̶ n̶o̶t̶e̶ c̶o̶l̶o̶r̶s̶ a̶n̶d̶ n̶o̶t̶e̶ r̶e̶n̶d̶e̶r̶i̶n̶g̶ f̶u̶n̶c̶t̶i̶o̶n̶ t̶o̶ m̶o̶d̶ t̶h̶e̶ r̶o̶o̶t̶ n̶o̶t̶e̶ c̶o̶l̶o̶r̶.̶
 *̶  -̶ c̶o̶l̶o̶r̶ o̶f̶ C̶'̶s̶ s̶h̶o̶u̶l̶d̶ b̶e̶ c̶l̶o̶s̶e̶r̶ t̶o̶ o̶t̶h̶e̶r̶ n̶o̶t̶e̶s̶.̶
 *̶  -̶ M̶i̶d̶l̶e̶ C̶ s̶h̶o̶u̶l̶d̶ b̶e̶ m̶a̶r̶k̶e̶d̶ u̶n̶i̶q̶u̶e̶l̶y̶
 */


// process.env.UV_THREADPOOL_SIZE = 30;

const os = require('os');
const ipc = require('node-ipc');
const bitmaps = require('./bitmaps.js');
var fs = require('fs');
// const lineReader = require('line-reader');
const midi = require('midi');
const {
  log
} = require('node-ipc');
const {
  v4: uuidv4
} = require('uuid');

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

/** TODO: @todo virtual midi for RTP midi
 *  **/
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
    if (midiInputDevicesNames[step].includes("RtMidi Output Client:RtMidi Output Client") || midiInputDevicesNames[step].includes("Midi Through:Midi Through Port") || midiInputDevicesNames[step].includes("FL STUDIO FIRE:FL STUDIO FIRE MIDI")) {
      midiInputDevicesHidden[step] = true;
    } else {
      midiInputDevicesHidden[step] = false;
    }
  }
}

if (!fireMidiIn.isPortOpen()) {
  throw ("Fire Midi not found.")
}

fireMidiIn.ignoreTypes(false, false, false);

// find out open Akai Fire MIDI output port and open it under "fireMidiOut"
// Also create array of all ports and open them.
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



// for(i=0;i<midiOutputDevices.length;i++){
//   midiOutputDevices[i].sendMessage([0x90,60,100]);
// }

var btnLEDSysEx = [0xf0, 0x47, 0x7f, 0x43, 0x65, 0x00, 0x04, 0, 0, 0, 0, 0xF7];
var gridBtnLEDcolor = JSON.parse('{"btn":[{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0}]}');

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


const LED_COLORS_NAMES = ["Off", "White", "White (dim)", "Red", "Red (dim)", "Green", "Green (dim)", "Blue", "Blue (dim)", "Aqua", "Aqua (dim)", "Yellow", "Yellow (dim)", "Magenta", "Magenta (dim)", "Orange"];

// @note note and scale defs
var noteColors = {};
noteColors.C = LED_COLOR_ORANGE;
noteColors.Csharp = LED_COLOR_YELLOW;
noteColors.Dflat = noteColors.Csharp;
noteColors.D = LED_COLOR_WHITE;
noteColors.Dsharp = LED_COLOR_YELLOW;
noteColors.Eflat = noteColors.Dsharp;
noteColors.E = LED_COLOR_WHITE;
noteColors.F = LED_COLOR_WHITE;
noteColors.Fsharp = LED_COLOR_YELLOW;
noteColors.Gflat = noteColors.Fsharp;
noteColors.G = LED_COLOR_WHITE;
noteColors.Gsharp = LED_COLOR_YELLOW;
noteColors.Aflat = noteColors.Gsharp;
noteColors.A = LED_COLOR_WHITE;
noteColors.Asharp = LED_COLOR_YELLOW;
noteColors.Bflat = noteColors.Asharp;
noteColors.B = LED_COLOR_WHITE;
noteColors.middleC = LED_COLOR_RED;

// Piano, chromatic, major, harmonic minor, melodic minor, Whole tone, diminished,
// major pentatonic, minor pentatonic, Japanese In Sen, Major bebop,
// dominant bebop, blues, arabic, Enigmatic, Neopolitan, Neopolitan minor,
// Hungarian minor, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian
var scales = {};
scales.indexNames = ["chromatic", "major", "harmMajor", "harmMinor", "melMinor", "wholeTone", "majorPent", "minorPent", "japInSen1", "japInSen2", "majBebop", "domBebop", "blues", "arabic", "enigmatic", "neoplitan", "neoplitanMinor", "hungarianMinor", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"];
scales.text = ["Chromatic", "Major", "Harmonic Major", "Harmonic Minor", "Melodic Minor", "Whole Tone", "Major Pentatonic", "Minor Pentatonic", "Japanese InSen 1", "Japanese InSen 2", "Major Bebop", "Dominant Bebop", "Blues", "Arabic", "Enigmatic", "Neoplitan", "Neoplitan Minor", "Hungarian Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
scales.noteColorIndexes = ["C", "Csharp", "D", "Dsharp", "E", "F", "Fsharp", "G", "Gsharp", "A", "Asharp", "B", "C", "Csharp", "D", "Dsharp", "E", "F", "Fsharp", "G", "Gsharp", "A", "Asharp", "B", "middleC"];
scales.noteNamesSharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
scales.noteNamesFlats = ["C", "D" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "D", "E" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "E", "F", "G" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "G", "A" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "A", "B" + String.fromCharCode(CHARCODE_FLAT_SYMBOL), "B"];
scales.chromatic = [...Array(12).keys()];
scales.major = [0, 2, 4, 5, 7, 9, 11];
scales.harmMinor = [0, 2, 3, 5, 7, 8, 11];
scales.harmMajor = [0, 2, 4, 5, 7, 8, 11];
scales.melMinor = [0, 2, 3, 5, 7, 9, 11];
scales.wholeTone = [0, 2, 4, 6, 8, 10];
scales.majorPent = [0, 2, 4, 7, 9];
scales.minorPent = [0, 3, 5, 7, 11];
scales.japInSen1 = [0, 1, 5, 7, 11];
scales.japInSen2 = [0, 1, 5, 7, 10];
scales.majBebop = [0, 2, 4, 5, 7, 8, 10];
scales.domBebop = [0, 2, 4, 5, 7, 9, 10, 11];
scales.blues = [0, 3, 5, 6, 7, 10];
scales.arabic = [0, 1, 4, 5, 7, 8, 11];
scales.enigmatic = [0, 1, 4, 6, 8, 10, 11];
scales.neoplitanMinor = [0, 1, 3, 5, 7, 8, 11];
scales.neoplitan = [0, 1, 3, 5, 7, 9, 11];
scales.hungarianMinor = [0, 2, 3, 6, 7, 8, 11];
scales.dorian = [0, 2, 3, 5, 7, 9, 10];
scales.phrygian = [0, 1, 3, 5, 7, 8, 10];
scales.lydian = [0, 2, 4, 6, 7, 9, 11];
scales.mixolydian = [0, 2, 4, 5, 7, 9, 10];
scales.aeolian = [0, 2, 3, 5, 7, 8, 10];
scales.locrian = [0, 1, 3, 5, 6, 8, 10];

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
  this.color.mode = "preset"; // "preset" or "rgb"
  this.color.preset = 5;
  this.defaults = {};
  this.defaults.noteData = 60;
  this.defaults.noteLength = 99;
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
  this.monophonicMode = false;
  this.defaultColor = 127;
  this.outputType = 1; // 1 for MIDI device output. 2 for control voltage output
  this.outputName = "MIDI Translator MIDI 1";
  this.outputIndex = null;
  this.midiChannel = 0;
  this.trackName = "Track" + (this.num < 10 ? "0" + (this.num + 1) : (this.num + 1));
  this.channel = 0;
  this.CVportNum = 0;
  this.trackMode = 0; // 0=Noraml mode, 1=Drum trigger mode  --  In drum trigger mode, the track shall be set to output one note across all events.
  this.defaultNote = 63;
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
    if (this.outputType == 1) {
      let midiDevice = false;
      let found = false;
      for (let i = 0; i < midiOutputDevicesNames.length; i++) {
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
      console.log("6");
      /** TODO: @todo CV gate stuff
       * **/
      return true;
    }
  }
  this.getNumberOfPatterns = function () {
    return Object.keys(this.patterns).length;
  }
}

var seq = {}; // object to hold state of things

seq.currentProjectID = uuidv4();
seq.currentProjectName = "default";

seq.track = [];
for (let i = 0; i < 5; i++) {
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

// @note Step Mode
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

// @note Alt Step MODE
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
  /** TODO: @todo implement altStep mode
   * **/
};

// @note Note Mode
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

  // updateAllGridBtnLEDs();
  clearOLEDmemMap();
  PlotStringToPixelMemMap("Note", 0, 0, 32);
  PlotStringToPixelMemMap("MODE", 0, 36, 16);
  FireOLED_SendMemMap(0);
  seq.state.OLEDmemMapContents = "noteMode";
  gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
  // gridBtnsScales("arabic", 0, 0, 3);
  updateAllNotGridBtnLEDS();
  updateAllGridBtnLEDs();
};

// @note gridBtnScales fn
// scale: text string for scale object name
// root: root note for the scale to start on
// offset: which note of the scale to start disaply on
// octave: starting octave for bottom row
function gridBtnsScales(scale, root = 0, offset = 0, octaveParam = 0) {
  let octave = octaveParam;
  root = root % 12; // limit parameter value to within range
  let scaleLength = scales[scale].length; // for readability
  offset = offset % scaleLength; // limit offset to be within scalelength
  let offsetAdd = Math.floor(scaleLength / 3);
  forLoopOuter1: for (let i = 48; i < 64;) { // bottom row of buttons
    for (let p = offset; p < scales[scale].length; p++) {
      let scaleStep = scales[scale][p];
      let noteValue = (octave * 12) + scaleStep + root;
      seq.mode.Note.notes[i].value = (noteValue < 0 ? 0 : noteValue);
      let noteAlpha = seq.mode.Note.notes[i].value % 12;
      let noteName = scales.noteColorIndexes[noteAlpha];
      let noteColor = 0;
      if (noteValue == 60) {
        noteColor = noteColors.middleC;
      } else if (noteAlpha == root) {
        noteColor = LED_COLOR_BLUE;
      } else {
        noteColor = noteColors[noteName];
      }
      seq.mode.Note.notes[i].color.red = noteColor >> 17 & 0x7f;
      seq.mode.Note.notes[i].color.grn = noteColor >> 9 & 0x7f;
      seq.mode.Note.notes[i].color.blu = noteColor >> 1 & 0x7f;
      i++;
      if (i > 63) {
        break forLoopOuter1;
      }
    }
    octave++;
    for (let p = 0; p < offset; p++) {
      let scaleStep = scales[scale][p];
      let noteValue = (octave * 12) + scaleStep + root;
      seq.mode.Note.notes[i].value = (noteValue < 0 ? 0 : noteValue);
      let noteAlpha = seq.mode.Note.notes[i].value % 12;
      let noteName = scales.noteColorIndexes[noteAlpha];
      let noteColor = 0;
      if (noteValue == 60) {
        noteColor = noteColors.middleC;
      } else if (noteAlpha == root) {
        noteColor = LED_COLOR_BLUE;
      } else {
        noteColor = noteColors[noteName];
      }
      seq.mode.Note.notes[i].color.red = noteColor >> 17 & 0x7f;
      seq.mode.Note.notes[i].color.grn = noteColor >> 9 & 0x7f;
      seq.mode.Note.notes[i].color.blu = noteColor >> 1 & 0x7f;
      i++;
      if (i > 63) {
        break forLoopOuter1;
      }
    }
  }
  octave = octaveParam + 1;
  offset = (offset + offsetAdd) % scaleLength;
  forLoopOuter2:
    for (let i = 32; i < 48;) { // row3
      for (let p = offset; p < scales[scale].length; p++) {
        let scaleStep = scales[scale][p];
        let noteValue = (octave * 12) + scaleStep + root;
        seq.mode.Note.notes[i].value = (noteValue < 0 ? 0 : noteValue);
        let noteAlpha = seq.mode.Note.notes[i].value % 12;
        let noteName = scales.noteColorIndexes[noteAlpha];
        let noteColor = 0;
        if (noteValue == 60) {
          noteColor = noteColors.middleC;
        } else if (noteAlpha == root) {
          noteColor = LED_COLOR_BLUE;
        } else {
          noteColor = noteColors[noteName];
        }
        seq.mode.Note.notes[i].color.red = noteColor >> 17 & 0x7f;
        seq.mode.Note.notes[i].color.grn = noteColor >> 9 & 0x7f;
        seq.mode.Note.notes[i].color.blu = noteColor >> 1 & 0x7f;
        i++;
        if (i > 47) {
          break forLoopOuter2;
        }
      }
      octave++;
      for (let p = 0; p < offset; p++) {
        let scaleStep = scales[scale][p];
        let noteValue = (octave * 12) + scaleStep + root;
        seq.mode.Note.notes[i].value = (noteValue < 0 ? 0 : noteValue);
        let noteAlpha = seq.mode.Note.notes[i].value % 12;
        let noteName = scales.noteColorIndexes[noteAlpha];
        let noteColor = 0;
        if (noteValue == 60) {
          noteColor = noteColors.middleC;
        } else if (noteAlpha == root) {
          noteColor = LED_COLOR_BLUE;
        } else {
          noteColor = noteColors[noteName];
        }
        seq.mode.Note.notes[i].color.red = noteColor >> 17 & 0x7f;
        seq.mode.Note.notes[i].color.grn = noteColor >> 9 & 0x7f;
        seq.mode.Note.notes[i].color.blu = noteColor >> 1 & 0x7f;
        i++;
        if (i > 47) {
          break forLoopOuter2;
        }
      }
    }
  offset = (offset + offsetAdd) % scaleLength;
  octave = octaveParam + 2;
  forLoopOuter3:
    for (let i = 16; i < 32;) { // row2
      for (let p = offset; p < scales[scale].length; p++) {
        let scaleStep = scales[scale][p];
        let noteValue = (octave * 12) + scaleStep + root;
        seq.mode.Note.notes[i].value = (noteValue < 0 ? 0 : noteValue);
        let noteAlpha = seq.mode.Note.notes[i].value % 12;
        let noteName = scales.noteColorIndexes[noteAlpha];
        let noteColor = 0;
        if (noteValue == 60) {
          noteColor = noteColors.middleC;
        } else if (noteAlpha == root) {
          noteColor = LED_COLOR_BLUE;
        } else {
          noteColor = noteColors[noteName];
        }
        seq.mode.Note.notes[i].color.red = noteColor >> 17 & 0x7f;
        seq.mode.Note.notes[i].color.grn = noteColor >> 9 & 0x7f;
        seq.mode.Note.notes[i].color.blu = noteColor >> 1 & 0x7f;
        i++;
        if (i > 31) {
          break forLoopOuter3;
        }
      }
      octave++;
      for (let p = 0; p < offset; p++) {
        let scaleStep = scales[scale][p];
        let noteValue = (octave * 12) + scaleStep + root;
        seq.mode.Note.notes[i].value = (noteValue < 0 ? 0 : noteValue);
        let noteAlpha = seq.mode.Note.notes[i].value % 12;
        let noteName = scales.noteColorIndexes[noteAlpha];
        let noteColor = 0;
        if (noteValue == 60) {
          noteColor = noteColors.middleC;
        } else if (noteAlpha == root) {
          noteColor = LED_COLOR_BLUE;
        } else {
          noteColor = noteColors[noteName];
        }
        seq.mode.Note.notes[i].color.red = noteColor >> 17 & 0x7f;
        seq.mode.Note.notes[i].color.grn = noteColor >> 9 & 0x7f;
        seq.mode.Note.notes[i].color.blu = noteColor >> 1 & 0x7f;
        i++;
        if (i > 31) {
          break forLoopOuter3;
        }
      }
    }
  offset = (offset + offsetAdd) % scaleLength;
  octave = octaveParam + 3;
  forLoopOuter4:
    for (let i = 0; i < 16;) { // row1
      for (let p = offset; p < scales[scale].length; p++) {
        let scaleStep = scales[scale][p];
        let noteValue = (octave * 12) + scaleStep + root;
        seq.mode.Note.notes[i].value = (noteValue < 0 ? 0 : noteValue);
        let noteAlpha = seq.mode.Note.notes[i].value % 12;
        let noteName = scales.noteColorIndexes[noteAlpha];
        let noteColor = 0;
        if (noteValue == 60) {
          noteColor = noteColors.middleC;
        } else if (noteAlpha == root) {
          noteColor = LED_COLOR_BLUE;
        } else {
          noteColor = noteColors[noteName];
        }
        seq.mode.Note.notes[i].color.red = noteColor >> 17 & 0x7f;
        seq.mode.Note.notes[i].color.grn = noteColor >> 9 & 0x7f;
        seq.mode.Note.notes[i].color.blu = noteColor >> 1 & 0x7f;
        i++;
        if (i > 15) {
          break forLoopOuter4;
        }
      }
      octave++;
      for (let p = 0; p < offset; p++) {
        let scaleStep = scales[scale][p];
        let noteValue = (octave * 12) + scaleStep + root;
        seq.mode.Note.notes[i].value = (noteValue < 0 ? 0 : noteValue);
        let noteAlpha = seq.mode.Note.notes[i].value % 12;
        let noteName = scales.noteColorIndexes[noteAlpha];
        let noteColor = 0;
        if (noteValue == 60) {
          noteColor = noteColors.middleC;
        } else if (noteAlpha == root) {
          noteColor = LED_COLOR_BLUE;
        } else {
          noteColor = noteColors[noteName];
        }
        seq.mode.Note.notes[i].color.red = noteColor >> 17 & 0x7f;
        seq.mode.Note.notes[i].color.grn = noteColor >> 9 & 0x7f;
        seq.mode.Note.notes[i].color.blu = noteColor >> 1 & 0x7f;
        i++;
        if (i > 15) {
          break forLoopOuter4;
        }
      }
    }
}

function btnNote() {
  this.value = 0;
  this.color = {};
  this.color.red = 0;
  this.color.grn = 0;
  this.color.blu = 0;
  this.timeout;
}

seq.mode.Note.bottomRowMode = 0;
seq.mode.Note.notes = [];
seq.mode.Note.octave = 3;
seq.mode.Note.root = 0;
seq.mode.Note.offset = 0;
seq.mode.Note.currentScale = 0;

for (let i = 0; i < 64; i++) {
  seq.mode.Note.notes.push(new btnNote());
}

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
  /** TODO: @todo implememtn drum mode
   * **/
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
  /** TODO: @todo implement perfomr mode
   * **/
};



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
seq.state.currentStepsPerBeat = 4;
seq.state.muteSoloBtnsLastPressed = null;
seq.state.gridBtnsPressedUpper = 0;
seq.state.gridBtnsPressedLower = 0;
seq.state.gridBtnsPressedLast = 0;
seq.state.gridBtnsTimeouts = new Array(64);
for (let i = 0; i < 64; i++) {
  seq.state.gridBtnsTimeouts[i] = {};
  seq.state.gridBtnsTimeouts[i].time = 0;
  seq.state.gridBtnsTimeouts[i].fn = null;
}
seq.state.muteSoloBtnsTimeouts = new Array(4);
for (let i = 0; i < 4; i++) {
  seq.state.muteSoloBtnsTimeouts[i] = {};
  seq.state.muteSoloBtnsTimeouts[i].time = 0;
  seq.state.muteSoloBtnsTimeouts[i].fn = null;
}
seq.state.noteTimeout = null;


seq.state.menu = {};
seq.state.menu.entered = false;
seq.state.menu.currentLevel = 0;
seq.state.menu.timeOut;

seq.state.buttonLedsUpdateInterval = setInterval(() => {
  clearInterval(seq.state.buttonLedsUpdateInterval);
}, 1);;

seq.settings = {};
seq.settings.general = {};
seq.settings.general.OLEDtimeout = 5; // number of seconds to wait before clearing the OLED
seq.settings.midi = {};
seq.settings.midi.clockInEnabled = false;
seq.settings.midi.clockInSource = null;
seq.settings.encoders = {};
seq.settings.encoders.banks = 4;
seq.settings.encoders.noteControl = false;
seq.settings.encoders.global = true;
seq.settings.encoders.control = new Array(16);
midiCCtypeName = ["abs", "rel1", "rel2", "rel1Inv", "rel2Inv"];
let count = 1;
for (let q = 0; q < 16; q++) {
  seq.settings.encoders.control[q] = new Array(4);
  for (let r = 0; r < 4; r++) {
    seq.settings.encoders.control[q][r] = {};
    seq.settings.encoders.control[q][r].name = "CC# " + count;
    seq.settings.encoders.control[q][r].midiCC = count++;
    seq.settings.encoders.control[q][r].value = 0;
    seq.settings.encoders.control[q][r].midiCCtype = midiCCtypeName[1]; // "rel1"; // abs, rel1 (127 = -1, 1 = +1), rel2 (63 = -1, 65 = +1), rel1Inv, rel2Inv
    seq.settings.encoders.control[q][r].midiOutPort = 5;
    seq.settings.encoders.control[q][r].midiOutChannel = 1;
    seq.settings.encoders.control[q][r].midiOutPortName = "USB Midi MIDI 1 ";
  }
}

seq.project = {};
seq.project.encoders = {};
seq.project.encoders.banks = 4;
seq.project.encoders.control = new Array(16);
count = 1;
for (let q = 0; q < 16; q++) {
  seq.project.encoders.control[q] = new Array(4);
  for (let r = 0; r < 4; r++) {
    seq.project.encoders.control[q][r] = {};
    seq.project.encoders.control[q][r].name = "CC# " + count;
    seq.project.encoders.control[q][r].midiCC = count++;
    seq.project.encoders.control[q][r].value = 0;
    seq.project.encoders.control[q][r].midiCCtype = "abs"; // abs, rel1 (127 = -1, 1 = +1), rel2 (63 = -1, 65 = +1), rel1Inv, rel2Inv
    seq.project.encoders.control[q][r].midiOutPort = 5;
    seq.project.encoders.control[q][r].midiOutChannel = 1;
    seq.project.encoders.control[q][r].midiOutPortName = "USB Midi MIDI 1 ";
  }
}

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
        seq.project.encoders.control[w][m].midiOutPort = null;
      }
    }
  }
}

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

// @toMove IPC
// need to also rewrite all ipc calls elsewhere in the file
/**************************************************************************************
@note Inter-Process Communications
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
var mainProcessSocket;

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
        ipc.server.emit(seqLoop_ipcSocket, 'requestMidiDevices');
        // console.log(socket);
      }
    );
    ipc.server.on('midiDevices', function(data,socket){
      // let midiDevices={};
      // midiDevices.in = midiInputDevicesNames;
      // midiDevices.out = midiOutputDevicesNames;
      // console.log(data);
      midiInputDevicesNames = data.in.names;
      midiOutputDevicesNames = data.out.names;
      midiInputDevicesEnabled = data.in.enabled;
      midiOutputDevicesEnabled = data.out.enabled;
      midiInputDevicesHidden = data.in.hidden;
      midiOutputDevicesHidden = data.out.hidden;
      // console.log(midiInputDevicesNames);
      seq.track.forEach(function (track, index) {
        track.updateOutputIndex();
      })
      ipc.server.emit(seqLoop_ipcSocket, 'seq.trackVar', seq.track);
    });
    ipc.server.on('wifiControlConnected', function (data, socket) {
      wifiControl.ipcSocket = socket;
      wifiControl.isEstablished = true;
      console.log("WiFi Control client has connected.");
      ipc.server.emit(wifiControl.ipcSocket, 'scanForNetworks');
      ipc.server.emit(wifiControl.ipcSocket, 'listSavedNetworks');
      ipc.server.emit(wifiControl.ipcSocket, 'connectToNetwork', {ssid: 'Wifi AC2.4',password: 'dodge5587856430'})
    });
    ipc.server.on('mainJSProcessConnected', function (data, socket) {
      mainProcessSocket = socket;
    });
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


// @toMove PlaNote
/**************************************************************************************
@note playNote
**************************************************************************************/
function playNote(eventData, socket = null, timeoutIndex = null) {
  // newTimingLogEntry("playnote : " + JSON.stringify(eventData));

  if (settings.osType != "Windows_NT") {
    let midiDevice = false;
    if (seq.track[eventData.track].outputIndex != null) {
      if (seq.track[eventData.track].outputType == 1) {
        midiDevice = midiOutputDevices[seq.track[eventData.track].outputIndex];
      } else {
        // do thing for CV GATE output
        /** TODO: @todo CV gate stuff
         **/
      }
    } else {
      // do not output anything since outputIndex is null. This would mean that a device has not been selected.
      return;
    }
    // parse eventData and generate midi data
    if (eventData.event.velocity > 0) {
      let newMidiMessage = [0, 0, 0];
      newMidiMessage[0] = 0x90 + seq.track[eventData.track].channel;
      newMidiMessage[1] = eventData.event.data;
      newMidiMessage[2] = eventData.event.velocity;
      // send midi data to device associated with track
      if (midiDevice != false) {
        midiDevice.sendMessage(newMidiMessage);
      }
      newMidiMessage[0] = 0x80 + seq.track[eventData.track].channel;
      if (eventData.lengthTime != null) {
        setTimeout(function () {
          if (midiDevice != false) {
            midiDevice.sendMessage(newMidiMessage);
          }
        }, eventData.lengthTime * 1000);
      } else if (seq.track[seq.state.selectedTrack].monophonicMode) {
        seq.state.noteTimeout = setTimeout(function () {
          if (midiDevice != false) {
            midiDevice.sendMessage(newMidiMessage);
          }
        }, 10000);
      }
    } else {
      let newMidiMessage = [0, 0, 0];
      newMidiMessage[0] = 0x80 + seq.track[eventData.track].channel;
      newMidiMessage[1] = eventData.event.data;
      newMidiMessage[2] = eventData.event.velocity;
      // send midi data to device associated with track
      if (midiDevice != false) {
        midiDevice.sendMessage(newMidiMessage);
      }
    }
  }
  // newTimingLogEntry("playnote : '" + JSON.stringify(eventData) + "' : done");
}


// @toMove midiOutCC
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


let oldBtn = new Array(4);
for (let k = 0; k < 4; k++) {
  oldBtn[k] = 0;
}
// highlight the current step in the grid
/* #region  stepHighlight(stepNumber) */
// @note step highlight
function stepHighlight(stepNumber) {
  seq.state.playing = true;


  // need  to set grid button led colors to white for the step seq is on.
  // this should only be done for tracks whose patterns are in view of the current step.
  // i.e., if a track is 32 steps long and currentl showing steps 17-32, then that track
  // should get the step highligh when those steps would be playing. if a pattern is 8 steps,
  // it will be shown twice.
  // if (seq.mode.current == 0) {
  switch (seq.mode.current) {
    case 0:
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
      // @todo make highlights for note-mode/bottom row
      break;
  }
}

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
    switch (message[0]) {
      case 144: // @note note-on event
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

              // reset menu stuff so that we dont enter old menus
              resetMenus();
              seq.state.gridBtnsTimeouts[btnIndex].time = Date.now();
              seq.state.gridBtnsTimeouts[btnIndex].fn = btn => {
                let track = seq.track[seq.state.selectedTrackRange + ((btn / 16) & 0xff)]; // determine which track is associated with row the button is on.
                curPat = track.patterns["id_" + track.currentPattern];
                if (curPat.patIsStepBased) {
                  let step = (btn % 16) + (curPat.viewArea * 16); // step in the row
                  if (curPat.events["id_" + step] != undefined) {
                    curPat.events["id_" + step].enabled = !curPat.events["id_" + step].enabled;
                  }
                }
                sendTrackUpdateToSeqLoop();
                updateAllGridBtnLEDs();
                displayTrackAndPatInfo(track, curPat);
              };
              break;
            case 1: // note mode
              switch (seq.mode.Note.bottomRowMode) {
                case 0: // bottome row extends notes
                  let noteData = {};
                  noteData.track = seq.state.selectedTrack;
                  noteData.lengthTime = null;
                  noteData.event = {};
                  noteData.event.startTimePatternOffset = 0;
                  noteData.event.data = seq.mode.Note.notes[btnIndex].value;
                  noteData.event.velocity = message[2];
                  clearOLEDmemMap();
                  PlotStringToPixelMemMap(scales.noteNamesSharps[noteData.event.data % 12], 0, 0, 32, 1);
                  FireOLED_SendMemMap();
                  if (seq.track[seq.state.selectedTrack].monophonicMode && seq.state.noteTimeout != null) {
                    if (!seq.state.noteTimeout._called) {
                      seq.state.noteTimeout._onTimeout();
                      clearTimeout(seq.state.noteTimeout);
                    }
                  }
                  playNote(noteData);
                  break;
                case 1: // bottom row shows current pattern
                  if (btnIndex < 48) {
                    let noteData = {};
                    noteData.track = seq.state.selectedTrack;
                    noteData.lengthTime = null;
                    noteData.event = {};
                    noteData.event.startTimePatternOffset = 0;
                    noteData.event.data = seq.mode.Note.notes[btnIndex].value;
                    noteData.event.velocity = message[2];
                    clearOLEDmemMap();
                    PlotStringToPixelMemMap(scales.noteNamesSharps[noteData.event.data % 12], 0, 0, 32, 1);
                    FireOLED_SendMemMap();
                    if (seq.track[seq.state.selectedTrack].monophonicMode && seq.state.noteTimeout != null) {
                      if (!seq.state.noteTimeout._called) {
                        seq.state.noteTimeout._onTimeout();
                        clearTimeout(seq.state.noteTimeout);
                      }
                    }
                    playNote(noteData);
                  }
                  selTrack = seq.track[seq.state.selectedTrack];
                  curPat = selTrack.patterns["id_" + selTrack.currentPattern];
                  // newTimingLogEntry("2");
                  let numBtnsPressed = bitCount(seq.state.gridBtnsPressedUpper) + bitCount(seq.state.gridBtnsPressedLower);
                  // newTimingLogEntry("2");
                  let row4Bits = seq.state.gridBtnsPressedUpper >>> 16;
                  let row3Bits = seq.state.gridBtnsPressedUpper & 0xffff;
                  step = getBitPosition(row4Bits) + (curPat.viewArea * 16); // step in the row
                  if (getBitPosition(seq.state.gridBtnsPressedLower) != null && curPat.events["id_" + step] != undefined && numBtnsPressed == 2) {
                    curPat.events["id_" + step].data = seq.mode.Note.notes[getBitPosition(seq.state.gridBtnsPressedLower)].value;
                    // log(seq.mode.Note.notes[getBitPosition(seq.state.gridBtnsPressedLower)].value);
                  } else if (getBitPosition(row3Bits) != null && curPat.events["id_" + step] != undefined && numBtnsPressed == 2) {
                    curPat.events["id_" + step].data = seq.mode.Note.notes[getBitPosition(row3Bits) + 32].value;
                  }
                  sendTrackUpdateToSeqLoop();
                  break;
                case 2: // bottom row controls octave, offset, and root note
                  if (btnIndex < 48) {
                    let noteData = {};
                    noteData.track = seq.state.selectedTrack;
                    noteData.lengthTime = null;
                    noteData.event = {};
                    noteData.event.startTimePatternOffset = 0;
                    noteData.event.data = seq.mode.Note.notes[btnIndex].value;
                    noteData.event.velocity = message[2];
                    clearOLEDmemMap();
                    PlotStringToPixelMemMap(scales.noteNamesSharps[noteData.event.data % 12], 0, 0, 32, 1);
                    FireOLED_SendMemMap();
                    if (seq.track[seq.state.selectedTrack].monophonicMode && seq.state.noteTimeout != null) {
                      if (!seq.state.noteTimeout._called) {
                        seq.state.noteTimeout._onTimeout();
                        clearTimeout(seq.state.noteTimeout);
                      }
                    }
                    playNote(noteData);
                  } else {
                    switch (btnIndex) {
                      case 48:
                        if (seq.mode.Note.octave > 0) {
                          seq.mode.Note.octave--;
                          gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
                        }
                        updateAllGridBtnLEDs();
                        break;
                      case 49:
                        if (seq.mode.Note.offset > 0) {
                          seq.mode.Note.offset--;
                          gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
                          updateAllGridBtnLEDs();
                        }
                        break;
                      case 62:
                        if (seq.mode.Note.offset < 11) {
                          seq.mode.Note.offset++;
                          gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
                          updateAllGridBtnLEDs();
                        }
                        break;
                      case 63:
                        if (seq.mode.Note.octave < 5) {
                          seq.mode.Note.octave++;
                          gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
                        }
                        updateAllGridBtnLEDs();
                        break;
                      default:
                        seq.mode.Note.root = btnIndex - 50;
                        gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
                        updateAllGridBtnLEDs();
                    }
                  }
                  break;
                default:
              }
              break;
            case 2: // drum mode
              /** TODO: @todo note-on in drum mode
               * **/
              break;
            case 3: // perform mode
              /** TODO: @todo note-on in perform mode
               * **/
              break;
            case 4: // alt-step mode
              /** TODO: @todo note-on in altStep mode
               * **/
              break;
          }
        }
        // let newMessage = [0xB0, 0, 0];
        switch (message[1]) {
          case 53: // @note rec button
            clearOLEDmemMap();
            PlotStringToPixelMemMap("REC", 0, 0, 32, 2);

            /** TODO: @todo note-on for rec button
             *  **/
            // make rec mode work

            PlotStringToPixelMemMap("Not working.", 0, 35, 16, 1);
            seq.state.OLEDmemMapContents = "REC";
            FireOLED_SendMemMap();
            if (seqLoop_ipcIsEstablished) {
              ipc.server.emit(seqLoop_ipcSocket, 'seqRec');
            }
            break;
          case 52: // @note stop button
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
          case 51: // @note play button
            clearOLEDmemMap();
            PlotStringToPixelMemMap("PLAY", 0, 0, 32, 2);
            seq.state.OLEDmemMapContents = "PLAY";
            FireOLED_SendMemMap(0);
            notGridBtnLEDS[PLAY_BTN_LED] = PATSONG_PLAY_GREEN;
            updateAllNotGridBtnLEDS();
            if (seqLoop_ipcIsEstablished && seq.state.playEnabled) {
              ipc.server.emit(seqLoop_ipcSocket, 'seqPlay', seq.state.currentStepsPerBeat);
            } else if (!seqLoop_ipcIsEstablished) {
              console.log("Cannot play because the SeqLoop client is not connectd.");
            } else if (!seq.state.playEnabled) {
              console.log("Cannot play because the play function has been disabled.");
            }
            break;
          case 50: // @note pat/song button
            /** TODO: @todo figure out pat/song metronome button
             * **/
            // not really sure what to do with this button. Do I want to try and make a song mode?
            // also need to implement midi clock and use the shift+pat/song button to en/disable it.

            // PlotStringToPixelMemMap(String.fromCharCode(CHARCODE_LEFTARROW, CHARCODE_RIGHTARROW), PlotStringToPixelMemMap(String.fromCharCode(CHARCODE_UPARROW, CHARCODE_DOWNARROW), 0, 0, 16, 2, 0), 0, 16, 2, 0);
            // FireOLED_SendMemMap(0);
            break;
          case 49: // @note alt button
            // when rpeseed, set alt flag
            seq.state.altPressed = true;

            /** TODO: @todo light up btns on alt
             * **/
            // Need to light up only the buttons that have alt function
            break;
          case 48: // shift button
            // when pressed, set shift flag
            seq.state.shiftPressed = true;

            /** TODO: @todo light up btns on shift
             * **/
            // Need to light up only the buttons that have shift function
            break;
          case 47: // @note Perform button
            seq.mode.Perform();
            break;
          case 46: // @note Drum button
            seq.mode.Drum();
            break;
          case 45: // @note Note button
            seq.mode.Note();
            break;
          case 44: // @note step button
            if (seq.state.altPressed) {
              seq.mode.altStep();
            } else {
              seq.mode.Step();
            }
            break;
          case 39: // track four mute/solo button
          case 38: // track three mute/solo button
          case 37: // track two mute/solo button
          case 36: // @note track one mute/solo button
            // soloMuteTrackSelectUpdate(message[1] - 36);
            resetMenus();
            let btn = message[1] - 36;
            seq.state.muteSoloBtnsLastPressed = 1 << btn;
            seq.state.muteSoloBtnsTimeouts[btn].time = Date.now();
            seq.state.muteSoloBtnsTimeouts[btn].fn = soloMuteTrackSelectUpdate;
            break;
          case 35: // @note grid right
            // non-shift, non-alt
            // shift grid right by 16 steps for current selected track and pattern, unless it is at the end of the pattern.
            selTrack = seq.track[seq.state.selectedTrack];
            curPat = selTrack.patterns["id_" + selTrack.currentPattern];


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
            sendTrackUpdateToSeqLoop();
            updateAllGridBtnLEDs();
            displayTrackAndPatInfo(seq.track[seq.state.selectedTrack], seq.track[seq.state.selectedTrack].patterns["id_" + seq.track[seq.state.selectedTrack].currentPattern]);
            break;
          case 34: // @note grid left
            // non-shift, non-alt
            // shift grid left by 16 steps for current selected track and pattern, unless it is at the end of the pattern.
            selTrack = seq.track[seq.state.selectedTrack];
            curPat = selTrack.patterns["id_" + selTrack.currentPattern];

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
            sendTrackUpdateToSeqLoop();
            updateAllGridBtnLEDs();
            displayTrackAndPatInfo(seq.track[seq.state.selectedTrack], seq.track[seq.state.selectedTrack].patterns["id_" + seq.track[seq.state.selectedTrack].currentPattern]);
            break;
          case 33: // @note browser button
            // seq.state.immediateTrackUpdates = !seq.state.immediateTrackUpdates;
            // ipc.server.emit(seqLoop_ipcSocket,'setITU', seq.state.immediateTrackUpdates);

            /** TODO: @todo browser button note-on, figure out what to do with this button.
             * **/
            // figure out somethig to use this button for
            // no seriously, what can it be used for?
            // newTimingLogEntry("start of all test");
            // performanceTestFnsToMove();
            // newTimingLogEntry("end of all test");
            // newTimingLogEntry("strings");
            // testSpeedOfAccessingObjectsByUsingStrings(10000);
            // newTimingLogEntry("strings done");
            // newTimingLogEntry("direct");
            // testSpeedOfAccessingObjectsByOtherWay(10000);
            // newTimingLogEntry("direct done");
            // writeTimingLogToFile();

            // selTrack = seq.track[seq.state.selectedTrack];
            // curPat = selTrack.patterns["id_" + selTrack.currentPattern];
            // saveProject(uuidv4(), "default");

            break;
          case 32: // @note pattern down button

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
              /** TODO: @todo pat down + alt + shift
               **/
            }

            // Need to display the selected pattern number when it changes
            displayTrackAndPatInfo(selTrack, selTrack.patterns["id_" + selTrack.currentPattern]);
            updateAllGridBtnLEDs();
            break;
          case 31: // @note pattern up button
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
          case 26: // @note encoder bank button
            // timout to reset back to bank 0 or 1
            seq.state.encoderBankTimeout = Date.now();
            seq.state.encoderBank++;
            setEncoderBankLEDs();
            break;
          case 25: // @note Select button
            /**
             * when pressed with no other buttons pressed, should do menu for changing things like
             * tempo, viewable track range, etc when in step mode
             * note layout, steps viewable, etc when in note mode
             */
            if (seq.state.shiftPressed && !seq.state.menu.entered) { // enter the main menu
              // enter the menu
              enterMenuWithTimeout(settingsMainMenu, 5000);
            } else if (seq.state.shiftPressed && seq.state.menu.entered) {
              seq.state.menu.timeOut.refresh();
              settingsMenu(4);
            } else if (seq.state.menu.entered) {
              seq.state.menu.timeOut.refresh();
              settingsMenu(3);
            } else if ((seq.state.gridBtnsPressedLower != 0 || seq.state.gridBtnsPressedUpper != 0) && !seq.state.altPressed && !seq.state.shiftPressed && !seq.state.menu.entered && seq.mode.current == 0) { // not shift, not alt, grid btn pressed
              // a grid btn is pressed
              enterMenuWithTimeout(stepMenu, 3000);
            } else if (seq.mode.current == 0 && seq.state.muteSoloBtnsLastPressed > 0 && !seq.state.shiftPressed && !seq.state.altPressed && !seq.state.menu.entered) {
              // mute / solo button is pressed
              enterMenuWithTimeout(soloTrackMenu, 3000);
            } else if (seq.state.encBeingTouched != 0 && !seq.state.menu.entered) {
              enterMenuWithTimeout(encodersMenu, 3000);
            } else if (!seq.state.shiftPressed && !seq.state.altPressed && !seq.state.menu.entered && seq.mode.current == 0) {
              enterMenuWithTimeout(bpmMenu, 3000);
            } else if (!seq.state.shiftPressed && !seq.state.altPressed && !seq.state.menu.entered && seq.mode.current == 1) {
              enterMenuWithTimeout(scalesMenu, 3000);
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
        // sendTrackUpdateToSeqLoop();
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
          switch (seq.mode.current) {
            case 0:
              // let track = seq.track[seq.state.selectedTrackRange + ((btnIndex / 16) & 0xff)]; // determine which track is associated with row the button is on.
              //     curPat = track.patterns["id_" + track.currentPattern];
              //     if (curPat.patIsStepBased) {
              //       step = (btnIndex % 16) + (curPat.viewArea * 16); // step in the row
              //       if (curPat.events["id_" + step] != undefined) {
              //         curPat.events["id_" + step].enabled = !curPat.events["id_" + step].enabled;
              //       }
              //       sendTrackUpdateToSeqLoop();
              //     }
              //     updateAllGridBtnLEDs();
              //     displayTrackAndPatInfo(track, curPat);
              if (Date.now() - seq.state.gridBtnsTimeouts[btnIndex].time < 100) {
                seq.state.gridBtnsTimeouts[btnIndex].fn(btnIndex);

              }
              // sendTrackUpdateToSeqLoop();

              break;
            case 1: // note mode
              switch (seq.mode.Note.bottomRowMode) {
                case 0:
                  let noteData = {};
                  noteData.track = seq.state.selectedTrack;
                  noteData.lengthTime = null;
                  noteData.event = {};
                  noteData.event.startTimePatternOffset = 0;
                  noteData.event.data = seq.mode.Note.notes[btnIndex].value;
                  noteData.event.velocity = 0;
                  playNote(noteData);
                  break;
                case 1:
                case 2:
                  if (btnIndex < 48) {
                    let noteData = {};
                    noteData.track = seq.state.selectedTrack;
                    noteData.lengthTime = null;
                    noteData.event = {};
                    noteData.event.startTimePatternOffset = 0;
                    noteData.event.data = seq.mode.Note.notes[btnIndex].value;
                    noteData.event.velocity = 0;
                    playNote(noteData);
                  }
                  break;
                default:
              }
              break;
          }
        }
        switch (message[1]) {
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
          case 38: // track three mute/solo button
          case 37: // track two mute/solo button
          case 36: // track one mute/solo button
            let btn = message[1] - 36;
            seq.state.muteSoloBtnsLastPressed = 0;
            if (Date.now() - seq.state.muteSoloBtnsTimeouts[btn].time < 250) {
              seq.state.muteSoloBtnsTimeouts[btn].fn(btn);
            }
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
            if (Date.now() - seq.state.encoderBankTimeout > 1000) {
              seq.state.encoderBank = 0;
            }
            setEncoderBankLEDs();
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
              // @note select encoder down / CCW
              if (seq.state.altPressed && seq.state.shiftPressed) {
                seq.track.push(new defaultTrack());
                seq.track[seq.track.length - 1].addPattern(16, seq.state.currentBPM, 4);
              } else if (seq.state.menu.entered) {
                // draw the menu items
                seq.state.menu.timeOut.refresh();
                settingsMenu(1);
              } else {
                if (seq.state.selectedTrackRange < seq.track.length - 4) {
                  seq.state.selectedTrackRange++;
                  seq.state.selectedTrack++;
                }
                updateAllNotGridBtnLEDS();
                updateAllGridBtnLEDs();
                selTrack = seq.track[seq.state.selectedTrack];
                curPat = selTrack.patterns["id_" + selTrack.currentPattern];
                displayTrackAndPatInfo(selTrack, curPat);
              }
            } else if (message[2] == 1) {
              // @note select encoder up / CW
              if (seq.state.menu.entered) {
                seq.state.menu.timeOut.refresh();
                settingsMenu(2);
              } else {
                if (seq.state.selectedTrackRange > 0) {
                  seq.state.selectedTrackRange--;
                  seq.state.selectedTrack--;
                }
                updateAllNotGridBtnLEDS();
                updateAllGridBtnLEDs();
                selTrack = seq.track[seq.state.selectedTrack];
                curPat = selTrack.patterns["id_" + selTrack.currentPattern];
                displayTrackAndPatInfo(selTrack, curPat);
              }
            } else {
              // non useful
            }
            sendTrackUpdateToSeqLoop();
            break;
          case 19: // @note encBank #4
          case 18: // @note encBank #3
          case 17: // @note encBank #2
          case 16: // @note encBank #1
            encBankUpdate(message[1] - 16, message[2]);
            break;
        }
        break;
      default:
        console.log("event not recognised");
    }
  }
});

function resetMenus() {
  seq.settings.menu.currentMenu = null;
  seq.state.menu.entered = false;
  clearTimeout(seq.state.menu.timeOut);
}

function enterMenuWithTimeout(aMenu, aTime_ms) {
  seq.state.menu.entered = true;;
  seq.state.menu.timeOut = setTimeout(() => {
    clearOLEDmemMap();
    FireOLED_SendMemMap();
    seq.state.menu.entered = false;
  }, aTime_ms);
  settingsMenu(0, aMenu);
}

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
  sendTrackUpdateToSeqLoop();
  updateAllNotGridBtnLEDS();
  selTrack = seq.track[seq.state.selectedTrack];
  curPat = selTrack.patterns["id_" + selTrack.currentPattern];
  displayTrackAndPatInfo(selTrack, curPat);

}


function sendTrackUpdateToSeqLoop() {
  if (!seqLoop_ipcIsEstablished) {
    return;
  }
  if (sendTrackUpdateToSeqLoop.lastUpdate === "undefined") {
    sendTrackUpdateToSeqLoop.lastUpdate = Date.now();
    ipc.server.emit(seqLoop_ipcSocket, 'seq.trackVar', seq.track);
    return;
  }
  let timeMillis = Date.now();
  if (timeMillis - sendTrackUpdateToSeqLoop.lastUpdate < 50) {
    return;
  }
  sendTrackUpdateToSeqLoop.lastUpdate = Date.now();
  // setTimeout(() => {
  ipc.server.emit(seqLoop_ipcSocket, 'seq.trackVar', seq.track);
  // }, 50);
}

function encoderTouch(encIndex = null) {
  let globalOrProject = seq.settings.encoders.global ? "settings" : "project";
  let noteControlEn = seq.settings.encoders.noteControl;
  clearOLEDmemMap();
  if (!noteControlEn) {
    ctrlName = seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].name;
    PlotStringToPixelMemMap(seq.settings.encoders.global ? "Glbl Ctrl Name:" : "Controller Name:", 0, 0, 16);
    PlotStringToPixelMemMap(ctrlName, 0, 20, 16);
    if (typeof seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value == "string") {
      PlotStringToPixelMemMap(seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value + "    ", 0, 40, 16);
    } else {
      PlotStringToPixelMemMap(seq[globalOrProject].encoders.control[seq.state.encoderBank][encIndex].value.toString() + "    ", 0, 40, 16);
    }
    FireOLED_SendMemMap(0);
    seq.state.OLEDmemMapContents = "encoder" + (encIndex + 16);
  } else {
    // @todo implement encoder note control
  }
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
    if (seq.settings.encoders.banks == 4) {
      if (seq.state.encoderBank >= 4) {
        seq.state.encoderBank = 0;
      }
      notGridBtnLEDS[23] = seq.state.encoderBank;
    } else if (seq.settings.encoders.banks == 16) {
      if (seq.state.encoderBank == 16) {
        seq.state.encoderBank = 0;
      }
      notGridBtnLEDS[23] = seq.state.encoderBank + 16;
    }
  } else {
    if (seq.project.encoders.banks == 4) {
      if (seq.state.encoderBank >= 4) {
        seq.state.encoderBank = 0;
      }
      notGridBtnLEDS[23] = seq.state.encoderBank;
    } else if (seq.project.encoders.banks == 16) {
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
function PlotStringToPixelMemMap(inString, xOrigin, yOrigin, heightPx, spacing = 1, invert = false, noDraw = false) {
  // newTimingLogEntry("PlotStringToPixelMemMap : "+inString);
  let font;
  let widthOverflow = false;
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
    if (!noDraw) {
      PlotBitmapToPixelMemmap(currentCharData, cursor, yOrigin, currentCharWidth, heightPx, invert ? 1 : 0);
    }
    cursor += currentCharWidth;
    if (font[inString.charCodeAt(i + 1) - 32] != undefined) { // If there are still characters in the string to plot
      if (cursor + spacing + (font[inString.charCodeAt(i + 1) - 32][font[inString.charCodeAt(i + 1) - 32].length - 1]) > 127) {
        widthOverflow = true;
        break;
      }
    }
    if (spacing > 0) {
      let spaceBitmap = new Array(Math.ceil(spacing / 8) * heightPx);
      for (let g = 0; g < spaceBitmap.length; g++) {
        spaceBitmap[g] = 0;
      }
      if (!noDraw) {
        PlotBitmapToPixelMemmap(spaceBitmap, cursor, yOrigin, spacing, heightPx, invert ? 1 : 0);
      }
    }
    cursor += spacing;
  }
  // newTimingLogEntry("PlotStringToPixelMemMap : "+inString+" : Done");
  if (widthOverflow) {
    return 128;
  }
  return cursor;
}

/*************************************************************************************************
 * @note updateAllGridBtnLEDs()
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
  } else if (seq.mode.current == 1) {
    switch (seq.mode.Note.bottomRowMode) {
      case 0: // bottom row extends keyboard
        for (let i = 0; i < 64; i++) {
          gridBtnLEDcolor.btn[i].red = seq.mode.Note.notes[i].color.red;
          gridBtnLEDcolor.btn[i].grn = seq.mode.Note.notes[i].color.grn;
          gridBtnLEDcolor.btn[i].blu = seq.mode.Note.notes[i].color.blu;
        }
        break;
      case 1: // bottom row is current pattern on current track
        for (let i = 0; i < 48; i++) {
          gridBtnLEDcolor.btn[i].red = seq.mode.Note.notes[i].color.red;
          gridBtnLEDcolor.btn[i].grn = seq.mode.Note.notes[i].color.grn;
          gridBtnLEDcolor.btn[i].blu = seq.mode.Note.notes[i].color.blu;
        }

        let i = seq.state.selectedTrack;
        for (let y = 0; y < 16; y++) {
          if ((seq.track[i].patterns["id_" + seq.track[i].currentPattern].patLength < 16) && (y < seq.track[i].patterns["id_" + seq.track[i].currentPattern].patLength)) {
            if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].events["id_" + y] != undefined) {
              if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].events["id_" + y].enabled) {
                gridBtnLEDcolor.btn[48 + y].red = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.red;
                gridBtnLEDcolor.btn[48 + y].grn = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.grn;
                gridBtnLEDcolor.btn[48 + y].blu = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.blu;
              } else {
                gridBtnLEDcolor.btn[48 + y].red = 0;
                gridBtnLEDcolor.btn[48 + y].grn = 0;
                gridBtnLEDcolor.btn[48 + y].blu = 0;
              }
            } else {
              gridBtnLEDcolor.btn[48 + y].red = 0;
              gridBtnLEDcolor.btn[48 + y].grn = 0;
              gridBtnLEDcolor.btn[48 + y].blu = 0;
            }
          } else if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].patLength < 16) {
            gridBtnLEDcolor.btn[48 + y].red = 0;
            gridBtnLEDcolor.btn[48 + y].grn = 0;
            gridBtnLEDcolor.btn[48 + y].blu = 0;
          } else {
            if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].events["id_" + (y + (seq.track[i].patterns["id_" + seq.track[i].currentPattern].viewArea * 16))] != undefined) {
              if (seq.track[i].patterns["id_" + seq.track[i].currentPattern].events["id_" + (y + (seq.track[i].patterns["id_" + seq.track[i].currentPattern].viewArea * 16))].enabled) {
                gridBtnLEDcolor.btn[48 + y].red = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.red;
                gridBtnLEDcolor.btn[48 + y].grn = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.grn;
                gridBtnLEDcolor.btn[48 + y].blu = seq.track[i].patterns["id_" + seq.track[i].currentPattern].color.blu;
              } else {
                gridBtnLEDcolor.btn[48 + y].red = 0;
                gridBtnLEDcolor.btn[48 + y].grn = 0;
                gridBtnLEDcolor.btn[48 + y].blu = 0;
              }
            } else {
              gridBtnLEDcolor.btn[48 + y].red = 0;
              gridBtnLEDcolor.btn[48 + y].grn = 0;
              gridBtnLEDcolor.btn[48 + y].blu = 0;
            }
          }
        }
        break;
      case 2: // root note selection and octave up/down
        for (let i = 0; i < 48; i++) {
          gridBtnLEDcolor.btn[i].red = seq.mode.Note.notes[i].color.red;
          gridBtnLEDcolor.btn[i].grn = seq.mode.Note.notes[i].color.grn;
          gridBtnLEDcolor.btn[i].blu = seq.mode.Note.notes[i].color.blu;
        }

        gridBtnLEDcolor.btn[48].red = LED_COLOR_GREEN >> 17 & 0x7f;
        gridBtnLEDcolor.btn[48].grn = LED_COLOR_GREEN >> 9 & 0x7f;
        gridBtnLEDcolor.btn[48].blu = LED_COLOR_GREEN >> 1 & 0x7f;
        gridBtnLEDcolor.btn[49].red = LED_COLOR_BLUE >> 17 & 0x7f;
        gridBtnLEDcolor.btn[49].grn = LED_COLOR_BLUE >> 9 & 0x7f;
        gridBtnLEDcolor.btn[49].blu = LED_COLOR_BLUE >> 1 & 0x7f;
        gridBtnLEDcolor.btn[62].red = LED_COLOR_BLUE >> 17 & 0x7f;
        gridBtnLEDcolor.btn[62].grn = LED_COLOR_BLUE >> 9 & 0x7f;
        gridBtnLEDcolor.btn[62].blu = LED_COLOR_BLUE >> 1 & 0x7f;
        gridBtnLEDcolor.btn[63].red = LED_COLOR_GREEN >> 17 & 0x7f;
        gridBtnLEDcolor.btn[63].grn = LED_COLOR_GREEN >> 9 & 0x7f;
        gridBtnLEDcolor.btn[63].blu = LED_COLOR_GREEN >> 1 & 0x7f;

        for (let i = 2; i < 14; i++) {
          let noteColor = noteColors[scales.noteColorIndexes[i - 2]];
          gridBtnLEDcolor.btn[48 + i].red = noteColor >> 17 & 0x7f;
          gridBtnLEDcolor.btn[48 + i].grn = noteColor >> 9 & 0x7f;
          gridBtnLEDcolor.btn[48 + i].blu = noteColor >> 1 & 0x7f;
        }
        break;
      default:
    }
  }

  let count = 0;
  clearInterval(seq.state.buttonLedsUpdateInterval);
  seq.state.buttonLedsUpdateInterval = setInterval(function () {
    // for(let i = 0; i < 64; i ++){
    let sysEx = btnLEDSysEx;
    sysEx[7] = count;
    sysEx[8] = (gridBtnLEDcolor.btn[count].red) & 0x7f;
    sysEx[9] = (gridBtnLEDcolor.btn[count].grn) & 0x7f;
    sysEx[10] = (gridBtnLEDcolor.btn[count].blu) & 0x7f;
    fireMidiOut.sendMessage(sysEx);
    count++;
    if (count > 63) {
      clearInterval(seq.state.buttonLedsUpdateInterval);
    }
    // }
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

function between(x, num1, num2, inclusive = true) {
  // return addon.between(x,num1,num2,inclusive);
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

function bitCount(n) {
  n = n - ((n >> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
  return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}

function getBitPosition(n) {
  let m = n;
  if (bitCount(n) > 1) return null;
  for (let i = 0; i < 64; i++) {
    if (m & 1) return i;
    m = n >>> (i + 1);
  }
  return null;
}

seq.settings.menu = {};
seq.settings.menu.currentMenu = 0;

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
function settingsMenu(action, menuToEnter = null) {
  switch (action) {
    case 0: // begin menu

      if (menuToEnter != null) {
        seq.settings.menu.currentMenu = menuToEnter;

      } else {
        seq.settings.menu.currentMenu = settingsMainMenu;
      }
      break;
    case 1: // selection down

      if (seq.settings.menu.currentMenu.isSubMenu) {
        if (seq.settings.menu.currentMenu.currentSelectedItem < seq.settings.menu.currentMenu.subMenuItems.length - 1) {
          seq.settings.menu.currentMenu.currentSelectedItem++;
          if (seq.settings.menu.currentMenu.currentSelectedItem > seq.settings.menu.currentMenu.currentDisplayRange + (seq.settings.menu.currentMenu.fontSize == 16 ? 3 : 1)) {
            seq.settings.menu.currentMenu.currentDisplayRange++;
          }
        }
      } else if (seq.settings.menu.currentMenu.isMenuItem) {
        seq.settings.menu.currentMenu.downActionFn();
      }
      break;
    case 2: // selection up

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

      // if (seq.settings.menu.currentMenu.isSubMenu && (seq.settings.menu.currentMenu.parentDisplayText == null) && (seq.settings.menu.currentMenu.parentMenu == null)) {
      if (seq.settings.menu.currentMenu.parentMenu == null) {

        clearTimeout(seq.state.menu.timeOut);
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
      seq.settings.menu.currentMenu.displayFn(seq.settings.menu.currentMenu.generateFn(seq.settings.menu.currentMenu.currentSelectedItem)).forEach(function (item, i) {
        displayStrings.push(item);
      });
    }
    clearOLEDmemMap();

    // This value represents the number of display lines minus 1 for easy math later.
    let numLines = 1; // defaults to value for size 32 text
    if (seq.settings.menu.currentMenu.fontSize == 16) {
      numLines = 3;
    } else if (seq.settings.menu.currentMenu.fontSize == 24) {
      numLines = 2;
    }

    displayStrings.forEach(function (item, i) {
      let curSelection = seq.settings.menu.currentMenu.currentSelectedItem;
      let curDispRange = seq.settings.menu.currentMenu.currentDisplayRange;
      // newTimingLogEntry("1x");
      if (between(i, curDispRange, curDispRange + numLines)) {
        // newTimingLogEntry("1");
        PlotStringToPixelMemMap(item, 0, (i - curDispRange) * seq.settings.menu.currentMenu.fontSize, seq.settings.menu.currentMenu.fontSize, seq.settings.menu.currentMenu.fontSize == 16 ? 1 : 0, i == curSelection ? 1 : 0);
      }
    })
    FireOLED_SendMemMap();
  } // end of re-rendering prevention

}


// @note MenuItem constructor function
function menuItem(text, upFn, dwnFn, selFn, genFn, dispFn, parent, goBack = false, textSize = 16) {
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
  this.fontSize = textSize;
}

// @note subMenu constructor function
function subMenu(text, items, parent, textSize = 16) {
  this.isSubMenu = true;
  this.parentDisplayText = text;
  this.subMenuItems = items;
  this.parentMenu = parent;
  this.currentSelectedItem = 0;
  this.currentDisplayRange = 0;
  this.fontSize = textSize;
}

var trackMonophonicModeToggle = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    this.tempVar = seq.track[seq.state.selectedTrack];
    return "Mono Mode";
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
    this.tempVar.monophonicMode = selection == 0;
  },
  function () { // genFn
    return true;
  },
  function (uselessBool) { // dispFn
    let returnStrings = [];
    if (this.tempVar.monophonicMode) {
      returnStrings.push(String.fromCharCode(CHARCODE_RIGHTARROW) + "Enable");
    } else {
      returnStrings.push("Enable");
    }

    if (!this.tempVar.monophonicMode) {
      returnStrings.push(String.fromCharCode(CHARCODE_RIGHTARROW) + "Disable");
    } else {
      returnStrings.push("Disable");
    }

    return returnStrings;
  },
  null,
  true
);

var encoderBankGlobalSettingsNumBanks = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    this.tempVar = seq.settings.encoders.global ? "settings" : "project"
    return "# of banks: " + seq[this.tempVar].encoders.banks;
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
        seq[this.tempVar].encoders.banks = 4;
        setEncoderBankLEDs();
        break;
      case 1:
        seq[this.tempVar].encoders.banks = 16;
        setEncoderBankLEDs();
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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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
    updateEncoderOutputPortIndexesByName();
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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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

    midiInputDevicesEnabled[selection] = !midiInputDevicesEnabled[selection];

  },
  function () { // generator fn

    let deviceNames = [];
    midiInputDevicesNames.forEach(function (name, i) {
      if (!midiInputDevicesHidden[i]) {
        if (name.length > 16) {


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


    return deviceNames;
  },
  function (genReturn) {
    return genReturn;
  },
  null
)

var midiOutDeviceEnable = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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


    midiOutputDevicesEnabled[selection] = !midiOutputDevicesEnabled[selection];

  },
  function () { // generator fn

    let deviceNames = [];
    midiOutputDevicesNames.forEach(function (name, i) {
      if (!midiOutputDevicesHidden[i]) {
        if (name.length > 16) {

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


    return deviceNames;
  },
  function (genReturn) {
    return genReturn;
  },
  null
)

var midiClockInputDeviceSelect = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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


      seq.settings.midi.clockInEnabled = true;
    } else {
      seq.settings.midi.clockInSource = null;
      seq.settings.midi.clockInEnabled = false;
    }
  },
  function () { // genFn
    let deviceNames = ["Disable"];
    midiInputDevicesNames.forEach(function (name, i) {
      if (!midiOutputDevicesHidden[i]) {
        if (name.length > 16) {

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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    let text = "Preset: ";
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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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
    if (seq.track[seq.state.selectedTrack].outputType == 1) {
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
    if (seq.track[seq.state.selectedTrack].outputType == 1) {
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
    if (seq.track[seq.state.selectedTrack].outputType == 1) {
      for (let i = 0; i < midiOutputDevicesNames.length; i++) {
        if (midiOutputDevicesEnabled[i] && !midiOutputDevicesHidden[i]) {
          if (midiOutputDevicesNames[i].length > 16) {
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
    return displayStrings;
  },
  null, true
);


var trackOutputType = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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
      seq.track[seq.state.selectedTrack].outputType = 1;
    } else if (selection == 1) {
      seq.track[seq.state.selectedTrack].outputType = 2;
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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    let selTrack = seq.track[seq.state.selectedTrack];
    selTrack.trackNameTemp = selTrack.trackName;
    this.goBackOnSel = false;
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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
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


var settingsPowerControl_shutdown = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Shutdown"
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn
    ipc.server.emit(mainProcessSocket,'systemShutdown');
  },
  function () { // genFn

  },
  function () { // dispFn
    return ["Be sure to", "save your data!", "OK, Shutdown"]
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

var settingsPowerControl_reboot = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Full reboot"
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn
    ipc.server.emit(mainProcessSocket,'systemReboot');
  },
  function () { // genFn

  },
  function () { // dispFn
    return ["Be sure to", "save your data!", "OK, Reboot"]
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

var settingsPowerControl_restartFireSeq = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Restart FireSeq"
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function () { // selFn
    ipc.server.emit(mainProcessSocket,'restartNodemidi');
  },
  function () { // genFn

  },
  function () { // dispFn
    return ["Be sure to", "save your data!", "OK, Restart"]
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

var settingsPowerControlMenu = new subMenu(
  "Power Control",
  [settingsPowerControl_shutdown, settingsPowerControl_reboot, settingsPowerControl_restartFireSeq],
  null
)

settingsPowerControl_shutdown.parentMenu = settingsPowerControlMenu;
settingsPowerControl_reboot.parentMenu = settingsPowerControlMenu;
settingsPowerControl_restartFireSeq.parentMenu = settingsPowerControlMenu;


var settingsGlobalMenu = new subMenu(
  "Global Settings",
  [encoderBankGlobalSettings, settingsMidiMenu, globalImmeiateTrackUpdatesMenu],
  null
);

encoderBankGlobalSettings.parentMenu = settingsGlobalMenu;
settingsMidiMenu.parentMenu = settingsGlobalMenu;
globalImmeiateTrackUpdatesMenu.parentMenu = settingsGlobalMenu;

var projectSave = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.tempVar = {};
    this.tempVar.name = seq.currentProjectName;
    this.tempVar.currentSelectedItem = 0;
    this.goBackOnSel = false;
    return "Save project";
  },
  function () { // upFn
    if (this.tempVar.currentSelectedItem > 0) {
      this.tempVar.currentSelectedItem--;
    }
    if ((this.tempVar.currentSelectedItem < 1 || this.tempVar.currentSelectedItem >= 107) && this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
    }
  },
  function () { // dwnFn
    if (this.tempVar.currentSelectedItem < 109) {
      if (seq.state.shiftPressed) {
        this.tempVar.currentSelectedItem = 108;
      } else {
        this.tempVar.currentSelectedItem++;
      }
    }
    if ((this.tempVar.currentSelectedItem < 2 || this.tempVar.currentSelectedItem > 108) && this.currentSelectedItem < 3) {
      this.currentSelectedItem++;
    }
  },
  function (selection) { // selFn
    switch (selection) {
      case 0:
        this.tempVar.name = "";
        break;
      case 2:
        saveProject(seq.currentProjectID, this.tempVar.name);
        this.goBackOnSel = true;
        break;
      case 3:
        this.goBackOnSel = true;
        break;
      default:
        if (seq.state.altPressed) {
          this.tempVar.name = this.tempVar.name.substring(0, this.tempVar.name.length - 1);
        } else {
          this.tempVar.name = this.tempVar.name + String.fromCharCode(this.tempVar.currentSelectedItem + 31);
        }
    }
  },
  function () { // genFn
  },
  function () { // dispFn
    switch (this.tempVar.currentSelectedItem) {
      case 0:
        return ["Project Name:", this.tempVar.name, "Press select", "to clear name"];
      case 107:
      case 108:
      case 109:
        return ["Project Name:", this.tempVar.name, "SAVE", "CANCEL"];
      default:
        let dispString = this.tempVar.name + String.fromCharCode(this.tempVar.currentSelectedItem + 31);
        for (; PlotStringToPixelMemMap(dispString, 0, 0, 16, 0, false, true) > 114;) {
          dispString = dispString.substring(1);
        }
        return ["Project Name:", dispString, "SAVE", "CANCEL"]
    }
  },
  null,
  false
)

var projectLoad = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.tempVar = {};
    this.tempVar.projectsArray = getProjectsFromSaveFile();
    this.tempVar.numProjects = this.tempVar.projectsArray.length;
    return "Load project";
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
    if (this.currentSelectedItem < this.tempVar.numProjects - 1) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 2 < this.currentSelectedItem && this.currentDisplayRange < this.tempVar.numProjects - 4) {
        this.currentDisplayRange++;
      }
    }
  },
  function (selection) { // selFn
    loadProject(this.tempVar.projectsArray[selection].uuid)
  },
  function () { // genFn

  },
  function () { // dispFn
    let dispArray = [];
    this.tempVar.projectsArray.forEach((proj, ind) => {
      dispArray.push(proj.name);
    })
    return dispArray;
  },
  null,
  true
)

var projectNewFromCurrent = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.tempVar = {};
    this.tempVar.name = seq.currentProjectName;
    this.tempVar.currentSelectedItem = 0;
    this.goBackOnSel = false;
    return "Save as new";
  },
  function () { // upFn
    if (this.tempVar.currentSelectedItem > 0) {
      this.tempVar.currentSelectedItem--;
    }
    if ((this.tempVar.currentSelectedItem < 1 || this.tempVar.currentSelectedItem >= 107) && this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
    }
  },
  function () { // dwnFn
    if (this.tempVar.currentSelectedItem < 109) {
      if (seq.state.shiftPressed) {
        this.tempVar.currentSelectedItem = 108;
      } else {
        this.tempVar.currentSelectedItem++;
      }
    }
    if ((this.tempVar.currentSelectedItem < 2 || this.tempVar.currentSelectedItem > 108) && this.currentSelectedItem < 3) {
      this.currentSelectedItem++;
    }
  },
  function (selection) { // selFn
    switch (selection) {
      case 0:
        this.tempVar.name = "";
        break;
      case 2:
        loadProject(saveProject(uuidv4(), this.tempVar.name));
        this.goBackOnSel = true;
        break;
      case 3:
        this.goBackOnSel = true;
        break;
      default:
        if (seq.state.altPressed) {
          this.tempVar.name = this.tempVar.name.substring(0, this.tempVar.name.length - 1);
        } else {
          this.tempVar.name = this.tempVar.name + String.fromCharCode(this.tempVar.currentSelectedItem + 31);
        }
    }
  },
  function () { // genFn
  },
  function () { // dispFn
    switch (this.tempVar.currentSelectedItem) {
      case 0:
        return ["Project Name:", this.tempVar.name, "Press select", "to clear name"];
      case 107:
      case 108:
      case 109:
        return ["Project Name:", this.tempVar.name, "SAVE", "CANCEL"];
      default:
        let dispString = this.tempVar.name + String.fromCharCode(this.tempVar.currentSelectedItem + 31);
        for (; PlotStringToPixelMemMap(dispString, 0, 0, 16, 0, false, true) > 114;) {
          dispString = dispString.substring(1);
        }
        return ["Project Name:", dispString, "SAVE", "CANCEL"]
    }
  },
  null,
  false
)

var projectNewFromDefault = new menuItem(
  function () {
    this.currentSelectedItem = 10;
    this.currentDisplayRange = 0;
    return "New empty proj";
  },
  function () { // upFn

  },
  function () { // dwnFn

  },
  function (selection) { // selFn
    loadProject("1d1fc495-e297-472a-b26f-7400eedfe207")
    seq.currentProjectID = uuidv4();
    seq.currentProjectName = "New project";
  },
  function () { // genFn

  },
  function () { // dispFn
    return ["Are you sure?", "This will destroy", "the current", "project"]
  },
  null,
  true
)
// 1d1fc495-e297-472a-b26f-7400eedfe207


var projectDeleteLine1 = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    this.tempVar = {};
    this.tempVar.projectsArray = getProjectsFromSaveFile();
    return "Be careful.";
  },
  projDelUp,
  projDelDwn,
  projDelSel,
  function () {},
  projDelDisp,
  null,
  true
);

var projectDeleteLine2 = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    this.tempVar = projectDeleteLine1.tempVar;
    return "This is permanent";
  },
  projDelUp,
  projDelDwn,
  projDelSel,
  function () {},
  projDelDisp,
  null,
  true
);

function projDelUp() {
  if (this.currentSelectedItem > 0) {
    this.currentSelectedItem--;
    if(this.currentSelectedItem<this.currentDisplayRange){
      this.currentDisplayRange=this.currentSelectedItem;
    }
  }
}

function projDelDwn() {
  if (this.currentSelectedItem < this.tempVar.projectsArray.length-1) {
    this.currentSelectedItem++;
    if(this.currentDisplayRange+2<this.currentSelectedItem && this.currentDisplayRange<this.tempVar.projectsArray.length-4){
      this.currentDisplayRange++;
    }
  }
}

function projDelSel(selection) {
  projectDeleteAfter.tempVar = this.tempVar.projectsArray[selection];
  projectDeleteAfter.currentSelectedItem=0;
}

function projDelDisp() {
  let returnArray = [];
  for(let i = 0; i < this.tempVar.projectsArray.length; i++){
    returnArray.push(this.tempVar.projectsArray[i].name);
  }
  return returnArray;
}

var projectDeleteAfter = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return ""
  },
  function () { // upFn
    if(this.currentSelectedItem>0){
      this.currentSelectedItem--;
    }
  },
  function () { // dwnFn
    if(this.currentSelectedItem<5){
      this.currentSelectedItem++;
    }
  },
  function () { // selFn
    deleteProject(this.tempVar.uuid)
  },
  function () { // genFn

  },
  function () { // dispFn
    return ["Delete","\" " + this.tempVar.name + " \"","","Confirm Delete?"]
  },
  null,
  true
);


var projectInfo = new menuItem(
  function () {
    this.currentSelectedItem = 50;
    this.currentDisplayRange = 0;
    return "Project Info";
  },
  function () { // upFn
    if (this.currentDisplayRange > 0) {
      this.currentDisplayRange--;
    }
  },
  function () { // dwnFn
    if (this.currentDisplayRange < 6) {
      this.currentDisplayRange++;
    }
  },
  function () { // selFn

  },
  function () { // genFn

  },
  function () { // dispFn
    let projectsArray = getProjectsFromSaveFile();
    let projCreationDate;
    let projModDate;
    let returnArray = [];
    projectsArray.forEach((proj, ind) => {
      if (proj.uuid == seq.currentProjectID) {
        projCreationDate = new Date(proj.dateCreated);
        projCreationDateString = projCreationDate.getFullYear().toString() + "/" + (projCreationDate.getMonth() + 1).toString() + "/" + (projCreationDate.getDay() + 1).toString();
        projModDate = new Date(proj.dateModified);
        projModDateString = projModDate.getFullYear().toString() + "/" + (projModDate.getMonth() + 1).toString() + "/" + (projModDate.getDay() + 1).toString();
        returnArray = ["Project Name:", proj.name, "", "Created:", projCreationDateString, "", "Modified:", projModDateString]
      }
    })
    return returnArray;
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
  [projectInfo, projectSave, projectLoad, projectNewFromCurrent, projectNewFromDefault, projectDeleteConfirm1],
  null
);

projectNewFromDefault.parentMenu = settingsProjectMenu;
projectInfo.parentMenu = settingsProjectMenu;
projectSave.parentMenu = settingsProjectMenu;
projectLoad.parentMenu = settingsProjectMenu;
projectNewFromCurrent.parentMenu = settingsProjectMenu;
projectDeleteConfirm1.parentMenu = settingsProjectMenu;
projectDeleteConfirm2.parentMenu = projectDeleteConfirm1;
projectDeleteLine1.parentMenu = projectDeleteAfter;
projectDeleteLine2.parentMenu = projectDeleteAfter;
projectDeleteAfter.parentMenu = settingsProjectMenu;


var settingsTrackMenu = new subMenu(
  function () {
    let text = "Track ";
    text = text + (seq.track[seq.state.selectedTrack].num + 1);
    text = text + " Settings";
    return text;
  },
  [trackColor, trackName, trackOutputType, trackOutputDevice, trackMidiChannel, trackMonophonicModeToggle],
  null
);

trackColor.parentMenu = settingsTrackMenu;
trackName.parentMenu = settingsTrackMenu;
trackOutputDevice.parentMenu = settingsTrackMenu;
trackOutputType.parentMenu = settingsTrackMenu;
trackMidiChannel.parentMenu = settingsTrackMenu;
trackMonophonicModeToggle.parentMenu = settingsTrackMenu;


var settingsMainMenu = new subMenu(
  null,
  [settingsGlobalMenu, settingsProjectMenu, settingsTrackMenu, settingsPowerControlMenu],
  null
)

settingsGlobalMenu.parentMenu = settingsMainMenu;
settingsProjectMenu.parentMenu = settingsMainMenu;
settingsTrackMenu.parentMenu = settingsMainMenu;
settingsPowerControlMenu = settingsMainMenu;


var encodersMenuOutDevice = new menuItem(
  /** TODO: @todo encoders out device menu item
   * **/
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
  true
);

var encodersMenuMidiChan = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Midi out channel";
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
    if (this.currentSelectedItem < 15) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < 12) {
        this.currentDisplayRange++;
      }
    }
  },
  function () { // selFn
    this.tempVar = seq.settings.encoders.global ? "settings" : "project";
    let selEnc = seq[this.tempVar].encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];
    selEnc.midiOutChannel = this.currentSelectedItem + 1;
    saveGlobalData();
  },
  function () { // genFn

  },
  function () { // dispFn
    let dispText = [];
    for (let i = 1; i <= 16; i++) {
      dispText.push(i.toString());
    }
    return dispText;
  },
  null,
  true
);

var encodersMenuMidiCC = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Midi out CC#";
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
    if (this.currentSelectedItem < 126) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < 123) {
        this.currentDisplayRange++;
      }
    }
  },
  function () { // selFn
    this.tempVar = seq.settings.encoders.global ? "settings" : "project";
    let selEnc = seq[this.tempVar].encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];
    selEnc.midiCC = this.currentSelectedItem + 1;
    saveGlobalData();
  },
  function () {},
  function () { // dispFn

    let dispText = [];
    for (let i = 1; i <= 127; i++) {
      dispText.push(i.toString());
    }
    return dispText;
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);



var encodersMenuName = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    this.tempVar = seq.settings.encoders.global ? "settings" : "project";
    let selEnc = seq[this.tempVar].encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];
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
      if (seq.state.shiftPressed) {
        this.currentSelectedItem = 106;
      } else {
        this.currentSelectedItem++;
      }
    }
  },
  function (selection) { // selFn
    let selEnc = seq[this.tempVar].encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];

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

  },
  function () { // genFn
    return true;
  },
  function (genReturn) { // dispFn
    if (genReturn) {
      let selEnc = seq[this.tempVar].encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];
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

var encodersMenuCCType = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Midi CC Type";
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
    if (this.currentSelectedItem < 4) {
      this.currentSelectedItem++;
      if (this.currentDisplayRange + 1 < this.currentSelectedItem && this.currentDisplayRange < 1) {
        this.currentDisplayRange++;
      }
    }
  },
  function (selection) { // selFn
    this.tempVar = seq.settings.encoders.global ? "settings" : "project";
    let selEnc = seq[this.tempVar].encoders.control[seq.state.encoderBank][seq.state.encLastTouched - 16];
    selEnc.midiCCtype = midiCCtypeName[selection];
  },
  function () {},
  function () { // dispFn
    return ["Absolute", "Rel: 1 & 127", "Rel: 65 & 63", "Rel1 Inverted", "Rel2 Inverted"];
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

var gridBtnMenuNote = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    let track = seq.track[seq.state.selectedTrackRange + ((seq.state.gridBtnsPressedLast / 16) & 0xff)]; // determine which track is associated with row the button is on.
    this.tempVar = {};
    this.tempVar.track = track;
    this.tempVar.step = (seq.state.gridBtnsPressedLast % 16) + (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].viewArea * 16);
    this.currentSelectedItem = 0;

    return "Note Value";
  },
  function () { // upFn
    if (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].data < 127) {
      ++this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].data;
    }
  },
  function () { // dwnFn
    if (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].data > 1) {
      --this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].data;
    }
  },
  function (selection) { // selFn
    sendTrackUpdateToSeqLoop();
  },
  sendTrackUpdateToSeqLoop,
  function () { // dispFn
    let value = this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].data;
    let value2 = "";
    if (scales.noteNamesFlats[value % 12].length > 1) {
      value2 = scales.noteNamesFlats[value % 12] + "/" + scales.noteNamesSharps[value % 12] + (Math.ceil((value - 20) / 12));
    } else {
      value2 = scales.noteNamesFlats[value % 12] + (Math.ceil((value - 20) / 12));
    }
    return ["Note Value: ", value2.toString()]
  },
  null,
  true, // optional bool to indicate if the menu show go back to the parent on select
  24
)

var gridBtnMenuVelocity = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    let track = seq.track[seq.state.selectedTrackRange + ((seq.state.gridBtnsPressedLast / 16) & 0xff)]; // determine which track is associated with row the button is on.
    this.tempVar = {};
    this.tempVar.track = track;
    this.tempVar.step = (seq.state.gridBtnsPressedLast % 16) + (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].viewArea * 16);
    this.currentSelectedItem = 0;

    return "Velocity";
  },
  function () { // upFn
    if (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].velocity < 127) {
      ++this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].velocity;
    }
  },
  function () { // dwnFn
    if (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].velocity > 1) {
      --this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].velocity;
    }
  },
  function (selection) { // selFn
    sendTrackUpdateToSeqLoop();
    return;
  },
  sendTrackUpdateToSeqLoop,
  function () { // dispFn
    let value = this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].velocity;
    return ["Velocity: ", value.toString()]
  },
  null,
  true, // optional bool to indicate if the menu show go back to the parent on select
  24
)

var gridBtnMenuLength = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    let track = seq.track[seq.state.selectedTrackRange + ((seq.state.gridBtnsPressedLast / 16) & 0xff)]; // determine which track is associated with row the button is on.
    this.tempVar = {};
    this.tempVar.track = track;
    this.tempVar.step = (seq.state.gridBtnsPressedLast % 16) + (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].viewArea * 16);
    this.currentSelectedItem = 0;

    return "Length as %";
  },
  function () { // upFn
    if (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].length < 10000) {
      if(seq.state.altPressed){
        this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].length += 1;
      }else{
        this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].length += 10;
      }
    }
  },
  function () { // dwnFn
    if (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].length > 1) {
      if(seq.state.altPressed){
        this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].length -= 1;
      }else{
        this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].length -= 10;
      }
    }
  },
  function (selection) { // selFn
    sendTrackUpdateToSeqLoop();
    return;
  },
  sendTrackUpdateToSeqLoop,
  function () { // dispFn
    let value = this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].length;
    return ["Length: ", value.toString() + "%"]
  },
  null,
  true, // optional bool to indicate if the menu show go back to the parent on select
  24
)

var gridBtnMenuOffset = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    let track = seq.track[seq.state.selectedTrackRange + ((seq.state.gridBtnsPressedLast / 16) & 0xff)]; // determine which track is associated with row the button is on.
    this.tempVar = {};
    this.tempVar.track = track;
    this.tempVar.step = (seq.state.gridBtnsPressedLast % 16) + (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].viewArea * 16);
    this.currentSelectedItem = 0;

    return "Time Offset";
  },
  function () { // upFn
    if (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].startTimePatternOffset < 500) {
      ++this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].startTimePatternOffset;
    }
  },
  function () { // dwnFn
    if (this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].startTimePatternOffset > -500) {
      --this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].startTimePatternOffset;
    }
  },
  function (selection) { // selFn
    sendTrackUpdateToSeqLoop();
    return;
  },
  sendTrackUpdateToSeqLoop,
  function () { // dispFn
    let value = this.tempVar.track.patterns["id_" + this.tempVar.track.currentPattern].events["id_" + this.tempVar.step].startTimePatternOffset;
    return ["Time Offset: ", value.toString()]
  },
  null,
  true, // optional bool to indicate if the menu show go back to the parent on select
  24
)

var stepMenu = new subMenu(
  null,
  [gridBtnMenuNote, gridBtnMenuVelocity, gridBtnMenuLength, gridBtnMenuOffset],
  null,
  24
);

gridBtnMenuNote.parentMenu = stepMenu;
gridBtnMenuVelocity.parentMenu = stepMenu;
gridBtnMenuLength.parentMenu = stepMenu;
gridBtnMenuOffset.parentMenu = stepMenu;


var bpmMenu = new menuItem( // this is probably gonna end up being the only menu that exists as a menuitem without bing in a submenu
  function () {
    return "BPM";
  },
  function () { // upFn
    seq.state.currentBPM++;
  },
  function () { // dwnFn
    seq.state.currentBPM--;
  },
  function () { // selFn
    if (seqLoop_ipcIsEstablished) {
      ipc.server.emit(seqLoop_ipcSocket, 'tempoChange', seq.state.currentBPM);
    }
  },
  function () { // genFn

  },
  function () { // dispFn
    return ["BPM", seq.state.currentBPM.toString()];
  },
  null,
  false, // optional bool to indicate if the menu show go back to the parent on select
  32
)


// gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
var scalesMenuScale = new menuItem(
  function () {
    this.currentSelectedItem = 10;
    return "Scale";
  },
  function () { // upFn
    if (seq.mode.Note.currentScale > 0) {
      seq.mode.Note.currentScale--;
    }
  },
  function () { // dwnFn
    if (seq.mode.Note.currentScale < scales.indexNames.length - 1) {
      seq.mode.Note.currentScale++;
    }
  },
  function () { // selFn
  },
  function () { // genFn

  },
  function () { // dispFn
    gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
    updateAllGridBtnLEDs();
    let stringSizeInPixels = PlotStringToPixelMemMap(scales.text[seq.mode.Note.currentScale], 0, 0, 24, 1, false, true);

    if (stringSizeInPixels < 128) {
      return [scales.text[seq.mode.Note.currentScale]];
    } else {
      let retStringArr = [];
      let inString = scales.text[seq.mode.Note.currentScale];
      retStringArr.push(inString.substring(0, inString.indexOf(' ')));
      retStringArr.push(inString.substring(inString.indexOf(' ') + 1));
      return retStringArr;
    }
  },
  null,
  true, // optional bool to indicate if the menu show go back to the parent on select
  24
)

var scalesMenuRoot = new menuItem(
  function () {
    this.currentSelectedItem = 1;
    return "Root Note";
  },
  function () { // upFn
    if (seq.mode.Note.root > 0) {
      seq.mode.Note.root--;
    }
  },
  function () { // dwnFn
    if (seq.mode.Note.root < 11) {
      seq.mode.Note.root++;
    }
  },
  function () { // selFn
  },
  function () { // genFn

  },
  function () { // dispFn
    gridBtnsScales(scales.indexNames[seq.mode.Note.currentScale], seq.mode.Note.root, seq.mode.Note.offset, seq.mode.Note.octave);
    updateAllGridBtnLEDs();
    return [scales.noteNamesFlats[seq.mode.Note.root]]
  },
  null,
  true, // optional bool to indicate if the menu show go back to the parent on select
  24
)

var scalesMenuOffset = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Disp Shift"
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
  true, // optional bool to indicate if the menu show go back to the parent on select
  24
)

var scalesMenuOctave = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Octave";
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
  true, // optional bool to indicate if the menu show go back to the parent on select
  24
)

var scalesMenuBottomRowMode = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;
    return "Btm Row Mode";
  },
  function () { // upFn
    if (this.currentSelectedItem > 0) {
      this.currentSelectedItem--;
    }
  },
  function () { // dwnFn
    if (this.currentSelectedItem < 2) {
      this.currentSelectedItem++;
    }
  },
  function (selection) { // selFn
    seq.mode.Note.bottomRowMode = selection;
    updateAllGridBtnLEDs();
  },
  function () { // genFn

  },
  function () { // dispFn
    let retStringArr = ["Extend Scale", "Current Pattern", "Root / Octave"];
    retStringArr[seq.mode.Note.bottomRowMode] = String.fromCharCode(0x84) + retStringArr[seq.mode.Note.bottomRowMode];
    return retStringArr;
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
)

var scalesMenu = new subMenu(
  null,
  [scalesMenuScale, scalesMenuRoot, scalesMenuOffset, scalesMenuOctave, scalesMenuBottomRowMode],
  null,
  16
)

scalesMenuScale.parentMenu = scalesMenu;
scalesMenuRoot.parentMenu = scalesMenu;
scalesMenuOffset.parentMenu = scalesMenu;
scalesMenuOctave.parentMenu = scalesMenu;
scalesMenuBottomRowMode.parentMenu = scalesMenu;

var soloTrack_mode_MenuItem = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.tempVar = {};
    this.tempVar.track = seq.track[seq.state.selectedTrackRange + getBitPosition(seq.state.muteSoloBtnsLastPressed)]; // determine which track is associated with row the button is on.
    return "Track Mode"
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
    seq.track[seq.state.selectedTrackRange + getBitPosition(seq.state.muteSoloBtnsLastPressed)].trackMode = selection;
  },
  function () { // genFn

  },
  function () { // dispFn
    return [`${
      this.tempVar.track.trackMode==0?String.fromCharCode(CHARCODE_RIGHTARROW):""
    }Normal`, `${
      this.tempVar.track.trackMode==1?String.fromCharCode(CHARCODE_RIGHTARROW):""
    }Drum Trig`]
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

var soloTrack_trackNote_menuItem = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.tempVar = {};
    this.tempVar.track = seq.track[seq.state.selectedTrackRange + getBitPosition(seq.state.muteSoloBtnsLastPressed)]; // determine which track is associated with row the button is on.
    switch (this.tempVar.track.trackMode) {
      case 0:
        return "Default Note"
      case 1:
        return "Trigger Note"
    }
  },
  function () { // upFn
    if (this.tempVar.track.defaultNote < 127) {
      this.tempVar.track.defaultNote++;
    }
    playNote({
      event: {
        startTimePatternOffset: 0,
        data: this.tempVar.track.defaultNote,
        length: 50,
        velocity: 100,
        id: 0,
        idText: "",
        enabled: true
      },
      track: this.tempVar.track.num,
      lengthTime: 0.0625
    })
  },
  function () { // dwnFn
    if (this.tempVar.track.defaultNote > 1) {
      this.tempVar.track.defaultNote--;
    }
    playNote({
      event: {
        startTimePatternOffset: 0,
        data: this.tempVar.track.defaultNote,
        length: 50,
        velocity: 100,
        id: 0,
        idText: "",
        enabled: true
      },
      track: this.tempVar.track.num,
      lengthTime: 0.0625
    })
  },
  function () { // selFn
  },
  function () { // genFn
  },
  function () { // dispFn
    return ["notes"]
  },
  null,
  true // optional bool to indicate if the menu show go back to the parent on select
);

var soloTrackMenu = new subMenu(
  null,
  [soloTrack_mode_MenuItem, soloTrack_trackNote_menuItem],
  null
)

soloTrack_mode_MenuItem.parentMenu = soloTrackMenu;
soloTrack_trackNote_menuItem.parentMenu = soloTrackMenu;


/** TODO: @todo Menu entries todo list
 * **/
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
OSC
  - enable / disable
  - broadcast enable / disable
  - remote device address(s)
  - remote device port(s)
Device control
  - power off
  - reboot
  - restart software
Midi
  - reload midi devices
  - Midi clock output device select
Project
  -̶ N̶e̶w̶
  -̶ S̶a̶v̶e̶
  -̶ L̶o̶a̶d̶
  -̶ C̶o̶p̶y̶
Pattern
  - Copy
  - Reset
Track
  -̶ M̶i̶d̶i̶ d̶e̶v̶i̶c̶e̶ c̶h̶a̶n̶n̶e̶l̶

N̶o̶t̶e̶ m̶e̶n̶u̶ e̶n̶t̶r̶i̶e̶s̶ t̶o̶ m̶a̶k̶e̶:̶
  -̶ m̶i̶d̶i̶ n̶o̶t̶e̶ v̶a̶l̶u̶e̶
  -̶ m̶i̶d̶i̶ v̶e̶l̶o̶c̶i̶t̶y̶
  -̶ n̶o̶t̶e̶ l̶e̶n̶g̶t̶h̶
  -̶ s̶t̶a̶r̶t̶ t̶i̶m̶e̶ o̶f̶f̶s̶e̶t̶

M̶e̶n̶u̶ e̶n̶t̶r̶i̶e̶s̶ f̶o̶r̶ w̶h̶e̶n̶ i̶n̶ s̶t̶e̶p̶ m̶o̶d̶e̶ w̶i̶t̶h̶ n̶o̶ o̶t̶h̶e̶r̶ b̶u̶t̶t̶o̶n̶s̶ p̶r̶e̶s̶s̶e̶d̶
  -̶ T̶e̶m̶p̶o̶
  -̶ V̶i̶e̶w̶a̶b̶l̶e̶ T̶r̶a̶c̶k̶s̶
*/


// @note menuItemTemplate
var menuItemTemplate = new menuItem(
  function () {
    this.currentSelectedItem = 0;
    this.currentDisplayRange = 0;

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

function saveGlobalData() {
  // global stuff to save:
  // global encoder settings
  let glob = {};
  glob.seqSettingsmidi = seq.settings.midi;
  glob.seqSettingsEncoders = seq.settings.encoders;
  fs.writeFileSync('globalSave', JSON.stringify(glob));
}

!function loadGlobalData() {
  let a = JSON.parse(fs.readFileSync('globalSave'));

  seq.settings.midi.clockInEnabled = a.seqSettingsmidi.clockInEnabled;
  seq.settings.midi.clockInSource = a.seqSettingsmidi.clockInSource;

  seq.settings.encoders.banks = a.seqSettingsEncoders.banks;
  seq.settings.encoders.global = a.seqSettingsEncoders.global;

  for (let q = 0; q < 16; q++) {
    for (let r = 0; r < 4; r++) {
      seq.settings.encoders.control[q][r].name = a.seqSettingsEncoders.control[q][r].name;
      seq.settings.encoders.control[q][r].midiCC = a.seqSettingsEncoders.control[q][r].midiCC;
      seq.settings.encoders.control[q][r].value = a.seqSettingsEncoders.control[q][r].value;
      seq.settings.encoders.control[q][r].midiCCtype = a.seqSettingsEncoders.control[q][r].midiCCtype;
      seq.settings.encoders.control[q][r].midiOutPort = a.seqSettingsEncoders.control[q][r].midiOutPort;
      seq.settings.encoders.control[q][r].midiOutChannel = a.seqSettingsEncoders.control[q][r].midiOutChannel;
      seq.settings.encoders.control[q][r].midiOutPortName = a.seqSettingsEncoders.control[q][r].midiOutPortName;
    }
  }
  updateEncoderOutputPortIndexesByName();
  setEncoderBankLEDs();
}()

// loadGlobalData();

function loadProject(IDuuid) {
  try {
    let projectFilename = "projects/" + IDuuid.toString();
    let projectFileAsString = fs.readFileSync(projectFilename);
    let projAsStringArrays = projectFileAsString.toString().split('\n');
    let stateObj = JSON.parse(projAsStringArrays[0]);
    let settingsObj = JSON.parse(projAsStringArrays[1]);
    let trackObj = JSON.parse(projAsStringArrays[2]);


    seq.state.currentBPM = stateObj.currentBPM;
    seq.state.mute = stateObj.mute;
    seq.state.selectedTrack = stateObj.selectedTrack;
    seq.state.selectedTrackRange = stateObj.selectedTrackRange;
    seq.state.solo = stateObj.solo;

    seq.settings.midi = Object.assign(settingsObj.midiSettings);
    seq.project.encoders = Object.assign(settingsObj.encodersPerProject);

    trackNumIndex = 0; // reset to 0 - global variable, will be accessed by the creation method for new defaultTrack
    seq.track = []; // reset seq.track to empty array
    console.log("loading project");
    trackObj.forEach((track, ind) => {
      seq.track.push(new defaultTrack());
      seq.track[ind].currentPattern = track.currentPattern;
      seq.track[ind].mute = track.mute;
      seq.track[ind].solo = track.solo;
      seq.track[ind].monophonicMode = track.monophonicMode;
      seq.track[ind].defaultColor = track.defaultColor;
      seq.track[ind].outputType = track.outputType;
      seq.track[ind].outputName = track.outputName;
      seq.track[ind].outputIndex = track.outputIndex;
      seq.track[ind].midiChannel = track.midiChannel;
      seq.track[ind].trackName = track.trackName;
      seq.track[ind].channel = track.channel;
      seq.track[ind].CVportNum = track.CVportNum;
      seq.track[ind].trackMode = track.trackMode;
      seq.track[ind].defaultNote = track.defaultNote;

      seq.track[ind].updateOutputIndex();

      let count = 0;
      while (track.patterns["id_" + count] != undefined) {
        let pat = track.patterns["id_" + count];
        seq.track[ind].addPattern(pat.patLength, pat.originalBPM, pat.beatsInPattern);

        seq.track[ind].patterns["id_" + count].color.red = pat.color.red;
        seq.track[ind].patterns["id_" + count].color.grn = pat.color.grn;
        seq.track[ind].patterns["id_" + count].color.blu = pat.color.blu;
        seq.track[ind].patterns["id_" + count].color.mode = pat.color.mode;
        seq.track[ind].patterns["id_" + count].defaults.noteData = pat.defaults.noteData;
        seq.track[ind].patterns["id_" + count].defaults.noteLength = pat.defaults.noteLength;
        seq.track[ind].patterns["id_" + count].defaults.noteOffset = pat.defaults.noteOffset;
        seq.track[ind].patterns["id_" + count].defaults.noteVelocity = pat.defaults.noteVelocity;
        seq.track[ind].patterns["id_" + count].patIsStepBased = pat.patIsStepBased;
        seq.track[ind].patterns["id_" + count].viewArea = pat.viewArea;

        for (let i = 0; i < pat.patLength; i++) {
          seq.track[ind].patterns["id_" + count].events["id_" + i].startTimePatternOffset = pat.events["id_" + i].startTimePatternOffset;
          seq.track[ind].patterns["id_" + count].events["id_" + i].data = pat.events["id_" + i].data;
          seq.track[ind].patterns["id_" + count].events["id_" + i].length = pat.events["id_" + i].length;
          seq.track[ind].patterns["id_" + count].events["id_" + i].velocity = pat.events["id_" + i].velocity;
          seq.track[ind].patterns["id_" + count].events["id_" + i].enabled = pat.events["id_" + i].enabled;
        }
        count++;
      }
    })

    seq.currentProjectID = IDuuid;
    seq.currentProjectName = getProjectsFromSaveFile().find(element => element.uuid == IDuuid).name;

    updateAllGridBtnLEDs();
    updateAllNotGridBtnLEDS();
    updateEncoderOutputPortIndexesByName();
    sendTrackUpdateToSeqLoop();

    console.log("loading complete");

    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log("file not found")
    }
    return false;
  }
}

function deleteProject(IDuuid){
  let projectsArray = getProjectsFromSaveFile();
  let found = null;
  for(let i = 0; i < projectsArray.length; i++){
    if(IDuuid == projectsArray[i].uuid){
      found = i;
      i = projectsArray.length;
    }
  }
  if(found!==null){
    projectsArray.splice(found,1);
  }else{
    return false;
  }
  try {
    fs.writeFileSync('saveFile', JSON.stringify(projectsArray));
    fs.unlinkSync("projects/"+IDuuid)
    return true;
  } catch (err) {
    console.log(err)
    return err;
  }
}

function saveProject(IDuuid, nameString) {
  let tempObj = getProjectsFromSaveFile();
  let found = null;
  for (let i = 0; i < tempObj.length; i++) {
    if (IDuuid == tempObj[i].uuid) {
      console.log("entry already exists");
      tempObj[i].name = nameString;
      found = i;
      i = tempObj.length;
    }
  }
  if (found !== null) {
    tempObj[found].dateModified = Date.now()
    try {
      fs.writeFileSync('saveFile', JSON.stringify(tempObj));
    } catch (err) {
      console.log(err)
    }
  } else {

    let lineData = {};
    lineData.name = nameString;
    lineData.uuid = IDuuid;
    lineData.dateCreated = Date.now();
    lineData.dateModified = Date.now();
    tempObj.push(lineData);
    try {
      fs.writeFileSync('saveFile', JSON.stringify(tempObj));
    } catch (err) {
      console.log(err)
    }
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
  try {
    fs.writeFileSync("projects/" + IDuuid, returnString);
  } catch (err) {
    console.log(err)
  }
  return IDuuid;
}

function getProjectsFromSaveFile() {
  return JSON.parse(fs.readFileSync('saveFile'));
}


function newTimingLogEntry(entryText) {
  let newEntry = {};
  newEntry.time = process.hrtime();
  newEntry.text = entryText;
  timingLog.push(newEntry);
}

function writeTimingLogToFile() {
  fs.writeFileSync('timingLog.json', JSON.stringify(timingLog));
}

function convertUTCepochToPrettyString(time) {
  let dateObj = Date(time);
  let monthArray = ["Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let dateString = monthArray[dateObj.getMonth()] + " " + dateObj.getDate() + ", " + dateObj.getFullYear();
  let timeString = (dateObj.getHours() > 12 ? dateObj.getHours() - 12 : dateObj.getHours()).toString() + ":" + dateObj.getMinutes().toString();
  return [dateString, timeString];
}