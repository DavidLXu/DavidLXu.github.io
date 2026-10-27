const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {value: id === 'volume' ? '55' : '64', checked: true, children: [], classList: {toggle() {}}, setAttribute() {}});
  return elements.get(id);
}
const events = [];
const param = () => ({value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}});
const node = () => ({gain: param(), threshold: param(), ratio: param(), connect() {return this;}, disconnect() {}});
class AudioContext {
  constructor() {this.currentTime = 0; this.state = 'running'; this.destination = node();}
  createGain() {return node();}
  createDynamicsCompressor() {return node();}
  createOscillator() {
    return {...node(), frequency: param(), start(time) {events.push({time,frequency:this.frequency.value});}, stop(time) {this.stoppedAt=time;}};
  }
}
const context = {
  document: {getElementById: element, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}},
  window: {AudioContext}, setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/apps/guitar-practice/app.js','utf8'), context);
const run = expression => vm.runInContext(expression, context);
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
(async () => {
  const expected={E7:[2,4,8,11],A7:[1,4,7,9],B7:[3,6,9,11],D7:[0,2,6,9],Dm7:[0,2,5,9],G7:[2,5,7,11],Cmaj7:[0,4,7,11],Am7:[0,4,7,9],Fmaj7:[0,4,5,9],Am:[0,4,9],Dm:[2,5,9],D9:[0,2,4,6,9],E9:[2,4,6,8,11],Gmaj7:[2,6,7,11],Bm7b5:[2,5,9,11],Gm7:[2,5,7,10],C7:[0,4,10],F7:[0,3,5,9],Dm9:[0,2,4,5],G13:[4,5,7,11],Cmaj9:[0,2,4,11]};
  const shapes = JSON.parse(run('JSON.stringify(chords)'));
  assert.equal(Object.keys(shapes).length,21);
  for(const [name,c] of Object.entries(shapes)) {
    const notes=[40,45,50,55,59,64].flatMap((n,i)=>c.f[i]<0?[]:[(n+c.f[i])%12]);
    assert.deepEqual([...new Set(notes)].sort((a,b)=>a-b), expected[name],name);
    c.f.forEach((f,i)=>{if(f>0){assert.ok(f>=(c.start||1)&&f<=(c.start||1)+3,name); assert.ok(c.n[i]>=1&&c.n[i]<=4,name);}});
  }
  assert.equal(run('presets.length'),13);
  assert.equal(run('presets.filter(p=>p.groove).length'),8);
  assert.ok(run('presets.every(p=>p.seq.every(name=>chords[name]))'));
  await run('initAudio()');
  await element('play').onclick();
  assert.equal(run('running'),true);
  assert.equal(events.length,1,'count-in starts with one click, no chord');
  assert.equal(run('pendingVisuals[0].count'),1);
  run('audio.currentTime=nextTime; tick(); audio.currentTime=nextTime; tick(); audio.currentTime=nextTime; tick()');
  assert.equal(events.length,4,'four clicks before accompaniment');
  run('audio.currentTime=nextTime; tick(); draw()');
  assert.equal(run('countDisplay'),0);
  assert.equal(run('bar'),0); assert.equal(run('beat'),0);
  assert.ok(events.length>4,'backing begins after count-in');
  run('stop()');
  assert.ok(run('[...voices].every(v=>v.o.stoppedAt<=audio.currentTime+.041)'), 'pause stops all notes');
  assert.equal(run('pendingVisuals.length'),0);
  // Each mode uses the named chord and includes both chord voices and bass.
  for(const groove of ['sustain','swing','bossa']) {
    element('groove').value=groove; events.length=0;
    for(let b=0;b<4;b++)run(`accompaniment('Dm7',${b},${10+b},1)`);
    assert.ok(events.length>=10,groove);
    const allowed=new Set([0,2,5,9]);
    for(const e of events){const midi=Math.round(69+12*Math.log2(e.frequency/440));assert.ok(allowed.has((midi%12+12)%12),groove+' note '+midi);}
    if(groove==='swing')assert.ok(events.some(e=>e.time>=12+2/3 && e.time<12+2/3+.05),'swung offbeat');
    if(groove==='bossa')assert.ok(events.some(e=>e.time>=11.5 && e.time<11.55),'straight offbeat');
  }
  // Audio clock stays on the beat grid despite timer jitter; loop returns to bar zero.
  element('sound').checked=false; element('backing').checked=false; element('countIn').checked=false;element('bpm').value='120';
  run('selected=2;bar=0;beat=-1;audio.currentTime=0;running=true;countRemaining=0;scheduledBar=0;scheduledBeat=0;nextTime=.05;pendingVisuals=[]');
  for(let i=0;i<17;i++) {
    run(`audio.currentTime=${.05+i*.5+.02};tick();draw()`);
    assert.equal(run('bar'),Math.floor(i/4)%4);assert.equal(run('beat'),i%4);close(run('nextTime'),.05+(i+1)*.5);
  }
  const before=events.length;run("accompaniment('G7',0,20,1)");assert.equal(events.length,before,'mute suppresses backing');
  // Jumping cancels the previous chord and restarts at beat one of the selected bar.
  element('backing').checked=true;element('groove').value='sustain';
  element('progression').onclick({target:{closest:()=>({dataset:{bar:'1'}})}});
  assert.ok(run('[...voices].filter(v=>v.o.stoppedAt<nextTime).length>0'));
  assert.equal(run('pendingVisuals[0].bar'),1);assert.equal(run('pendingVisuals[0].beat'),0);
  element('bpm').value='60';run('audio.currentTime=nextTime;tick()');close(run('nextTime-audio.currentTime'),1);
  element('styles').onclick({target:{closest:()=>({dataset:{preset:'10'}})}});
  assert.equal(run('running'),false);assert.equal(element('groove').value,'bossa');assert.equal(run('bar'),0);
  element('reset').onclick();assert.equal(run('bar'),0);assert.equal(run('beat'),-1);
  for(let i=0;i<13;i++){run('selected='+i);const svg=run('sheet()');assert.ok(svg.includes('<svg'));if(process.argv.includes("--export-sheets"))fs.writeFileSync(`assets/apps/guitar-practice/chord-sheets/practice-${i+1}.svg`,svg);}
  console.log('PASS: 21 chord voicings, 13 progressions, 3 backing patterns, four-beat count-in, clock alignment, loop, mute, tempo change, jump, pause/reset, style switching and sheet exports.');
})().catch(e=>{console.error(e);process.exitCode=1;});
