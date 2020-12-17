var piWifi = require('pi-wifi');
const ipc = require('node-ipc');
const { clearInterval } = require('timers');

ipc.config.id = 'nodeWifiControl';
ipc.config.retry = 1500;
ipc.config.silent = true;

var wifiScanningTimeout = 5000; // milliseconds
// var foundNetworks = [];

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
        ipc.of.nodeMidi.on('connectToNetwork', function(networkDetails){
            //A simple connection
            setTimeout(() => {
                piWifi.connectTo(networkDetails, function(err) {
                    if (!err) { //Network created correctly
                        setTimeout(function () {
                            piWifi.check(networkDetails.ssid, function (err2, status) {
                                if (!err2 && status.connected) {
                                    console.log('Connected to the network ' + networkDetails.ssid + '!');
                                } else {
                                    console.log('Unable to connect to the network ' + networkDetails.ssid + '!');
                                    console.log(err2);
                                }
                            });
                        }, 5000);
                    } else {
                        console.log('Unable to create the network ' + networkDetails.ssid + '.');
                        console.log(err);
                    }
                });
            }, 10000);

            // setTimeout(() => {
            //     piWifi.connectToId(0,function(err){
            //         if (err) {
            //             return console.error(err.message);
            //         }else{
            //             console.log("connected to 1");
            //         }
            //     });
            //     piWifi.status('wlan0', function(err, status) {
            //         if (err) {
            //             return console.error(err.message);
            //         }
            //         console.log("status:");
            //         console.log(status);
            //     });
            //     piWifi.check(networkDetails.ssid, function (err, status) {
            //         if (!err && status.connected) {
            //             console.log('Connected to the network ' + networkDetails.ssid + '!');
            //         } else {
            //             console.log('Unable to connect to the network ' + networkDetails.ssid + '!');
            //         }
            //     });
            // }, 5000);
            
        })
        ipc.of.nodeMidi.on('listSavedNetworks', function () {
            piWifi.listNetworks(function (err, networksArray) {
                if (err) {
                    return console.error(err.message);
                }
                // console.log(networksArray);
                ipc.of.nodeMidi.emit('savedNetworks',networksArray);
            });
        });
        ipc.of.nodeMidi.on('scanForNetworks', function () {
            var count = 0;
            foundNetworks = [];
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
                    // console.log(networks);
                    // networks.forEach(element => {
                    //     foundNetworks.push(element)
                    // });
                    ipc.of.nodeMidi.emit('scannedNetworks',foundNetworks);
                });
                count++;
            }, wifiScanningTimeout);
        });
    }
);





// piWifi.scan(function (err, networks) {
//     if (err) {
//         return console.error(err.message);
//     }
//     // console.log(networks);
// });

// piWifi.status('wlan0', function (err, status) {
//     if (err) {
//         return console.error(err.message);
//     }
//     // console.log(status);
// });



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

