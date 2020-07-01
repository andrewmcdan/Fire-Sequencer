var WiFiControl = require("wifi-control");
const wifiControl = require("wifi-control");
WiFiControl.init({debug:true});
// console.log(wifiControl.findInterface());
wifiControl.scanForWiFi(function(err,response){
    if(err)console.log(err);
    console.log(response);
})