import reweight = require('../src/index');

test('jest should be working with Typescript', ()=>{
  let n: number = 2;
  expect(n).toBe(2);
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
