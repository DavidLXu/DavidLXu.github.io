'use strict';
const $ = (selector) => document.querySelector(selector);
const labels = { accepted: '已验收', in_progress: '开发中', not_started: '未开始' };
const kindLabels = { accepted: '验收参考', diagnostic: '调试录像', development: '开发演示' };
let tasks = [], status = 'all', previousFocus = null;
const esc = (value) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const duration = (seconds) => `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;
const placeholder = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m32 7 23 13v25L32 58 9 45V20Z M9 20l23 13 23-13 M32 33v25 M20 13l23 13v14"/></svg><span>等待动作录制</span><small>尚无演示视频</small>`;
const hero = $('#hero-video');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
function syncHeroButton() {
  $('#hero-toggle').setAttribute('aria-label', hero.paused ? '播放首页演示' : '暂停首页演示');
  $('#hero-toggle').innerHTML = `<span aria-hidden="true">${hero.paused ? '▶' : 'Ⅱ'}</span>`;
}
hero.addEventListener('play', syncHeroButton);
hero.addEventListener('pause', syncHeroButton);
$('#hero-toggle').addEventListener('click', () => hero.paused ? hero.play().catch(syncHeroButton) : hero.pause());
if (!motionPreference.matches) hero.play().catch(syncHeroButton);
motionPreference.addEventListener('change', e => { if (e.matches) hero.pause(); });
new IntersectionObserver(entries => { if (!entries[0].isIntersecting) hero.pause(); }, { threshold: 0.05 }).observe(hero);
function render() {
  const query = $('#search').value.trim().toLowerCase();
  const visible = tasks.filter(t => (status === 'all' || t.status === status) && `${t.title} ${t.id} ${t.category} ${t.description}`.toLowerCase().includes(query));
  $('#result-count').textContent = `${visible.length} 项任务`;
  $('#empty').hidden = visible.length > 0;
  $('#grid').innerHTML = visible.map(t => {
    const v = t.videos[0];
    const scene = t.scene_preview;
    const media = v ? `<img src="${esc(v.poster)}" alt="${esc(t.title)}仿真画面" loading="lazy" width="640" height="480">${v.kind !== 'accepted' ? `<span class="video-kind">${kindLabels[v.kind] || '开发录像'}</span>` : ''}<span class="play-icon" aria-hidden="true">▶</span>`
      : scene ? `<img src="${esc(scene.url)}" alt="RevoTron 与${esc(t.title)}的静态场景" loading="lazy" width="1200" height="900"><span class="video-kind scene-kind">静态初态</span>` : placeholder;
    return `<button class="task-card" data-task="${esc(t.id)}" aria-label="查看${esc(t.title)}${v ? '视频' : scene ? '静态场景' : '任务介绍'}"><div class="task-media ${v || scene ? '' : 'placeholder'}">${media}</div><div class="task-copy"><span class="card-category">${esc(t.category)}</span><h3>${esc(t.title)}</h3><div class="card-bottom"><span class="status ${t.status}">${labels[t.status]}</span><span>${v ? `${duration(v.duration_s)}${t.trajectory_count ? ` · ${t.trajectory_count} 条参考` : ''}` : scene ? '环境已摆好 · 0 条轨迹' : '等待录制'}</span></div></div></button>`;
  }).join('');
}
function openTask(id) {
  const t = tasks.find(task => task.id === id);
  if (!t) return;
  previousFocus = document.activeElement;
  hero.pause();
  const v = t.videos[0];
  const scene = t.scene_preview;
  const sceneDetail = scene ? `<div class="detail-scene"><img src="${esc(scene.url)}" alt="RevoTron 与${esc(t.title)}的静态初态" width="1200" height="900"></div>` : `<div class="task-media placeholder detail-placeholder">${placeholder}</div>`;
  $('#detail-body').innerHTML = `${v ? `<div class="detail-video"><video id="task-video" controls playsinline preload="metadata" poster="${esc(v.poster)}" aria-label="${esc(t.title)}视频"><source src="${esc(v.url)}" type="video/mp4"></video></div><p class="video-error" id="video-error" hidden>视频暂时无法播放，请稍后重试。</p>` : sceneDetail}<div class="detail-copy"><span class="status ${t.status}">${labels[t.status]}</span><h2 id="detail-title">${esc(t.title)}</h2><p>${esc(t.description)}</p>${t.videos.length > 1 ? `<div class="video-options" role="group" aria-label="选择视频">${t.videos.map((clip,i) => `<button data-clip="${i}" aria-pressed="${i === 0}">${esc(clip.label)}</button>`).join('')}</div>` : ''}<div class="detail-meta"><span>${esc(t.category)}</span><span>${t.trajectory_count} 条已登记验收参考</span>${v ? `<span id="clip-meta">${kindLabels[v.kind]} · ${duration(v.duration_s)}</span>` : scene ? '<span>RevoTron · 静态初态</span>' : ''}</div>${t.task_spec_url ? `<a class="task-spec-link" href="${esc(t.task_spec_url)}">资产、步骤与验收标准 ↗</a>` : ''}<p class="detail-notice" id="clip-notice">${scene && !v ? '真实模型的静态场景渲染，展示机器人与道具的初始摆放。尚无动作轨迹，不代表动态接触或任务验收通过。' : clipNotice(v)}</p><span class="task-id">${esc(t.id)}</span></div>`;
  if (!$('#detail').open) $('#detail').showModal();
  if (v) {
    const video = $('#task-video');
    video.addEventListener('error', () => { $('#video-error').hidden = false; });
    video.querySelector('source').addEventListener('error', () => { $('#video-error').hidden = false; });
    video.play().catch(() => {});
    document.querySelectorAll('[data-clip]').forEach(button => button.addEventListener('click', () => {
      const clip = t.videos[Number(button.dataset.clip)];
      video.src = clip.url; video.poster = clip.poster; $('#video-error').hidden = true;
      $('#clip-meta').textContent = `${kindLabels[clip.kind]} · ${duration(clip.duration_s)}`;
      $('#clip-notice').textContent = clipNotice(clip);
      document.querySelectorAll('[data-clip]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      video.play().catch(() => {});
    }));
  }
  history.replaceState(null, '', `#task=${encodeURIComponent(id)}`);
}
function clipNotice(v) {
  if (!v) return '该任务尚未开始，暂时没有动作录像。';
  const sample = v.sampling === 'original_video' ? '原始仿真录像。' : '由稀疏真实采样帧按原生时间戳保持生成，并非逐帧连续录制。';
  return sample + (v.kind === 'accepted' ? '物理与数据已验收；仿人动作质量仍需单独复核。' : '开发过程记录，不代表最终验收效果。');
}
function closeDetail() { $('#detail').close(); }
$('#close').addEventListener('click', closeDetail);
$('#detail').addEventListener('click', e => { if (e.target === $('#detail')) { const r = $('#detail').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDetail(); } });
$('#detail').addEventListener('close', () => { $('#task-video')?.pause(); if (location.hash.startsWith('#task=')) history.replaceState(null, '', '#tasks'); previousFocus?.focus({ preventScroll: true }); });
document.addEventListener('click', e => { const button = e.target.closest('[data-task]'); if (button) openTask(button.dataset.task); });
function setStatus(next) {
  status = next;
  document.querySelectorAll('[data-status]').forEach(b => { const active = b.dataset.status === next; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  render();
}
document.querySelectorAll('[data-status]').forEach(button => button.addEventListener('click', () => {
  setStatus(button.dataset.status);
  history.replaceState(null, '', status === 'not_started' ? '#not-started' : '#tasks');
}));
document.querySelectorAll('[data-task-status]').forEach(link => link.addEventListener('click', e => {
  e.preventDefault(); setStatus(link.dataset.taskStatus);
  history.replaceState(null, '', '#not-started'); $('#tasks').scrollIntoView();
}));
$('#search').addEventListener('input', render);
fetch('./snapshot.json?v=20261103-revotron').then(r => { if (!r.ok) throw Error('Task collection unavailable'); return r.json(); }).then(data => {
  tasks = data.tasks;
  const order = { accepted: 0, in_progress: 1, not_started: 2 };
  tasks.sort((a,b) => order[a.status] - order[b.status]);
  document.querySelectorAll('[data-status]').forEach(b => { b.querySelector('span').textContent = b.dataset.status === 'all' ? tasks.length : tasks.filter(t => t.status === b.dataset.status).length; });
  $('#hero-meta').innerHTML = `<span>${tasks.length} 项操作任务</span><span>${tasks.reduce((n,t) => n+t.videos.length,0)} 段仿真视频</span><span>${tasks.reduce((n,t) => n+t.trajectory_count,0)} 条验收参考轨迹</span>`;
  $('#snapshot-date').textContent = data.snapshot_date.replaceAll('-', '.');
  setStatus(location.hash === '#not-started' ? 'not_started' : 'all');
  if (location.hash === '#not-started') $('#tasks').scrollIntoView();
  if (location.hash.startsWith('#task=')) openTask(decodeURIComponent(location.hash.slice(6)));
}).catch(() => { $('#error').hidden = false; $('#result-count').textContent = '列表加载失败'; });
