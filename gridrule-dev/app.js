(function () {
  "use strict";

  const ROWS = 7;
  const COLS = 15;
  const BASELINE_OPTIMAL = 16;
  const BASE_MAP = [
    "###############",
    "####i....G###.#",
    "#?i#.#P########",
    "#@..........GX#",
    "#?####P#####P##",
    "#########..i.i#",
    "###############"
  ];

  const DIRECTIONS = [
    { name: "UP", glyph: "↑", dr: -1, dc: 0 },
    { name: "DOWN", glyph: "↓", dr: 1, dc: 0 },
    { name: "LEFT", glyph: "←", dr: 0, dc: -1 },
    { name: "RIGHT", glyph: "→", dr: 0, dc: 1 },
    { name: "WAIT", glyph: "·", dr: 0, dc: 0 }
  ];

  const BASE_POSITIONS = {
    start: [3, 1],
    exit: [3, 13],
    finalGate: [3, 12],
    shortcutGate: [1, 9],
    trapDestination: [1, 13],
    panels: { top: [2, 1], bottom: [4, 1] },
    portals: {
      safe: [4, 6],
      safeDestination: [5, 9],
      return: [4, 12],
      returnDestination: [3, 9],
      bad: [2, 6]
    },
    items: {
      beta_contaminant: [2, 2],
      proof_a_trap: [1, 4],
      alpha_key: [5, 11],
      proof_b: [5, 13]
    }
  };

  const ITEM_META = {
    alpha_key: { label: "alpha_key", glyph: "α", role: "required" },
    proof_b: { label: "proof_b", glyph: "B", role: "required" },
    beta_contaminant: { label: "beta_contaminant", glyph: "β", role: "harmful" },
    proof_a_trap: { label: "proof_a_trap", glyph: "A", role: "harmful" }
  };
  const REQUIRED_ITEMS = new Set(["alpha_key", "proof_b"]);

  const DIRECTIONS_DATA = {
    "costed-counterexample": {
      name: "Costed counterexample",
      hypothesis: "A policy that reads disconfirming evidence when it is free may still commit to the first plausible rule when the counterexample costs actions.",
      rubric: [
        ["Shortcut attacked", "Stop after a locally coherent claim and act as if the hypothesis audit were complete."],
        ["Tempting wrong action", "Take proof A or enter its shortcut immediately after reading the claim panel."],
        ["Preventing evidence", "A counterexample showing that valid proofs require a return witness."],
        ["Commitment consequence", "Permanent proof contamination; the exact final gate becomes unreachable."],
        ["Primary failure label", "proof_before_counterexample"],
        ["Matched control", "The same counterexample beside the start, with topology and action budget held fixed."],
        ["Expected rescue", "An explicit evidence ledger or an information-value policy that pays the detour before commitment."],
        ["Why this is not just longer", "Only the price of decision-relevant information changes; the safe execution route is identical."],
        ["Critical trace events", "claim_read → proof_a_pickup → counterexample_unread → unwinnable"],
        ["Promotion test", "Naive policy near floor, matched free-evidence control high, oracle solvable, and the critical event traceable." ]
      ]
    },
    "helpful-poison": {
      name: "Helpful poison",
      hypothesis: "Can an agent reject an item that creates genuine short-term progress when it also violates a later exact-set contract?",
      rubric: [
        ["Shortcut attacked", "Treat immediate reachability gain as globally positive credit."],
        ["Tempting wrong action", "Pick up a contaminant that opens a useful bypass."],
        ["Preventing evidence", "The final gate specifies exact-set equality, not an at-least requirement."],
        ["Commitment consequence", "The item helps locally but cannot be dropped before the final gate."],
        ["Primary failure label", "helpful_poison_contamination"],
        ["Matched control", "Replace the exact gate with an at-least gate while preserving the shortcut benefit."],
        ["Expected rescue", "Future-utility credit or explicit reasoning over inhibitory preconditions."],
        ["Why this is not just longer", "The route can become shorter; the hard part is assigning negative long-horizon value to useful progress."],
        ["Critical trace events", "poison_pickup → shortcut_opened → local_progress → final_reject_contaminated"],
        ["Promotion test", "Verify a genuine local benefit, matched gate control, oracle solutions, and distinct progress-versus-utility labels."]
      ]
    },
    "experiment-ledger": {
      name: "Experiment-policy ledger",
      hypothesis: "Can a prompt-level ledger distilled from certified and invalid patch families improve experiment generation on fresh ContractForge targets?",
      rubric: [
        ["Shortcut attacked", "Reuse a cheap decisive edit family even when previous certificates show that it changes causal identity."],
        ["Tempting wrong action", "Choose a one-field witness edit because it separates outcomes faster than the valid two-slot permutation."],
        ["Preventing evidence", "Cross-case records distinguish decisive-but-confounded patches from certified invariant-preserving patches."],
        ["Commitment consequence", "Bad prompt memory biases every fresh experiment toward an invalid family and yields no training credit."],
        ["Primary failure label", "decisive_pair_bad_buffer_transfer"],
        ["Matched control", "Fresh targets with no memory, certificate-only memory, and a decisive-pair bad buffer at matched call and action budgets."],
        ["Expected rescue", "A compact invariant template learned across the minibatch before proposing the next bounded patch."],
        ["Why this is not just longer", "The patch DSL and ten-action certificate stay fixed; only the provenance and content of experiment memory change."],
        ["Critical trace events", "minibatch_ingest → fresh_target → patch_family → validator_status → ledger_update"],
        ["Promotion test", "Increase fresh-target certificate rate without admitting invalid pairs; replicate against both no-memory and bad-buffer controls."]
      ]
    },
    "untrusted-certificate": {
      name: "Untrusted certificate",
      hypothesis: "Can the agent abstain when a record looks decisive but its intervention metadata does not certify what was actually held fixed?",
      rubric: [
        ["Shortcut attacked", "Trust a claimed causal comparison because its outcome pair is clean and high-margin."],
        ["Tempting wrong action", "Adopt the surface rule from a certificate that silently changed code or witness."],
        ["Preventing evidence", "Independent validation of intervention provenance and field-level deltas."],
        ["Commitment consequence", "A poisoned causal rule is installed in the persistent hypothesis ledger."],
        ["Primary failure label", "confounded_certificate_accepted"],
        ["Matched control", "A cryptographically or evaluator-validated record with the same visible outcome pair."],
        ["Expected rescue", "Provenance audit plus abstention when identifying assumptions are not certified."],
        ["Why this is not just longer", "The evidence is already present; the challenge is deciding whether it warrants an update."],
        ["Critical trace events", "certificate_seen → provenance_unchecked → ledger_update → heldout_failure"],
        ["Promotion test", "Accept valid surface swaps, reject code/witness confounds, and preserve the prior under ambiguous metadata."]
      ]
    },
    "shared-budget": {
      name: "Shared experiment budget",
      hypothesis: "When several causal nodes are uncertain, can an agent spend one experiment where it most changes the final commitment?",
      rubric: [
        ["Shortcut attacked", "Audit the most salient uncertainty instead of the one with highest decision value."],
        ["Tempting wrong action", "Spend the sole test on a low-impact OR choice while SEQ or GUARD remains outcome-critical."],
        ["Preventing evidence", "A graph showing which unresolved node gates the largest set of valid commitments."],
        ["Commitment consequence", "The shared test budget is exhausted before the decisive ambiguity is resolved."],
        ["Primary failure label", "experiment_budget_misallocated"],
        ["Matched control", "Give one test per uncertain node while holding the contract fixed."],
        ["Expected rescue", "Expected value of information over the causal graph, with an explicit abstain option."],
        ["Why this is not just longer", "The number of actions can stay fixed; difficulty comes from allocating one informative intervention."],
        ["Critical trace events", "uncertainties_listed → audit_chosen → budget_spent → unresolved_commit"],
        ["Promotion test", "Each node has a matched identifying test, one node is uniquely decision-critical, and random auditing has a measurable floor."]
      ]
    }
  };

  const refs = {};
  const config = {
    clueMode: "false-proof",
    controlMode: "geographic",
    orientation: "fixed",
    budget: 20,
    seed: 17,
    direction: "experiment-ledger"
  };
  let level;
  let game;
  let toastTimer;

  function key(pos) {
    return `${pos[0]},${pos[1]}`;
  }

  function samePos(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }

  function formatPos(pos) {
    return `(${pos[0]},${pos[1]})`;
  }

  function mulberry32(seed) {
    return function () {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffledBindings(seed) {
    const values = [0, 1, 2, 3, 4];
    const random = mulberry32(seed);
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [values[index], values[swap]] = [values[swap], values[index]];
    }
    return values;
  }

  function transformPosition(pos) {
    let [row, col] = pos;
    if (config.orientation === "horizontal" || config.orientation === "both") col = COLS - 1 - col;
    if (config.orientation === "vertical" || config.orientation === "both") row = ROWS - 1 - row;
    return [row, col];
  }

  function transformTree(value) {
    if (Array.isArray(value)) return transformPosition(value);
    const output = {};
    Object.entries(value).forEach(([name, child]) => { output[name] = transformTree(child); });
    return output;
  }

  function buildLevel() {
    const positions = transformTree(BASE_POSITIONS);
    const floors = new Set();
    BASE_MAP.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        if (cell !== "#") floors.add(key(transformPosition([rowIndex, colIndex])));
      });
    });

    const itemAt = new Map();
    Object.entries(positions.items).forEach(([name, pos]) => itemAt.set(key(pos), name));
    const panelAt = new Map([
      [key(positions.panels.top), "top"],
      [key(positions.panels.bottom), "bottom"]
    ]);
    const portalAt = new Map([
      [key(positions.portals.safe), "safe"],
      [key(positions.portals.return), "return"],
      [key(positions.portals.bad), "bad"]
    ]);

    const bindings = config.controlMode === "geographic" ? [0, 1, 2, 3, 4] : shuffledBindings(config.seed);
    return { positions, floors, itemAt, panelAt, portalAt, bindings };
  }

  function clueCopy() {
    const p = level.positions;
    if (config.clueMode === "direct") {
      return {
        top: {
          label: "Lock rule",
          text: `Final gate accepts exactly the two items at ${formatPos(p.items.alpha_key)} and ${formatPos(p.items.proof_b)}. Items at ${formatPos(p.items.beta_contaminant)} or ${formatPos(p.items.proof_a_trap)} contaminate the inventory and cannot be dropped.`
        },
        bottom: {
          label: "Route rule",
          text: `Portal ${formatPos(p.portals.safe)} is the useful portal and returns later via ${formatPos(p.portals.return)}. Portal ${formatPos(p.portals.bad)} is a one-way trap. Gate ${formatPos(p.shortcutGate)} rewards the tempting proof but strands the run.`
        }
      };
    }
    if (config.clueMode === "relational") {
      return {
        top: {
          label: "Lock rule",
          text: "Final gate accepts exactly the two items on the safe remote branch. Every other item is a contaminant and cannot be dropped."
        },
        bottom: {
          label: "Route rule",
          text: "The safe remote branch is reached through the main-corridor portal that lies on the same side of the corridor as the long remote branch. The opposite main-corridor portal is a trap. The remote branch contains the return portal."
        }
      };
    }
    return {
      top: {
        label: "Claim rule",
        text: `A proof on a branch can certify the final gate. The visible shortcut branch proof at ${formatPos(p.items.proof_a_trap)} appears to satisfy this rule.`
      },
      bottom: {
        label: "Counterexample rule",
        text: `A branch proof is valid only if its branch has a return witness. The shortcut branch has no return witness and strands the run. The safe branch starts through portal ${formatPos(p.portals.safe)}, contains the ordinary branch item at ${formatPos(p.items.alpha_key)} and the valid proof at ${formatPos(p.items.proof_b)}, and returns through portal ${formatPos(p.portals.return)}. Portal ${formatPos(p.portals.bad)} is a one-way trap.`
      }
    };
  }

  function initialGame() {
    return {
      position: [...level.positions.start],
      inventory: new Set(),
      evidence: new Set(),
      discovered: new Map(),
      traces: new Set(),
      steps: 0,
      won: false,
      failed: false,
      exhausted: false,
      events: [],
      status: "Episode active"
    };
  }

  function record(text, tone) {
    game.events.push({ step: game.steps, text, tone: tone || "neutral" });
    if (game.events.length > 40) game.events.shift();
  }

  function resetGame(message) {
    level = buildLevel();
    game = initialGame();
    record(message || "Episode reset. Pickups are permanent; the final gate requires exactly two items.");
    updateHash();
    render();
  }

  function exactInventory(inventory) {
    return inventory.size === REQUIRED_ITEMS.size && [...REQUIRED_ITEMS].every((item) => inventory.has(item));
  }

  function cloneNode(source) {
    return {
      position: [...source.position],
      inventory: new Set(source.inventory),
      won: Boolean(source.won),
      failed: Boolean(source.failed)
    };
  }

  function transitionCore(source, directionIndex) {
    const node = cloneNode(source);
    const direction = DIRECTIONS[directionIndex];
    const result = {
      node,
      directionIndex,
      moved: false,
      waited: false,
      blocked: null,
      pickup: null,
      panel: null,
      portal: null,
      gateOpened: false,
      touched: []
    };

    if (directionIndex === 4) {
      result.waited = true;
      return result;
    }

    const candidate = [node.position[0] + direction.dr, node.position[1] + direction.dc];
    if (!level.floors.has(key(candidate))) {
      result.blocked = "wall";
      return result;
    }

    if (samePos(candidate, level.positions.finalGate)) {
      if (!exactInventory(node.inventory)) {
        result.blocked = [...node.inventory].some((item) => ITEM_META[item].role === "harmful") ? "final_contaminated" : "final_missing";
        return result;
      }
      result.gateOpened = true;
    }

    if (samePos(candidate, level.positions.shortcutGate)) {
      if (!node.inventory.has("proof_a_trap")) {
        result.blocked = "shortcut_locked";
        return result;
      }
      node.position = candidate;
      node.failed = true;
      result.moved = true;
      result.blocked = "shortcut_trap";
      result.touched.push(candidate);
      return result;
    }

    node.position = candidate;
    result.moved = true;
    result.touched.push(candidate);

    const portal = level.portalAt.get(key(candidate));
    if (portal === "safe") {
      result.portal = "safe";
      node.position = [...level.positions.portals.safeDestination];
      result.touched.push(node.position);
    } else if (portal === "return") {
      result.portal = "return";
      node.position = [...level.positions.portals.returnDestination];
      result.touched.push(node.position);
    } else if (portal === "bad") {
      result.portal = "bad";
      node.position = [...level.positions.trapDestination];
      node.failed = true;
      result.touched.push(node.position);
      return result;
    }

    const item = level.itemAt.get(key(node.position));
    if (item && !node.inventory.has(item)) {
      node.inventory.add(item);
      result.pickup = item;
    }

    result.panel = level.panelAt.get(key(node.position)) || null;
    if (samePos(node.position, level.positions.exit)) node.won = true;
    return result;
  }

  function addTrace(label) {
    game.traces.add(label);
  }

  function takeAction(actionIndex) {
    if (game.won || game.failed || game.exhausted) return;
    const directionIndex = level.bindings[actionIndex];
    const result = transitionCore(game, directionIndex);
    game.steps += 1;
    game.position = result.node.position;
    game.inventory = result.node.inventory;
    game.won = result.node.won;
    game.failed = result.node.failed;

    if (config.controlMode === "hidden" && (result.moved || result.waited)) {
      game.discovered.set(actionIndex, directionIndex);
    }

    if (result.waited) {
      game.status = "Waited; one action spent";
      record("Waited in place. The action budget still moved.");
    } else if (result.blocked === "wall") {
      game.status = "Wall; action spent";
      record("Bumped a wall. The attempt still costs one action.");
    } else if (result.blocked === "final_missing") {
      game.status = "Final gate rejected: items missing";
      addTrace("final_reject_missing");
      record("Final gate rejected the inventory: a required item is missing.", "harmful");
    } else if (result.blocked === "final_contaminated") {
      game.status = "Final gate rejected: contaminated";
      addTrace("final_reject_contaminated");
      record("Final gate rejected the inventory: exact-set equality was violated.", "harmful");
    } else if (result.blocked === "shortcut_locked") {
      game.status = "Shortcut gate locked";
      record("Shortcut gate is locked without its nearby proof.");
    } else if (result.blocked === "shortcut_trap") {
      game.status = "Wrong proof opened a terminal shortcut";
      addTrace("wrong_proof_trap");
      record("The proof opened the tempting shortcut—and the branch stranded the run.", "harmful");
    } else {
      game.status = `Moved ${DIRECTIONS[directionIndex].name.toLowerCase()}`;
    }

    if (result.gateOpened) {
      game.status = "Exact inventory accepted";
      record("The final gate accepted exactly {alpha_key, proof_b}.", "good");
    }

    if (result.portal) {
      if (!game.evidence.has("bottom")) addTrace("portal_before_route_clue");
      if (game.evidence.size < 2) addTrace("commit_before_full_evidence");
      if (result.portal === "bad") {
        game.status = "One-way portal trap";
        addTrace("bad_portal");
        record("The portal jumped to a terminal trap cell.", "harmful");
      } else if (result.portal === "safe") {
        game.status = "Entered the remote branch";
        record("Portal jump: entered the long remote branch.", "good");
      } else {
        game.status = "Returned to the main corridor";
        record("Return portal restored access to the final corridor.", "good");
      }
    }

    if (result.pickup) {
      const item = result.pickup;
      if (game.evidence.size < 2) addTrace("commit_before_full_evidence");
      if (item === "proof_a_trap") {
        addTrace("invalid_proof_pickup");
        if (!game.evidence.has("bottom")) addTrace("proof_before_counterexample");
      }
      if (item === "beta_contaminant") addTrace("contaminant_pickup");
      const role = ITEM_META[item].role;
      game.status = "Item collected permanently";
      record(`Picked up the item at ${formatPos(game.position)}. It cannot be dropped.`, `semantic-${role}`);
    }

    if (result.panel) {
      const wasNew = !game.evidence.has(result.panel);
      game.evidence.add(result.panel);
      const fact = clueCopy()[result.panel];
      game.status = wasNew ? `${fact.label} recorded` : `${fact.label} reread`;
      record(`${wasNew ? "Recorded" : "Reread"} the ${fact.label.toLowerCase()} panel.`, wasNew ? "good" : "neutral");
      if (game.evidence.size === 2) addTrace("evidence_complete");
    }

    if (game.won) {
      game.status = "Exit reached";
      addTrace("solved");
      record("Exit reached. Episode solved.", "good");
    }

    if (!game.won && !game.failed && config.budget > 0 && game.steps >= config.budget) {
      game.exhausted = true;
      game.status = "Action budget exhausted";
      addTrace("budget_exhausted");
      record("Action budget exhausted before the exit.", "harmful");
    }

    render();
  }

  function nodeKey(node) {
    return `${key(node.position)}|${[...node.inventory].sort().join("+")}`;
  }

  function solveFromCurrent() {
    if (game.failed) return null;
    if (game.won) return { distance: 0, path: [] };
    const start = cloneNode(game);
    const queue = [{ node: start, distance: 0, path: [] }];
    const visited = new Set([nodeKey(start)]);
    let cursor = 0;

    while (cursor < queue.length) {
      const current = queue[cursor++];
      for (let directionIndex = 0; directionIndex < 4; directionIndex += 1) {
        const result = transitionCore(current.node, directionIndex);
        if (!result.moved || result.node.failed) continue;
        const nextPath = current.path.concat(result.touched.map((pos) => [...pos]));
        if (result.node.won) return { distance: current.distance + 1, path: nextPath };
        const signature = nodeKey(result.node);
        if (visited.has(signature)) continue;
        visited.add(signature);
        queue.push({ node: result.node, distance: current.distance + 1, path: nextPath });
      }
    }
    return null;
  }

  function cellDescriptor(pos, overlay, solutionPath) {
    const signature = key(pos);
    const classes = ["cell"];
    let glyph = "";
    let label = "floor";

    if (!level.floors.has(signature)) {
      classes.push("wall");
      label = "wall";
    } else if (level.panelAt.has(signature)) {
      classes.push("panel");
      glyph = "?";
      label = `${level.panelAt.get(signature)} evidence panel`;
    } else if (level.itemAt.has(signature) && !game.inventory.has(level.itemAt.get(signature))) {
      const item = level.itemAt.get(signature);
      classes.push("item");
      glyph = overlay ? ITEM_META[item].glyph : "◆";
      label = overlay ? ITEM_META[item].label : "unknown item";
      if (overlay) classes.push(`semantic-${ITEM_META[item].role}`);
    } else if (level.portalAt.has(signature)) {
      const portal = level.portalAt.get(signature);
      classes.push("portal");
      glyph = overlay ? (portal === "bad" ? "!" : portal === "safe" ? "S" : "↩") : "◇";
      label = overlay ? `${portal} portal` : "portal";
      if (overlay) classes.push(portal === "bad" ? "semantic-bad" : "semantic-safe");
    } else if (samePos(pos, level.positions.finalGate)) {
      classes.push("gate");
      glyph = overlay ? "=" : "▥";
      label = overlay ? "exact final gate" : "gate";
    } else if (samePos(pos, level.positions.shortcutGate)) {
      classes.push("gate");
      glyph = overlay ? "!" : "▥";
      label = overlay ? "terminal shortcut gate" : "gate";
      if (overlay) classes.push("semantic-bad");
    } else if (samePos(pos, level.positions.exit)) {
      classes.push("exit");
      glyph = "★";
      label = "exit";
    }

    if (solutionPath.has(signature) && level.floors.has(signature)) classes.push("oracle-path");
    if (samePos(pos, game.position)) {
      classes.push("agent");
      glyph = "●";
      label = `agent on ${label}`;
    }
    return { classes, glyph, label };
  }

  function renderBoard(solution) {
    const overlay = refs.overlay.checked;
    const solutionPath = new Set(overlay && solution ? solution.path.map(key) : []);
    const fragment = document.createDocumentFragment();
    const textRows = [];
    for (let row = 0; row < ROWS; row += 1) {
      let textRow = "";
      for (let col = 0; col < COLS; col += 1) {
        const pos = [row, col];
        const cell = document.createElement("span");
        const descriptor = cellDescriptor(pos, overlay, solutionPath);
        cell.className = descriptor.classes.join(" ");
        cell.textContent = descriptor.glyph;
        cell.setAttribute("aria-hidden", "true");
        cell.title = overlay ? `${formatPos(pos)} · ${descriptor.label}` : "";
        fragment.appendChild(cell);

        const signature = key(pos);
        if (samePos(pos, game.position)) textRow += "@";
        else if (!level.floors.has(signature)) textRow += "#";
        else if (level.panelAt.has(signature)) textRow += "?";
        else if (level.itemAt.has(signature) && !game.inventory.has(level.itemAt.get(signature))) textRow += "i";
        else if (level.portalAt.has(signature)) textRow += "P";
        else if (samePos(pos, level.positions.finalGate) || samePos(pos, level.positions.shortcutGate)) textRow += "G";
        else if (samePos(pos, level.positions.exit)) textRow += "X";
        else textRow += ".";
      }
      textRows.push(`Row ${row}: ${textRow}`);
    }
    refs.board.replaceChildren(fragment);
    refs.board.setAttribute("aria-label", `FrontierGrid board. Agent at ${formatPos(game.position)}. ${game.status}. ${game.inventory.size} items held and ${game.evidence.size} of 2 facts read.`);
    const semanticSummary = overlay
      ? ` Overlay roles: required alpha key ${formatPos(level.positions.items.alpha_key)}, required proof B ${formatPos(level.positions.items.proof_b)}, contaminants ${formatPos(level.positions.items.beta_contaminant)} and ${formatPos(level.positions.items.proof_a_trap)}, safe portal ${formatPos(level.positions.portals.safe)}, return portal ${formatPos(level.positions.portals.return)}, bad portal ${formatPos(level.positions.portals.bad)}.`
      : "";
    const oracleSummary = overlay && solution
      ? ` Oracle path cells: ${solution.path.map(formatPos).join(", ") || "already at the exit"}.`
      : "";
    refs.boardText.textContent = `Text grid. ${textRows.join(". ")}. Symbols: # wall, dot floor, @ agent, ? evidence panel, i unknown item, P portal, G gate, X exit.${semanticSummary}${oracleSummary}`;
  }

  function renderBindings() {
    const focusedAction = document.activeElement && document.activeElement.classList.contains("action-button")
      ? document.activeElement.dataset.action
      : null;
    const fragment = document.createDocumentFragment();
    level.bindings.forEach((directionIndex, actionIndex) => {
      const chip = document.createElement("span");
      chip.className = "binding-chip";
      const known = config.controlMode !== "hidden" || game.discovered.has(actionIndex);
      if (!known) chip.classList.add("unknown");
      const actionName = config.controlMode === "geographic" ? DIRECTIONS[actionIndex].glyph : `A${actionIndex + 1}`;
      const directionName = known ? `${DIRECTIONS[directionIndex].glyph} ${DIRECTIONS[directionIndex].name}` : "?";
      chip.innerHTML = `<strong>${actionName}</strong> → ${directionName}`;
      fragment.appendChild(chip);
    });
    refs.bindingPanel.replaceChildren(fragment);

    const actions = document.createDocumentFragment();
    level.bindings.forEach((directionIndex, actionIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "action-button";
      button.dataset.action = String(actionIndex);
      button.disabled = game.won || game.failed || game.exhausted;
      if (config.controlMode === "geographic") {
        button.innerHTML = `<b>${DIRECTIONS[actionIndex].glyph}</b>${DIRECTIONS[actionIndex].name}`;
        button.setAttribute("aria-label", DIRECTIONS[actionIndex].name);
      } else {
        button.innerHTML = `<b>A${actionIndex + 1}</b>key ${actionIndex + 1}`;
        const known = config.controlMode === "visible" || game.discovered.has(actionIndex);
        button.setAttribute("aria-label", known ? `Action A${actionIndex + 1}, ${DIRECTIONS[directionIndex].name}` : `Unknown action A${actionIndex + 1}`);
      }
      button.addEventListener("click", () => takeAction(actionIndex));
      actions.appendChild(button);
    });
    refs.actions.replaceChildren(actions);
    if (focusedAction !== null) {
      const replacement = refs.actions.querySelector(`[data-action="${focusedAction}"]`);
      if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
    }
    refs.keyboardHint.textContent = config.controlMode === "geographic"
      ? "Keyboard: arrows or W/A/S/D to move · Space to wait"
      : "Keyboard: 1–5 issue A1–A5 · successful movement reveals hidden bindings";
  }

  function renderInventory() {
    if (game.inventory.size === 0) {
      refs.inventory.innerHTML = '<span class="empty-state">Nothing collected</span>';
      refs.inventoryValidity.className = "validity neutral";
      refs.inventoryValidity.textContent = "empty";
      return;
    }
    const overlay = refs.overlay.checked;
    const fragment = document.createDocumentFragment();
    [...game.inventory].forEach((item) => {
      const chip = document.createElement("span");
      chip.className = `inventory-chip ${ITEM_META[item].role}`;
      chip.textContent = overlay ? ITEM_META[item].label : `item @ ${formatPos(level.positions.items[item])}`;
      fragment.appendChild(chip);
    });
    refs.inventory.replaceChildren(fragment);

    if (!overlay) {
      refs.inventoryValidity.className = "validity neutral";
      refs.inventoryValidity.textContent = `${game.inventory.size} held`;
      return;
    }

    const harmful = [...game.inventory].some((item) => ITEM_META[item].role === "harmful");
    if (exactInventory(game.inventory)) {
      refs.inventoryValidity.className = "validity good";
      refs.inventoryValidity.textContent = "gate-valid";
    } else if (harmful) {
      refs.inventoryValidity.className = "validity bad";
      refs.inventoryValidity.textContent = "contaminated";
    } else {
      refs.inventoryValidity.className = "validity neutral";
      refs.inventoryValidity.textContent = `${2 - game.inventory.size} missing`;
    }
  }

  function renderEvidence() {
    const facts = clueCopy();
    refs.evidenceCount.textContent = `${game.evidence.size} / 2 facts`;
    if (game.evidence.size === 0) {
      refs.evidenceList.innerHTML = '<li class="empty-state">Step on a ? panel to record a fact.</li>';
      return;
    }
    const fragment = document.createDocumentFragment();
    ["top", "bottom"].forEach((panel) => {
      if (!game.evidence.has(panel)) return;
      const item = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = facts[panel].label;
      item.append(label, document.createTextNode(facts[panel].text));
      fragment.appendChild(item);
    });
    refs.evidenceList.replaceChildren(fragment);
  }

  function renderDiagnostics(solution) {
    const overlay = refs.overlay.checked;
    refs.diagnostics.hidden = !overlay;
    document.body.classList.toggle("overlay-on", overlay);
    if (!overlay) return;

    const structural = Boolean(solution);
    refs.diagSolvable.textContent = structural ? "yes" : "no";
    refs.diagSolvable.className = structural ? "diag-good" : "diag-bad";
    refs.diagOptimal.textContent = structural ? `${solution.distance} action${solution.distance === 1 ? "" : "s"}` : "unreachable";
    if (config.budget === 0) {
      refs.diagBudget.textContent = structural ? "unlimited" : "no";
      refs.diagBudget.className = structural ? "diag-good" : "diag-bad";
    } else {
      const remaining = Math.max(0, config.budget - game.steps);
      const within = structural && solution.distance <= remaining && !game.exhausted;
      refs.diagBudget.textContent = within ? `yes · ${remaining} left` : `no · ${remaining} left`;
      refs.diagBudget.className = within ? "diag-good" : "diag-bad";
    }
    refs.diagRhae.textContent = game.won ? Math.pow(BASELINE_OPTIMAL / game.steps, 2).toFixed(3) : "scored on win";

    if (game.traces.size === 0) {
      refs.traceLabels.innerHTML = "<i>none yet</i>";
    } else {
      const fragment = document.createDocumentFragment();
      [...game.traces].forEach((trace) => {
        const chip = document.createElement("b");
        chip.textContent = trace;
        if (/trap|contamin|reject|before|exhaust/.test(trace)) chip.classList.add("harmful");
        fragment.appendChild(chip);
      });
      refs.traceLabels.replaceChildren(fragment);
    }
  }

  function renderLog() {
    const fragment = document.createDocumentFragment();
    [...game.events].reverse().forEach((event) => {
      const item = document.createElement("li");
      if (event.tone.startsWith("semantic-")) {
        if (refs.overlay.checked) item.classList.add(event.tone.replace("semantic-", ""));
      } else if (event.tone !== "neutral") {
        item.classList.add(event.tone);
      }
      const step = document.createElement("span");
      step.textContent = String(event.step).padStart(2, "0");
      item.append(step, document.createTextNode(event.text));
      fragment.appendChild(item);
    });
    refs.eventLog.replaceChildren(fragment);
  }

  function renderStatus() {
    refs.episodeStatus.textContent = game.status;
    refs.actionCount.textContent = game.steps;
    refs.budgetLabel.textContent = config.budget === 0 ? " actions · unlimited" : ` / ${config.budget} actions`;
    refs.statusDot.className = "status-dot";
    if (game.won) refs.statusDot.classList.add("success");
    else if (game.failed) refs.statusDot.classList.add("danger");
    else if (game.exhausted) refs.statusDot.classList.add("paused");
  }

  function renderPrompt() {
    const prompts = {
      "false-proof": "Resist the visible shortcut proof until you have checked its counterexample.",
      relational: "Infer which same-side portal reaches the long remote branch.",
      direct: "Use the explicit coordinates without collecting either contaminant."
    };
    refs.episodePrompt.innerHTML = `<span>Current challenge</span> ${prompts[config.clueMode]}`;
  }

  function render() {
    const solution = refs.overlay && refs.overlay.checked ? solveFromCurrent() : null;
    renderStatus();
    renderPrompt();
    renderBoard(solution);
    renderBindings();
    renderInventory();
    renderEvidence();
    renderDiagnostics(solution);
    renderLog();
  }

  function renderDirection(directionId) {
    const validDirection = Object.hasOwn(DIRECTIONS_DATA, directionId) ? directionId : "experiment-ledger";
    const data = DIRECTIONS_DATA[validDirection];
    config.direction = validDirection;
    refs.directionName.textContent = data.name;
    refs.directionHypothesis.textContent = data.hypothesis;
    const fragment = document.createDocumentFragment();
    data.rubric.forEach(([term, definition]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = definition;
      row.append(dt, dd);
      fragment.appendChild(row);
    });
    refs.directionRubric.replaceChildren(fragment);
    refs.gateChecks.innerHTML = ["oracle-solvable", "matched control", "one new mechanism", "traceable critical event", "naive floor specified"]
      .map((check) => `<span class="gate-check">${check}</span>`).join("");
    document.querySelectorAll(".seed").forEach((button) => {
      const selected = button.dataset.direction === config.direction;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateHash();
  }

  function directionMarkdown() {
    const data = DIRECTIONS_DATA[config.direction];
    const lines = [`# ${data.name}`, "", `**Status:** design direction — not in current generator`, "", `**Hypothesis:** ${data.hypothesis}`, ""];
    data.rubric.forEach(([term, definition]) => lines.push(`- **${term}:** ${definition}`));
    lines.push("", "Gate checks: oracle-solvable; matched control; one new mechanism; traceable critical event; naive floor specified.");
    return lines.join("\n");
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    showToast(successMessage);
  }

  function showToast(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 1800);
  }

  function updateHash() {
    if (!window.history || !window.location) return;
    const params = new URLSearchParams({
      clue: config.clueMode,
      controls: config.controlMode,
      orientation: config.orientation,
      budget: String(config.budget),
      seed: String(config.seed),
      direction: config.direction
    });
    history.replaceState(null, "", `${location.pathname}${location.search}#${params.toString()}`);
  }

  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const allowed = {
      clue: ["direct", "relational", "false-proof"],
      controls: ["geographic", "visible", "hidden"],
      orientation: ["fixed", "horizontal", "vertical", "both"],
      budget: ["0", "20", "24"]
    };
    if (allowed.clue.includes(params.get("clue"))) config.clueMode = params.get("clue");
    if (allowed.controls.includes(params.get("controls"))) config.controlMode = params.get("controls");
    if (allowed.orientation.includes(params.get("orientation"))) config.orientation = params.get("orientation");
    if (allowed.budget.includes(params.get("budget"))) config.budget = Number(params.get("budget"));
    const seed = Number(params.get("seed"));
    if (Number.isInteger(seed) && seed >= 0 && seed < 1000000) config.seed = seed;
    const direction = params.get("direction");
    if (Object.hasOwn(DIRECTIONS_DATA, direction)) config.direction = direction;
  }

  function applyConfigToControls() {
    refs.clueMode.value = config.clueMode;
    refs.controlMode.value = config.controlMode;
    refs.orientation.value = config.orientation;
    refs.budget.value = String(config.budget);
  }

  function bindEvents() {
    refs.clueMode.addEventListener("change", () => {
      config.clueMode = refs.clueMode.value;
      resetGame("Evidence regime changed; episode reset so facts cannot leak across treatments.");
    });
    refs.controlMode.addEventListener("change", () => {
      config.controlMode = refs.controlMode.value;
      resetGame("Action binding changed; episode reset.");
    });
    refs.orientation.addEventListener("change", () => {
      config.orientation = refs.orientation.value;
      resetGame("Orientation changed; all coordinates and mechanics were transformed together.");
    });
    refs.budget.addEventListener("change", () => {
      config.budget = Number(refs.budget.value);
      resetGame("Action budget changed; episode reset.");
    });
    refs.reset.addEventListener("click", () => resetGame());
    refs.remix.addEventListener("click", () => {
      config.seed = (config.seed + 1) % 1000000;
      resetGame("Bindings remixed from a new deterministic seed.");
      showToast(config.controlMode === "geographic" ? "Seed changed; choose shuffled controls to see it" : "Action bindings remixed");
    });
    refs.overlay.addEventListener("change", render);
    refs.clearLog.addEventListener("click", () => {
      game.events = [];
      record("Trace view cleared; episode state is unchanged.");
      renderLog();
    });
    document.querySelectorAll(".seed").forEach((button) => {
      button.addEventListener("click", () => renderDirection(button.dataset.direction));
    });
    refs.randomDirection.addEventListener("click", () => {
      const ids = Object.keys(DIRECTIONS_DATA).filter((id) => id !== config.direction);
      const random = mulberry32(Date.now() % 1000000);
      renderDirection(ids[Math.floor(random() * ids.length)]);
    });
    refs.copyDirection.addEventListener("click", () => copyText(directionMarkdown(), "Direction card copied as Markdown"));

    refs.scratchpad.addEventListener("input", () => {
      try {
        localStorage.setItem("gridrule-dev-scratchpad-v1", refs.scratchpad.value);
        refs.saveStatus.textContent = "Saved in this browser";
      } catch (error) {
        refs.saveStatus.textContent = "Browser storage unavailable";
      }
    });
    refs.clearNotes.addEventListener("click", () => {
      refs.scratchpad.value = "";
      try { localStorage.removeItem("gridrule-dev-scratchpad-v1"); } catch (error) { /* storage can be disabled */ }
      refs.saveStatus.textContent = "Local notes cleared";
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      if (target.matches("input, select, textarea") || (target.matches("button") && event.key === " ")) return;
      if (game.won || game.failed || game.exhausted) return;
      if (config.controlMode === "geographic") {
        const map = {
          ArrowUp: 0, w: 0, W: 0,
          ArrowDown: 1, s: 1, S: 1,
          ArrowLeft: 2, a: 2, A: 2,
          ArrowRight: 3, d: 3, D: 3,
          " ": 4
        };
        if (event.key in map) {
          event.preventDefault();
          takeAction(map[event.key]);
        }
      } else if (/^[1-5]$/.test(event.key)) {
        event.preventDefault();
        takeAction(Number(event.key) - 1);
      }
    });
  }

  function collectRefs() {
    [
      "clue-mode", "control-mode", "orientation", "budget", "reset", "remix",
      "episode-prompt", "board", "board-text", "status-dot", "episode-status", "action-count", "budget-label",
      "binding-panel", "actions", "keyboard-hint", "inventory", "inventory-validity",
      "evidence-count", "evidence-list", "overlay", "diagnostics", "diag-solvable",
      "diag-optimal", "diag-budget", "diag-rhae", "trace-labels", "clear-log", "event-log",
      "direction-name", "direction-hypothesis", "direction-rubric", "gate-checks",
      "random-direction", "copy-direction", "scratchpad", "save-status", "clear-notes", "toast"
    ].forEach((id) => { refs[id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = document.getElementById(id); });
  }

  function runSelfTest() {
    config.clueMode = "false-proof";
    config.controlMode = "geographic";
    config.orientation = "fixed";
    config.budget = 20;
    level = buildLevel();

    function follow(start, directions) {
      let node = cloneNode(start);
      directions.forEach((directionIndex) => {
        const result = transitionCore(node, directionIndex);
        node = result.node;
      });
      return node;
    }

    const start = initialGame();
    const canonical = [3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 2, 0, 3, 3, 3, 3];
    const solved = follow(start, canonical);
    if (!solved.won || solved.failed || !exactInventory(solved.inventory)) {
      throw new Error("Canonical 16-action route did not solve with the exact inventory.");
    }

    const badPortal = follow(start, [3, 3, 3, 3, 3, 0]);
    if (!badPortal.failed || !samePos(badPortal.position, level.positions.trapDestination)) {
      throw new Error("Bad portal did not terminate at the trap destination.");
    }

    const contaminated = cloneNode(start);
    contaminated.position = [3, 11];
    contaminated.inventory = new Set(["alpha_key", "proof_b", "beta_contaminant"]);
    const rejected = transitionCore(contaminated, 3);
    if (rejected.blocked !== "final_contaminated" || rejected.gateOpened) {
      throw new Error("Exact gate accepted a strict superset of the required inventory.");
    }

    const valid = cloneNode(start);
    valid.position = [3, 11];
    valid.inventory = new Set(["alpha_key", "proof_b"]);
    const opened = transitionCore(valid, 3);
    const exited = transitionCore(opened.node, 3);
    if (!opened.gateOpened || !exited.node.won) {
      throw new Error("Valid exact inventory did not open the gate and reach the exit.");
    }

    const backedOut = transitionCore(opened.node, 2).node;
    backedOut.inventory.add("beta_contaminant");
    const reentry = transitionCore(backedOut, 3);
    if (reentry.blocked !== "final_contaminated") {
      throw new Error("Final gate was not rechecked after a valid traversal and later contamination.");
    }

    const evidence = clueCopy();
    if (!evidence.top.text.includes("appears") || !evidence.bottom.text.includes("return witness")) {
      throw new Error("False-proof claim/counterexample treatment is incomplete.");
    }

    const orientationDistances = {};
    ["fixed", "horizontal", "vertical", "both"].forEach((orientation) => {
      config.orientation = orientation;
      level = buildLevel();
      game = initialGame();
      const solution = solveFromCurrent();
      orientationDistances[orientation] = solution && solution.distance;
      if (!solution || solution.distance !== BASELINE_OPTIMAL) {
        throw new Error(`Orientation ${orientation} lost the 16-action oracle route.`);
      }
    });

    config.orientation = "both";
    config.clueMode = "direct";
    level = buildLevel();
    const mirroredDirect = clueCopy().top.text;
    if (!mirroredDirect.includes("(1,3)") || !mirroredDirect.includes("(4,12)")) {
      throw new Error("Mirrored direct clues did not transform item coordinates.");
    }

    return {
      canonicalActions: canonical.length,
      canonicalInventory: [...solved.inventory].sort(),
      badPortalTerminal: badPortal.failed,
      strictSupersetRejected: rejected.blocked,
      exactSetAccepted: opened.gateOpened,
      postTraversalRecheck: reentry.blocked,
      orientationDistances,
      mirroredCoordinatesUpdated: true
    };
  }

  function init() {
    collectRefs();
    readHash();
    applyConfigToControls();
    bindEvents();
    try {
      refs.scratchpad.value = localStorage.getItem("gridrule-dev-scratchpad-v1") || "";
      if (refs.scratchpad.value) refs.saveStatus.textContent = "Loaded from this browser";
    } catch (error) {
      refs.saveStatus.textContent = "Browser storage unavailable";
    }
    level = buildLevel();
    game = initialGame();
    record("Episode ready. Read both panels before making an irreversible commitment.");
    renderDirection(config.direction);
    render();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { runSelfTest };
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
}());
