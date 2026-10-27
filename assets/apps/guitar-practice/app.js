const chords={
 E7:{f:[0,2,0,1,0,0],n:[0,2,0,1,0,0],note:'开放和弦 · 从 6 弦弹起'},
 A7:{f:[-1,0,2,0,2,0],n:[0,0,1,0,2,0],note:'开放和弦 · 从 5 弦弹起'},
 B7:{f:[-1,2,1,2,0,2],n:[0,2,1,3,0,4],note:'开放和弦 · 从 5 弦弹起'},
 D7:{f:[-1,-1,0,2,1,2],n:[0,0,0,2,1,3],note:'开放和弦 · 从 4 弦弹起'},
 Dm7:{f:[-1,-1,0,2,1,1],n:[0,0,0,2,1,1],barre:[1,4,5],note:'食指小横按 · 1、2 弦第 1 品'},
 G7:{f:[3,2,0,0,0,1],n:[3,2,0,0,0,1],note:'开放和弦 · 从 6 弦弹起'},
 Cmaj7:{f:[-1,3,2,0,0,0],n:[0,3,2,0,0,0],note:'开放和弦 · 从 5 弦弹起'},
 Am7:{f:[-1,0,2,0,1,0],n:[0,0,2,0,1,0],note:'开放和弦 · 从 5 弦弹起'},
 Fmaj7:{f:[-1,-1,3,2,1,0],n:[0,0,3,2,1,0],note:'不用横按 · 从 4 弦弹起'},
 Am:{f:[-1,0,2,2,1,0],n:[0,0,2,3,1,0],note:'开放和弦 · 从 5 弦弹起'},
 Dm:{f:[-1,-1,0,2,3,1],n:[0,0,0,2,3,1],note:'开放和弦 · 从 4 弦弹起'},
 D9:{f:[-1,5,4,5,5,5],n:[0,2,1,3,3,3],start:4,barre:[5,3,5],note:'无名指小横按 · 第 5 品'},
 Gmaj7:{f:[3,-1,4,4,3,-1],n:[1,0,3,4,2,0],start:3,note:'从 6 弦弹起 · 5、1 弦不弹'},
 Bm7b5:{f:[-1,2,3,2,3,-1],n:[0,1,3,2,4,0],note:'半减七和弦 · 6、1 弦不弹'},
 Gm7:{f:[3,-1,3,3,3,-1],n:[2,0,3,3,3,0],start:3,barre:[3,2,4],note:'无名指小横按 · 5、1 弦不弹'},
 C7:{f:[-1,3,2,3,1,0],n:[0,3,2,4,1,0],note:'开放和弦 · 从 5 弦弹起'},
 F7:{f:[1,3,1,2,1,1],n:[1,3,1,2,1,1],barre:[1,0,5],note:'食指第 1 品大横按'},
 Dm9:{f:[-1,5,3,5,5,-1],n:[0,2,1,3,4,0],start:3,note:'省略五音 · 6、1 弦不弹'},
 G13:{f:[3,-1,3,4,5,-1],n:[1,0,2,3,4,0],start:3,note:'省略五音、九音 · 5、1 弦不弹'},
 Cmaj9:{f:[-1,3,2,4,3,-1],n:[0,2,1,4,3,0],start:2,note:'省略五音 · 6、1 弦不弹'},
 E9:{f:[-1,7,6,7,7,7],n:[0,2,1,3,3,3],start:6,barre:[7,3,5],note:'无名指小横按 · 第 7 品'}
};
const presets=[
 {name:'十二小节蓝调',en:'12-BAR BLUES',key:'E 调',bpm:72,seq:['E7','E7','E7','E7','A7','A7','E7','E7','B7','A7','E7','B7'],desc:'从三个属七和弦开始，听见蓝调的张力。最后一小节的 B7 会带你回到 E7。',tip:'Ⅰ7–Ⅳ7–Ⅴ7 · 先每拍向下扫一次；熟悉后把每拍细分成「长—短」的 shuffle。节拍器只打四分音符。'},
 {name:'换个调弹蓝调',en:'BLUES IN A',key:'A 调',bpm:76,seq:['A7','A7','A7','A7','D7','D7','A7','A7','E7','D7','A7','E7'],desc:'保持同一套十二小节结构，换成 A 调。先用熟悉的开放指法，练出不同的听感。',tip:'Ⅰ7–Ⅳ7–Ⅴ7 · 第 5、9 小节注意换和弦。试着轻扫第 1、3 拍，稍重弹第 2、4 拍。'},
 {groove:'swing',name:'一点爵士',en:'JAZZ · ii–V–I',key:'C 调',bpm:64,seq:['Dm7','G7','Cmaj7','Cmaj7'],desc:'用你熟悉的 C 调进入爵士。听 Dm7 到 G7 的推动，再听 Cmaj7 落下来的柔和。',tip:'ii7–V7–Imaj7 · 每小节先弹一个长和弦。Dm7 的食指同时压住最细两根弦的第 1 品。'},
 {name:'柔和流行',en:'MELLOW POP',key:'C 调',bpm:72,seq:['Cmaj7','Am7','Fmaj7','G7'],desc:'给熟悉的和弦加一点七和弦色彩。不用大横按，也能弹出柔和、舒展的进行。',tip:'Imaj7–vi7–IVmaj7–V7 · 试试分解和弦：低音 → 3 弦 → 2 弦 → 1 弦，一拍一个音。'},
 {name:'小调的情绪',en:'MINOR MOOD',key:'A 小调',bpm:68,seq:['Am','Dm','E7','Am'],desc:'从明亮转向内敛。E7 中的升 G 音，会让回到 Am 的感觉更加明确。',tip:'i–iv–V7–i · 每小节第 1 拍弹低音，第 2、3、4 拍轻扫。留意 E7 → Am 的解决感。'},
 {name:'Funk 九和弦',en:'FUNK · 9TH CHORDS',key:'D9 ↔ E9',bpm:80,seq:['D9','D9','E9','E9'],desc:'这是两和弦的律动练习。保持同一个九和弦手形，在第 5 和第 7 品之间移动。',tip:'先练每拍短促扫弦：弹完松一点按弦压力来止音，但手指仍贴住琴弦。6 弦不要弹。'},
 {groove:'swing',name:'爵士回转进行',en:'JAZZ · I–VI–ii–V',key:'C 调',bpm:76,seq:['Cmaj7','A7','Dm7','G7'],desc:'让四个和弦不断回到起点。这里用 A7 替代 Am7，增加通向 Dm7 的推动力。',tip:'Imaj7–VI7–ii7–V7 · A7 是 Dm7 的属和弦。先听伴奏，再用短促的和弦回应。'},
 {groove:'swing',name:'爵士换调 · G',en:'JAZZ · ii–V–I IN G',key:'G 调',bpm:68,seq:['Am7','D7','Gmaj7','Gmaj7'],desc:'把 ii–V–I 搬到 G 调，认识 Gmaj7 的中低把位指法。听同一种解决在不同调里的颜色。',tip:'ii7–V7–Imaj7 · Gmaj7 的 5 弦和 1 弦不弹；先用拨弦逐个检查声音。'},
 {groove:'swing',name:'小调爵士',en:'MINOR · iiø–V–i',key:'A 小调',bpm:64,seq:['Bm7b5','E7','Am7','Am7'],desc:'半减七和弦带来更暗的颜色，经 E7 回到 Am7。这个小调 ii–V–i 很适合练习听张力与解决。',tip:'iiø7–V7–i7 · Bm7♭5 读作 B 半减七。小指按 2 弦第 3 品，最细弦不弹。'},
 {groove:'swing',name:'爵士蓝调',en:'JAZZ BLUES · 12 BARS',key:'C 调',bpm:80,seq:['C7','F7','C7','C7','F7','F7','C7','A7','Dm7','G7','C7','G7'],desc:'在十二小节蓝调里加入 A7 和 Dm7–G7，让后半段多一点爵士的走向。这是一组简化爵士蓝调。',tip:'第 8–10 小节：A7 → Dm7 → G7。F7 需要大横按，先把速度降下来。'},
 {groove:'bossa',name:'Bossa 的九和弦',en:'BOSSA · EXTENDED CHORDS',key:'C 调',bpm:72,seq:['Dm9','G13','Cmaj9','Cmaj9'],desc:'给 ii–V–I 加上九音与十三音，配轻盈的 Bossa 伴奏。吉他使用省略部分音的四音指法，按起来更清楚。',tip:'ii9–V13–Imaj9 · 先每小节弹一下，听清新加的音。Bossa 使用均分八分音符，不是 Swing 的长短拍。'},
 {groove:'swing',name:'爵士五度循环',en:'JAZZ · CIRCLE PROGRESSION',key:'C / A 小调',bpm:64,seq:['Am7','Dm7','G7','Cmaj7','Fmaj7','Bm7b5','E7','Am7'],desc:'沿根音的五度关系走一圈，把大调七和弦、半减七和弦与属七和弦连起来。',tip:'Am7 → Dm7 → G7 → Cmaj7 → Fmaj7 → Bm7♭5 → E7 → Am7。先练前四小节，再接后四小节。'},
 {groove:'swing',name:'爵士换调 · F',en:'JAZZ · ii–V–I IN F',key:'F 调',bpm:68,seq:['Gm7','C7','Fmaj7','Fmaj7'],desc:'在 F 调练同一套 ii–V–I。Gm7 的小横按和开放 C7、Fmaj7 之间的转换，是这组练习的重点。',tip:'ii7–V7–Imaj7 · Gm7 的无名指同时按住 4、3、2 弦第 3 品；5、1 弦不弹。'}
];
let selected=2,bar=0,beat=-1,running=false,timer=null,audio=null,nextTime=0,playToken=0;
let backingBus=null,previewBus=null,master=null,frame=null,scheduledBar=0,scheduledBeat=0,countRemaining=0;
let pendingVisuals=[],countDisplay=0;
const voices=new Set();
const tuning=[40,45,50,55,59,64];
const $=id=>document.getElementById(id);
function diagram(name){const c=chords[name],s=c.start||1;let a=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 210" role="img" aria-label="${name} 吉他指法，6 弦至 1 弦品位 ${c.f.map(x=>x<0?'不弹':x).join('、')}"><title>${name} 指法</title>`;
for(let r=0;r<=4;r++)a+=`<line x1="40" y1="${45+r*31}" x2="140" y2="${45+r*31}" stroke="#9a9e91" stroke-width="${r===0&&s===1?4:1}"/>`;
for(let i=0;i<6;i++){let x=40+i*20;a+=`<line x1="${x}" y1="45" x2="${x}" y2="169" stroke="#8a9183" stroke-width="${1.5-i*.15}"/>`;a+=`<text x="${x}" y="191" text-anchor="middle" fill="#818779" font-family="sans-serif" font-size="10">${['E','A','D','G','B','e'][i]}</text>`;if(c.f[i]<=0)a+=`<text x="${x}" y="30" text-anchor="middle" fill="#59624e" font-family="sans-serif" font-size="15">${c.f[i]<0?'×':'○'}</text>`;}
a+=`<text x="20" y="65" text-anchor="middle" fill="#7b8175" font-family="sans-serif" font-size="10">${s}品</text>`;
if(c.barre){let [f,l,r]=c.barre;a+=`<line x1="${40+l*20}" y1="${45+(f-s+.5)*31}" x2="${40+r*20}" y2="${45+(f-s+.5)*31}" stroke="#bd5235" stroke-width="18" stroke-linecap="round"/>`;}
c.f.forEach((f,i)=>{if(f>0){const x=40+i*20,y=45+(f-s+.5)*31;a+=`<circle cx="${x}" cy="${y}" r="9" fill="#bd5235"/><text x="${x}" y="${y+3.5}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="10">${c.n[i]}</text>`;}});return a+'</svg>';}
function render(){const p=presets[selected];$('styles').innerHTML=presets.map((p,i)=>`<button class="style-button ${i===selected?'active':''}" aria-pressed="${i===selected}" data-preset="${i}"><span class="num">${String(i+1).padStart(2,'0')}</span><span><strong>${p.name}</strong><small>${p.en}</small></span></button>`).join('');$('category').textContent=p.en;$('title').textContent=p.name;$('key').textContent=p.key;$('description').textContent=p.desc;$('tip').textContent=p.tip;
$('progression').innerHTML=p.seq.map((c,i)=>`<button class="bar" data-bar="${i}" aria-label="第 ${i+1} 小节 ${c}"><small>${String(i+1).padStart(2,'0')}</small><strong>${c}</strong></button>`).join('');$('chords').innerHTML=[...new Set(p.seq)].map(c=>`<article class="chord" data-chord="${c}"><div class="chord-head"><h4>${c}</h4><button class="listen" data-listen="${c}" aria-label="试听 ${c}">♪</button></div>${diagram(c)}<p class="chord-note">${chords[c].note}</p></article>`).join('');update();}
function update(){document.querySelectorAll('.bar').forEach((e,i)=>{e.classList.toggle('current',i===bar);e.setAttribute('aria-current',i===bar?'step':'false')});document.querySelectorAll('.chord').forEach(e=>e.classList.toggle('selected',e.dataset.chord===presets[selected].seq[bar]));[...$('beats').children].forEach((e,i)=>e.classList.toggle('on',running&&i===beat));$('position').textContent=`${String(bar+1).padStart(2,'0')} / ${String(presets[selected].seq.length).padStart(2,'0')}`;$('play').textContent=running?'Ⅱ 暂停练习':'▶ 开始练习';
$('nowPlaying').textContent=countDisplay?`预备拍 ${countDisplay} / 4`:`${running?'正在练习':'当前和弦'} · ${presets[selected].seq[bar]}`;}

async function initAudio(){
 if(!audio){
  audio=new (window.AudioContext||window.webkitAudioContext)();
  master=audio.createDynamicsCompressor();master.threshold.value=-14;master.ratio.value=5;master.connect(audio.destination);
  backingBus=audio.createGain();backingBus.gain.value=$('backing').checked?Number($('volume').value)/100:0;backingBus.connect(master);
  previewBus=audio.createGain();previewBus.gain.value=.7;previewBus.connect(master);
 }
 if(audio.state==='suspended')await audio.resume();
}
function note(midi,t,duration,level,bus,type='triangle',kind='backing'){
 const o=audio.createOscillator(),g=audio.createGain();
 o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.012);
 g.gain.exponentialRampToValueAtTime(Math.max(.0001,level*.35),t+Math.max(.02,duration*.35));
 g.gain.exponentialRampToValueAtTime(.0001,t+duration);
 o.connect(g).connect(bus);const voice={o,g,kind};voices.add(voice);
 o.onended=()=>{voices.delete(voice);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.03);
}
function silence(kind){
 if(!audio)return;
 for(const v of voices){if(kind&&v.kind!==kind)continue;
  // Stop future notes as well as audible tails; a short fade avoids clicks.
  v.g.gain.cancelScheduledValues(audio.currentTime);
  v.g.gain.setTargetAtTime(.0001,audio.currentTime,.008);
  v.o.stop(audio.currentTime+.04);
 }
}
function click(t,accent,force=false){
 if(!$('sound').checked&&!force)return;
 note(accent?89:82,t,.055,.075,master,'sine','click');
}
function chordAt(name,t,duration,level=.055,bus=backingBus,kind='backing'){
 chords[name].f.forEach((f,i)=>{if(f>=0){const midi=tuning[i]+f;
  note(midi,t+i*.007,duration,level,bus,'triangle',kind);
  note(midi+12,t+i*.007,duration*.45,level*.12,bus,'sine',kind);
 }});
}
function bassAt(name,t,duration,fifth=false){
 const root={A:33,B:35,C:36,D:38,E:28,F:29,G:31}[name[0]];
 note(root+(fifth?7:0),t,duration,.16,backingBus,'sine');
 note(root+(fifth?19:12),t,duration*.65,.025,backingBus,'triangle');
}
function accompaniment(name,b,t,seconds){
 if(!$('backing').checked)return;
 const groove=$('groove').value;
 if(groove==='swing'){
  // Quarter-note bass; chord stabs on 2 and 4, plus a swung offbeat.
  bassAt(name,t,seconds*.8,b%2===1);
  if(b===1||b===3)chordAt(name,t,seconds*.55);
  if(b===2)chordAt(name,t+seconds*2/3,seconds*.28,.04);
 }else if(groove==='bossa'){
  if(b===0||b===2)bassAt(name,t,seconds*1.35,b===2);
  if(b===0||b===3)chordAt(name,t,seconds*.65);
  if(b===1)chordAt(name,t+seconds*.5,seconds*.65,.05);
 }else{
  if(b===0)chordAt(name,t,seconds*3.7,.045);
  if(b===0||b===2)bassAt(name,t,seconds*1.6,b===2);
 }
}
function draw(){
 if(!running)return;
 while(pendingVisuals.length&&pendingVisuals[0].time<=audio.currentTime){
  const event=pendingVisuals.shift();bar=event.bar;beat=event.beat;countDisplay=event.count;update();
 }
 frame=requestAnimationFrame(draw);
}
function tick(){
 if(!running)return;
 // Schedule against the audio clock, ahead of the UI, so timer jitter does not accumulate.
 if(nextTime<audio.currentTime-.2){
  silence();pendingVisuals=[];scheduledBar=bar;scheduledBeat=0;countRemaining=0;nextTime=audio.currentTime+.04;
 }
 while(nextTime<audio.currentTime+.1){
  const seconds=60/Number($('bpm').value);
  if(countRemaining){
   const count=5-countRemaining;click(nextTime,count===1,true);
   pendingVisuals.push({time:nextTime,bar,beat:count-1,count});countRemaining--;
  }else{
   const name=presets[selected].seq[scheduledBar];
   click(nextTime,scheduledBeat===0);accompaniment(name,scheduledBeat,nextTime,seconds);
   pendingVisuals.push({time:nextTime,bar:scheduledBar,beat:scheduledBeat,count:0});
   scheduledBeat++;if(scheduledBeat===4){scheduledBeat=0;scheduledBar=(scheduledBar+1)%presets[selected].seq.length;}
  }
  nextTime+=seconds;
 }
 timer=setTimeout(tick,25);
}
function restartBar(){
 clearTimeout(timer);cancelAnimationFrame(frame);silence();pendingVisuals=[];countDisplay=0;countRemaining=0;
 beat=-1;scheduledBar=bar;scheduledBeat=0;nextTime=audio.currentTime+.05;tick();draw();
}
function stop(){
 playToken++;running=false;clearTimeout(timer);cancelAnimationFrame(frame);pendingVisuals=[];
 countRemaining=0;countDisplay=0;silence();update();
}
$('play').onclick=async()=>{
 if(running){stop();return;}const token=++playToken;
 try{await initAudio();if(token!==playToken)return;
  running=true;beat=-1;countRemaining=$('countIn').checked?4:0;scheduledBar=bar;scheduledBeat=0;
  nextTime=audio.currentTime+.06;pendingVisuals=[];update();tick();draw();
 }catch(e){$('tip').textContent='当前浏览器未能启动音频，请尝试使用 Chrome 或 Safari。';}
};
$('reset').onclick=()=>{stop();bar=0;beat=-1;update();};
$('bpm').oninput=()=>{$('bpmLabel').textContent=$('bpm').value;};
$('backing').onchange=()=>{
 if(backingBus){backingBus.gain.setTargetAtTime($('backing').checked?Number($('volume').value)/100:0,audio.currentTime,.025);}
 if(!$('backing').checked)silence('backing');
};
$('volume').oninput=()=>{
 $('volumeLabel').textContent=$('volume').value+'%';
 if(backingBus&&$('backing').checked)backingBus.gain.setTargetAtTime(Number($('volume').value)/100,audio.currentTime,.025);
};
$('sound').onchange=()=>{if(!$('sound').checked&&!countDisplay)silence('click');};
$('groove').onchange=()=>{if(running)restartBar();};
$('styles').onclick=e=>{
 const b=e.target.closest('[data-preset]');if(!b)return;stop();selected=+b.dataset.preset;bar=0;beat=-1;
 $('bpm').value=presets[selected].bpm;$('bpmLabel').textContent=presets[selected].bpm;
 $('groove').value=presets[selected].groove||'sustain';render();
 document.querySelector('.practice')?.scrollIntoView({behavior:'smooth',block:'start'});
};
$('progression').onclick=e=>{
 const b=e.target.closest('[data-bar]');if(!b)return;bar=+b.dataset.bar;beat=-1;
 if(running)restartBar();else update();
};
$('chords').onclick=async e=>{
 const b=e.target.closest('[data-listen]');if(!b)return;
 const token=playToken;
 try{await initAudio();if(token!==playToken)return;silence('preview');chordAt(b.dataset.listen,audio.currentTime+.01,1.5,.045,previewBus,'preview');}
 catch(e){$('tip').textContent='当前浏览器无法播放试听音频。';}
};
function sheet(){const p=presets[selected],names=[...new Set(p.seq)],width=Math.max(660,names.length*180+60);let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="460" viewBox="0 0 ${width} 460"><rect width="100%" height="100%" fill="#f8f6f1"/><g font-family="sans-serif" fill="#252b27"><text x="30" y="40" font-size="24">六弦练习室 · ${p.name}</text><text x="30" y="70" font-size="14">${p.key} · 4/4 拍 · 每个和弦 1 小节</text><text x="30" y="104" font-size="16">${p.seq.join(' | ')}</text>`;names.forEach((c,i)=>{svg+=`<g transform="translate(${30+i*180},140)"><text x="90" y="0" text-anchor="middle" font-size="24">${c}</text>${diagram(c).replace('<svg ','<svg y="10" width="180" height="210" ')}</g>`;});return svg+`<text x="30" y="397" font-size="12">从左到右 6 → 1 弦（粗 → 细） · × 不弹 · ○ 空弦</text><text x="30" y="422" font-size="12">1 食指 · 2 中指 · 3 无名指 · 4 小指 · 连线表示横按</text></g></svg>`;}
$('download').onclick=()=>{const url=URL.createObjectURL(new Blob([sheet()],{type:'image/svg+xml;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`吉他指法-${presets[selected].name}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop();});$('bpm').value=presets[selected].bpm;$('bpmLabel').textContent=presets[selected].bpm;$('groove').value=presets[selected].groove;render();
