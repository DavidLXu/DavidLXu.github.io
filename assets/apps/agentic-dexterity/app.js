(() => {
  const lanes = [...document.querySelectorAll(".lane")];
  const links = document.querySelectorAll(".switcher a");

  for (const lane of lanes) {
    const label = lane.querySelector(".filter");
    const select = label.querySelector("select");
    const entries = lane.querySelectorAll("details");
    const count = lane.querySelector('[role="status"]');

    function filterEntries() {
      let visible = 0;
      for (const entry of entries) {
        entry.hidden = Boolean(select.value) && !entry.dataset.tags.split(" ").includes(select.value);
        if (!entry.hidden) visible++;
      }
      count.textContent = visible + " 项";
    }
    select.addEventListener("change", filterEntries);
    filterEntries();
    label.hidden = false;
  }

  const paperTopic = document.getElementById("paper-topic");
  const paperQuery = document.getElementById("paper-query");
  const papers = [...document.querySelectorAll(".paper")].map(element => ({
    element,
    text: element.textContent.toLowerCase()
  }));
  function filterPapers() {
    const query = paperQuery.value.trim().toLowerCase();
    let count = 0;
    for (const { element, text } of papers) {
      const matches = (!paperTopic.value || element.dataset.topic === paperTopic.value) && text.includes(query);
      element.hidden = !matches;
      if (matches) count++;
    }
    document.getElementById("paper-count").textContent = count + " 篇";
    document.getElementById("paper-empty").hidden = count > 0;
  }
  paperQuery.addEventListener("input", filterPapers);
  paperTopic.addEventListener("change", filterPapers);
  document.querySelector(".paper-tools").hidden = false;
  filterPapers();

  function selectLane() {
    const target = document.getElementById(location.hash.slice(1));
    const selected = target?.closest(".lane") || lanes[0];
    for (const lane of lanes) lane.classList.toggle("selected", lane === selected);
    for (const link of links) {
      if (link.hash === "#" + selected.id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    if (target?.matches("details")) target.open = true;
  }
  selectLane();
  document.documentElement.classList.add("has-js");
  window.addEventListener("hashchange", selectLane);
})();
