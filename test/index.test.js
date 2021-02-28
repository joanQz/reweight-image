const fs = require('fs');

const reweight = require('./index.js');

const imageBuffer = fs.readFileSync('./1400x1400.jpg');

/* maybe fileStr = imageBuffer.toString(“base64”) */

reweightedImage = reweight( imageBuffer, {maxFileSizeMb: 0.5});
if (!reweightedImage)
  throw('Error: no results');

if (Buffer.byteLength(reweightedImage) > 500000)
  throw('Error: image is bigger than expected')
