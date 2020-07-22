var piWifi = require('pi-wifi');
const ipc = require('node-ipc');
const { clearInterval } = require('timers');

ipc.config.id = 'nodeWifiControl';
ipc.config.retry = 1500;
ipc.config.silent = true;

ipc.connectTo(
    'nodeMidi',
    function () {
        ipc.of.nodeMidi.on(
            'connect',
            function () {
                ipc.of.nodeMidi.emit('wifiControlConnected');
                console.log("Connected to Fire Sequencer main process.");
            }
        );
        ipc.of.nodeMidi.on(
            'disconnect',
            function () {
                console.log("Disconnected form Fire Sequencer main process.");
            }
        );
        ipc.of.nodeMidi.on('listSavedNetworks', function () {
            piWifi.listNetworks(function (err, networksArray) {
                if (err) {
                    return console.error(err.message);
                }
                // console.log(networksArray);
            });
        });
        ipc.of.nodeMidi.on('scanForNetworks', function () {
            var count = 0;
            var scanInterval = setInterval(function () {
                if(count>5){
                    clearInterval(scanInterval);
                }
                piWifi.scan(function (err, networks) {
                    if (err) {
                        return console.error(err.message);
                    }
                    // console.log(networks);
                    if(networks.length!=1){
                        clearInterval(scanInterval);
                    }
                });
                count++;
            }, 10000);
        });

    }
);





piWifi.scan(function (err, networks) {
    if (err) {
        return console.error(err.message);
    }
    // console.log(networks);
});

piWifi.status('wlan0', function (err, status) {
    if (err) {
        return console.error(err.message);
    }
    // console.log(status);
});

// var obj34 = {params:{param1:3,param2:"three",param3:null}};
// var obj45 = {params:{param1:4,param2:"four",param3:false}};

// function testFunk(objName,...paramets){

//   for(const things in paramets){
//     if(objName in paramets[things]){
//       console.log(paramets[things][objName].param1);
//     }
//   }
// }

// testFunk("params",obj34,obj45);