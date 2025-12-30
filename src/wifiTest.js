var piWifi = require('pi-wifi');
const ipc = require('node-ipc');

ipc.config.id = 'nodeWifiControl';
ipc.config.retry = 1500;
ipc.config.silent = true;

ipc.connectTo(
  'nodeMidi',
  function () {
    ipc.of.nodeMidi.on(
      'connect',
      function () {
        // ipc.log('## connected to nodeMidi ##'.rainbow, ipc.config.delay);
        ipc.of.nodeMidi.emit('get-seq.track-Var');
        console.log("Connected to Fire Sequencer main process.");        
      }
    );
    ipc.of.nodeMidi.on(
      'disconnect',
      function () {
        // ipc.log('disconnected from nodeMidi'.notice);
        // console.log("Disconnected from main processs.");
        seqStop(false);
        console.log("Disconnected form Fire Sequencer main process.");
      }      
    );
    ipc.of.nodeMidi.on(
      'seq.trackVar', //any event or message type your server listens for
      function (data) {
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
    ipc.of.nodeMidi.on('seqPlay', function(beats){
      seqPlay(beats);
    });
    ipc.of.nodeMidi.on('seqStop', seqStop);
    ipc.of.nodeMidi.on('tempoChange', function (data) {
      seq.state.currentBPM = data
    });
    ipc.of.nodeMidi.on('setITU', function(data){ // ITC = Immediate Track Updates
      seq.state.immediateTrackUpdate=data;
    });
  }
);


piWifi.listNetworks(function(err, networksArray) {
  if (err) {
    return console.error(err.message);
  }
  console.log(networksArray);
});


/*
var piWifi = require('pi-wifi');
 */
piWifi.scan(function(err, networks) {
  if (err) {
    return console.error(err.message);
  }
  console.log(networks);
});

piWifi.status('wlan0', function(err, status) {
    if (err) {
      return console.error(err.message);
    }
    console.log(status);
  });