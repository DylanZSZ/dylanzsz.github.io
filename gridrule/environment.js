(function () {
  "use strict";

  const REQUIRED = ["alpha_key", "proof_b"];
  const CONTAMINANTS = ["beta_contaminant", "proof_a_trap"];

  const MODES = {
    direct: {
      label: "Direct",
      instruction: "The direct panels name both the requirement and the route.",
      evidence: [
        {
          id: "manifest",
          title: "Gate manifest",
          preview: "A plain-language inventory specification.",
          fact: "The gate requires alpha_key and proof_b, with no extra item.",
          tag: "explicit requirement"
        },
        {
          id: "route",
          title: "Route placard",
          preview: "A plain-language portal specification.",
          fact: "North access is the safe portal; the shortcut transit is a trap.",
          tag: "explicit route"
        }
      ],
      itemHints: {
        alpha_key: "Required key",
        proof_b: "Required proof",
        beta_contaminant: "Permanent contaminant",
        proof_a_trap: "Invalid proof; permanent"
      },
      portals: [
        { id: "safe", title: "North access", hint: "Marked: final-gate route", safe: true, tag: "safe branch" },
        { id: "bad", title: "Shortcut transit", hint: "Marked: one-way trap", safe: false, tag: "bad portal" }
      ]
    },
    relational: {
      label: "Relational",
      instruction: "No panel names the answer alone; join the two relations.",
      evidence: [
        {
          id: "registry",
          title: "Route registry",
          preview: "A relation between marks, proofs, and portals.",
          fact: "The admissible proof shares the cobalt mark of the safe portal.",
          tag: "relational clue 1"
        },
        {
          id: "specimen",
          title: "Proof specimen",
          preview: "A lookup needed to resolve the first relation.",
          fact: "proof_b is cobalt; proof_a is amber. Therefore the cobalt arch is safe.",
          tag: "relational clue 2"
        }
      ],
      itemHints: {
        alpha_key: "Key with alpha notch",
        proof_b: "Proof with cobalt seal",
        beta_contaminant: "Object with beta notch",
        proof_a_trap: "Proof with amber seal"
      },
      portals: [
        { id: "safe", title: "Cobalt arch", hint: "Shares a mark with one proof", safe: true, tag: "resolved relation" },
        { id: "bad", title: "Amber arch", hint: "Shares a mark with one proof", safe: false, tag: "unresolved shortcut" }
      ]
    },
    "false-proof": {
      label: "False-proof",
      instruction: "A tempting claim is useful only if you skip the counterexample.",
      evidence: [
        {
          id: "claim",
          title: "Tempting claim",
          preview: "“Proof A is valid; take the claim shortcut.”",
          fact: "The claim endorses proof_a and its shortcut, but has not survived a counterexample.",
          tag: "plausible claim"
        },
        {
          id: "counterexample",
          title: "Counterexample panel",
          preview: "A test of the tempting claim.",
          fact: "The counterexample invalidates proof_a; proof_b and review transit preserve the route.",
          tag: "disconfirming evidence"
        }
      ],
      itemHints: {
        alpha_key: "Required access key",
        proof_b: "Survives the counterexample",
        beta_contaminant: "Permanent shortcut residue",
        proof_a_trap: "Endorsed by the untested claim"
      },
      portals: [
        { id: "bad", title: "Claim shortcut", hint: "Fast, tempting, and one-way", safe: false, tag: "premature commitment" },
        { id: "safe", title: "Review transit", hint: "Route supported by counterexample", safe: true, tag: "evidence-backed branch" }
      ]
    }
  };

  const ITEMS = [
    { id: "alpha_key", title: "alpha_key", contaminant: false, tag: "required item" },
    { id: "proof_b", title: "proof_b", contaminant: false, tag: "valid proof" },
    { id: "beta_contaminant", title: "beta_contaminant", contaminant: true, tag: "permanent contaminant" },
    { id: "proof_a_trap", title: "proof_a_trap", contaminant: true, tag: "wrong-proof trap" }
  ];

  let currentMode = "direct";
  let labState = freshState();

  function freshState() {
    return {
      read: [],
      inventory: [],
      portal: null,
      phase: "exploring",
      traces: new Set(),
      message: "Read the evidence panels before committing.",
      messageType: ""
    };
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setPressed(buttons, activeButton) {
    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button === activeButton));
    });
  }

  function makeTag(text) {
    const tag = document.createElement("span");
    tag.className = "research-tag";
    tag.textContent = text;
    return tag;
  }

  function makeChoice(config, kind) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.dataset.kind = kind;
    button.dataset.id = config.id;
    if (config.contaminant || config.safe === false) button.classList.add("danger-choice");

    const title = document.createElement("strong");
    title.textContent = config.title;
    const detail = document.createElement("small");
    detail.textContent = config.preview || config.hint;
    button.append(title, detail, makeTag(config.tag));
    return button;
  }

  function setupDesignTabs() {
    const tabs = Array.from(document.querySelectorAll("[role='tab'][data-tab]"));
    const panels = Array.from(document.querySelectorAll("[role='tabpanel'][data-panel]"));

    function activate(tab, moveFocus) {
      tabs.forEach(function (candidate) {
        const selected = candidate === tab;
        candidate.setAttribute("aria-selected", String(selected));
        candidate.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.panel !== tab.dataset.tab;
      });
      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { activate(tab, false); });
      tab.addEventListener("keydown", function (event) {
        let nextIndex = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;
        if (nextIndex !== null) {
          event.preventDefault();
          activate(tabs[nextIndex], true);
        }
      });
    });
  }

  function renderLabChoices() {
    const mode = MODES[currentMode];
    byId("evidence-instruction").textContent = mode.instruction;

    const evidenceContainer = byId("evidence-choices");
    evidenceContainer.replaceChildren();
    mode.evidence.forEach(function (evidence) {
      evidenceContainer.append(makeChoice(evidence, "evidence"));
    });

    const itemContainer = byId("item-choices");
    itemContainer.replaceChildren();
    ITEMS.forEach(function (item) {
      itemContainer.append(makeChoice({
        id: item.id,
        title: item.title,
        hint: mode.itemHints[item.id],
        contaminant: item.contaminant,
        tag: item.tag
      }, "item"));
    });

    const portalContainer = byId("portal-choices");
    portalContainer.replaceChildren();
    mode.portals.forEach(function (portal) {
      portalContainer.append(makeChoice(portal, "portal"));
    });
  }

  function getEvidence(id) {
    return MODES[currentMode].evidence.find(function (entry) { return entry.id === id; });
  }

  function getPortal(id) {
    return MODES[currentMode].portals.find(function (entry) { return entry.id === id; });
  }

  function inventoryIsExact() {
    return labState.inventory.length === REQUIRED.length && REQUIRED.every(function (item) {
      return labState.inventory.includes(item);
    });
  }

  function inventoryIsContaminated() {
    return CONTAMINANTS.some(function (item) { return labState.inventory.includes(item); });
  }

  function updateLab() {
    const locked = labState.portal !== null || labState.phase === "solved" || labState.phase === "failed";

    document.querySelectorAll("[data-kind='evidence']").forEach(function (button) {
      const read = labState.read.includes(button.dataset.id);
      button.classList.toggle("read", read);
      button.disabled = locked || read;
      button.setAttribute("aria-pressed", String(read));
    });

    document.querySelectorAll("[data-kind='item']").forEach(function (button) {
      const collected = labState.inventory.includes(button.dataset.id);
      button.classList.toggle("collected", collected);
      button.disabled = locked || collected;
      button.setAttribute("aria-pressed", String(collected));
    });

    document.querySelectorAll("[data-kind='portal']").forEach(function (button) {
      const picked = labState.portal === button.dataset.id;
      button.classList.toggle("portal-picked", picked);
      button.disabled = labState.portal !== null || labState.phase === "solved" || labState.phase === "failed";
      button.setAttribute("aria-pressed", String(picked));
    });

    byId("evidence-count").textContent = labState.read.length + " / 2";
    byId("evidence-meter").style.width = (labState.read.length / 2 * 100) + "%";

    const ledger = byId("evidence-ledger");
    ledger.replaceChildren();
    if (labState.read.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-entry";
      empty.textContent = "No panels read yet.";
      ledger.append(empty);
    } else {
      labState.read.forEach(function (id) {
        const item = document.createElement("li");
        item.textContent = getEvidence(id).fact;
        ledger.append(item);
      });
    }

    const slots = byId("inventory-slots");
    slots.replaceChildren();
    if (labState.inventory.length === 0) {
      const empty = document.createElement("span");
      empty.className = "empty-entry";
      empty.textContent = "Inventory is empty.";
      slots.append(empty);
    } else {
      labState.inventory.forEach(function (id) {
        const chip = document.createElement("span");
        chip.className = "inventory-chip" + (CONTAMINANTS.includes(id) ? " contaminant" : "");
        chip.textContent = id;
        slots.append(chip);
      });
    }

    const portal = labState.portal ? getPortal(labState.portal) : null;
    byId("portal-readout").textContent = portal ? portal.title + " crossed. The fork is closed." : "No portal crossed.";

    const overlayVisible = document.body.classList.contains("overlay-on");
    let visiblePhase = labState.phase;
    if (overlayVisible && (visiblePhase === "exploring" || visiblePhase === "committed") && inventoryIsContaminated()) visiblePhase = "compromised";
    const phaseNode = byId("episode-state");
    phaseNode.textContent = visiblePhase;
    phaseNode.className = "episode-state";
    if (visiblePhase === "failed" || visiblePhase === "compromised") phaseNode.classList.add("failed");
    if (visiblePhase === "solved") phaseNode.classList.add("solved");

    const status = byId("lab-status");
    status.textContent = overlayVisible && inventoryIsContaminated() && labState.phase !== "failed"
      ? labState.message + " Research overlay: is_winnable = false."
      : labState.message;
    status.className = "status-message" + (labState.messageType ? " " + labState.messageType : "");
    byId("trace-labels").textContent = labState.traces.size ? Array.from(labState.traces).join(" · ") : "none";
    byId("try-gate").disabled = labState.phase === "solved" || labState.phase === "failed";
  }

  function readEvidence(id) {
    if (labState.read.includes(id) || labState.portal) return;
    labState.read.push(id);
    labState.traces.add("clue_read");
    if (labState.read.length === 1) labState.traces.add("one_unique_fact");
    if (labState.read.length === 2) labState.traces.add("evidence_complete");
    labState.message = getEvidence(id).fact;
    labState.messageType = "";
    updateLab();
  }

  function collectItem(id) {
    if (labState.inventory.includes(id) || labState.portal) return;
    labState.inventory.push(id);
    if (labState.read.length < 2) labState.traces.add("commit_before_full_evidence");
    if (id === "proof_a_trap") {
      labState.traces.add("wrong_proof_collected");
      if (currentMode === "false-proof" && !labState.read.includes("counterexample")) {
        labState.traces.add("proof_before_counterexample");
      }
    }
    if (id === "beta_contaminant") labState.traces.add("contaminant_collected");
    if (CONTAMINANTS.includes(id)) {
      labState.message = id + " added permanently. It cannot be dropped.";
      labState.messageType = "warning";
    } else {
      labState.message = id + " added permanently. Check the evidence before taking anything else.";
      labState.messageType = "";
    }
    updateLab();
  }

  function crossPortal(id) {
    if (labState.portal) return;
    const portal = getPortal(id);
    labState.portal = id;
    labState.phase = "committed";
    if (labState.read.length === 1) labState.traces.add("one_clue_commitment");
    if (labState.read.length === 0) labState.traces.add("commit_before_evidence");
    labState.traces.add(portal.safe ? "safe_portal" : "bad_portal");
    if (portal.safe) {
      labState.message = portal.title + " reaches the verifier. Present the inventory to the gate.";
      labState.messageType = "";
    } else {
      labState.message = portal.title + " is the wrong one-way branch. The final verifier is unreachable.";
      labState.messageType = "warning";
    }
    updateLab();
  }

  function tryGate() {
    if (!labState.portal) {
      labState.message = "The verifier is beyond the fork. Choose a portal first.";
      labState.messageType = "warning";
      updateLab();
      return;
    }
    const portal = getPortal(labState.portal);
    if (!portal.safe) {
      labState.phase = "failed";
      labState.traces.add("terminal_bad_route");
      labState.message = "Failed: the bad portal never reaches the exact-inventory verifier.";
      labState.messageType = "warning";
    } else if (inventoryIsExact()) {
      labState.phase = "solved";
      labState.traces.add("exact_gate_success");
      labState.message = "Solved: the safe route delivered exactly {alpha_key, proof_b}.";
      labState.messageType = "success";
    } else {
      labState.phase = "failed";
      labState.traces.add("exact_gate_reject");
      if (inventoryIsContaminated()) {
        labState.message = "Rejected: permanent contamination makes the inventory a strict superset of the accepted set.";
      } else {
        const missing = REQUIRED.filter(function (item) { return !labState.inventory.includes(item); });
        labState.message = "Rejected: missing " + missing.join(" and ") + ". The portal closed behind you.";
      }
      labState.messageType = "warning";
    }
    updateLab();
  }

  function resetLab(message) {
    labState = freshState();
    if (message) labState.message = message;
    renderLabChoices();
    updateLab();
  }

  function setupLab() {
    const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
    modeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        currentMode = button.dataset.mode;
        setPressed(modeButtons, button);
        resetLab(MODES[currentMode].label + " clues loaded. Read before committing.");
      });
    });

    byId("evidence-choices").addEventListener("click", function (event) {
      const button = event.target.closest("[data-kind='evidence']");
      if (button) readEvidence(button.dataset.id);
    });
    byId("item-choices").addEventListener("click", function (event) {
      const button = event.target.closest("[data-kind='item']");
      if (button) collectItem(button.dataset.id);
    });
    byId("portal-choices").addEventListener("click", function (event) {
      const button = event.target.closest("[data-kind='portal']");
      if (button) crossPortal(button.dataset.id);
    });
    byId("try-gate").addEventListener("click", tryGate);
    byId("reset-lab").addEventListener("click", function () { resetLab(); });
    byId("overlay-toggle").addEventListener("change", function (event) {
      document.body.classList.toggle("overlay-on", event.target.checked);
      updateLab();
    });
    resetLab();
  }

  const LENSES = {
    hindsight: {
      wrong: "positive",
      right: "positive",
      wrongWidth: 72,
      rightWidth: 72,
      explanation: "Hindsight retains prefixes that reached a milestone, including prefixes containing the harmful wrong-proof choice."
    },
    progress: {
      wrong: "+0.15",
      right: "+0.15",
      wrongWidth: 55,
      rightWidth: 55,
      explanation: "Generic local progress gives the claim and counterexample the same +0.15. It measures movement through state, not downstream necessity."
    },
    paired: {
      wrong: "−1",
      right: "+2",
      wrongWidth: 18,
      rightWidth: 96,
      explanation: "A matched downstream comparison separates the harmful branch (−1) from the useful branch (+2): a three-point mediated-credit gap."
    }
  };

  let currentLens = "hindsight";
  let selectedBranch = null;

  function renderCreditFork() {
    const lens = LENSES[currentLens];
    byId("wrong-score").textContent = lens.wrong;
    byId("right-score").textContent = lens.right;
    byId("wrong-score-bar").style.width = lens.wrongWidth + "%";
    byId("right-score-bar").style.width = lens.rightWidth + "%";
    byId("wrong-score-bar").style.background = currentLens === "paired" ? "var(--coral)" : "var(--amber)";
    byId("right-score-bar").style.background = currentLens === "paired" ? "var(--lime)" : "var(--violet)";

    let explanation = lens.explanation;
    if (selectedBranch === "wrong") explanation += " You selected the tempting branch—the one naive signals fail to reject.";
    if (selectedBranch === "right") explanation += " You selected the evidence branch—the alternative protected by the counterexample.";
    byId("credit-explanation").textContent = explanation;

    document.querySelectorAll("[data-branch]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.branch === selectedBranch));
    });
  }

  function setupCreditFork() {
    const lensButtons = Array.from(document.querySelectorAll("[data-lens]"));
    lensButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        currentLens = button.dataset.lens;
        setPressed(lensButtons, button);
        renderCreditFork();
      });
    });
    document.querySelectorAll("[data-branch]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectedBranch = selectedBranch === button.dataset.branch ? null : button.dataset.branch;
        renderCreditFork();
      });
    });
    renderCreditFork();
  }

  function setupCoalition() {
    const buttonA = byId("coalition-a");
    const buttonB = byId("coalition-b");
    let activeA = false;
    let activeB = false;

    function render() {
      buttonA.setAttribute("aria-pressed", String(activeA));
      buttonB.setAttribute("aria-pressed", String(activeB));
      let key = "none";
      let notation = "∅";
      if (activeA && activeB) { key = "ab"; notation = "{a,b}"; }
      else if (activeA) { key = "a"; notation = "{a}"; }
      else if (activeB) { key = "b"; notation = "{b}"; }
      const utility = activeA && activeB ? 1 : 0;
      byId("utility-value").textContent = "U(" + notation + ") = " + utility;
      byId("utility-bar").style.width = utility ? "100%" : "0%";
      document.querySelectorAll("[data-coalition]").forEach(function (row) {
        row.classList.toggle("active-row", row.dataset.coalition === key);
      });
      byId("and-readout").textContent = utility
        ? "Joint value appears · interaction = 1 · Shapley credit = 0.5 each"
        : "No standalone terminal value · interaction = 1 · Shapley credit = 0.5 each";
    }

    buttonA.addEventListener("click", function () { activeA = !activeA; render(); });
    buttonB.addEventListener("click", function () { activeB = !activeB; render(); });
    render();
  }

  const CONTRACT_REGIMES = {
    aligned: {
      near: { sigil: "Sigil A", detail: "code 1 · authentic", authentic: true },
      far: { sigil: "Sigil B", detail: "code 2 · forged", authentic: false },
      caption: "Aligned support places the authentic sigil in NEAR on every adaptation contract.",
      proxyPick: "selects Sigil A · NEAR",
      proxyOutcome: "success · +1",
      proxySuccess: true,
      causalPick: "selects Sigil A · code match",
      causalOutcome: "success · +1",
      delta: "Δ = 0",
      verdict: "ABSTAIN · observational tie",
      certified: false,
      explanation: "Both rules succeed on aligned adaptation contracts, so more of the same successful data cannot identify the invariant."
    },
    swap: {
      near: { sigil: "Sigil B", detail: "code 2 · forged", authentic: false },
      far: { sigil: "Sigil A", detail: "code 1 · authentic", authentic: true },
      caption: "The matched twin swaps NEAR/FAR only; Sigil A remains authentic because witness and codes are unchanged.",
      proxyPick: "selects Sigil B · NEAR",
      proxyOutcome: "failure · −1",
      proxySuccess: false,
      causalPick: "selects Sigil A · code match",
      causalOutcome: "success · +1",
      delta: "Δ = +2",
      verdict: "CERTIFIED · causal edit",
      certified: true,
      explanation: "The surface swap makes the hypotheses disagree: NEAR fails while the code-witness rule succeeds, yielding a certified +2 causal edit in 10 actions per pair."
    }
  };

  function setupContractExperiment() {
    const regimeButtons = Array.from(document.querySelectorAll("[data-contract-regime]"));
    let currentRegime = "aligned";

    function setSigil(slotId, sigilId, stateId, config) {
      const slot = byId(slotId);
      slot.classList.toggle("is-authentic", config.authentic);
      slot.classList.toggle("is-forged", !config.authentic);
      byId(sigilId).textContent = config.sigil;
      byId(stateId).textContent = config.detail;
    }

    function setOutcome(id, text, success) {
      const outcome = byId(id);
      outcome.textContent = text;
      outcome.className = "hypothesis-outcome " + (success ? "success" : "failure");
    }

    function render() {
      const regime = CONTRACT_REGIMES[currentRegime];
      setSigil("contract-near-slot", "contract-near-sigil", "contract-near-state", regime.near);
      setSigil("contract-far-slot", "contract-far-sigil", "contract-far-state", regime.far);
      byId("contract-surface-caption").textContent = regime.caption;
      byId("proxy-pick").textContent = regime.proxyPick;
      byId("causal-pick").textContent = regime.causalPick;
      setOutcome("proxy-outcome", regime.proxyOutcome, regime.proxySuccess);
      setOutcome("causal-outcome", regime.causalOutcome, true);
      byId("contract-delta").textContent = regime.delta;
      byId("contract-verdict").textContent = regime.verdict;
      byId("contract-certificate-bar").style.width = regime.certified ? "100%" : "0%";
      byId("contract-certificate").className = "certificate-readout " + (regime.certified ? "certified" : "tie");
      byId("contract-explanation").textContent = regime.explanation;
    }

    regimeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        currentRegime = button.dataset.contractRegime;
        setPressed(regimeButtons, button);
        render();
      });
    });
    render();
  }

  setupDesignTabs();
  setupLab();
  setupCreditFork();
  setupCoalition();
  setupContractExperiment();
}());
