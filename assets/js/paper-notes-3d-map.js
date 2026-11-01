/* RoboScope: stable research facets and independent similarity neighborhoods. */
(() => {
  "use strict";
  const root = document.getElementById("roboscope");
  if (!root) return;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
  let lang = document.documentElement.lang.startsWith("zh") ? "zh" : "en";
  const t = (en, zh) => lang === "zh" ? zh : en;
  const name = v => v?.[lang] || v?.en || "";
  const $ = s => root.querySelector(s);
  const state = {
    q: "",
    filters: new Set(),
    view: "3d",
    autoRotate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    color: "method",
    selected: null,
    near: null,
    sort: "date"
  };
  let data, papers, byId, labels, search, scene;
  const facets = p => Object.values(p.facets).flat();
  const color = p => labels.get(p.facets[state.color][0])?.color || "#8b9198";
  const url = p => (root.dataset.baseurl || "") + p.url;
  const matches = (p, filters = state.filters) => state.q.toLowerCase().trim().split(/\s+/).every(w => search.get(p.id).includes(w)) && [ ...filters ].every(id => facets(p).includes(id));
  const nearby = () => state.near ? new Set([ state.near, ...byId.get(state.near).related.map(r => r.id) ]) : null;
  const tag = id => `<span class="rs-tag">${esc(name(labels.get(id)))}</span>`;
  function shell() {
    root.innerHTML = `<div class="rs-toolbar"><label class="rs-search"><span>${t("Search your reading", "搜索阅读笔记")}</span><input id="rs-search" type="search" placeholder="${t("Title, method, keyword…", "标题、方法、关键词…")}" value="${esc(state.q)}"></label><div class="rs-views" role="group" aria-label="${t("View", "视图")}">${[ [ "3d", "3D" ], [ "2d", "2D" ] ].map(([ id, n ]) => `<button data-view="${id}">${n}</button>`).join("")}</div></div>
    <div class="rs-workspace"><aside class="rs-filters" aria-label="${t("Research filters", "研究筛选")}"><div class="rs-section-head"><h2>${t("Research lenses", "研究维度")}</h2><button id="rs-clear" class="rs-text-button">${t("Reset", "重置")}</button></div><p class="rs-muted">${t("All selected labels must match. A paper can have several labels.", "所选标签同时满足；每篇论文可以拥有多个标签。")}</p><div id="rs-facets">${data.taxonomy.map(d => `<fieldset><legend>${esc(name(d))}</legend>${d.values.map(v => `<label class="rs-facet"><input type="checkbox" data-facet="${v.id}"><span>${esc(name(v))}</span><span class="rs-facet-count" data-count="${v.id}"></span></label>`).join("")}</fieldset>`).join("")}</div><details class="rs-about"><summary>${t("How classification works", "分类是怎么来的？")}</summary><p>${t("Labels are inferred from existing tags, titles and summaries. Inspect the evidence in paper details. Uncertain dimensions stay empty; manual corrections take priority.", "标签依据原有标签、标题和摘要推断。详情中可查看判定依据。不确定的维度留空，人工校正优先。")}</p><p>${t("Similarity neighborhoods use cleaned text and shared labels. They are suggestions, not research categories or citations.", "相似邻域依据清洗后的文本和共同标签计算，用于探索，不代表研究分类或引用关系。")}</p></details></aside>
    <section class="rs-results" aria-label="${t("Matching papers", "匹配论文")}"><div class="rs-section-head"><p id="rs-count" role="status" aria-live="polite"></p><label class="rs-sort">${t("Sort", "排序")} <select id="rs-sort"><option value="date">${t("Newest notes", "笔记日期")}</option><option value="title">${t("Title A–Z", "标题 A–Z")}</option></select></label></div><div id="rs-active"></div><div id="rs-map-panel"><div class="rs-map-toolbar"><label>${t("Color by", "颜色维度")} <select id="rs-color">${data.taxonomy.map(d => `<option value="${d.id}">${esc(name(d))}</option>`).join("")}</select></label><div class="rs-map-controls"><button id="rs-auto-rotate" class="rs-text-button" aria-pressed="${state.autoRotate}">${t("Auto-rotate", "自动旋转")}</button><button id="rs-reset-view" class="rs-text-button">${t("Reset view", "重置视角")}</button></div></div><div class="rs-map"><svg id="rs-map-svg" viewBox="0 0 800 470" role="group" aria-label="${t("Select a paper to inspect it", "选择论文以查看详情")}"></svg><div id="rs-three" hidden></div><div id="rs-map-tip" role="status"></div></div><div id="rs-legend" class="rs-legend"></div><p class="rs-map-caption">${t("Fixed positions · nearby points suggest related reading, not precise semantic distances. Select a point for details.", "位置固定 · 邻近点提供阅读线索，距离不代表精确的语义差异。选择节点查看详情。")}</p></div><div id="rs-list" class="rs-paper-list"></div></section>
    <aside id="rs-detail" class="rs-detail" aria-label="${t("Paper details", "论文详情")}" tabindex="-1"></aside></div>`;
    $("#rs-color").value = state.color;
    $("#rs-sort").value = state.sort;
    $("#rs-search").addEventListener("input", e => {
      state.q = e.target.value;
      update();
    });
    $("#rs-clear").addEventListener("click", () => {
      state.filters.clear();
      state.q = "";
      state.near = null;
      $("#rs-search").value = "";
      update();
    });
    $("#rs-sort").addEventListener("change", e => {
      state.sort = e.target.value;
      update();
    });
    $("#rs-color").addEventListener("change", e => {
      state.color = e.target.value;
      update();
    });
    $("#rs-auto-rotate").addEventListener("click", () => {
      state.autoRotate = !state.autoRotate;
      update();
    });
    $("#rs-reset-view").addEventListener("click", () => scene?.reset());
    root.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => {
      state.view = b.dataset.view;
      update();
    }));
    $("#rs-facets").addEventListener("change", e => {
      const id = e.target.dataset.facet;
      if (id) {
        e.target.checked ? state.filters.add(id) : state.filters.delete(id);
        update();
      }
    });
    root.addEventListener("click", click);
    detail();
    update();
  }
  function click(e) {
    const p = e.target.closest("[data-paper]"), remove = e.target.closest("[data-remove]");
    if (p) select(p.dataset.paper);
    if (remove) {
      state.filters.delete(remove.dataset.remove);
      update();
    }
    if (e.target.closest("#rs-near")) {
      state.near = state.selected;
      update();
    }
    if (e.target.closest("#rs-exit-near")) {
      state.near = null;
      update();
    }
    if (e.target.closest("#rs-close")) {
      state.selected = null;
      state.near = null;
      detail();
      update();
    }
  }
  function select(id) {
    if (!byId.has(id)) return;
    state.selected = id;
    if (state.near) state.near = id;
    detail();
    update();
    $("#rs-detail").focus({
      preventScroll: true
    });
    if (innerWidth < 1100) $("#rs-detail").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
  function detail() {
    root.classList.toggle("rs-has-selection", Boolean(state.selected));
    if (!state.selected) {
      $("#rs-detail").innerHTML = `<span class="rs-eyebrow">${t("READING COMPANION", "阅读线索")}</span><h2>${t("Follow an idea.", "沿着问题读下去。")}</h2><p>${t("Select a paper in the map or list to see its summary, classification evidence and related reading.", "选择地图或列表中的论文，查看摘要、分类依据与相似论文。")}</p><div class="rs-detail-example">${t("Try a combination", "试试组合筛选")}<br><strong>${t("Dexterous hand + Touch + Reinforcement learning", "灵巧手 + 触觉 + 强化学习")}</strong></div><p class="rs-muted">${t("Dates refer to reading notes, not publication dates.", "日期为笔记日期，并非论文发表日期。")}</p>`;
      return;
    }
    const p = byId.get(state.selected), sources = {
      tags: t("Existing tag", "原有标签"),
      title: t("Title", "标题"),
      summary: t("Summary · suggested", "摘要 · 推断"),
      reviewed: t("Manually reviewed", "人工校正")
    };
    $("#rs-detail").innerHTML = `<div class="rs-section-head"><span class="rs-eyebrow">${t("PAPER DETAIL", "论文详情")}</span><button id="rs-close" aria-label="${t("Close details", "关闭详情")}">×</button></div><h2>${esc(p.title)}</h2><p class="rs-muted">${t("Note", "笔记")} · ${p.date}</p><p>${esc(p.summary || t("Open the note for details.", "打开笔记查看详情。"))}</p><a class="rs-open-note" href="${esc(url(p))}">${t("Read full note ↗", "阅读全文 ↗")}</a>${data.taxonomy.map(d => `<div class="rs-detail-facet"><h3>${esc(name(d))}</h3><div>${p.facets[d.id].length ? p.facets[d.id].map(tag).join("") : `<span class="rs-muted">${t("Not specified", "未确定")}</span>`}</div></div>`).join("")}<details class="rs-evidence"><summary>${t("Inspect classification evidence", "查看分类依据")}</summary><ul>${Object.entries(p.evidence).map(([ id, v ]) => `<li><strong>${esc(name(labels.get(id)))}</strong><br>${sources[v.source]} · ${esc(v.phrase)}</li>`).join("") || `<li>${t("No confident labels yet.", "暂未确定标签。")}</li>`}</ul></details><div class="rs-section-head rs-related-head"><h3>${t("Related reading", "相似论文")}</h3><button id="rs-near" class="rs-text-button">${t("Explore neighborhood", "查看邻域")}</button></div><p class="rs-muted">${t("Suggested by text and shared labels; independent of filters.", "依据文本相似度和共同标签推荐，不受当前筛选限制。")}</p><div class="rs-related">${p.related.map(r => `<button data-paper="${r.id}"><strong>${esc(byId.get(r.id).title)}</strong><small>${r.shared.length ? esc(r.shared.slice(0, 3).map(id => name(labels.get(id))).join(" · ")) : t("Similar wording in notes", "笔记文本相近")}</small></button>`).join("") || `<p>${t("No close matches yet.", "暂时没有足够相近的论文。")}</p>`}</div>`;
  }
  function update() {
    const near = nearby();
    const found = papers.filter(p => matches(p) && (!near || near.has(p.id))).sort((a, b) => state.sort === "title" ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
    const visible = new Set(found.map(p => p.id));
    $("#rs-count").textContent = t(`${found.length} of ${papers.length} notes`, `${found.length} / ${papers.length} 篇笔记`);
    root.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
    root.querySelectorAll("[data-facet]").forEach(i => {
      i.checked = state.filters.has(i.dataset.facet);
    });
    root.querySelectorAll("[data-count]").forEach(el => {
      const f = new Set(state.filters);
      f.add(el.dataset.count);
      el.textContent = papers.filter(p => matches(p, f) && (!near || near.has(p.id))).length;
    });
    $("#rs-active").innerHTML = [ ...state.filters ].map(id => `<button class="rs-active-tag" data-remove="${id}" aria-label="${esc(t("Remove ", "移除 ") + name(labels.get(id)))}">${esc(name(labels.get(id)))} ×</button>`).join("") + (state.near ? `<button id="rs-exit-near" class="rs-active-tag">${t("Neighborhood", "相似邻域")}: ${esc(byId.get(state.near).title.split(":")[0])} ×</button>` : "");
    $("#rs-list").innerHTML = found.length ? found.map(p => `<article class="rs-paper ${state.selected === p.id ? "is-selected" : ""}"><div class="rs-paper-meta"><span class="rs-dot" style="background:${color(p)}"></span><time>${p.date}</time><span>${t("READING NOTE", "论文笔记")}</span></div><h3><button data-paper="${p.id}" aria-pressed="${state.selected === p.id}">${esc(p.title)}</button></h3><p>${esc(p.summary || t("Open the note for details.", "打开笔记查看详情。"))}</p><div class="rs-tags">${facets(p).map(tag).join("")}</div><a href="${esc(url(p))}" class="rs-note-link">${t("Read note ↗", "阅读笔记 ↗")}</a></article>`).join("") : `<div class="rs-empty"><h3>${t("No matching notes", "没有匹配的笔记")}</h3><p>${t("Remove a label, clear the search, or leave the neighborhood.", "移除标签、清空搜索，或退出相似邻域以扩大范围。")}</p></div>`;
    $("#rs-map-svg").style.display = state.view === "2d" ? "block" : "none";
    $("#rs-three").hidden = state.view !== "3d";
    $(".rs-map-controls").hidden = state.view !== "3d";
    $("#rs-auto-rotate").setAttribute("aria-pressed", String(state.autoRotate));
    const colors = new Set(found.map(p => p.facets[state.color][0]));
    $("#rs-legend").innerHTML = data.taxonomy.find(d => d.id === state.color).values.filter(v => colors.has(v.id)).map(v => `<span><i style="background:${v.color}"></i>${esc(name(v))}</span>`).join("") + (colors.has(undefined) ? `<span><i style="background:#8b9198"></i>${t("Not specified", "未确定")}</span>` : "") + `<small>${t("Color uses the first label in the chosen dimension. All labels appear in details.", "颜色取所选维度的首个标签，全部标签见详情。")}</small>`;
    $("#rs-map-tip").textContent = "";
    if (state.view === "2d") map2d(found);
    if (state.view === "3d") {
      try {
        if (!scene) scene = makeScene();
        scene.update(visible);
      } catch (e) {
        $("#rs-three").textContent = t("3D unavailable. Please switch to 2D.", "当前环境无法显示 3D，请切换 2D。");
      }
    }
    scene?.active(state.view === "3d");
    save();
  }
  const point = p => [ 400 + p.position[0] * 49, 235 + p.position[1] * 49 ];
  const svgEl = (type, attrs) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", type);
    Object.entries(attrs).forEach(([ k, v ]) => el.setAttribute(k, v));
    return el;
  };
  function map2d(found) {
    const svg = $("#rs-map-svg");
    svg.replaceChildren();
    const ids = new Set(found.map(p => p.id));
    if (state.selected && ids.has(state.selected)) {
      const p = byId.get(state.selected), a = point(p);
      p.related.filter(r => ids.has(r.id)).forEach(r => {
        const b = point(byId.get(r.id));
        svg.append(svgEl("line", {
          x1: a[0],
          y1: a[1],
          x2: b[0],
          y2: b[1],
          stroke: "#8aa9ad",
          "stroke-width": 1.5,
          "stroke-dasharray": "4 5"
        }));
      });
    }
    found.forEach(p => {
      const [ x, y ] = point(p), selected = state.selected === p.id, g = svgEl("g", {
        role: "button",
        tabindex: 0,
        "aria-label": p.title,
        "aria-pressed": selected,
        "data-paper": p.id
      });
      const title = svgEl("title", {});
      title.textContent = p.title;
      g.append(svgEl("circle", {
        cx: x,
        cy: y,
        r: selected ? 9 : 5.5,
        fill: color(p),
        stroke: selected ? "#172e3c" : "#fff",
        "stroke-width": selected ? 3 : 1.4
      }), title);
      g.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(p.id);
        }
      });
      g.addEventListener("pointerenter", () => {
        $("#rs-map-tip").textContent = p.title;
      });
      g.addEventListener("pointerleave", () => {
        $("#rs-map-tip").textContent = "";
      });
      svg.append(g);
    });
  }
  function makeScene() {
    const T = window.THREE;
    if (!T) throw new Error("Three unavailable");
    const host = $("#rs-three"), renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    host.append(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", t("3D map: drag to rotate, scroll to zoom. Use the list for keyboard selection.", "3D 地图：拖动旋转，滚轮缩放。键盘操作请使用论文列表。"));
    const world = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, .1, 100), group = new T.Group(), geometry = new T.SphereGeometry(.07, 12, 10);
    camera.position.z = 17;
    world.add(group);
    const meshes = papers.map(p => {
      const m = new T.Mesh(geometry, new T.MeshBasicMaterial({
        color: color(p)
      }));
      m.position.set(...p.position);
      m.userData.id = p.id;
      group.add(m);
      return m;
    });
    const ray = new T.Raycaster(), pointer = new T.Vector2();
    let running = false, frame = null, down = null, origin = null, moved = false;
    let lastTime = 0, hovering = false, pauseUntil = 0;
    function draw(now = performance.now()) {
      if (!running) return;
      const elapsed = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
      lastTime = now;
      if (state.autoRotate && !hovering && !down && now >= pauseUntil && !document.hidden) {
        group.rotation.y += elapsed * 0.075;
      }
      renderer.render(world, camera);
      frame = requestAnimationFrame(draw);
    }
    const observer = new ResizeObserver(() => {
      if (!host.clientWidth) return;
      renderer.setSize(host.clientWidth, 360);
      camera.aspect = host.clientWidth / 360;
      camera.updateProjectionMatrix();
    });
    observer.observe(host);
    function pick(e) {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(pointer, camera);
      return ray.intersectObjects(meshes.filter(m => m.visible))[0]?.object;
    }
    renderer.domElement.addEventListener("pointerenter", () => { hovering = true; });
    renderer.domElement.addEventListener("pointerdown", e => {
      down = origin = [ e.clientX, e.clientY ];
      moved = false;
      renderer.domElement.setPointerCapture(e.pointerId);
    });
    renderer.domElement.addEventListener("pointermove", e => {
      if (down) {
        if (Math.hypot(e.clientX - origin[0], e.clientY - origin[1]) > 4) moved = true;
        group.rotation.y += (e.clientX - down[0]) * .006;
        group.rotation.x += (e.clientY - down[1]) * .006;
        down = [ e.clientX, e.clientY ];
      } else {
        const hit = pick(e);
        $("#rs-map-tip").textContent = hit ? byId.get(hit.userData.id).title : "";
        renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      }
    });
    renderer.domElement.addEventListener("pointerup", e => {
      if (down && !moved) {
        const hit = pick(e);
        if (hit) select(hit.userData.id);
      }
      down = null;
      pauseUntil = performance.now() + 2000;
      if (renderer.domElement.hasPointerCapture(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId);
    });
    renderer.domElement.addEventListener("pointercancel", () => {
      down = null;
      hovering = false;
      pauseUntil = performance.now() + 2000;
    });
    renderer.domElement.addEventListener("pointerleave", () => {
      hovering = false;
      pauseUntil = performance.now() + 1200;
      $("#rs-map-tip").textContent = "";
    });
    renderer.domElement.addEventListener("wheel", e => {
      e.preventDefault();
      pauseUntil = performance.now() + 2000;
      camera.position.z = Math.max(5, Math.min(30, camera.position.z + e.deltaY * .01));
    }, {
      passive: false
    });
    return {
      update(ids) {
        meshes.forEach(m => {
          m.visible = ids.has(m.userData.id);
          m.material.color.set(color(byId.get(m.userData.id)));
          m.scale.setScalar(state.selected === m.userData.id ? 1.9 : 1);
        });
      },
      active(v) {
        if (running === v) return;
        running = v;
        lastTime = 0;
        if (v) draw(); else cancelAnimationFrame(frame);
      },
      reset() {
        group.rotation.set(0, 0, 0);
        camera.position.z = 17;
      },
      dispose() {
        running = false;
        cancelAnimationFrame(frame);
        observer.disconnect();
        geometry.dispose();
        meshes.forEach(m => m.material.dispose());
        renderer.dispose();
      }
    };
  }
  function save() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.filters.size) p.set("tags", [ ...state.filters ].sort().join(","));
    if (state.view !== "3d") p.set("view", state.view);
    if (state.selected) p.set("paper", state.selected);
    if (state.near) p.set("near", state.near);
    if (state.color !== "method") p.set("color", state.color);
    if (state.sort !== "date") p.set("sort", state.sort);
    history.replaceState(null, "", location.pathname + (p.size ? "?" + p : "") + location.hash);
  }
  function restore() {
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") || "";
    state.filters = new Set((p.get("tags") || "").split(",").filter(id => labels.has(id)));
    if ([ "2d", "3d" ].includes(p.get("view"))) state.view = p.get("view");
    if (byId.has(p.get("paper"))) state.selected = p.get("paper");
    if (byId.has(p.get("near"))) state.near = p.get("near");
    if (data.taxonomy.some(d => d.id === p.get("color"))) state.color = p.get("color");
    if (p.get("sort") === "title") state.sort = "title";
  }
  async function init() {
    try {
      const response = await fetch(root.dataset.indexUrl);
      if (!response.ok) throw new Error("HTTP " + response.status);
      data = await response.json();
      papers = data.papers;
      byId = new Map(papers.map(p => [ p.id, p ]));
      labels = new Map(data.taxonomy.flatMap(d => d.values.map(v => [ v.id, v ])));
      search = new Map(papers.map(p => [ p.id, [ p.title, p.summary, ...p.tags, ...facets(p).flatMap(id => {
        const v = labels.get(id);
        return [ v.en, v.zh, ...v.aliases ];
      }) ].join(" ").toLowerCase() ]));
      restore();
      shell();
      new MutationObserver(() => {
        const next = document.documentElement.lang.startsWith("zh") ? "zh" : "en";
        if (next === lang) return;
        lang = next;
        scene?.dispose();
        scene = null;
        root.removeEventListener("click", click);
        shell();
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: [ "lang" ]
      });
    } catch (e) {
      root.innerHTML = `<p role="alert">${t("Reading index unavailable. Reload to retry.", "阅读索引暂时无法加载，请刷新重试。")} <a href="${esc(root.dataset.baseurl || "")}/year-archive/">${t("All notes", "全部笔记")}</a></p>`;
      console.error("RoboScope:", e);
    }
  }
  init();
})();
