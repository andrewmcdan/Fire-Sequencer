const bitmaps = require('./bitmaps.js');
var fs = require('fs');



var fireOLED_pixelMemMap = new Array(128);
for (let i = 0; i < 128; i++) {
  fireOLED_pixelMemMap[i] = new Array(64);
  for (let p = 0; p < 64; p++) {
    fireOLED_pixelMemMap[i][p] = 0;
  }
}

btnLEDSysEx = new Uint8Array([0xf0, 0x47, 0x7f, 0x43, 0x65, 0x00, 0x04, 0, 0, 0, 0, 0xF7]);
gridBtnLEDcolor = JSON.parse('{"btn":[{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0},{"red":0,"grn":0,"blu":0}]}');
const DIM_VAL = 10;
const LED_COLOR_WHITE = (127 << 17) | (127 << 9) | (127 << 1);
const LED_COLOR_WHITE_DIM = (DIM_VAL << 17) | (DIM_VAL << 9) | (DIM_VAL << 1);
const LED_COLOR_RED = (127 << 17) | (0 << 9) | (0 << 1);
const LED_COLOR_RED_DIM = (DIM_VAL << 17) | (0 << 9) | (0 << 1);
const LED_COLOR_GREEN = (0 << 17) | (127 << 9) | (0 << 1);
const LED_COLOR_GREEN_DIM = (0 << 17) | (DIM_VAL << 9) | (0 << 1);
const LED_COLOR_BLUE = (0 << 17) | (0 << 9) | (127 << 1);
const LED_COLOR_BLUE_DIM = (0 << 17) | (0 << 9) | (DIM_VAL << 1);
const LED_COLOR_AQUA = (0 << 17) | (127 << 9) | (127 << 1);
const LED_COLOR_AQUA_DIM = (0 << 17) | (DIM_VAL << 9) | (DIM_VAL << 1);
const LED_COLOR_YELLOW = (127 << 17) | (127 << 9) | (0 << 1);
const LED_COLOR_YELLOW_DIM = (DIM_VAL << 17) | (DIM_VAL << 9) | (0 << 1);
const LED_COLOR_MAGENTA = (127 << 17) | (0 << 9) | (127 << 1);
const LED_COLOR_MAGENTA_DIM = (DIM_VAL << 17) | (0 << 9) | (DIM_VAL << 1);
const LED_COLOR_OFF = (0 << 17) | (0 << 9) | (0 << 1);

settings = {};

var yOffset = 0,
  xOffset = 0;;

if ((process.argv[2] && process.argv[2] === '--debugLevel') && (process.argv[3])) {
  settings.debugLevel = parseInt(process.argv[3]);
} else if ((process.argv[2] && process.argv[2] === '-d') && (process.argv[3])) {
  settings.debugLevel = parseInt(process.argv[3]);
} else {
  settings.debugLevel = 0;
}

const midi = require('midi');
flushedInput = false;
console.log("Flushing MIDI input buffers...");
setTimeout(function() {
  flushedInput = true;
  console.log("MIDI input buffer flush complete.");
}, 500);

// setup virtual interface to software midi
const virInput = new midi.Input();
virInput.openVirtualPort("Akai Fire Sequencer Input");
virInput.ignoreTypes(false, false, false);

const virOutput = new midi.Output();
virOutput.openVirtualPort("Akai Fire Sequencer Output");

// callback for incoming messages from virtual input port
virInput.on('message', (deltaTime, message) => {
  if (!settings.flushInput) {
    console.log("virinpout");
    console.log(`m: ${message} d: ${deltaTime}`);
  }
});

// Set up a new input.
const fireMidiIn = new midi.Input();
const fireMidiOut = new midi.Output();

// Count the available input ports.
console.log(fireMidiOut.getPortCount());

// find out open Akai Fire MIDI input port
// Get the name of a specified input port.
for (let step = 0; step < fireMidiIn.getPortCount(); step++) {
  // console.log(input.getPortName(step));
  if (fireMidiIn.getPortName(step).search("FL STUDIO FIRE:FL STUDIO FIRE MIDI 1") != -1) {
    fireMidiIn.openPort(step);
    console.log(fireMidiIn.getPortName(step));
  }
}
fireMidiIn.ignoreTypes(false, false, false);

// find out open Akai Fire MIDI output port
for (let step = 0; step < fireMidiOut.getPortCount(); step++) {
  console.log(fireMidiOut.getPortName(step));
  // if (fireMidiOut.getPortName(step).search("FL STUDIO FIRE:FL STUDIO FIRE MIDI 1") != -1) {
  if (fireMidiOut.getPortName(step).search("FL STUDIO FIRE:FL STUDIO FIRE MIDI 1") != -1) {
    fireMidiOut.openPort(step);
    console.log(fireMidiOut.getPortName(step));
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
fireMidiIn.on('message', async function(deltaTime, message) {
  if (flushedInput) { // make sure we ignore incoming messages until the input butffers have been flushed.
    console.log(message);
    switch (message[0]) {
      case 144: // note-on event
        if (message[1] >= 54 && message[1] <= 117) { // grid button

          //////////////////////////////////////////////
          ////////////     testing      ////////////////
          //                                          //
          let frame = 0;
          let inteval = new setInterval(function() {
            LED_COLOR = (frame << 17) | (0 << 9) | (0 << 1);
            btnLEDSysEx = [0xf0, 0x47, 0x7f, 0x43, 0x65, 0x00, 0x04, message[1] - 54, (LED_COLOR >> 17) & 0x7F, (LED_COLOR >> 9) & 0x7F, (LED_COLOR >> 1) & 0x7F, 0xF7];
            if (frame % 5 == 0) {
              fireMidiOut.sendMessage(btnLEDSysEx);
            }
            if (frame < 127) {
              frame++;
            } else {
              btnLEDSysEx = [0xf0, 0x47, 0x7f, 0x43, 0x65, 0x00, 0x04, message[1] - 54, (LED_COLOR_BLUE >> 17) & 0x7F, (LED_COLOR_BLUE >> 9) & 0x7F, (LED_COLOR_BLUE >> 1) & 0x7F, 0xF7];
              fireMidiOut.sendMessage(btnLEDSysEx);
              clearInterval(inteval);
            }
          }, 5);

          //                                          //
          //////////////////////////////////////////////

        }
        switch (message[1]) {
          case 53:
            // console.log("rec btn");
            // FireOLED_DrawFullScreenBitmap(0, 0, bitmaps._aSEGGERBitmap128x56);
            PlotStringToPixelMemMap("REC  button       ", 0, 0, 24, 2, 0);
            FireOLED_SendMemMap(0);
            break;
          case 52:
            // console.log("stop btn");
            // FireOLED_DrawBitmap_partial(30, 0, bitmaps.bitmap_check64x64, 64, 64);
            PlotStringToPixelMemMap("STOP  button      ", 0, 0, 24, 2, 0);
            FireOLED_SendMemMap(0);
            break;
          case 51:
            // convertStringToBitmap("ABCabc", 16);
            PlotStringToPixelMemMap("PLAY  button       ", 0, 0, 24, 2, 0);
            FireOLED_SendMemMap(0);
            break;
          case 50:
            // convertStringToBitmap("ABCabc", 16);
            // PlotStringToPixelMemMap("Pat/song btn          ", 0, 0, 24, 2, 0);
            PlotStringToPixelMemMap(String.fromCharCode(0x85,0x86), PlotStringToPixelMemMap(String.fromCharCode(0x83,0x84), 0, 0, 16, 2, 0),0, 16, 2, 0);
            FireOLED_SendMemMap(0);
            break;
        }
        break;
      case 128: // note-off event

        break;
      case 176: // CC event
        if (message[1] == 118 && message[2] == 127) {
          // FireOLED_DrawBitmap_partial(xOffset, ++yOffset, bitmaps.bitmap_thermom32x32, 32, 32);
          PlotStringToPixelMemMap("~ABCDEFGH", 0, 0, 24, 0, 1);
          PlotStringToPixelMemMap("ancdefghij", 0, 24, 24, 1, 0);
          PlotStringToPixelMemMap("klmnopqrstuvwxyz", 0, 48, 24, 2, 1);
          // PlotStringToPixelMemMap("RSTUVYZ", 0, 48, 24, 3, 0);
          FireOLED_SendMemMap(0);
          xOffset = 0;
        } else if (message[1] == 118 && message[2] == 1) {
          if (yOffset == 0) {
            yOffset++;
            xOffset++;
          }
          yOffset--;
          PlotStringToPixelMemMap("ABCDEFGHIJKLMN", 0, 0, 24, 0, 0);
          PlotStringToPixelMemMap("OPQRSTUVY", 0, 16, 24, 1, 1);
          PlotStringToPixelMemMap("abcdefghklm", 0, 32, 24, 2, 0);
          PlotStringToPixelMemMap("nopqrstu", 0, 48, 24, 3, 1);
          FireOLED_SendMemMap(0);
        }

        break;
      default:
        console.log("event not recognised");
    }
  }
});


/*

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

*/
function PlotStringToPixelMemMap(inString, xOrigin, yOrigin, heightPx, spacing, invert = 0) {
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
  }
  let cursor = xOrigin;
  for (let i = 0; i < inString.length; i++) {
    // get the width of the character from the array. Its the last value in each array.
    let currentCharWidth = font[inString.charCodeAt(i) - 32][font[inString.charCodeAt(i) - 32].length - 1];
    let currentCharData = font[inString.charCodeAt(i) - 32];
    PlotBitmapToPixelMemmap(currentCharData, cursor, yOrigin, currentCharWidth, heightPx, invert);
    cursor += currentCharWidth;
    if (font[inString.charCodeAt(i + 1) - 32] != undefined) { // If there are still characters in the string to plot
      if (cursor + spacing + (font[inString.charCodeAt(i + 1) - 32][font[inString.charCodeAt(i + 1) - 32].length - 1]) > 127) {
        break;
      }
    }
    if (spacing > 0) {
      let spaceBitmap = new Array((((spacing / 8) + 0.9999999) & 0xff) * heightPx);
      for (let g = 0; g < spaceBitmap.length; g++) {
        spaceBitmap[g] = 0;
      }
      PlotBitmapToPixelMemmap(spaceBitmap, cursor, yOrigin, spacing, heightPx, invert);
    }
    cursor += spacing;
  }
  return cursor;
}

/*************************************************************************************************
        Update all of the grid button LED from the gridBtnLEDcolor object.
        This function sends the sysEx commands with a ~1ms delay between each.
*************************************************************************************************/
function updateAllGridBtnLEDs() {
  let count = 0;
  let updateInterval = setInterval(function() {
    let sysEx = btnLEDSysEx;
    sysEx[7] = count;
    sysEx[8] = (gridBtnLEDcolor.btn[count].red >> 17) & 0x7f;
    sysEx[9] = (gridBtnLEDcolor.btn[count].grn >> 9) & 0x7f;
    sysEx[10] = (gridBtnLEDcolor.btn[count].blu >> 1) & 0x7f;
    fireMidiOut.sendMessage(sysEx);
    count++;
    if (count > 63) {
      clearInterval(updateInterval);
    }
  }, 0);
}
/*************************************************************************************************
 *************************************************************************************************/

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
  let y;
  let x;
  let xOrigin = 0,
    yOrigin = 0,
    yHeight = 64;
  switch (section) {
    case 1: // lines / pages 0, 1, 2
      yHeight = 24;
      break;
    case 2: // lines / pages 3, 4, 5
      yHeight = 24;
      yOrigin = 24;
      break;
    case 3: // lines / pages 6, 7
      yHeight = 16;
      yOrigin = 48;
      break;
  } // no "0" or default needed since values were set at declaration

  let newArraySize = ((((128 * yHeight) / 7) + 0.999999999) & 0xffff);
  var bit7_OLEDBitmap = new Uint8Array(newArraySize);
  for (x = 0; x < newArraySize; ++x) {
    bit7_OLEDBitmap[x] = 0;
  }

  /*for (x = 0; x < 128; x++) {
    for (y = yOrigin; y < (yOrigin + yHeight); y++) {
      let currentBit = fireOLED_pixelMemMap[x][y];
      let xUnwound = x + (128 * (((y-yOrigin) / 8) & 0xff));
      let yUnwound = y % 8;

      let bitByteMut = bitMutate_byteAddr[yUnwound][xUnwound%7];

      if (currentBit > 0) {
        bit7_OLEDBitmap[bitByteMut[1]+(((xUnwound/7)&0xff)*8)] |= (1 << bitByteMut[0]);
      } else {
        bit7_OLEDBitmap[bitByteMut[1]+(((xUnwound/7)&0xff)*8)] &=  (~(1 << bitByteMut[0]))&0xff;
      }
    }
  }*/

  for (x = 0; x < 128; x++) {
    for (y = yOrigin; y < (yOrigin + yHeight); y++) {
      let xUnwound = x + (128 * (((y - yOrigin) / 8) & 0xff));
      let bitByteMut =  bitmaps.bitMutate_byteAddr[y % 8][xUnwound % 7];
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
  invert - 0 for normal, 1 for inverted colors

*/
function PlotBitmapToPixelMemmap(inBitmap, xOrigin, yOrigin, bmp_width, bmp_height, invert) {
  /*  let x,y;
    let splitPoint = ((bmp_width/8)+0.999999999)&0xff;
    for ( x = 0; x < bmp_width; x++){
      for ( y = 0; y < bmp_height; y++){
        // if (currentCharData[(y * modSize) + ((x / 8) & 0xff)] & (0x80 >>> (x % 8))) {
        let inByte = inBitmap[(y*splitPoint) + ((x/8)&0xff)];
        let selBit = (0x80 >>> (x%8));
        let outBit = inByte & selBit;
        if(invert==1){
          fireOLED_pixelMemMap[x+xOrigin][y+yOrigin] = outBit>0?0:1;
        }else{
          fireOLED_pixelMemMap[x+xOrigin][y+yOrigin] = outBit>0?1:0;
        }
      }
    }*/
  let x, y;
  for (x = 0; x < bmp_width; x++) {
    for (y = 0; y < bmp_height; y++) {
      let outBit = (inBitmap[(y * (((bmp_width / 8) + 0.999999999) & 0xff)) + ((x / 8) & 0xff)]) & (0x80 >>> (x % 8));
      if (invert == 1) {
        fireOLED_pixelMemMap[x + xOrigin][y + yOrigin] = outBit > 0 ? 0 : 1;
      } else {
        fireOLED_pixelMemMap[x + xOrigin][y + yOrigin] = outBit > 0 ? 1 : 0;
      }
    }
  }
}

function debug(s, lvl, comment) {
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
  // if (dataLoaded) {
  // debug("saved", 3);
  // debug(midiConnections, 5);
  // }

  fireMidiIn.closePort();
  fireMidiOut.closePort();
  virInput.closePort();
  virOutput.closePort();
}


function exitHandler(options, exitCode) {
  exit();
  if (options.cleanup) debug('clean', 2);
  if (exitCode || exitCode === 0) debug(exitCode, 1);
  if (options.exit) process.exit();
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

// 120 bpm, 16 steps,
// 60/120 = 0.5 sec/beat
// 16/4 = 4 steps/beats
// 4 * 0.5 = total pattern time

// (60/bpm)*(patternLength/stepPerBeat)
