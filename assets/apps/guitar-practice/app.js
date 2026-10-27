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
 E9:{f:[-1,7,6,7,7,7],n:[0,2,1,3,3,3],start:6,barre:[7,3,5],note:'无名指小横按 · 第 7 品'}
};
const presets=[
 {name:'十二小节蓝调',en:'12-BAR BLUES',key:'E 调',bpm:72,seq:['E7','E7','E7','E7','A7','A7','E7','E7','B7','A7','E7','B7'],desc:'从三个属七和弦开始，听见蓝调的张力。最后一小节的 B7 会带你回到 E7。',tip:'Ⅰ7–Ⅳ7–Ⅴ7 · 先每拍向下扫一次；熟悉后把每拍细分成「长—短」的 shuffle。节拍器只打四分音符。'},
 {name:'换个调弹蓝调',en:'BLUES IN A',key:'A 调',bpm:76,seq:['A7','A7','A7','A7','D7','D7','A7','A7','E7','D7','A7','E7'],desc:'保持同一套十二小节结构，换成 A 调。先用熟悉的开放指法，练出不同的听感。',tip:'Ⅰ7–Ⅳ7–Ⅴ7 · 第 5、9 小节注意换和弦。试着轻扫第 1、3 拍，稍重弹第 2、4 拍。'},
 {name:'一点爵士',en:'JAZZ · ii–V–I',key:'C 调',bpm:64,seq:['Dm7','G7','Cmaj7','Cmaj7'],desc:'用你熟悉的 C 调进入爵士。听 Dm7 到 G7 的推动，再听 Cmaj7 落下来的柔和。',tip:'ii7–V7–Imaj7 · 每小节先弹一个长和弦。Dm7 的食指同时压住最细两根弦的第 1 品。'},
 {name:'柔和流行',en:'MELLOW POP',key:'C 调',bpm:72,seq:['Cmaj7','Am7','Fmaj7','G7'],desc:'给熟悉的和弦加一点七和弦色彩。不用大横按，也能弹出柔和、舒展的进行。',tip:'Imaj7–vi7–IVmaj7–V7 · 试试分解和弦：低音 → 3 弦 → 2 弦 → 1 弦，一拍一个音。'},
 {name:'小调的情绪',en:'MINOR MOOD',key:'A 小调',bpm:68,seq:['Am','Dm','E7','Am'],desc:'从明亮转向内敛。E7 中的升 G 音，会让回到 Am 的感觉更加明确。',tip:'i–iv–V7–i · 每小节第 1 拍弹低音，第 2、3、4 拍轻扫。留意 E7 → Am 的解决感。'},
 {name:'Funk 九和弦',en:'FUNK · 9TH CHORDS',key:'D9 ↔ E9',bpm:80,seq:['D9','D9','E9','E9'],desc:'这是两和弦的律动练习。保持同一个九和弦手形，在第 5 和第 7 品之间移动。',tip:'先练每拍短促扫弦：弹完松一点按弦压力来止音，但手指仍贴住琴弦。6 弦不要弹。'}
];
let selected=0,bar=0,beat=-1,running=false,timer=null,audio=null,nextTime=0,playToken=0;
const $=id=>document.getElementById(id);
function diagram(name){const c=chords[name],s=c.start||1;let a=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 210" role="img" aria-label="${name} 吉他指法，6 弦至 1 弦品位 ${c.f.map(x=>x<0?'不弹':x).join('、')}"><title>${name} 指法</title>`;
for(let r=0;r<=4;r++)a+=`<line x1="40" y1="${45+r*31}" x2="140" y2="${45+r*31}" stroke="#9a9e91" stroke-width="${r===0&&s===1?4:1}"/>`;
for(let i=0;i<6;i++){let x=40+i*20;a+=`<line x1="${x}" y1="45" x2="${x}" y2="169" stroke="#8a9183" stroke-width="${1.5-i*.15}"/>`;a+=`<text x="${x}" y="191" text-anchor="middle" fill="#818779" font-family="sans-serif" font-size="10">${['E','A','D','G','B','e'][i]}</text>`;if(c.f[i]<=0)a+=`<text x="${x}" y="30" text-anchor="middle" fill="#59624e" font-family="sans-serif" font-size="15">${c.f[i]<0?'×':'○'}</text>`;}
a+=`<text x="20" y="65" text-anchor="middle" fill="#7b8175" font-family="sans-serif" font-size="10">${s}品</text>`;
if(c.barre){let [f,l,r]=c.barre;a+=`<line x1="${40+l*20}" y1="${45+(f-s+.5)*31}" x2="${40+r*20}" y2="${45+(f-s+.5)*31}" stroke="#bd5235" stroke-width="18" stroke-linecap="round"/>`;}
c.f.forEach((f,i)=>{if(f>0){const x=40+i*20,y=45+(f-s+.5)*31;a+=`<circle cx="${x}" cy="${y}" r="9" fill="#bd5235"/><text x="${x}" y="${y+3.5}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="10">${c.n[i]}</text>`;}});return a+'</svg>';}
function render(){const p=presets[selected];$('styles').innerHTML=presets.map((p,i)=>`<button class="style-button ${i===selected?'active':''}" aria-pressed="${i===selected}" data-preset="${i}"><span class="num">0${i+1}</span><span><strong>${p.name}</strong><small>${p.en}</small></span></button>`).join('');$('category').textContent=p.en;$('title').textContent=p.name;$('key').textContent=p.key;$('description').textContent=p.desc;$('tip').textContent=p.tip;
$('progression').innerHTML=p.seq.map((c,i)=>`<button class="bar" data-bar="${i}" aria-label="第 ${i+1} 小节 ${c}"><small>${String(i+1).padStart(2,'0')}</small><strong>${c}</strong></button>`).join('');$('chords').innerHTML=[...new Set(p.seq)].map(c=>`<article class="chord" data-chord="${c}"><div class="chord-head"><h4>${c}</h4><button class="listen" data-listen="${c}" aria-label="试听 ${c}">♪</button></div>${diagram(c)}<p class="chord-note">${chords[c].note}</p></article>`).join('');update();}
function update(){document.querySelectorAll('.bar').forEach((e,i)=>{e.classList.toggle('current',i===bar);e.setAttribute('aria-current',i===bar?'step':'false')});document.querySelectorAll('.chord').forEach(e=>e.classList.toggle('selected',e.dataset.chord===presets[selected].seq[bar]));[...$('beats').children].forEach((e,i)=>e.classList.toggle('on',running&&i===beat));$('position').textContent=`${String(bar+1).padStart(2,'0')} / ${String(presets[selected].seq.length).padStart(2,'0')}`;$('play').textContent=running?'Ⅱ 暂停练习':'▶ 开始练习';}
async function initAudio(){if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')await audio.resume();}
function click(t,accent){if(!$('sound').checked)return;const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=accent?1100:760;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+.055);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.06);}
function tick(){if(!running)return;const t=audio.currentTime;if(t>=nextTime){beat++;if(beat>3){beat=0;bar=(bar+1)%presets[selected].seq.length;}click(t,beat===0);update();nextTime=t+60/Number($('bpm').value);}timer=setTimeout(tick,15);}
function stop(){playToken++;running=false;clearTimeout(timer);update();}
$('play').onclick=async()=>{if(running){stop();return;}const token=++playToken;try{await initAudio();if(token!==playToken)return;running=true;beat=-1;nextTime=audio.currentTime;tick();}catch(e){$('tip').textContent='当前浏览器未能启动音频，请尝试使用 Chrome 或 Safari。';}};
$('reset').onclick=()=>{stop();bar=0;beat=-1;update();};$('bpm').oninput=()=>{$('bpmLabel').textContent=$('bpm').value;};
$('styles').onclick=e=>{const b=e.target.closest('[data-preset]');if(!b)return;stop();selected=+b.dataset.preset;bar=0;beat=-1;$('bpm').value=presets[selected].bpm;$('bpmLabel').textContent=presets[selected].bpm;render();};
$('progression').onclick=e=>{const b=e.target.closest('[data-bar]');if(!b)return;bar=+b.dataset.bar;beat=-1;if(running)nextTime=audio.currentTime;update();};
$('chords').onclick=async e=>{const b=e.target.closest('[data-listen]');if(!b)return;try{await initAudio();const notes=[40,45,50,55,59,64],start=audio.currentTime;chords[b.dataset.listen].f.forEach((f,i)=>{if(f<0)return;const t=start+i*.035,o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=440*Math.pow(2,(notes[i]+f-69)/12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+1.5);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+1.6);});}catch(e){$('tip').textContent='当前浏览器无法播放试听音频。';}};
function sheet(){const p=presets[selected],names=[...new Set(p.seq)],width=Math.max(660,names.length*180+60);let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="460" viewBox="0 0 ${width} 460"><rect width="100%" height="100%" fill="#f8f6f1"/><g font-family="sans-serif" fill="#252b27"><text x="30" y="40" font-size="24">六弦练习室 · ${p.name}</text><text x="30" y="70" font-size="14">${p.key} · 4/4 拍 · 每个和弦 1 小节</text><text x="30" y="104" font-size="16">${p.seq.join(' | ')}</text>`;names.forEach((c,i)=>{svg+=`<g transform="translate(${30+i*180},140)"><text x="90" y="0" text-anchor="middle" font-size="24">${c}</text>${diagram(c).replace('<svg ','<svg y="10" width="180" height="210" ')}</g>`;});return svg+`<text x="30" y="397" font-size="12">从左到右 6 → 1 弦（粗 → 细） · × 不弹 · ○ 空弦</text><text x="30" y="422" font-size="12">1 食指 · 2 中指 · 3 无名指 · 4 小指 · 连线表示横按</text></g></svg>`;}
$('download').onclick=()=>{const url=URL.createObjectURL(new Blob([sheet()],{type:'image/svg+xml;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`吉他指法-${presets[selected].name}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop();});render();
