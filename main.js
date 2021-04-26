var usbDetect = require('usb-detection');
const spawn = require('child_process').spawn;
const path = require('path');
const kill = require('tree-kill');
const exec = require('child_process').exec;
// const osc = require('osc');

const fireVID = 2536;
const firePID = 67;

var FireSeq_isStarted = false;
var firstTest = true;
var child;

usbDetect.startMonitoring();

const ipc = require('node-ipc');
const {
  clearInterval
} = require('timers');

ipc.config.id = 'nodeMainJS';
ipc.config.retry = 1500;
ipc.config.silent = true;

ipc.connectTo(
  'nodeMidi',
  function () {
    ipc.of.nodeMidi.on(
      'connect',
      function () {
        ipc.of.nodeMidi.emit('mainJSProcessConnected');
        console.log("Connected to Fire Sequencer main process.");
      }
    );
    ipc.of.nodeMidi.on(
      'disconnect',
      function () {
        console.log("Disconnected form Fire Sequencer main process.");
      }
    );
    ipc.of.nodeMidi.on('systemShutdown', system_shutdown);
    ipc.of.nodeMidi.on('systemReboot', system_reboot);
    ipc.of.nodeMidi.on('restartNodemidi', nodeMidiRestart);
  }
);

var detectionInterval = setInterval(function () {
  usbDetect.find(fireVID, firePID, function (err, devices) {
    if (!err) {
      if (devices.length != 0 && !FireSeq_isStarted) {
        console.log("Akai Fire found.");
        console.log("Starting FireSequencer.js");
        let command = 'node';
        let parameters = [path.resolve('FireSequencer.js')];
        child = spawn(command, parameters, {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        FireSeq_isStarted = true;
      } else if (devices.length == 0 && FireSeq_isStarted) {
        console.log("Fire not detected. Killing sequencer.");
        kill(child.pid)
        FireSeq_isStarted = false;
      } else if (devices.length == 0 && !FireSeq_isStarted) {
        if (firstTest) {
          console.log("Please connect Akai Fire to sequencer device.");
          firstTest = false;
        }
      }
    } else {
      console.log(err);
    }
  });
}, 1000);

function nodeMidiRestart(){
  if(FireSeq_isStarted){
    kill(child.pid);
  }
  let command = 'node';
  let parameters = [path.resolve('FireSequencer.js')];
  child = spawn(command, parameters, {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  });
  FireSeq_isStarted = true;
}



// This code spawns the seq_loop node process. In testing, we manually spawn
// sequence looper so that we can debug it.
const nodeCommand = 'node';
const seqLoop_parameters = [path.resolve('seq_loop.js')];
const seqLoop_child = spawn(nodeCommand, seqLoop_parameters, {
  stdio: ['pipe', 'pipe', 'pipe', 'ipc']
});



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
  usbDetect.stopMonitoring()
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

// shutdown function
function system_shutdown(callback = console.log) {
  exec('sudo shutdown now', function (error, stdout, stderr) {
    callback(stdout);
    console.log(error);
    console.log(stderr);
  });
}

// Reboot computer
// shutdown(function(output){
//     console.log(output);
// });

// Create shutdown function
function system_reboot(callback = console.log) {
  exec('sudo shutdown -r now', function (error, stdout, stderr) {
    callback(stdout);
    console.log(error);
    console.log(stderr);
  });
}

// Reboot computer
// shutdown(function(output){
//     console.log(output);
// });
