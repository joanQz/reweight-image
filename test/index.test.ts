import reweight = require('../src/index');

test('jest should be working with Typescript', ()=>{
  let n: number = 2;
  expect(n).toBe(2);
});

test('get scale for 4000x3000 to max 1000 cover returns 0.33', ()=>{
  const reweighter = new reweight.Reweight();
  let getScale = reweighter['getScale'];
  const scale = getScale(1000, 4000, 3000, true);
  expect(scale).toBe(1/3);
});

test('get scale for 4000x3000 to max 5000 cover returns 1', ()=>{
  const reweighter = new reweight.Reweight();
  let getScale = reweighter['getScale'];
  const scale = getScale(5000, 4000, 3000, true);
  expect(scale).toBe(1);
});

test('get scale for 4000x3000 to max 1000 not cover returns 0.25', ()=>{
  const reweighter = new reweight.Reweight();
  let getScale = reweighter['getScale'];
  const scale = getScale(1000, 4000, 3000, false);
  expect(scale).toBe(0.25);
});

// TODO: test main function with a headless browser
