const bitmaps = require('./bitmaps.js');

const _aBitMutate = [
  [13, 19, 25, 31, 37, 43, 49],
  [0, 20, 26, 32, 38, 44, 50],
  [1, 7, 27, 33, 39, 45, 51],
  [2, 8, 14, 34, 40, 46, 52],
  [3, 9, 15, 21, 41, 47, 53],
  [4, 10, 16, 22, 28, 48, 54],
  [5, 11, 17, 23, 29, 35, 55],
  [6, 12, 18, 24, 30, 36, 42]
];

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
}, 1500);

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

// Get the name of a specified input port.
for (let step = 0; step < fireMidiIn.getPortCount(); step++) {
  // console.log(input.getPortName(step));
  if (fireMidiIn.getPortName(step).search("FL STUDIO FIRE:FL STUDIO FIRE MIDI 1") != -1) {
    fireMidiIn.openPort(step);
    console.log(fireMidiIn.getPortName(step));
  }
}
fireMidiIn.ignoreTypes(false, false, false);

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
          // console.log("grid btn");



          //////////////////////////////////////////////
          ////////////     testing      ////////////////
          //                                          //
          let frame = 0;
          let inteval = new setInterval(function() {
            LED_COLOR = (frame << 17) | (frame << 9) | (0 << 1);
            btnLEDSysEx = [0xf0, 0x47, 0x7f, 0x43, 0x65, 0x00, 0x04, message[1] - 54, (LED_COLOR >> 17) & 0x7F, (LED_COLOR >> 9) & 0x7F, (LED_COLOR >> 1) & 0x7F, 0xF7];
            if (frame % 5 == 0) {
              fireMidiOut.sendMessage(btnLEDSysEx);
            }
            if (frame < 127) {
              frame++;
            } else {
              btnLEDSysEx = [0xf0, 0x47, 0x7f, 0x43, 0x65, 0x00, 0x04, message[1] - 54, (LED_COLOR_GREEN >> 17) & 0x7F, (LED_COLOR_GREEN >> 9) & 0x7F, (LED_COLOR_GREEN >> 1) & 0x7F, 0xF7];
              fireMidiOut.sendMessage(btnLEDSysEx);
              clearInterval(inteval);
            }
          }, 5);

          //                                          //
          //////////////////////////////////////////////


          // console.log({
          //   btnLEDSysEx
          // });
        }
        if (message[1] == 53) { // record button note-on
          console.log("rec btn");
          FireOLED_DrawFullScreenBitmap(0, 0, bitmaps._aSEGGERBitmap);
        }
        if (message[1] == 52) { // stop button note-on
          console.log("stop btn");
          FireOLED_DrawBitmap_partial(32, 0, bitmaps.bitmap_check64x64, 64, 64);
        }
        if(message[1] == 51){
          convertStringToBitmap("ABCabc",16);
        }
        break;
      case 128: // note-off event

        break;
      case 176: // CC event
        console.log("CC event");
        console.log({
          yOffset
        });
        if (message[1] == 118 && message[2] == 127) {
          FireOLED_DrawBitmap_partial(xOffset, ++yOffset, bitmaps.bitmap_thermom32x32, 32, 32);
          xOffset = 0;
        } else if (message[1] == 118 && message[2] == 1) {
          if (yOffset == 0) {
            yOffset++;
            xOffset++;
          }
          // FireOLED_DrawBitmap_partial(xOffset, yOffset, bitmaps.bitmap_thermom32x32, 32, 32);
          yOffset--;
          let bitmapString = convertStringToBitmap("A",16);
          FireOLED_DrawBitmap_partial(0,0,bitmapString.array,bitmapString.width,16);
        }

        break;
      default:
        console.log("event not recognised");
    }
  }
});



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
function to generate a bitmap containing the bitmaps of characters from inString.

Returns an object containing width of the final bitmap and an array of bytes that
make then bitmap.

*/
function convertStringToBitmap(inString,heightPx){
  var stringBitmap = {}; // object to contain outgoing data

  stringBitmap.out = {};
  stringBitmap.out.width=0; // width of the final bitmap
  for(let i = 0; i < inString.length; i++){
    // console.log(bitmaps.font_16px[inString.charCodeAt(i)-32].length);
    // get the width of the character from the array. Its the last value in each array.
    stringBitmap.out.width += bitmaps.font_16px[inString.charCodeAt(i)-32][bitmaps.font_16px[inString.charCodeAt(i)-32].length-1];
  }


  stringBitmap.out.width += 8-(stringBitmap.out.width%8); // round the width up to the nearest byte-divisable (x%8=0) value
  // debug(stringBitmap.out.width,5,"out.width");
  stringBitmap.temp = new Array(heightPx);

  for( let i = 0; i < heightPx; i++){
    stringBitmap.temp[i] = new Array(stringBitmap.out.width/8); // create new array for each line

    // initialize the temp arrays to zeroes
    for(let p = 0; p < stringBitmap.out.width/8; p++){
      stringBitmap.temp[i][p] = 0;
    }

    // console.log(stringBitmap.temp[i]);
  }

  let cursor = 0;

  stringBitmap.out.array = new Array((stringBitmap.out.width/8)*heightPx);
  // console.log(stringBitmap.temp[0].length)

  for(let i = 0; i < inString.length; i++){
    // get the width of the character from the array. Its the last value in each array.
    // bitmaps.font_16px[74-32][bitmaps.font_16px[74-32].length-1]
    let currentCharWidth = bitmaps.font_16px[inString.charCodeAt(i)-32][bitmaps.font_16px[inString.charCodeAt(i)-32].length-1];
    let currentCharData = bitmaps.font_16px[inString.charCodeAt(i)-32];
    let currentCharHeight = heightPx;
    // console.log({currentCharWidth});
    // console.log({currentCharData});

    let modSize = (((currentCharWidth-1) / 8)&0xff)+1;

    // set bits in new array based on bits set in incoming bitmap
    for (y = 0; y < currentCharHeight; y++) {
      for (x = 0; x < currentCharWidth; x++) {
        // console.log("4");
        // if (currentCharData[((y) * ((currentCharWidth / modSize) & 0xff)) + ((x / 8) & 0xff)] & (0x80 >>> (x % 8))) {
        if (currentCharData[(y*modSize) + ((x / 8) & 0xff)] & (0x80 >>> (x % 8))) {
          // console.log("1");
          // yOrigin is used to create offset in mutated bitmap for y-axis.
          // x-axis offset is handled when the sysEx message is created, further down.
          // x += x_size * ((y / 8) & 0xff);
          // y %= 8;
          // stringBitmap.out.array[((x / 8) & 0xff) * 8 + ((remapBit / 7) & 0xff)] |= 1 << (remapBit % 7);

          // console.log(stringBitmap.out.width);
          // console.log({cursor});
          // console.log({cursor});
          // console.log({y});
          let aVar = stringBitmap.temp[y][((cursor/8)&0xff)];
          console.log(x);
          stringBitmap.temp[y][((x/8)&0xff)] = stringBitmap.temp[y][((x/8)&0xff)] | ( 1 << (x % 8));
          // console.log("3");

          // console.log("5");
          // console.log((bitpos/8)&0xff);
        }
        // console.log(((stringBitmap.out.width * y) + cursor));
        // console.log("dfdfd");
      }
      // debug(stringBitmap.temp[y],5,"temp[y]");
      // console.log("sdsdsdfsdfsdf");
    }
    // console.log("iutyiutyiutyiu");
    cursor+=currentCharWidth;
    // console.log({cursor});
  }

  console.log(stringBitmap.temp);

  stringBitmap.out.array = stringBitmap.temp[0];

  for(let y = 1; y < heightPx; y++){
    stringBitmap.out.array = stringBitmap.out.array.concat(stringBitmap.temp[y]);
  }

  console.log(stringBitmap.out.array);




  // FireOLED_DrawBitmap_partial(0,0,stringBitmap.out.array,stringBitmap.out.width,heightPx);

  // console.log({stringBitmap});
  return stringBitmap.out;
}



function FireOLED_DrawFullScreenBitmap(yOrigin, xOrigin, bitmapIn) {
  var _aOLEDBitmap = new Array(1171);
  let y;
  let x;
  for (x = 0; x < 128; ++x) {
    for (y = 0; y < 64; ++y) {
      FireOLED_PlotPixel_fullscreen(x, y, 0, _aOLEDBitmap);
      // console.log({x});
      // console.log({y});
    }
  }
  for (y = 0; y < 56; ++y) {
    for (x = 0; x < 120; ++x) {
      if (bitmapIn[((y) * ((128 / 8) & 0xff)) + ((x / 8) & 0xff)] & (0x80 >>> (x % 8))) {
        FireOLED_PlotPixel_fullscreen(xOrigin + x, yOrigin + y, 1, _aOLEDBitmap);

      }
    }
  }

  let newSysEx = new Array(_aOLEDBitmap.length + 12);
  newSysEx[0] = 0xf0; // sys ex
  newSysEx[1] = 0x47; // Akai manufacturer ID
  newSysEx[2] = 0x7F; // All Call Address
  newSysEx[3] = 0x43; // Fire Sub-ID
  newSysEx[4] = 0x0E; // Write OLED command
  newSysEx[5] = (_aOLEDBitmap.length + 4) >> 7; // payload length, btis 7-13
  newSysEx[6] = (_aOLEDBitmap.length + 4) & 0x7F; // payload length, bits 0-7
  newSysEx[7] = 0x00;
  newSysEx[8] = 0x07;
  newSysEx[9] = 0x00;
  newSysEx[10] = 0x7f;
  let i = 0;
  while (i < _aOLEDBitmap.length) {
    newSysEx[i + 11] = _aOLEDBitmap[i];
    i++;
  }
  newSysEx[_aOLEDBitmap.length + 11] = 0xf7;
  fireMidiOut.sendMessage(newSysEx);
}


function FireOLED_PlotPixel_fullscreen(x, y, c, bitmap) {
  let remapBit = 0;
  //
  if (x < 128 && y < 64) {
    //
    // Unwind 128x64 arrangement into a 1024x8 arrangement of pixels.
    //
    x += 128 * ((y / 8) & 0xff);
    y %= 8;
    //
    // Remap by tiling 7x8 block of translated pixels.
    //
    remapBit = _aBitMutate[y][x % 7];
    // console.log(remapBit);
    if (c > 0) {
      bitmap[((x / 7) & 0xff) * 8 + ((remapBit / 7) & 0xff)] |= 1 << (remapBit % 7);
    } else {
      bitmap[((x / 7) & 0xff) * 8 + ((remapBit / 7) & 0xff)] &= (~(1 << (remapBit % 7))) & 0xff;
    }
  }
}


/*************************************************************************************************
        Draw a bitmap to the Fire OLED

        Paramters:
          xOrigin,yOrigin - origin pixel to start drwaing bitmap.
          bitmapIn - Array of "byte values" containing bitmap data. Must be formatted in multiple
            such that the x_size is a multiple of y_size/8. i.e. 18x24,21x24,24x24,27x24,28x32,32x32 etc.
          x_size, y_size - size of the incoming bitmap

        Returns:
          true - if the function completes
          false - if there is an error
*************************************************************************************************/
function FireOLED_DrawBitmap_partial(xOrigin, yOrigin, bitmapIn, x_size, y_size) {
  // first thing is to calculate size of mutated bitmap. If the origin lands on the edge of an 8x7
  // OLED grid block, then the mutated bitmap will be the same size as the incoming bitmap. If the
  // origin lands somewher inside an 8x7 block...
  // for x axis..
  var mutatedBitmap_x_size = 0;
  // relationship of x_size and xOrigin can have one of three options:
  // 1. xOrigin does not land on an 8x7    |||  2.  xOrigin does not land on an 8x7 grid block edge, x_size is not a multiple of seven, and the offset of xOrigin does
  //    grid block edge and x_size is      |||      not cause an overflow into the next 8x7 grid block.
  //    a multiple of seven                |||
  //  |||                                  |||
  if (((xOrigin % 7 != 0) && (x_size % 7 == 0)) || ((xOrigin % 7 != 0) && (x_size % 7 != 0) && (((((x_size / 7) + 0.999999999999) & 0xff) * 7) > (xOrigin % 7) + x_size))) {
    mutatedBitmap_x_size = x_size + 7;
  } else { // 3. xOrigin lands on a grid block edge
    mutatedBitmap_x_size = x_size;
  }

  // var mutatedBitmap_x_size = (xOrigin % 7) != 0 ? x_size + 7 : x_size;

  // for y axis, mutated y size is 8 larger than y_size if the origin doed not land on a grid block edge
  var mutatedBitmap_y_size = (yOrigin % 8) != 0 ? y_size + 8 : y_size;

  // create a new array to hold the mutated bitmap data. "& 0xffff" and "+0.99999" used to truncate result to next higher integer
  var newArrayLength = ((((mutatedBitmap_x_size * mutatedBitmap_y_size) / 7) & 0xffff) + 0.9999999) & 0xffff;
  var _aOLEDBitmap = new Array(newArrayLength);


  let y;
  let x;

  // initialize the new array to all zeroes.
  for (x = 0; x < mutatedBitmap_x_size; ++x) {
    for (y = 0; y < mutatedBitmap_y_size; ++y) {
      FireOLED_PlotPixel_partial(x, y, 0, _aOLEDBitmap, mutatedBitmap_x_size, mutatedBitmap_y_size);
    }
  }

  // determine split point for bitmap data
  let modSize = (x_size / (y_size / 8));

  // set bits in new array based on bits set in incoming bitmap
  for (y = 0; y < y_size; ++y) {
    for (x = 0; x < x_size; ++x) {
      if (bitmapIn[((y) * ((x_size / modSize) & 0xff)) + ((x / 8) & 0xff)] & (0x80 >>> (x % 8))) {
        // yOrigin is used to create offset in mutated bitmap for y-axis.
        // x-axis offset is handled when the sysEx message is created, further down.
        FireOLED_PlotPixel_partial(x, (yOrigin % 8) + y, 1, _aOLEDBitmap, mutatedBitmap_x_size, mutatedBitmap_y_size);
      }
    }
  }

  let newSysEx = new Array(_aOLEDBitmap.length + 12);

  // calculate row start value, and return flase if the bitmap overruns the OLED
  let rowStart = (yOrigin / 8) & 0xff;
  if (rowStart > 7) {
    return false;
  }
  let rowEnd = ((mutatedBitmap_y_size / 8) & 0xff) - 1 + rowStart;
  if (rowEnd > 7) {
    return false;
  }
  newSysEx[0] = 0xf0; // sys ex
  newSysEx[1] = 0x47; // Akai manufacturer ID
  newSysEx[2] = 0x7F; // All Call Address
  newSysEx[3] = 0x43; // Fire Sub-ID
  newSysEx[4] = 0x0E; // Write OLED command
  newSysEx[5] = (_aOLEDBitmap.length + 4) >>> 7; // payload length, btis 7-13
  newSysEx[6] = (_aOLEDBitmap.length + 4) & 0x7F; // payload length, bits 0-7
  newSysEx[7] = rowStart;
  newSysEx[8] = rowEnd;
  newSysEx[9] = xOrigin;
  newSysEx[10] = mutatedBitmap_x_size + xOrigin - 1;
  let i = 0;
  while (i < _aOLEDBitmap.length) {
    newSysEx[i + 11] = _aOLEDBitmap[i];
    i++;
  }
  newSysEx[_aOLEDBitmap.length + 11] = 0xf7;
  if ((x_size + xOrigin) < 128) { // check for OLED overrun
    fireMidiOut.sendMessage(newSysEx);
  } else {
    return false;
  }
  return true;
}


function FireOLED_PlotPixel_partial(x, y, c, bitmap, x_size, y_size) {
  let remapBit = 0;
  //
  if ((x < x_size) && (y < y_size)) {
    //
    // Unwind 128x64 arrangement into a 1024x8 arrangement of pixels.
    //
    x += x_size * ((y / 8) & 0xff);
    y %= 8;
    //
    // Remap by tiling 7x8 block of translated pixels.
    //
    remapBit = _aBitMutate[y][x % 7];
    // console.log(remapBit);
    if (c > 0) {
      bitmap[((x / 7) & 0xff) * 8 + ((remapBit / 7) & 0xff)] |= 1 << (remapBit % 7);
    } else {
      bitmap[((x / 7) & 0xff) * 8 + ((remapBit / 7) & 0xff)] &= (~(1 << (remapBit % 7))) & 0xff;
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
  // fs.writeFileSync('dataObjFile', JSON.stringify(midiConnections));
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
