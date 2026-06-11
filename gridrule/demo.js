/* =========================================================
   GridRule Interactive Demo — visual grid renderer
   ========================================================= */
(function () {
"use strict";

// ── Levels ───────────────────────────────────────────────
const LEVELS = [
  {
    name: "1-gate: door",
    desc: "Pick up the key 🔑, open the door, reach the exit ★.  Controls are scrambled — discover which key moves where!",
    H: 7, W: 15,
    terrain: [
      "###############",
      "#.....#.......#",
      "#.....#.......#",
      "#.....#.......#",
      "#.....#.......#",
      "#.....#.......#",
      "###############",
    ],
    start: [3, 2],
    exit:  [3, 13],
    key:   [2, 3],
    door:  [3, 7],
  },
  {
    name: "2-gate: door + switch",
    desc: "Two rooms, two mechanics. Get the key → open door → hit switch → open gate → exit.",
    H: 7, W: 22,
    terrain: [
      "######################",
      "#.....#.......#......#",
      "#.....#.......#......#",
      "#.....#.......#......#",
      "#.....#.......#......#",
      "#.....#.......#......#",
      "######################",
    ],
    start: [3, 2],
    exit:  [3, 20],
    key:   [2, 3],
    door:  [3, 7],
    sw:    [4, 11],
    gate:  [3, 15],
  },
];

// ── Directions ───────────────────────────────────────────
const DIRS = [
  { dr: -1, dc:  0, label: "↑" },
  { dr:  1, dc:  0, label: "↓" },
  { dr:  0, dc: -1, label: "←" },
  { dr:  0, dc:  1, label: "→" },
];
const KEY_MAP = {
  ArrowUp: 0, ArrowDown: 1, ArrowLeft: 2, ArrowRight: 3,
  w: 0, s: 1, a: 2, d: 3,
  W: 0, S: 1, A: 2, D: 3,
};

// ── State ────────────────────────────────────────────────
let S = null;

function freshPerm() {
  const p = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

function initState(lvl) {
  return {
    lvl,
    perm: freshPerm(),
    discovered: [null, null, null, null],
    pos: [...lvl.start],
    hasKey: false,
    doorOpen: false,
    swHit: false,
    gateOpen: false,
    won: false,
    steps: 0,
    log: [],
    subgoalPos: null,
    autoPlaying: false,
    animCell: null,   // briefly highlights last moved-to cell
  };
}

// ── BFS (true coordinates) ────────────────────────────────
function bfsPath(lvl, st, target) {
  const key = (p, dk, go, sw) => `${p[0]},${p[1]},${+dk},${+go},${+sw}`;
  const q = [{ pos: [...st.pos], hasKey: st.hasKey, doorOpen: st.doorOpen,
               swHit: st.swHit, gateOpen: st.gateOpen, path: [] }];
  const vis = new Set([key(st.pos, st.hasKey, st.doorOpen, st.swHit)]);
  while (q.length) {
    const c = q.shift();
    if (c.pos[0] === target[0] && c.pos[1] === target[1]) return c.path;
    for (let d = 0; d < 4; d++) {
      const nr = c.pos[0] + DIRS[d].dr;
      const nc = c.pos[1] + DIRS[d].dc;
      if (nr < 0 || nr >= lvl.H || nc < 0 || nc >= lvl.W) continue;
      if (lvl.terrain[nr][nc] === '#') continue;
      let dk = c.hasKey, go = c.doorOpen, sw = c.swHit, ga = c.gateOpen;
      const p = [nr, nc];
      if (lvl.door && nr === lvl.door[0] && nc === lvl.door[1] && !go) { if (!dk) continue; go = true; }
      if (lvl.gate && nr === lvl.gate[0] && nc === lvl.gate[1] && !ga) { if (!sw) continue; }
      if (lvl.key && !dk && nr === lvl.key[0] && nc === lvl.key[1]) dk = true;
      if (lvl.sw && !sw && nr === lvl.sw[0] && nc === lvl.sw[1]) { sw = true; ga = true; }
      const k = key(p, dk, go, sw);
      if (!vis.has(k)) { vis.add(k); q.push({ pos: p, hasKey: dk, doorOpen: go, swHit: sw, gateOpen: ga, path: [...c.path, d] }); }
    }
  }
  return null;
}

function subgoalPlan(lvl, st) {
  const plan = [];
  if (lvl.key) plan.push({ target: lvl.key, label: "pick up key 🔑" });
  if (lvl.door) plan.push({ target: lvl.door, label: "open door" });
  if (lvl.sw) plan.push({ target: lvl.sw, label: "hit switch" });
  plan.push({ target: lvl.exit, label: "reach exit ★" });
  return plan;
}

// ── Step ──────────────────────────────────────────────────
function step(actionIdx) {
  if (S.won || S.autoPlaying) return;
  S.steps++;
  const trueDir = S.perm[actionIdx];
  const dir = DIRS[trueDir];

  // discover mapping
  if (S.discovered[actionIdx] === null) S.discovered[actionIdx] = dir.label;

  const nr = S.pos[0] + dir.dr;
  const nc = S.pos[1] + dir.dc;
  const lvl = S.lvl;

  if (nr < 0 || nr >= lvl.H || nc < 0 || nc >= lvl.W || lvl.terrain[nr][nc] === '#') {
    addLog("⟲ Bumped"); render(); return;
  }
  if (lvl.door && nr === lvl.door[0] && nc === lvl.door[1] && !S.doorOpen) {
    if (!S.hasKey) { addLog("🔒 Need the key first"); render(); return; }
    S.doorOpen = true; addLog("🗝 Door opened!");
  }
  if (lvl.gate && nr === lvl.gate[0] && nc === lvl.gate[1] && !S.gateOpen) {
    addLog("⛔ Gate closed — find switch"); render(); return;
  }
  S.pos = [nr, nc];
  S.animCell = [nr, nc];
  if (lvl.key && !S.hasKey && nr === lvl.key[0] && nc === lvl.key[1]) { S.hasKey = true; addLog("✨ Got the key!"); }
  if (lvl.sw && !S.swHit && nr === lvl.sw[0] && nc === lvl.sw[1]) { S.swHit = true; S.gateOpen = true; addLog("🔀 Switch → gate open!"); }
  if (nr === lvl.exit[0] && nc === lvl.exit[1]) { S.won = true; addLog(`🎉 Solved in ${S.steps} steps!`); }
  render();
  setTimeout(() => { S.animCell = null; render(); }, 180);
}

function addLog(msg) {
  S.log.unshift(msg);
  if (S.log.length > 5) S.log.pop();
}

// ── Auto-solve ────────────────────────────────────────────
async function autoSolve() {
  if (S.autoPlaying) return;
  S.autoPlaying = true;
  updateAutoBtn();

  const plan = subgoalPlan(S.lvl, S);
  for (const sg of plan) {
    if (!S.autoPlaying) break;
    S.subgoalPos = sg.target;
    addLog(`🤖 SUBGOAL (${sg.target[0]},${sg.target[1]}): ${sg.label}`);
    render();
    await sleep(700);

    const snap = { pos: [...S.pos], hasKey: S.hasKey, doorOpen: S.doorOpen, swHit: S.swHit, gateOpen: S.gateOpen };
    const path = bfsPath(S.lvl, snap, sg.target);
    if (!path) continue;

    for (const trueDir of path) {
      if (!S.autoPlaying || S.won) break;
      const dir = DIRS[trueDir];
      const nr = S.pos[0] + dir.dr, nc = S.pos[1] + dir.dc;
      const lvl = S.lvl;
      if (lvl.door && nr === lvl.door[0] && nc === lvl.door[1] && !S.doorOpen && S.hasKey) S.doorOpen = true;
      if (lvl.key && !S.hasKey && nr === lvl.key[0] && nc === lvl.key[1]) { S.hasKey = true; addLog("✨ Got the key!"); }
      if (lvl.sw && !S.swHit && nr === lvl.sw[0] && nc === lvl.sw[1]) { S.swHit = true; S.gateOpen = true; addLog("🔀 Switch → gate open!"); }
      S.pos = [nr, nc]; S.steps++;
      S.animCell = [nr, nc];
      if (S.pos[0] === lvl.exit[0] && S.pos[1] === lvl.exit[1]) {
        S.won = true; addLog(`🎉 Model solved in ${S.steps} steps!`);
      }
      // update discovered for all 4 actions (oracle knows all)
      S.perm.forEach((td, ai) => { if (S.discovered[ai] === null) {} }); // leave unknown
      render();
      await sleep(160);
      S.animCell = null;
    }
  }
  S.subgoalPos = null;
  S.autoPlaying = false;
  updateAutoBtn();
  render();
}

function stopAuto() {
  S.autoPlaying = false;
  S.subgoalPos = null;
  updateAutoBtn();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Render ────────────────────────────────────────────────
function render() {
  renderGrid();
  renderHUD();
  renderLog();
  renderControls();
}

// Cell classification → returns { cls, icon, tooltip }
function classifyCell(r, c) {
  const lvl = S.lvl;
  const isAgent = r === S.pos[0] && c === S.pos[1];
  const isSg = S.subgoalPos && r === S.subgoalPos[0] && c === S.subgoalPos[1];
  const isAnim = S.animCell && r === S.animCell[0] && c === S.animCell[1];
  const t = lvl.terrain[r][c];

  if (t === '#') return { cls: "dc-wall", icon: "", tip: "Wall" };

  if (isAgent && isSg) return { cls: "dc-agent dc-subgoal-cell", icon: "◉", tip: "Agent (at subgoal!)" };
  if (isAgent) return { cls: `dc-agent${isAnim ? " dc-anim" : ""}`, icon: "◉", tip: "Agent" };
  if (isSg) return { cls: "dc-subgoal-cell", icon: "⊙", tip: "Proposed subgoal" };

  if (lvl.exit && r === lvl.exit[0] && c === lvl.exit[1])
    return { cls: "dc-exit", icon: "★", tip: "Exit — reach here to win!" };

  if (lvl.key && !S.hasKey && r === lvl.key[0] && c === lvl.key[1])
    return { cls: "dc-key", icon: "⚿", tip: "Key — pick this up" };

  if (lvl.door && r === lvl.door[0] && c === lvl.door[1])
    return S.doorOpen
      ? { cls: "dc-door-open", icon: "", tip: "Door (open)" }
      : { cls: "dc-door", icon: "▌", tip: "Door — need the key" };

  if (lvl.gate && r === lvl.gate[0] && c === lvl.gate[1])
    return S.gateOpen
      ? { cls: "dc-door-open", icon: "", tip: "Gate (open)" }
      : { cls: "dc-gate", icon: "⊞", tip: "Gate — need the switch" };

  if (lvl.sw && r === lvl.sw[0] && c === lvl.sw[1])
    return S.swHit
      ? { cls: "dc-sw-on", icon: "◈", tip: "Switch (activated)" }
      : { cls: "dc-sw", icon: "◇", tip: "Switch — step on to open gate" };

  return { cls: "dc-floor", icon: "", tip: "" };
}

function renderGrid() {
  const wrap = document.getElementById("demo-grid-inner");
  if (!wrap) return;
  const lvl = S.lvl;

  // Compute cell size: fill 100% of container width
  const containerW = wrap.parentElement.clientWidth || 680;
  const cellSize = Math.max(28, Math.min(44, Math.floor((containerW - 12) / lvl.W)));
  const gridW = cellSize * lvl.W;

  wrap.style.width = gridW + "px";
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = `repeat(${lvl.W}, ${cellSize}px)`;
  wrap.style.gridTemplateRows = `repeat(${lvl.H}, ${cellSize}px)`;
  wrap.style.gap = "0";

  // Label positions for rooms
  const ROOM_LABELS = lvl.W > 16
    ? [{ r: 0, c: 2, txt: "Room 0" }, { r: 0, c: 9, txt: "Room 1" }, { r: 0, c: 17, txt: "Room 2" }]
    : [{ r: 0, c: 2, txt: "Room 0" }, { r: 0, c: 9, txt: "Room 1" }];

  const cells = [];
  for (let r = 0; r < lvl.H; r++) {
    for (let c = 0; c < lvl.W; c++) {
      const { cls, icon, tip } = classifyCell(r, c);
      const div = document.createElement("div");
      div.className = "dc " + cls;
      div.style.width = cellSize + "px";
      div.style.height = cellSize + "px";
      div.style.fontSize = Math.round(cellSize * 0.46) + "px";
      if (tip) div.title = tip;
      if (icon) div.textContent = icon;

      // room label overlay on top wall row
      const lbl = ROOM_LABELS.find(l => l.r === r && l.c === c);
      if (lbl) {
        div.setAttribute("data-label", lbl.txt);
        div.classList.add("dc-has-label");
      }
      cells.push(div);
    }
  }
  wrap.replaceChildren(...cells);
}

function renderHUD() {
  const el = document.getElementById("demo-hud");
  if (!el) return;
  const lvl = S.lvl;
  const bits = [];
  bits.push(`<span class="hb">Steps <strong>${S.steps}</strong></span>`);
  if (lvl.key) bits.push(`<span class="hb ${S.hasKey ? 'hb-ok' : ''}">🔑 ${S.hasKey ? "Held" : "Not held"}</span>`);
  if (lvl.door) bits.push(`<span class="hb ${S.doorOpen ? 'hb-ok' : ''}">🚪 ${S.doorOpen ? "Open" : "Locked"}</span>`);
  if (lvl.sw) bits.push(`<span class="hb ${S.swHit ? 'hb-ok' : ''}">◇ ${S.swHit ? "Switch on" : "Switch off"}</span>`);
  if (lvl.gate) bits.push(`<span class="hb ${S.gateOpen ? 'hb-ok' : ''}">⊞ ${S.gateOpen ? "Gate open" : "Gate closed"}</span>`);
  if (S.won) bits.push(`<span class="hb hb-win">🎉 Solved!</span>`);
  el.innerHTML = bits.join("");
}

function renderLog() {
  const el = document.getElementById("demo-log");
  if (!el) return;
  el.innerHTML = S.log.map(m => `<div class="dl-entry">${m}</div>`).join("") ||
    '<div class="dl-hint">Use WASD / arrow keys, or tap the buttons below.</div>';
}

function renderControls() {
  const el = document.getElementById("demo-ctrl-body");
  if (!el) return;
  el.innerHTML = S.discovered.map((d, i) => `
    <tr>
      <td class="ck">${DIRS[i].label}</td>
      <td class="ca">→</td>
      <td class="cv ${d ? 'cf' : ''}">${d || "?"}</td>
    </tr>`).join("");
}

function updateAutoBtn() {
  const btn = document.getElementById("demo-btn-auto");
  if (!btn) return;
  btn.textContent = S.autoPlaying ? "⏹ Stop" : "🤖 Watch model solve";
  btn.classList.toggle("btn-stop", S.autoPlaying);
}

// ── Init ──────────────────────────────────────────────────
function boot() {
  let currentLvlIdx = 0;

  function reset(idx) {
    currentLvlIdx = idx;
    if (S && S.autoPlaying) stopAuto();
    S = initState(LEVELS[idx]);
    document.querySelectorAll(".demo-lvl-btn").forEach((b, i) =>
      b.classList.toggle("dlb-active", i === idx));
    const desc = document.getElementById("demo-desc");
    if (desc) desc.textContent = LEVELS[idx].desc;
    document.getElementById("demo-grid-inner").focus();
    render();
  }

  // keyboard
  const container = document.getElementById("demo-container");
  if (container) {
    container.addEventListener("keydown", e => {
      const ai = KEY_MAP[e.key];
      if (ai !== undefined) { e.preventDefault(); step(ai); }
    });
    container.setAttribute("tabindex", "0");
  }

  // d-pad buttons
  document.querySelectorAll(".dpad-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const ai = parseInt(btn.dataset.action);
      step(ai);
      container && container.focus();
    });
  });

  document.getElementById("demo-btn-reset")?.addEventListener("click", () => reset(currentLvlIdx));

  document.getElementById("demo-btn-auto")?.addEventListener("click", () => {
    if (S.autoPlaying) stopAuto();
    else autoSolve();
  });

  document.getElementById("demo-btn-reveal")?.addEventListener("click", () => {
    S.discovered = S.perm.map(i => DIRS[i].label);
    addLog("🔎 Controls revealed");
    render();
  });

  document.querySelectorAll(".demo-lvl-btn").forEach((btn, i) => {
    btn.addEventListener("click", () => reset(i));
  });

  // Re-render on window resize (responsive cells)
  window.addEventListener("resize", () => { if (S) renderGrid(); });

  reset(0);
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", boot)
  : boot();

})();
