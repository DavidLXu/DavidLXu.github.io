const ROOT = document.getElementById("paper-notes-3d-map");
const CANVAS = document.getElementById("paper-notes-3d-canvas");
const STATUS = document.getElementById("paper-notes-3d-status");
const TOOLTIP = document.getElementById("paper-notes-3d-tooltip");
const CLUSTERS_EL = document.getElementById("paper-notes-3d-clusters");
const COUNT_EL = document.getElementById("paper-notes-count");
const CLUSTER_COUNT_EL = document.getElementById("paper-notes-cluster-count");

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "paper", "notes",
  "are", "can", "not", "into", "using", "uses", "used", "via", "its",
  "their", "which", "than", "then", "also", "more", "but", "one", "two",
  "three", "model", "models", "data", "learning", "robot", "robots",
  "policy", "policies", "method", "task", "tasks", "train", "training",
  "results", "based", "post", "supports", "english", "switching", "site",
  "language", "toggle", "navigation", "paper notes", "中文", "摘要", "论文",
  "方法", "模型"
]);

const DOMAIN_KEEP = new Set([
  "vla", "world", "action", "dexterous", "manipulation", "tactile",
  "hand", "hands", "egocentric", "video", "videos", "humanoid", "rl",
  "reinforcement", "diffusion", "flow", "matching", "bimanual", "grasp",
  "grasping", "sim", "real", "simulation", "dynamics", "embodied",
  "memory", "planning", "contact", "tracking", "teleoperation", "cross",
  "embodiment", "foundation", "dataset", "datasets", "trajectory",
  "trajectories", "reward", "state", "states", "vision", "language",
  "open", "vocabulary", "representation", "morphology", "human"
]);

const COLORS = [
  0x2563eb, 0xdc2626, 0x16a34a, 0x9333ea, 0xea580c,
  0x0891b2, 0x4f46e5, 0xbe123c, 0x65a30d, 0x7c3aed
];

function tokenize(text) {
  const matches = String(text).toLowerCase().match(/[a-z][a-z0-9+\-]{1,}|[\u4e00-\u9fff]{2,}/g) || [];
  return matches
    .map((token) => token.replace(/^[-+]+|[-+]+$/g, ""))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function chooseK(n) {
  return Math.max(5, Math.min(10, Math.round(Math.sqrt(n)) + 2));
}

function buildTfidf(posts, maxFeatures = 520) {
  const docCounts = new Map();
  const termCounts = posts.map((post) => {
    const weighted = [
      post.title, post.title, post.title, post.title,
      ...(post.tags || []), ...(post.tags || []), ...(post.tags || []),
      post.excerpt || "", post.text || ""
    ].join(" ");
    const counts = new Map();
    for (const token of tokenize(weighted)) counts.set(token, (counts.get(token) || 0) + 1);
    for (const token of counts.keys()) docCounts.set(token, (docCounts.get(token) || 0) + 1);
    return counts;
  });

  const n = posts.length;
  const vocab = Array.from(docCounts.entries())
    .filter(([term, df]) => (df >= 2 || DOMAIN_KEEP.has(term)) && (df <= Math.max(5, Math.floor(n * 0.75)) || DOMAIN_KEEP.has(term)))
    .sort((a, b) => (b[1] + (DOMAIN_KEEP.has(b[0]) ? 4 : 0)) - (a[1] + (DOMAIN_KEEP.has(a[0]) ? 4 : 0)))
    .slice(0, maxFeatures)
    .map(([term]) => term)
    .sort();

  const index = new Map(vocab.map((term, i) => [term, i]));
  const matrix = termCounts.map((counts) => {
    const row = new Array(vocab.length).fill(0);
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0) || 1;
    for (const [term, count] of counts.entries()) {
      const col = index.get(term);
      if (col === undefined) continue;
      const df = docCounts.get(term) || 0;
      row[col] = (count / total) * (Math.log((1 + n) / (1 + df)) + 1);
    }
    const norm = Math.hypot(...row) || 1;
    return row.map((value) => value / norm);
  });

  return { matrix, vocab };
}

function centeredCopy(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const means = new Array(cols).fill(0);
  for (const row of matrix) for (let j = 0; j < cols; j++) means[j] += row[j] / rows;
  return matrix.map((row) => row.map((value, j) => value - means[j]));
}

function normalize(vector) {
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
}

function pca(matrix, components = 3) {
  const work = centeredCopy(matrix);
  const rows = work.length;
  const cols = work[0].length;
  const scores = Array.from({ length: rows }, () => new Array(components).fill(0));

  for (let component = 0; component < components; component++) {
    let vector = normalize(Array.from({ length: cols }, (_, j) => Math.sin((j + 1) * (component + 2))));
    for (let iter = 0; iter < 45; iter++) {
      const left = work.map((row) => row.reduce((sum, value, j) => sum + value * vector[j], 0));
      const next = new Array(cols).fill(0);
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) next[j] += work[i][j] * left[i];
      vector = normalize(next);
    }
    const componentScores = work.map((row) => row.reduce((sum, value, j) => sum + value * vector[j], 0));
    for (let i = 0; i < rows; i++) scores[i][component] = componentScores[i];
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) work[i][j] -= componentScores[i] * vector[j];
  }

  return scores;
}

function normalizePoints(points) {
  const dims = points[0].length;
  const mins = new Array(dims).fill(Infinity);
  const maxs = new Array(dims).fill(-Infinity);
  for (const point of points) {
    for (let j = 0; j < dims; j++) {
      mins[j] = Math.min(mins[j], point[j]);
      maxs[j] = Math.max(maxs[j], point[j]);
    }
  }
  return points.map((point) => point.map((value, j) => {
    const span = maxs[j] - mins[j] || 1;
    return ((value - mins[j]) / span - 0.5) * 10;
  }));
}

function squaredDistance(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += (a[i] - b[i]) ** 2;
  return total;
}

function kmeans(points, k, rounds = 100) {
  const centers = [points[0].slice()];
  while (centers.length < k) {
    let farthest = 0;
    let farthestDistance = -1;
    for (let i = 0; i < points.length; i++) {
      const distance = Math.min(...centers.map((center) => squaredDistance(points[i], center)));
      if (distance > farthestDistance) {
        farthest = i;
        farthestDistance = distance;
      }
    }
    centers.push(points[farthest].slice());
  }

  let labels = new Array(points.length).fill(0);
  for (let iter = 0; iter < rounds; iter++) {
    const nextLabels = points.map((point) => {
      let best = 0;
      let bestDistance = Infinity;
      centers.forEach((center, i) => {
        const distance = squaredDistance(point, center);
        if (distance < bestDistance) {
          best = i;
          bestDistance = distance;
        }
      });
      return best;
    });
    if (nextLabels.every((label, i) => label === labels[i])) break;
    labels = nextLabels;
    for (let cid = 0; cid < k; cid++) {
      const members = points.filter((_, i) => labels[i] === cid);
      if (!members.length) continue;
      for (let j = 0; j < centers[cid].length; j++) {
        centers[cid][j] = members.reduce((sum, point) => sum + point[j], 0) / members.length;
      }
    }
  }
  return labels;
}

function topTerms(matrix, vocab, labels, cid) {
  const members = labels.map((label, i) => label === cid ? i : -1).filter((i) => i >= 0);
  const others = labels.map((label, i) => label !== cid ? i : -1).filter((i) => i >= 0);
  return vocab
    .map((term, col) => {
      const a = members.reduce((sum, row) => sum + matrix[row][col], 0) / Math.max(1, members.length);
      const b = others.reduce((sum, row) => sum + matrix[row][col], 0) / Math.max(1, others.length);
      return { term, score: a - 0.55 * b };
    })
    .filter((item) => item.score > 0 && !STOPWORDS.has(item.term))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.term);
}

function clusterName(terms) {
  const labels = [
    [["tactile", "contact", "sensor", "force", "sensing"], "触觉与接触建模"],
    [["bimanual", "ambidextrous", "symmetric", "motion"], "双手/双臂操作"],
    [["egocentric", "video", "videos", "human", "trajectory"], "人类视频与数据集"],
    [["vla", "language", "action", "vision", "vlm"], "VLA 与动作生成"],
    [["reward", "state", "states", "distance", "representation"], "状态表示与奖励建模"],
    [["world", "dynamics", "state", "reward", "latent"], "世界模型与动力学"],
    [["rl", "reinforcement", "policy", "guidance", "online"], "强化学习与策略改进"],
    [["humanoid", "mimic", "teleoperation"], "人形机器人与遥操作"],
    [["dexterous", "hand", "hands", "grasp", "grasping"], "灵巧手与抓取"],
    [["planning", "memory", "open", "vocabulary"], "规划、记忆与开放词汇"]
  ];
  const termSet = new Set(terms);
  let best = terms.slice(0, 3).join(" / ") || "未命名主题";
  let bestScore = 0;
  for (const [keys, name] of labels) {
    const score = keys.filter((key) => termSet.has(key)).length;
    if (score > bestScore) {
      best = name;
      bestScore = score;
    }
  }
  return best;
}

function makeClusters(posts, matrix, vocab, labels) {
  return Array.from(new Set(labels)).map((cid, order) => {
    const papers = posts
      .map((post, i) => ({ ...post, index: i }))
      .filter((_, i) => labels[i] === cid);
    const keywords = topTerms(matrix, vocab, labels, cid);
    return {
      id: cid,
      order,
      color: COLORS[order % COLORS.length],
      colorCss: `#${COLORS[order % COLORS.length].toString(16).padStart(6, "0")}`,
      name: clusterName(keywords),
      keywords,
      papers
    };
  }).sort((a, b) => b.papers.length - a.papers.length || a.name.localeCompare(b.name));
}

function hexToRgb(value) {
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function renderClusterList(clusters) {
  CLUSTERS_EL.innerHTML = clusters.map((cluster) => {
    const { r, g, b } = hexToRgb(cluster.color);
    return `
    <button class="paper-notes-3d__cluster" type="button" data-cluster-id="${cluster.id}" style="--cluster-color:${cluster.colorCss}; --cluster-glow:rgba(${r}, ${g}, ${b}, 0.18);">
      <span class="paper-notes-3d__cluster-title">
        <span class="paper-notes-3d__swatch" style="background:${cluster.colorCss}"></span>
        <span>${cluster.name}</span>
        <span class="paper-notes-3d__count">${cluster.papers.length}</span>
      </span>
      <span class="paper-notes-3d__keywords">${cluster.keywords.join(", ")}</span>
    </button>
  `;
  }).join("");
}

function clusterExtents(points, labels, clusterId) {
  const members = points.filter((_, i) => labels[i] === clusterId);
  const center = members.reduce((sum, point) => {
    sum[0] += point[0];
    sum[1] += point[1];
    sum[2] += point[2];
    return sum;
  }, [0, 0, 0]).map((value) => value / Math.max(1, members.length));

  const spread = members.reduce((sum, point) => {
    return sum + Math.hypot(point[0] - center[0], point[1] - center[1], point[2] - center[2]);
  }, 0) / Math.max(1, members.length);

  return {
    center,
    radius: Math.max(0.9, Math.min(2.8, spread * 0.82 + 0.55))
  };
}

function renderScene(posts, points, labels, clusters) {
  if (!window.THREE) throw new Error("Three.js is not loaded.");
  const THREE = window.THREE;
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const renderer = new THREE.WebGLRenderer({ canvas: CANVAS, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111722);
  scene.fog = new THREE.Fog(0x111722, 17, 33);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1000);
  camera.position.set(0, 2.5, 17);

  scene.add(new THREE.AmbientLight(0xdde7ff, 1.05));
  const light = new THREE.DirectionalLight(0xffffff, 1.75);
  light.position.set(5, 8, 9);
  scene.add(light);

  const group = new THREE.Group();
  const horizon = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18, 1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x172131,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    })
  );
  horizon.rotation.x = -Math.PI / 2;
  horizon.position.y = -6.08;
  group.add(horizon);

  const grid = new THREE.GridHelper(15, 10, 0x5c6f8a, 0x2b3546);
  grid.position.y = -6;
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.2;
    material.depthWrite = false;
  });
  group.add(grid);

  const haloMeshes = [];
  const haloGeometry = new THREE.SphereGeometry(1, 40, 24);
  clusters.forEach((cluster) => {
    const { center, radius } = clusterExtents(points, labels, cluster.id);
    const material = new THREE.MeshBasicMaterial({
      color: cluster.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Mesh(haloGeometry, material);
    halo.position.set(center[0], center[1], center[2]);
    halo.scale.set(radius * 1.15, radius * 0.72, radius * 1.15);
    halo.userData = {
      cluster,
      targetOpacity: 0.095
    };
    group.add(halo);
    haloMeshes.push(halo);
  });

  const pointMeshes = [];
  const geometry = new THREE.SphereGeometry(0.16, 24, 16);
  posts.forEach((post, i) => {
    const cluster = clusterById.get(labels[i]);
    const material = new THREE.MeshStandardMaterial({
      color: cluster.color,
      roughness: 0.42,
      metalness: 0.08,
      emissive: cluster.color,
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(points[i][0], points[i][1], points[i][2]);
    mesh.userData = {
      post,
      cluster,
      targetOpacity: 0.86,
      targetScale: 1,
      targetEmissive: 0.08
    };
    mesh.scale.setScalar(0.001);
    group.add(mesh);
    pointMeshes.push(mesh);
  });
  scene.add(group);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const clusterCards = Array.from(CLUSTERS_EL.querySelectorAll(".paper-notes-3d__cluster"));
  let active = null;
  let selectedClusterId = null;
  let dragging = false;
  let pointerInside = false;
  let hasHoverPosition = false;
  let previousX = 0;
  let previousY = 0;
  let hoverPreviousX = 0;
  let hoverPreviousY = 0;
  let targetRotationX = -0.18;
  let targetRotationY = 0.45;
  group.rotation.x = targetRotationX;
  group.rotation.y = targetRotationY;

  function updateEmphasis() {
    const hoverClusterId = active?.userData.cluster.id ?? null;
    const focusClusterId = hoverClusterId ?? selectedClusterId;

    pointMeshes.forEach((mesh) => {
      const sameCluster = focusClusterId !== null && mesh.userData.cluster.id === focusClusterId;
      const isActive = mesh === active;
      const isDimmed = focusClusterId !== null && !sameCluster;
      mesh.userData.targetOpacity = isDimmed ? 0.18 : sameCluster ? 0.94 : 0.86;
      mesh.userData.targetScale = isActive ? 1.72 : sameCluster ? 1.22 : isDimmed ? 0.78 : 1;
      mesh.userData.targetEmissive = isActive ? 0.62 : sameCluster ? 0.26 : 0.08;
    });

    haloMeshes.forEach((halo) => {
      const sameCluster = focusClusterId !== null && halo.userData.cluster.id === focusClusterId;
      const isDimmed = focusClusterId !== null && !sameCluster;
      halo.userData.targetOpacity = sameCluster ? 0.18 : isDimmed ? 0.018 : 0.095;
    });

    clusterCards.forEach((card) => {
      const clusterId = Number(card.getAttribute("data-cluster-id"));
      const isActive = focusClusterId !== null && clusterId === focusClusterId;
      card.classList.toggle("is-active", isActive);
      card.classList.toggle("is-muted", focusClusterId !== null && !isActive);
      card.setAttribute("aria-pressed", selectedClusterId === clusterId ? "true" : "false");
    });
  }

  clusterCards.forEach((card) => {
    const clusterId = Number(card.getAttribute("data-cluster-id"));
    card.setAttribute("aria-pressed", "false");
    card.addEventListener("click", () => {
      selectedClusterId = selectedClusterId === clusterId ? null : clusterId;
      updateEmphasis();
    });
  });
  updateEmphasis();

  function resize() {
    const rect = CANVAS.parentElement.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function updatePointer(event) {
    const rect = CANVAS.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    TOOLTIP.style.left = `${event.clientX - rect.left + 14}px`;
    TOOLTIP.style.top = `${event.clientY - rect.top + 14}px`;
  }

  function pickPoint() {
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(pointMeshes, false)[0]?.object || null;
  }

  CANVAS.addEventListener("pointermove", (event) => {
    pointerInside = true;
    updatePointer(event);
    if (!dragging && hasHoverPosition) {
      const dx = event.clientX - hoverPreviousX;
      const dy = event.clientY - hoverPreviousY;
      targetRotationY -= dx * 0.0018;
      targetRotationX -= dy * 0.0012;
      targetRotationX = Math.max(-1.15, Math.min(1.15, targetRotationX));
    }
    hoverPreviousX = event.clientX;
    hoverPreviousY = event.clientY;
    hasHoverPosition = true;

    const nextActive = pickPoint();
    const activeChanged = nextActive !== active;
    active = nextActive;
    if (active) {
      const { post, cluster } = active.userData;
      TOOLTIP.innerHTML = `<strong>${post.title}</strong>${cluster.name}<br>${post.date}<br>Click to open note`;
      TOOLTIP.style.opacity = "1";
      CANVAS.style.cursor = "pointer";
    } else {
      active = null;
      TOOLTIP.style.opacity = "0";
      CANVAS.style.cursor = dragging ? "grabbing" : "grab";
    }
    if (activeChanged) updateEmphasis();
  });

  CANVAS.addEventListener("pointerdown", (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    CANVAS.setPointerCapture(event.pointerId);
  });

  CANVAS.addEventListener("pointerup", (event) => {
    dragging = false;
    CANVAS.style.cursor = active ? "pointer" : "grab";
    if (CANVAS.hasPointerCapture(event.pointerId)) CANVAS.releasePointerCapture(event.pointerId);
  });

  CANVAS.addEventListener("pointercancel", () => {
    dragging = false;
  });

  CANVAS.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - previousX;
    const dy = event.clientY - previousY;
    previousX = event.clientX;
    previousY = event.clientY;
    targetRotationY += dx * 0.006;
    targetRotationX += dy * 0.004;
    targetRotationX = Math.max(-1.15, Math.min(1.15, targetRotationX));
  });

  CANVAS.addEventListener("wheel", (event) => {
    event.preventDefault();
    camera.position.z = Math.max(8, Math.min(28, camera.position.z + event.deltaY * 0.012));
  }, { passive: false });

  CANVAS.addEventListener("pointerleave", () => {
    active = null;
    pointerInside = false;
    hasHoverPosition = false;
    TOOLTIP.style.opacity = "0";
    updateEmphasis();
  });

  CANVAS.addEventListener("click", (event) => {
    updatePointer(event);
    const clicked = pickPoint();
    if (clicked && clicked.userData.post.url) window.location.href = clicked.userData.post.url;
  });

  window.addEventListener("resize", resize);
  resize();
  const startTime = performance.now();

  function animate() {
    const intro = Math.min(1, (performance.now() - startTime) / 1150);
    const introEase = 1 - (1 - intro) ** 3;
    if (!dragging && !pointerInside) targetRotationY += 0.0022;
    group.rotation.x += (targetRotationX - group.rotation.x) * 0.08;
    group.rotation.y += (targetRotationY - group.rotation.y) * 0.08;
    pointMeshes.forEach((mesh) => {
      const targetScale = Math.max(0.001, mesh.userData.targetScale * introEase);
      mesh.scale.setScalar(mesh.scale.x + (targetScale - mesh.scale.x) * 0.12);
      mesh.material.opacity += ((mesh.userData.targetOpacity * introEase) - mesh.material.opacity) * 0.12;
      mesh.material.emissiveIntensity += (mesh.userData.targetEmissive - mesh.material.emissiveIntensity) * 0.12;
    });
    haloMeshes.forEach((halo) => {
      halo.material.opacity += ((halo.userData.targetOpacity * introEase) - halo.material.opacity) * 0.08;
    });
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}

async function main() {
  if (!ROOT || !CANVAS) return;
  try {
    const response = await fetch("/assets/data/paper_notes.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Cannot load paper_notes.json (${response.status})`);
    const posts = await response.json();
    if (!Array.isArray(posts) || posts.length < 3) throw new Error("Need at least 3 Paper Notes.");

    const { matrix, vocab } = buildTfidf(posts);
    const projection = pca(matrix, 12);
    const k = chooseK(posts.length);
    const labels = kmeans(projection, k);
    const points = normalizePoints(pca(matrix, 3));
    const clusters = makeClusters(posts, matrix, vocab, labels);

    COUNT_EL.textContent = String(posts.length);
    CLUSTER_COUNT_EL.textContent = String(clusters.length);
    STATUS.textContent = `TF-IDF + PCA + KMeans, k=${clusters.length}`;
    renderClusterList(clusters);
    renderScene(posts, points, labels, clusters);
  } catch (error) {
    STATUS.textContent = error.message || "Unable to render Paper Notes map.";
  }
}

main();
