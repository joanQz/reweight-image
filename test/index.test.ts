import Blob = require('cross-blob');

import reweight = require('../src/index');
import convert = require('../src/convert');

test('jest should be working with Typescript', ()=>{
  let n: number = 2;
  expect(n).toBe(2);
});

test('converting image64 to Blob should return a Blob object', ()=>{
  const base64Image = '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';
  // ./tiny.png (1833 bytes)
  /*
    Could be get with:
      const imageBuffer = fs.readFileSync('./test/tiny.png');
      // path is not relative to this file but relative to root, where npm is executed
      console.log(imageBuffer.byteLength, imageBuffer.toString('base64'))
  */
  const converter = new convert.Convert();
  const blob = converter.getBlobFromBase64(base64Image);
  expect(blob instanceof Blob).toBe(true);
});

test('converting passed image64 to Blob should return a Blob object of 1833 bytes', ()=>{
  const base64Image = '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';
  // ./tiny.png (1833 bytes)
  const converter = new convert.Convert();
  const blob = converter.getBlobFromBase64(base64Image);
  expect(blob.size).toBe(1833);
});

test('get scales for 4000x3000 to max 1000 cover returns {0.33, 1333, 1000}', ()=>{
  const reweighter = new reweight.Reweight();
  let getScales = reweighter['getScales'];
  const {scale: scale, xScale: xScale, yScale: yScale } = getScales(1000, 4000, 3000, true);
  expect(scale).toBe(1/3);
  expect(xScale).toBe(4000/3);
  expect(yScale).toBe(1000);
});

test('get scales for 4000x3000 to max 5000 cover returns {1, 4000, 3000}', ()=>{
  const reweighter = new reweight.Reweight();
  let getScales = reweighter['getScales'];
  const {scale: scale, xScale: xScale, yScale: yScale } = getScales(5000, 4000, 3000, true);
  expect(scale).toBe(1);
  expect(xScale).toBe(4000);
  expect(yScale).toBe(3000);
});

test('get scales for 4000x3000 to max 1000 not cover returns {0.25, 1000, 750}', ()=>{
  const reweighter = new reweight.Reweight();
  let getScales = reweighter['getScales'];
  const {scale: scale, xScale: xScale, yScale: yScale } = getScales(1000, 4000, 3000, false);
  expect(scale).toBe(0.25);
  expect(xScale).toBe(1000);
  expect(yScale).toBe(750);
});

// TODO: test main function with a headless browser