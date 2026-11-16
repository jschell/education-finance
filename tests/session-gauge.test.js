import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionSeed,updateSessionSeed} from '../site/js/session-seed.js';
import {gaugeColor,gaugeSegments} from '../site/js/gauge-colors.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('a tab session generates once, survives reload and accepts custom zero or maximum seed',()=>{
 const storage=memory();let calls=0;assert.equal(sessionSeed(storage,()=>{calls++;return 123456789;}),123456789);
 assert.equal(sessionSeed(storage,()=>{calls++;return 42;}),123456789);assert.equal(calls,1);
 updateSessionSeed(0,storage);assert.equal(sessionSeed(storage),0);updateSessionSeed(4294967295,storage);assert.equal(sessionSeed(storage),4294967295);
 assert.equal(sessionSeed(memory(),()=>987654321),987654321);
});
test('invalid saved seeds regenerate and restricted session storage leaves a usable seed',()=>{
 const storage=memory();storage.setItem('education-finance-session-seed-v1','-1');assert.equal(sessionSeed(storage,()=>7),7);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(sessionSeed(blocked,()=>8),8);assert.equal(updateSessionSeed(9,blocked),9);
 for(const n of [-1,1.5,4294967296,NaN])assert.throws(()=>updateSessionSeed(n,storage));
});
test('gauge moves through red and yellow, reserving green for the chosen target',()=>{
 assert.equal(gaugeColor(0,.9),'#8c3029');assert.equal(gaugeColor(.81,.9),'#edc84b');assert.equal(gaugeColor(.9,.9),'#378562');assert.equal(gaugeColor(1,.9),'#174f3b');
 assert.equal(gaugeColor(.8,.8),'#378562');assert.notEqual(gaugeColor(.8,.95),'#378562');assert.notEqual(gaugeColor(.2,.9),gaugeColor(.7,.9));
 for(const target of [.8,.9,.95]){const segments=gaugeSegments(target);assert.equal(segments[0].start,0);assert.equal(segments.at(-1).end,1);assert.ok(segments.some(s=>s.start===target));for(let i=1;i<segments.length;i++)assert.equal(segments[i-1].end,segments[i].start);}
});
