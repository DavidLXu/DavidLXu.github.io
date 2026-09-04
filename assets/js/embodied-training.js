(function () {
  'use strict';
  const root = document.getElementById('embodied-training-stack');
  if (!root) return;
  const buttons = Array.from(root.querySelectorAll('[data-route]'));
  const items = Array.from(root.querySelectorAll('[data-path]'));
  const stages = Array.from(root.querySelectorAll('.stage'));
  const detail = root.querySelector('.route-detail');
  let route = 'all';
  const matches = node => route === 'all' || node.dataset.path.split(' ').includes(route);

  function describe() {
    const zh = document.documentElement.lang.startsWith('zh');
    if (route === 'all') {
      detail.textContent = zh
        ? '选择上方模型，点亮共享环节。灰色表示本图未映射，不代表已经证实未使用。'
        : 'Select a model to highlight shared components. Gray means not mapped here, not proven absent.';
    } else {
      const name = buttons.find(button => button.dataset.route === route).textContent;
      const count = root.querySelectorAll('.node.active-path').length;
      detail.textContent = zh
        ? name + ' · 已点亮 ' + count + ' 个共享环节。阶段可合并或跳过；闭环执行本身不等于 RL 训练。'
        : name + ' · ' + count + ' shared components highlighted. Stages may merge or be skipped; feedback control alone is not RL training.';
    }
  }

  function selectRoute(next) {
    route = next;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.route === route)));
    items.forEach(item => {
      const active = matches(item);
      item.classList.toggle('dim', route !== 'all' && !active);
      item.classList.toggle('active-path', route !== 'all' && active);
    });
    stages.forEach(stage => stage.classList.toggle('inactive-stage', !Array.from(stage.querySelectorAll('[data-path]')).some(matches)));
    describe();
  }
  buttons.forEach(button => button.addEventListener('click', () => selectRoute(button.dataset.route)));
  new MutationObserver(describe).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  selectRoute('all');
})();
