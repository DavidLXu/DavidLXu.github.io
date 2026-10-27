'use strict';
const SOURCE = 'https://raw.githubusercontent.com/DavidLXu/RevoBench-Refactor/refs/heads/main/dashboard/tasks.json';
const LABELS = {accepted:'验收通过',in_progress:'开发中',not_started:'未开始'};
const QUALITY = {home_return:'默认姿态回位',smoothness:'轨迹平滑',humanlike:'仿人姿态',contact:'内侧接触'};
const QLABELS = {pending:'待复核',passed:'通过',failed:'待改进',not_applicable:'不适用'};
const GROUPS = {original:'首批参考',expansion:'扩展任务',tabletop:'新桌面场景'};
let tasks=[], statusFilter='all', dataVersion='', loading=false, openTask=null;
const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const publicURL = value => {try {const u=new URL(value); return u.protocol==='https:'?u.href:'';}catch{return '';}};
const date = value => new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const seconds = n => `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const stale = t => Date.now()-Date.parse(t.updated_at)>24*60*60*1000;
const active = t => t.activity==='active'&&!stale(t);
const activity = t => t.activity==='active'?(stale(t)?'进度待更新':'正在推进'):t.activity==='idle'?'待继续 / 待复核':'待认领';
const episodeCount = list => list.reduce((n,t)=>n+t.trajectories.length,0);
const badge = t => `<span class="badge ${esc(t.status)}"><i class="dot ${esc(t.status)}"></i>${LABELS[t.status]}</span>`;
const link = (url,label) => `<a href="${esc(publicURL(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
function validateFeed(data){
 if(data.schema_version!==1||!Array.isArray(data.tasks)||!data.tasks.length)throw new Error('数据格式不受支持');
 const ids=new Set();
 for(const t of data.tasks){
  if(!/^[a-z0-9_]+$/.test(t.id)||ids.has(t.id)||!(t.status in LABELS)||!Array.isArray(t.trajectories)||!Array.isArray(t.videos)||!t.motion_quality||!Array.isArray(t.evidence)||!Number.isFinite(Date.parse(t.updated_at)))throw new Error('任务记录不完整');
  ids.add(t.id);
  for(const v of t.videos)if(!publicURL(v.url)||!publicURL(v.poster))throw new Error('视频链接无效');
  for(const r of t.trajectories)if(r.physical_passed!==true||r.data_passed!==true||!t.videos.some(v=>v.kind==='accepted'&&v.run_id===r.run_id))throw new Error('验收轨迹缺少匹配证据');
  if(t.status==='accepted'&&!t.trajectories.length)throw new Error('验收状态缺少完整轨迹');
 }
 return data;
}
async function fetchFeed(url){const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!res.ok)throw new Error(`HTTP ${res.status}`);return validateFeed(await res.json());}
async function refresh(){
 if(loading)return;loading=true;$('#refresh').disabled=true;
 try{
  let data,offline=false;
  try{data=await fetchFeed(`${SOURCE}?t=${Math.floor(Date.now()/60000)}`);}
  catch(e){
   if(tasks.length){$('#sync').textContent='同步失败 · 保留上次数据';$('#error').hidden=false;$('#error').textContent='暂时无法读取 GitHub 最新记录。当前展示的是上次成功同步的数据，可稍后重试。';return;}
   data=await fetchFeed('./snapshot.json');offline=true;
  }
  tasks=data.tasks;dataVersion=data.updated_at;
  $('#error').hidden=!offline;
  if(offline)$('#error').textContent='暂时无法读取主分支，正在展示随网站发布的快照。下方更新时间属于快照，不代表最新进度。';
  $('#sync').textContent=`${offline?'发布快照':'已同步 main'} · 记录更新 ${date(dataVersion)}`;
  render();
  const hash=decodeURIComponent(location.hash.slice(1));if(hash&&!$('#detail').open)showTask(hash);
 }catch(e){$('#sync').textContent='数据读取失败';$('#error').hidden=false;$('#error').textContent='任务列表暂时无法加载，请点击“同步数据”重试。';$('#grid').innerHTML='';}
 finally{loading=false;$('#refresh').disabled=false;}
}
function render(){
 for(const [key,label] of Object.entries(GROUPS)){const option=$('#group').querySelector(`option[value="${key}"]`);if(option)option.textContent=`${label} · ${tasks.filter(t=>t.group===key).length} 项`;}
 const counts=Object.fromEntries(Object.keys(LABELS).map(s=>[s,tasks.filter(t=>t.status===s).length]));
 const running=tasks.filter(t=>active(t)&&t.status==='in_progress').length;
 $('#stats').innerHTML=[['登记任务',tasks.length,'全部任务与准备场景','main'],['验收通过',counts.accepted,'物理 + 完整数据',''],['开发中',counts.in_progress,`${running} 项最近标记为推进中`,''],['尚未开始',counts.not_started,'可分配动作开发',''],['验收轨迹',episodeCount(tasks),'已登记条数 · 非历史总量','']].map(([name,num,note,cls])=>`<div class="stat ${cls}"><div class="stat-head">${name}<span>↗</span></div><div class="number">${num}<span>${name==='验收轨迹'?'条':'项'}</span></div><small>${note}</small></div>`).join('');
 $('#status-filters').innerHTML=[['all','全部任务',tasks.length],...Object.entries(LABELS).map(([k,v])=>[k,v,counts[k]])].map(([key,label,n])=>`<button class="filter ${statusFilter===key?'selected':''}" data-status="${key}" aria-pressed="${statusFilter===key}"><i class="dot ${key}"></i>${label}<span class="count">${n}</span></button>`).join('');
 const term=$('#search').value.trim().toLowerCase(),group=$('#group').value;
 let list=tasks.filter(t=>(statusFilter==='all'||t.status===statusFilter)&&(group==='all'||t.group===group)&&(!$('#active-only').checked||active(t))&&(!$('#video-only').checked||t.videos.length)&&`${t.title} ${t.id} ${t.owner??''}`.toLowerCase().includes(term));
 const order=$('#sort').value;
 list.sort((a,b)=> order==='name'?a.title.localeCompare(b.title,'zh-CN'):order==='updated'?Date.parse(b.updated_at)-Date.parse(a.updated_at):order==='episodes'?b.trajectories.length-a.trajectories.length:({accepted:0,in_progress:1,not_started:2}[a.status]-{accepted:0,in_progress:1,not_started:2}[b.status]||a.title.localeCompare(b.title,'zh-CN')));
 $('#result-count').textContent=`${list.length} / ${tasks.length}`;
 $('#video-count').textContent=`${list.filter(t=>t.videos.length).length} 项有回放`;
 $('#grid').innerHTML=list.map(card).join('');$('#empty').hidden=!!list.length;
}
function card(t){
 const v=t.videos[0];
 const preview=v?`<img src="${esc(publicURL(v.poster))}" alt="${esc(t.title)}实际录像预览" loading="lazy"><span class="video-shade"></span><span class="play" aria-hidden="true">▶</span><span class="video-caption">${esc(v.label)}</span>`:`<span class="placeholder"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="24" width="40" height="27" rx="4"/><path d="M23 24v-8h18v8M22 37h20M32 28v18M8 55h48"/></svg><p>动作录像待录制</p></span>`;
 return `<article class="card"><button class="preview ${v?'':'no-video'}" data-task="${esc(t.id)}" aria-label="查看${esc(t.title)}${v?'视频':'详情'}">${preview}<span class="video-top">${badge(t)}${v?`<span class="timecode">${seconds(v.duration_s)}</span>`:''}</span></button><div class="card-body"><p class="task-id">${esc(t.id)}</p><button class="task-title" data-task="${esc(t.id)}">${esc(t.title)}</button><p class="summary">${esc(t.summary)}</p><div class="card-meta"><span class="episodes"><b>${t.trajectories.length}</b> 条验收轨迹</span><span class="owner">${active(t)?'<i class="pulse"></i>':''}${esc(t.owner||'待认领')}</span></div></div><div class="card-foot"><span>${t.status==='accepted'?GROUPS[t.group]:activity(t)}</span><span class="quality-note">仿人 ${Object.values(t.motion_quality).filter(s=>s==='passed').length}/4 已通过</span></div></article>`;
}
function showTask(id){
 const t=tasks.find(t=>t.id===id);if(!t)return;
 openTask=t;const v=t.videos[0];
 $('#detail-body').innerHTML=`<div class="detail-head"><div><h2 id="detail-title">${esc(t.title)}</h2><p>${esc(t.id)} · ${GROUPS[t.group]}</p></div>${badge(t)}</div>${t.videos.length>1?`<select class="video-select" id="video-select" aria-label="选择轨迹录像">${t.videos.map((v,i)=>`<option value="${i}">${esc(v.label)} / ${esc(v.run_id)}</option>`).join('')}</select>`:''}${v?`<video class="detail-video" controls playsinline preload="metadata" poster="${esc(publicURL(v.poster))}" src="${esc(publicURL(v.url))}"></video><div class="video-label"><span id="video-label">${esc(v.label)} · ${esc(v.run_id)}</span><span id="video-open">${link(v.url,'原视频')}</span></div><p class="detail-note" id="sampling-note">${v.sampling==='original_video'?'原始总览录像，全程保留。':'稀疏实拍渲染帧按原控制时间戳回放，帧间保持静止；不可据此评价连续性。'}</p>`:`<div class="detail-video-empty">${esc(t.video_pending_reason)}</div>`}<div class="detail-info"><div><h3>当前进展</h3><p>${esc(t.summary)}</p><h3>下一步</h3><p>${esc(t.next_step)}</p><p>负责人：${esc(t.owner||'待认领')}<br>工作状态：${activity(t)}<br>记录更新：${date(t.updated_at)}<br>物理：${t.physical_status==='passed'?'通过':'待验收'} · 完整数据：${t.data_status==='passed'?'通过':'待验收'}</p><div class="links">${t.evidence.map(e=>link(e.url,e.label)).join('')}</div></div><div><h3>仿人动作 · 独立验收</h3><div class="quality-grid">${Object.entries(QUALITY).map(([key,label])=>`<div>${label}<span class="${t.motion_quality[key]==='passed'?'pass-label':t.motion_quality[key]==='failed'?'fail-label':''}">${QLABELS[t.motion_quality[key]]}</span></div>`).join('')}</div><p class="detail-note">物理与数据通过，不自动意味着满足这四项。录像有助于审查，最终以对应报告为准。</p>${link(`https://github.com/DavidLXu/RevoBench-Refactor/blob/main/dashboard/tasks/${t.id}.json`,'维护此任务 JSON')}<br><button class="copy-link" id="copy-link">复制任务链接</button></div></div><section class="episode-table"><h3>已登记验收轨迹 · ${t.trajectories.length} 条</h3>${t.trajectories.length?`<table><thead><tr><th>独立录制 / Run ID</th><th>帧数</th><th>时长</th><th>证据</th></tr></thead><tbody>${t.trajectories.map(r=>`<tr><td><code>${esc(r.run_id)}</code></td><td>${r.frames.toLocaleString()}</td><td>${r.duration_s.toFixed(2)} s</td><td>${link(r.physical_report,'物理')} · ${link(r.data_report,'数据')}</td></tr>`).join('')}</tbody></table>`:'<p class="detail-note">尚无已登记的完整验收轨迹。开发录像、物理诊断和 pilot 不计入。</p>'}<p class="detail-note">${t.trajectory_inventory_complete?'维护者已声明此清单为当前完整清单。':'当前仅登记已核对的参考记录；历史录制尚未穷举，不能把该数量作为全部轨迹数。'} 重复导出、视频通道和帧数不另计轨迹。</p></section>`;
 if(!$('#detail').open)$('#detail').showModal();
 history.replaceState(null,'',`#${encodeURIComponent(id)}`);
 const video=$('.detail-video');if(video)video.addEventListener('error',()=>{$('#sampling-note').textContent='视频暂时无法播放，可打开原视频链接检查。报告与任务状态不受播放错误影响。';},{once:true});
 const select=$('#video-select');if(select)select.addEventListener('change',()=>{
  const v=t.videos[Number(select.value)];video.pause();video.src=publicURL(v.url);video.poster=publicURL(v.poster);video.load();
  $('#video-label').textContent=`${v.label} · ${v.run_id}`;$('#video-open').innerHTML=link(v.url,'原视频');$('#sampling-note').textContent=v.sampling==='original_video'?'原始总览录像，全程保留。':'稀疏实拍渲染帧按原控制时间戳回放，帧间保持静止；不可据此评价连续性。';
 });
 $('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);$('#copy-link').textContent='链接已复制';}catch{$('#copy-link').textContent='请复制地址栏中的任务链接';}});
}
function reset(){statusFilter='all';$('#search').value='';$('#group').value='all';$('#active-only').checked=false;$('#video-only').checked=false;$('#sort').value='status';render();}
$('#grid').addEventListener('click',e=>{const b=e.target.closest('[data-task]');if(b)showTask(b.dataset.task);});
$('#status-filters').addEventListener('click',e=>{const b=e.target.closest('[data-status]');if(b){statusFilter=b.dataset.status;render();}});
$('#search').addEventListener('input',render);for(const id of ['group','sort','active-only','video-only'])$('#'+id).addEventListener('change',render);
$('#refresh').addEventListener('click',refresh);$('#reset').addEventListener('click',reset);$('#clear').addEventListener('click',reset);
$('#close').addEventListener('click',()=>$('#detail').close());
$('#detail').addEventListener('click',e=>{if(e.target===$('#detail')){const box=$('#detail').getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)$('#detail').close();}});
$('#detail').addEventListener('close',()=>{const video=$('.detail-video');if(video)video.pause();openTask=null;history.replaceState(null,'',location.pathname+location.search);});
window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(id)showTask(id);});
setInterval(()=>{if(!document.hidden&&!$('#detail').open)refresh();},60000);
refresh();
