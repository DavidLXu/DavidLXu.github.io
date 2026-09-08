(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const posters = JSON.parse($('poster-data').textContent);
  const dialog = $('poster-dialog');
  const posterButtons = [...document.querySelectorAll('[data-poster]')];
  const byId = Object.fromEntries(posters.map(p => [p.id, p]));
  const imageURL = id => posterButtons.find(b => b.dataset.poster === id).querySelector('img').src;
  let selected = 0;
  let analysis = 'composition';
  let opener = null;

  function showAnalysis() {
    const detail = posters[selected].details[analysis];
    $('analysis-title').textContent = detail.title;
    $('analysis-text').textContent = detail.text;
    $('analysis-rule').textContent = detail.rule;
    document.querySelectorAll('[data-analysis]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.analysis === analysis)));
    const [left, top, width, height] = detail.zone;
    Object.assign($('design-zone').style, {left: left+'%', top: top+'%', width: width+'%', height: height+'%'});
    $('design-zone').hidden = !$('show-zone').checked;
  }
  function renderPoster() {
    const p = posters[selected];
    $('detail-image').src = imageURL(p.id);
    $('detail-image').alt = p.alt;
    $('original-poster').href = imageURL(p.id);
    $('detail-brand').textContent = p.brand+' / '+p.keyword;
    $('detail-title').textContent = p.name;
    $('detail-phrase').textContent = p.phrase;
    $('detail-counter').textContent = '0'+(selected+1)+' / 04';
    showAnalysis();
  }
  posterButtons.forEach(button => button.addEventListener('click', () => {
    opener = button;
    selected = posters.findIndex(p => p.id === button.dataset.poster);
    analysis = 'composition';
    renderPoster();
    dialog.showModal();
    document.body.classList.add('modal-open');
    dialog.scrollTop = 0;
    $('close-dialog').focus({preventScroll:true});
  }));
  $('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (opener) opener.focus({preventScroll:true});
  });
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  function turnPoster(direction) { selected = (selected+direction+posters.length)%posters.length; renderPoster(); }
  $('prev-poster').addEventListener('click', () => turnPoster(-1));
  $('next-poster').addEventListener('click', () => turnPoster(1));
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); turnPoster(e.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  document.querySelectorAll('[data-analysis]').forEach(b => b.addEventListener('click', () => {analysis = b.dataset.analysis; showAnalysis();}));
  $('show-zone').addEventListener('change', showAnalysis);

  const steps = {
    brief: {label:'01 / DIRECTION',title:'“自然”与“精密”，会导向两张不同的图。',description:'开始画之前，要先选一个让观众记住的意思。产品资料、使用场景和受众，决定这个选择。',before:'理解需求、追问模糊词，筛掉不该出现在海报里的信息。',after:'模型可以整理材料、提出候选方向；需求方仍需选定优先级，并提供准确的产品事实。',decision:'此处的判断一旦错了，后面排得再漂亮也很难补救。'},
    system: {label:'02 / DESIGN SYSTEM',title:'把反复使用的判断写下来。',description:'最多两种墨色、一个主视觉、明显的字阶、主动安排的留白。这些约束让每次生成有共同的出发点。',before:'建立参考板与视觉规范，逐项决定图像、字体和信息如何配合。',after:'Skill 把这些选择组织成规则，供智能体在新任务中读取；设计师可以修改规则本身。',decision:'规则的价值在于减少每次从零开始的选择，也会限制可尝试的方向。'},
    draft: {label:'03 / EXECUTION',title:'从一条条操作，转向描述结果。',description:'主体的尺度、标题的位置、图像的网点与墨色职责，都可以在生成指令里说明。图像模型据此完成一版可供挑选的初稿。',before:'在画布上逐项处理素材、尝试裁切、排标题，再调整颜色与质感。',after:'智能体根据 skill 组织提示词并调用图像工具。初稿中的错字、结构变化和排版问题仍需检查。',decision:'这一步最适合接手方向明确的概念初稿；需要严格可编辑图层的交付，还要继续制作。'},
    variants: {label:'04 / ITERATION',title:'让修改指向一个明确变量。',description:'“再高级一点”很难验收。“保留构图，把重窄体换成衬线，辅色只用于标题”则能给出可比较的方向。',before:'复制版面，逐个替换文字、字形、用色与素材，再整理候选版本。',after:'固定主体和文字，围绕指定变量生成候选。生成结果可能连带改变其他细节，人需要确认是否仍符合约束。',decision:'FLEX 2 的字形变化，是理解“同一系统、不同语气”的一个例子。'},
    review: {label:'05 / RESPONSIBILITY',title:'最后一眼，决定能否交出去。',description:'画面成立之后，还要核对产品外形、文案事实、文字可读性与最终用途。屏幕上的好看只是其中一项。',before:'审稿、改错、核对品牌规范，并处理尺寸、出血、色彩与交付格式。',after:'Skill 可以提供检查项，模型可以辅助找问题；采用哪张、改到何种程度，由项目负责人验收。',decision:'生成一张 PNG 不等于完成印前分色，也不会自动得到可编辑的字体和图层。'}
  };
  function selectStep(id) {
    const s = steps[id];
    for (const [field, key] of [['label','label'],['title','title'],['description','description'],['before','before'],['after','after'],['decision','decision']]) $('step-'+field).textContent = s[key];
    document.querySelectorAll('[data-step]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.step === id)));
  }
  document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => selectStep(b.dataset.step)));
  selectStep('brief');

  // Recipe values follow the Mono Color skill by Yan Liu (MIT).
  // This page composes instructions locally; it does not run an image model.
  const palettes = {
    red: {label:'炭黑 + 信号红',base:'#30343A',accent:'#C83232',names:'Charcoal and Signal Red'},
    blue: {label:'碳黑 + 电光蓝',base:'#242321',accent:'#173AE3',names:'Carbon and Electric Blue'},
    green: {label:'暖炭黑 + 薄荷绿',base:'#302D2E',accent:'#5EB783',names:'Warm Charcoal and Mint Green'}
  };
  const types = {
    condensed: {label:'重窄体',description:'heavy condensed grotesk with tight stacked lines'},
    grotesk: {label:'宽无衬线',description:'wide neo-grotesk with open, deliberate word shapes'},
    serif: {label:'衬线体',description:'expressive editorial serif with clear thick-to-thin contrast'}
  };
  const intents = {
    precision: {label:'精密',description:'Emphasize precision through clearly readable joints and a deliberate upright gesture. Let the articulation itself carry the message.'},
    natural: {label:'自然',description:'Emphasize natural motion through a relaxed, open gesture and a diagonal crop. Keep the gesture plausible for the supplied hand.'},
    gentle: {label:'轻触',description:'Emphasize a gentle touch through a small, carefully framed distance between fingertips. Use a simple spatial relationship, without inventing a performance demonstration.'},
    yielding: {label:'柔顺',description:'Emphasize yielding through curved fingers and an open contour. Let exposed paper enter between the thumb and fingers.'}
  };
  const defaults = {'revo-3':'precision','wuji-hand-2':'natural','sharpa-wave':'gentle','flex-2':'yielding'};
  function compileRecipe() {
    const p = byId[$('recipe-product').value];
    const palette = palettes[$('recipe-palette').value];
    const type = types[$('recipe-type').value];
    const intent = intents[$('recipe-intent').value];
    const space = $('recipe-space').value;
    const headline = $('recipe-headline').value.trim();
    $('space-value').value = space+'%';
    $('ink-chips').replaceChildren(...['#E9E9E5',palette.base,palette.accent].map((color,i) => {
      const chip = document.createElement('span');
      chip.style.backgroundColor = color;
      chip.title = (i===0 ? '纸面 ' : '墨色 ')+color;
      return chip;
    }));
    $('recipe-summary').replaceChildren();
    const summary = document.createElement('span');
    summary.textContent = `${p.brand} ${p.name} · ${intent.label}。用${type.label}组织标题，${palette.label}分工，留出 ${space}% 纸面。`;
    const meta = document.createElement('small');meta.textContent = `SUBSTRATE #E9E9E5 / INKS ${palette.base} + ${palette.accent}`;
    $('recipe-summary').append(summary,meta);
    const textInstruction = headline ? `Use this exact headline, preserving its language and punctuation: ${JSON.stringify(headline)}.` : 'Create a text-free image; do not invent a headline or any microcopy.';
    const paragraphs = [
      `Use the mono-color skill to create an original 3:4, flat, front-facing editorial poster. Use clean Cool Gray paper #E9E9E5 for the technical subject. Use only two ink plates: ${palette.names} (${palette.base} and ${palette.accent}). The dark plate carries the hand and any essential small type; ${headline ? 'the accent plate carries one headline event' : 'the accent plate marks one small structural detail'}. Keep the dark plate dominant and the accent restrained. The substrate is not an ink.`,
      `Use an editorial-cover composition with one dominant hand, one decisive edge crop and a simple asymmetric alignment. Aim for ${space}% visibly empty paper with a single quiet release zone. Make the object the main focal event; ${headline ? 'lock the headline tightly to its contour without hiding identifying joints' : 'let the open contour organize the surrounding paper without adding typography'}. Use one small ruled gesture only if it strengthens that relationship.`,
      `Subject: the supplied product photograph of ${p.brand} ${p.name}. Preserve its actual silhouette, joints, materials and visible structural details. ${intent.description} Render the hand in medium halftone, with paper showing through highlights and gaps. Use the product photo as the factual reference; create a new poster composition rather than tracing an existing poster.`,
      `${textInstruction} ${headline ? `Set it in a ${type.description}, with an approximately 8:1 scale difference from any necessary neutral monospaced labels. Keep all other words sparse. Include product facts only when supplied and verified. Do not invent logos, slogans, specifications or certification marks.` : 'Omit labels, logos and decorative lettering as well.'}`,
      `Keep the finish contemporary: clean screening, at most one subtle ink-density variation, and no automatic vintage aging. Avoid gradients, glossy mockups, decorative clutter and extra ink colors. Produce a raster image with its final prompt and recipe; inspect identity, text and hierarchy before accepting it. Against any poster reference, change at least four structural variables such as crop, layout, headline position, grid, type pairing and metadata treatment.`
    ];
    $('compiled-prompt').value = paragraphs.join('\n\n');
    $('copy-status').textContent = '';
  }
  function resetRecipe() {
    const p = byId[$('recipe-product').value];
    $('recipe-headline').value = p.phrase;
    $('recipe-intent').value = defaults[p.id];
    $('recipe-palette').value = p.palette;
    $('recipe-type').value = p.type;
    $('recipe-space').value = '35';
    compileRecipe();
  }
  $('recipe-product').addEventListener('change', resetRecipe);
  $('recipe-form').addEventListener('input', e => { if (e.target.id !== 'recipe-product') compileRecipe(); });
  $('recipe-form').addEventListener('submit', e => e.preventDefault());
  $('reset-recipe').addEventListener('click', resetRecipe);
  $('use-recipe').addEventListener('click', () => {
    $('recipe-product').value = posters[selected].id;
    resetRecipe();
    opener = $('recipe-product');
    dialog.close();
    $('workbench').scrollIntoView({block:'start'});
    $('recipe-product').focus({preventScroll:true});
  });
  async function copy(text, status, fallback) {
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = '已复制';
    } catch (_) {
      if (fallback) { fallback.focus(); fallback.select(); status.textContent = '请按 ⌘C / Ctrl+C 复制选中的内容'; }
      else { status.textContent = '未能访问剪贴板，请复制地址栏链接分享'; }
    }
  }
  $('copy-prompt').addEventListener('click', () => copy($('compiled-prompt').value,$('copy-status'),$('compiled-prompt')));
  $('compiled-prompt').addEventListener('input', () => { $('copy-status').textContent = '已手动编辑；调整配方将重新组合'; });
  $('download-prompt').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([$('compiled-prompt').value], {type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a');a.href = url;a.download = 'mono-color-'+$('recipe-product').value+'-prompt.txt';
    document.body.append(a);a.click();a.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  $('copy-share').addEventListener('click', () => copy('四张灵巧手海报，拆解 AI 如何接手构图、配色与变体制作。附 Mono Color skill 和可编辑的提示词：\n'+$('copy-share').dataset.url,$('share-status')));
  resetRecipe();
})();
