/*
TODO:
- set up child process for gerneator poly rythms
  - need to be able to send the ipc socket info for the generator back to the main processs
    so that changes to the generator can be sent straight to it.
  - Must be able to receive step events from the generator.
  - Upon receiving a step event, step through the events of the selected track and send it
    back to the main process for outputing to device.

*/

// var fs = require('fs');
// var timingLog = [];

// const midi = require('midi');


// // Set up a new input.
// const midi_In = new midi.Input(),
//   midi_Out = new midi.Output();
// var midiInputDevices = [],
//   midiInputDevicesNames = [],
//   midiInputDevicesEnabled = [],
//   midiOutputDevices = [],
//   midiOutputDevicesNames = [],
//   midiOutputDevicesEnabled = [],
//   midiInputDevicesHidden = [],
//   midiOutputDevicesHidden = [];

// // create array of all input ports and open them.

// for (let step = 0; step < midi_In.getPortCount(); step++) {
//   if (midi_In.getPortName(step).search("FL STUDIO FIRE:FL STUDIO FIRE MIDI 1") == -1) {
//     midiInputDevices[step] = new midi.Input();
//     midiInputDevices[step].openPort(step);
//     midiInputDevicesNames[step] = midiInputDevices[step].getPortName(step);
//     midiInputDevicesEnabled[step] = true;
//     if (midiInputDevicesNames[step].includes("RtMidi Output Client") || midiInputDevicesNames[step].includes("Midi Through") || midiInputDevicesNames[step].includes("FL STUDIO FIRE:FL STUDIO FIRE MIDI")) {
//       midiInputDevicesHidden[step] = true;
//     } else {
//       midiInputDevicesHidden[step] = false;
//     }
//   }
// }

// // create array of all output ports and open them.
// for (let step = 0; step < midi_Out.getPortCount(); step++) {
//   if (midi_Out.getPortName(step).search("FL STUDIO FIRE:FL STUDIO FIRE MIDI 1") == -1) {
//     midiOutputDevices[step] = new midi.Output();
//     midiOutputDevices[step].openPort(step);
//     midiOutputDevicesNames[step] = midiOutputDevices[step].getPortName(step);
//     midiOutputDevicesEnabled[step] = true;
//     // console.log(midiOutputDevicesNames[step]);
//     if (midiOutputDevicesNames[step].includes("RtMidi Input Client") || midiOutputDevicesNames[step].includes("Midi Through Port") || midiOutputDevicesNames[step].includes("FL STUDIO FIRE:FL STUDIO FIRE MIDI")) {
//       midiOutputDevicesHidden[step] = true;
//     } else {
//       midiOutputDevicesHidden[step] = false;
//     }
//   }
// }

var seq = {};
seq.bpm = 1;
seq.state = {};
seq.state.mute = 0; // bit coded, B0001 - track one, B0010 - track 2, B0100 - track 3, B1000 track 4
seq.state.solo = 0;
seq.state.recArmed = 0;
seq.state.playing = false;
seq.state.selectedPatternIndex = 0;
seq.state.firstLoopIteration = true;
seq.state.loopTimeMillis = new Date().getTime();
seq.state.currentBPM = 120;
seq.state.newTrackDataWaiting = false;
seq.state.stepNumberCounted = 0;
seq.state.immediateTrackUpdate = true;
seq.track = [];
var newTrackData = [];

var theLoopInterval;

var currentStepsPerBeat = 4;

function seqPlay(stepsPerBeat = 4) {
  if (!seq.state.playing) {
    console.log("play");
    seq.state.playing = true;
    seq.state.loopTimeMillis = new Date().getTime();
    seq.state.stepNumberCounted = 0;
    theLoopInterval = setInterval(theLoopFn, 1, stepsPerBeat);
  }
}

function seqStop(log = true) {
  clearInterval(theLoopInterval);
  seq.state.playing = false;
  seq.state.firstLoopIteration = true;
  if (log) {
    console.log("stop")
  }
}

function updateMaxPatternLength() {

}

const ipc = require('node-ipc');

ipc.config.id = 'nodeSeqLoop';
ipc.config.retry = 1500;
ipc.config.silent = true;

var logDisconnect = true;

ipc.connectTo(
  'nodeMidi',
  function () {
    ipc.of.nodeMidi.on(
      'connect',
      function () {
        // ipc.log('## connected to nodeMidi ##'.rainbow, ipc.config.delay);
        ipc.of.nodeMidi.emit('get-seq.track-Var');
        console.log("Connected to Fire Sequencer main process.");
        logDisconnect = true;
      }
    );
    ipc.of.nodeMidi.on(
      'disconnect',
      function () {
        // ipc.log('disconnected from nodeMidi'.notice);
        // console.log("Disconnected from main processs.");
        seqStop(false);
        if (logDisconnect) {
          console.log("Disconnected form Fire Sequencer main process.");
          logDisconnect = false;
        }
      }
    );
    ipc.of.nodeMidi.on(
      'seq.trackVar', //any event or message type your server listens for
      function (data) {
        // console.log("got data");
        // console.log(data[0].patterns.id_0.events.id_0);
        // ipc.log('got a message from nodeMidi : '.debug, data);
        // console.log(data);
        if (seq.state.immediateTrackUpdate) {
          seq.track = data;
        } else {
          seq.state.newTrackDataWaiting = true;
          newTrackData = data;
        }
      }
    );
    ipc.of.nodeMidi.on('seqPlay', function (stepsPerBeat) {
      seqPlay(stepsPerBeat);
      currentStepsPerBeat = stepsPerBeat;
    });
    ipc.of.nodeMidi.on('seqStop', seqStop);
    ipc.of.nodeMidi.on('tempoChange', function (data) {
      if (seq.state.playing) {
        seqStop();
        seq.state.currentBPM = data
        seqPlay(currentStepsPerBeat);
      } else {
        seq.state.currentBPM = data
      }
    });
    ipc.of.nodeMidi.on('setITU', function (data) { // ITC = Immediate Track Updates
      seq.state.immediateTrackUpdate = data;
      console.log(seq.state.immediateTrackUpdate);
    });
    // ipc.of.nodeMidi.on('requestMidiDevices',function (){
    //   let midiDevices={};
    //   midiDevices.in = {};
    //   midiDevices.in.names = midiInputDevicesNames;
    //   midiDevices.in.enabled = midiInputDevicesEnabled;
    //   midiDevices.in.hidden = midiInputDevicesHidden;
    //   midiDevices.out = {};
    //   midiDevices.out.names = midiOutputDevicesNames;
    //   midiDevices.out.enabled = midiOutputDevicesEnabled;
    //   midiDevices.out.hidden = midiOutputDevicesHidden;
    //   ipc.of.nodeMidi.emit('midiDevices',midiDevices);
    // })
  }
);

/***************************************************************************************

Loop function

Create a looping function that plays all the notes and stuff.
This function is called every 1ms and checks to see if anything
is due to be played. This is done by looking at the current step in
every active tracks current pattern and comparing its startTimeOffset
with how long it's been since the the loop started.

If there exists a difference in the length of the currnet patterns,
The loop length will be based off of the longest and all others will
loop back through to fill the length of the longest pattern.

Things to track during the loop:
  when the loop started
***************************************************************************************/


// need to rework the loop so that it is step based not loop time based. Either that, or use this loop as
// a time based loop and create a new one that is step based.

function theLoopFn(stepsPerBeat = 4) { 
  // let currentTimeMillis = new Date().getTime();
  // let loopTimeDiffMillis = currentTimeMillis - seq.state.loopTimeMillis;
  // let sequencerBPM = seq.state.currentBPM;
  // let seqSecsPerBeat = 60 / sequencerBPM;
  let stepTime = (60 / seq.state.currentBPM) / stepsPerBeat;
  // let stepNumberCalculated = Math.trunc(loopTimeDiffMillis / (stepTime * 1000));

  // let stepNumberCalculated = Math.trunc((new Date().getTime()-seq.state.loopTimeMillis)/(((60/seq.state.currentBPM)/stepsPerBeat) * 1000));

  // if (stepNumberCalculated == seq.state.stepNumberCounted + 1) {
  // if ((Math.trunc((new Date().getTime() - seq.state.loopTimeMillis) / (((60 / seq.state.currentBPM) / stepsPerBeat) * 1000))) == seq.state.stepNumberCounted + 1) {
  if ((Math.trunc((new Date().getTime() - seq.state.loopTimeMillis) / (stepTime * 1000))) == seq.state.stepNumberCounted + 1) {
    // Next step started
    // console.log(seq.state.stepNumberCounted);
    //go through each track
    seq.track.forEach(function (track, index) {
      let curPat = seq.track[index].patterns[`id_${track.currentPattern}`];
      if (!track.mute && curPat.patIsStepBased) { // if track is not muted and is step based

        // let origPatLength = curPat.patLength; // 16
        // let origPatBeatsInPat = curPat.beatsInPattern; // 4
        // let thisPatStepsPerBeat = origPatLength / origPatBeatsInPat; // 24 / 4 = 6
        // let thisPatStepSkips = (stepsPerBeat / thisPatStepsPerBeat) - 1; // 4 / 6 = 2, 2 - 1 = 1

        // play currentStep Event
        let data = {};
        data.event = curPat.events["id_" + (seq.state.stepNumberCounted % curPat.patLength)];
        data.track = index;
        data.lengthTime = stepTime * (data.event.length / 100);
        // console.log(data.event.enabled);
        if (data.event.enabled) {
          // setTimeout(() => {
          //   ipc.of.nodeMidi.emit('play-note', data);
          //   // playNote(data);
          // }, stepTime * (data.event.startTimePatternOffset / 100) * 1000);
          ipc.of.nodeMidi.emit('play-note', data);
          // newTimingLogEntry("playNote");
          // playNote(data);
          // console.log("note played");
        }
        // advance current step
        curPat.currentStep++;
      }
    });
    ipc.of.nodeMidi.emit('step', seq.state.stepNumberCounted);
    seq.state.stepNumberCounted++;
  } else {
    if (seq.state.newTrackDataWaiting && (seq.state.stepNumberCounted % 16 == 0)) {
      seq.track = newTrackData;
      seq.state.newTrackDataWaiting = false;
    }
  }
}

/**************************************************************************************
@note playNote
**************************************************************************************/
function playNote(eventData, socket = null, timeoutIndex = null) {
  // console.log(eventData);
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

// seq.track.forEach(function(track, index) {
//   // let pattern = track.patterns["id_" + track.currentPattern];
//   if (!track.mute && seq.track[index].patterns["id_" + track.currentPattern].patIsStepBased) {
//
//     // 120 bpm, 16 steps,
//     // 60/120 = 0.5 sec/beat
//     // 16/4 = 4 steps/beats
//     // 4 * 0.5 = total pattern time
//     // (60/bpm)*(patternLength/stepPerBeat)
//
//     if((loopTimeDiffMillis>(stepTime*seq.track[index].patterns["id_" + track.currentPattern].currentStep*1000))&&(stepTime*seq.track[index].patterns["id_" + track.currentPattern].currentStep<=seqPatternTime)){
//       // play currentStep Event
//       let data = {};
//       data.event = seq.track[index].patterns["id_" + track.currentPattern].events["id_" + seq.track[index].patterns["id_" + track.currentPattern].currentStep];
//       data.track = index;
//       data.lengthTime = stepTime * (data.event.length/100);
//       // console.log(data.event.enabled);
//       if(data.event.enabled){
//         ipc.of.nodeMidi.emit('play-note',data);
//         // console.log("note played");
//       }
//       // advance current step
//       seq.track[index].patterns["id_" + track.currentPattern].currentStep++;
//     }
//   }
//   if(seq.track[index].patterns["id_" + track.currentPattern].currentStep==seq.track[index].patterns["id_" + track.currentPattern].originalLengthSteps){
//     if(index==seq.track.length-1){
//       seq.state.firstLoopIteration = true;
//     }
//     seq.track[index].patterns["id_" + track.currentPattern].currentStep=0;
//   }
// });
// }




// function theLoopFn() {
//   let currentTimeMillis = new Date().getTime();
//   if (seq.state.firstLoopIteration) {
//     seq.state.firstLoopIteration = false;
//     seq.state.loopTimeMillis = new Date().getTime();
//     // console.log("loop start");
//     if(newTrackDataWaiting){
//        seq.track = newTrackData;
//        newTrackDataWaiting=false;
//      }
//   }
//   let loopTimeDiffMillis = currentTimeMillis - seq.state.loopTimeMillis;
//
//   seq.track.forEach(function(track, index) {
//     // let pattern = track.patterns["id_" + track.currentPattern];
//     if (!track.mute && seq.track[index].patterns["id_" + track.currentPattern].patIsStepBased) {
//       let patternBPM = seq.track[index].patterns["id_" + track.currentPattern].originalBPM;
//       let sequencerBPM = seq.state.currentBPM;
//       let steps = seq.track[index].patterns["id_" + track.currentPattern].originalLengthSteps;
//       let beats = seq.track[index].patterns["id_" + track.currentPattern].beatsInPattern;
//
//       let secsPerBeat = 60 / patternBPM;
//       let seqSecsPerBeat = 60 / sequencerBPM;
//       let stepsPerBeat = steps / beats;
//       let patternTime = secsPerBeat * stepsPerBeat;
//       let seqPatternTime = seqSecsPerBeat * stepsPerBeat;
//       let stepTime = seqPatternTime / steps;
//       // 120 bpm, 16 steps,
//       // 60/120 = 0.5 sec/beat
//       // 16/4 = 4 steps/beats
//       // 4 * 0.5 = total pattern time
//       // (60/bpm)*(patternLength/stepPerBeat)
//
//       if((loopTimeDiffMillis>(stepTime*seq.track[index].patterns["id_" + track.currentPattern].currentStep*1000))&&(stepTime*seq.track[index].patterns["id_" + track.currentPattern].currentStep<=seqPatternTime)){
//         // play currentStep Event
//         let data = {};
//         data.event = seq.track[index].patterns["id_" + track.currentPattern].events["id_" + seq.track[index].patterns["id_" + track.currentPattern].currentStep];
//         data.track = index;
//         data.lengthTime = stepTime * (data.event.length/100);
//         // console.log(data.event.enabled);
//         if(data.event.enabled){
//           ipc.of.nodeMidi.emit('play-note',data);
//           // console.log("note played");
//         }
//         // advance current step
//         seq.track[index].patterns["id_" + track.currentPattern].currentStep++;
//       }
//     }
//     if(seq.track[index].patterns["id_" + track.currentPattern].currentStep==seq.track[index].patterns["id_" + track.currentPattern].originalLengthSteps){
//       if(index==seq.track.length-1){
//         seq.state.firstLoopIteration = true;
//       }
//       seq.track[index].patterns["id_" + track.currentPattern].currentStep=0;
//     }
//   });
// }
// seqPlay();

// function newTimingLogEntry(entryText) {
//   let newEntry = {};
//   newEntry.time = process.hrtime();
//   newEntry.text = entryText;
//   timingLog.push(newEntry);
// }

// function writeTimingLogToFile() {
//   fs.writeFileSync('timingLog.json', JSON.stringify(timingLog));
// }

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
  // writeTimingLogToFile();
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