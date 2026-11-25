(() => {
  "use strict";

  function selectButton(buttons, selected) {
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button === selected));
    }
  }

  const benchmarks = [...document.querySelectorAll(".benchmark")];
  const filters = document.querySelectorAll("[data-filter]");
  for (const button of filters) {
    button.addEventListener("click", () => {
      selectButton(filters, button);
      const tag = button.dataset.filter;
      const matches = benchmarks.filter(item => tag === "全部" || item.dataset.tags.split(" ").includes(tag));
      for (const item of benchmarks) item.hidden = !matches.includes(item);
      if (matches.length && !matches.some(item => item.open)) matches[0].open = true;
      document.getElementById("result-count").textContent = matches.length + " 项";
    });
  }

  const methods = document.querySelectorAll("[data-method]");
  function showMethod(button) {
    selectButton(methods, button);
    for (const article of document.querySelectorAll(".method")) {
      article.hidden = article.id !== button.getAttribute("aria-controls");
    }
  }
  for (const button of methods) button.addEventListener("click", () => showMethod(button));
  showMethod(methods[0]);

  for (const control of document.querySelectorAll("[data-interactive]")) control.hidden = false;
})();
