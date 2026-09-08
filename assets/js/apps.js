(() => {
  const navigation = document.querySelector('[data-app-filters]');
  if (!navigation) return;
  const links = [...navigation.querySelectorAll('[data-group]')];
  const sections = [...document.querySelectorAll('.apps-section')];
  const groups = new Set(links.map(link => link.dataset.group));
  function render() {
    const hash = location.hash.slice(1);
    const group = groups.has(hash) ? hash : 'all';
    sections.forEach(section => { section.hidden = group !== 'all' && section.id !== group; });
    links.forEach(link => {
      if (link.dataset.group === group) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }
  navigation.addEventListener('click', event => {
    const link = event.target.closest('[data-group]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const hash = '#' + link.dataset.group;
    if (location.hash !== hash) history.pushState(null, '', hash);
    render();
  });
  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);
  render();
})();
