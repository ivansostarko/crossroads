/* ============================================================
   Crossroads — app.js
   Vanilla JS, no dependencies.

   Storage model (localStorage, with in-memory fallback):
     crossroads-db-v1 = {
       decisions: [ { id, createdAt, updatedAt, data: {...} } ],
       currentId: "…"   // last opened decision
     }
   ============================================================ */

(() => {
  "use strict";

  // ----------------------------------------------------------
  // Constants
  // ----------------------------------------------------------

  const STORAGE_KEY = "crossroads-db-v1";
  const LEGACY_KEY = "crossroads-v1"; // migrate old single-decision saves
  const LETTERS = "ABCDEFGH";
  const MAX_OPTIONS = 6;
  const MAX_WEIGHT = 5;
  const SPINNER_MS = 380; // small, honest "working" moment on submits

  const STEP_LABELS = [
    "Situation",
    "Options",
    "Pros & cons",
    "Reality check",
    "Premortem",
    "Verdict",
  ];

  const BIASES = [
    {
      id: "sunkCost",
      title: "Sunk cost fallacy",
      desc: "Am I choosing this partly because of time, money or effort I've already spent — costs that are gone either way? (Arkes & Blumer, 1985)",
    },
    {
      id: "confirmation",
      title: "Confirmation bias",
      desc: "Have I honestly looked for evidence AGAINST the option I secretly prefer, or only for support? (Nickerson, 1998)",
    },
    {
      id: "lossAversion",
      title: "Loss aversion",
      desc: "Losses feel roughly twice as heavy as equal gains. Am I overweighting what I could lose versus what I could gain? (Kahneman & Tversky, 1979)",
    },
    {
      id: "socialPressure",
      title: "Social pressure",
      desc: "Would I still choose this if nobody ever found out what I picked? Whose approval am I optimising for?",
    },
    {
      id: "emotionalState",
      title: "Emotional state (HALT)",
      desc: "Am I Hungry, Angry, Lonely or Tired right now? Strong transient emotions measurably distort risk judgement — big decisions deserve a calm body.",
    },
    {
      id: "outsideView",
      title: "The outside view",
      desc: "What usually happens to other people who make this kind of choice? Base rates predict outcomes better than my sense of being special. (Kahneman & Lovallo, 1993)",
    },
  ];

  // ----------------------------------------------------------
  // Data shapes
  // ----------------------------------------------------------

  const blankItem = () => ({ text: "", weight: 3 });

  const blankData = () => ({
    step: 0,
    situation: "",
    decisionTitle: "",
    reversible: "",
    deadline: "",
    options: [
      { text: "", pros: [blankItem()], cons: [blankItem()] },
      { text: "", pros: [blankItem()], cons: [blankItem()] },
    ],
    biases: {},
    premortem: "",
    safeguards: "",
    firstStep: "",
    accountability: "",
  });

  const newDecisionRecord = () => ({
    id: "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: blankData(),
  });

  // ----------------------------------------------------------
  // Persistence (localStorage with in-memory fallback)
  // ----------------------------------------------------------

  let memoryDB = null;

  function loadDB() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.decisions)) return parsed;
      }
      // one-time migration from the old single-decision format
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const old = JSON.parse(legacy);
        const rec = newDecisionRecord();
        rec.data = { ...blankData(), ...old };
        localStorage.removeItem(LEGACY_KEY);
        return { decisions: [rec], currentId: rec.id };
      }
    } catch (_) {
      /* storage unavailable — fall through */
    }
    return memoryDB ? memoryDB : { decisions: [], currentId: null };
  }

  function saveDB() {
    db.decisions.sort((a, b) => b.updatedAt - a.updatedAt);
    memoryDB = db;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (_) {
      /* in-memory only */
    }
  }

  let db = loadDB();
  let current = null; // the active decision record, or null on home

  function touch() {
    if (current) current.updatedAt = Date.now();
    saveDB();
  }

  // ----------------------------------------------------------
  // Tiny helpers
  // ----------------------------------------------------------

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clean = (s) => (s || "").trim();

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    }
    for (const child of children) {
      if (child == null) continue;
      node.append(child.nodeType ? child : document.createTextNode(child));
    }
    return node;
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ----------------------------------------------------------
  // Toast notifications
  // ----------------------------------------------------------

  function toast(msg, type = "success") {
    const stack = $("#toastStack");
    const t = el(
      "div",
      { class: `toast toast-${type}`, role: "status" },
      el("span", { class: "toast-dot", "aria-hidden": "true" }),
      msg
    );
    stack.append(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, 2800);
  }

  // ----------------------------------------------------------
  // Modal (replaces alert/confirm)
  // ----------------------------------------------------------

  let modalOnConfirm = null;
  let modalLastFocus = null;

  function openModal({ title, body, confirmText = "Confirm", danger = false, onConfirm }) {
    modalLastFocus = document.activeElement;
    $("#modalTitle").textContent = title;
    $("#modalBody").textContent = body;
    const confirmBtn = $("#modalConfirm");
    confirmBtn.querySelector(".btn-label").textContent = confirmText;
    confirmBtn.classList.toggle("btn-danger", danger);
    modalOnConfirm = onConfirm;
    $("#modalBackdrop").hidden = false;
    document.body.classList.add("modal-open");
    confirmBtn.focus();
  }

  function closeModal() {
    $("#modalBackdrop").hidden = true;
    document.body.classList.remove("modal-open");
    modalOnConfirm = null;
    if (modalLastFocus) modalLastFocus.focus();
  }

  function initModal() {
    $("#modalCancel").addEventListener("click", closeModal);
    $("#modalBackdrop").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#modalBackdrop").hidden) closeModal();
    });
    $("#modalConfirm").addEventListener("click", (e) => {
      const fn = modalOnConfirm;
      withSpinner(e.currentTarget, () => {
        closeModal();
        if (fn) fn();
      });
    });
  }

  // ----------------------------------------------------------
  // Button spinner
  // ----------------------------------------------------------

  function withSpinner(btn, fn, ms = SPINNER_MS) {
    if (btn.classList.contains("loading")) return;
    btn.classList.add("loading");
    btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove("loading");
      btn.disabled = false;
      fn();
    }, ms);
  }

  // ----------------------------------------------------------
  // View routing: home <-> wizard
  // ----------------------------------------------------------

  function showHome() {
    current = null;
    db.currentId = null;
    saveDB();
    $("#wizardView").hidden = true;
    $("#homeView").hidden = false;
    renderJournal();
    window.scrollTo({ top: 0 });
  }

  function openDecision(rec) {
    current = rec;
    db.currentId = rec.id;
    saveDB();
    $("#homeView").hidden = true;
    $("#wizardView").hidden = false;
    syncFieldsFromData();
    renderOptions();
    renderBiases();
    goTo(rec.data.step || 0, false);
  }

  // ----------------------------------------------------------
  // Home: journal list
  // ----------------------------------------------------------

  function journalCard(rec) {
    const d = rec.data;
    const title = clean(d.decisionTitle) || clean(d.situation).slice(0, 60) || "Untitled decision";
    const named = d.options.filter((o) => clean(o.text));
    const scored = named.map((o) => ({ o, s: scoreOption(o) }));
    const leader = scored.length
      ? scored.reduce((a, b) => (b.s.net > a.s.net ? b : a))
      : null;

    const meta = [
      `Updated ${fmtDate(rec.updatedAt)}`,
      `${named.length} option${named.length === 1 ? "" : "s"}`,
      `Step ${Math.min((d.step || 0) + 1, 6)} of 6`,
    ].join(" · ");

    const card = el("article", { class: "journal-card" });
    card.append(
      el(
        "div",
        { class: "journal-main" },
        el("h3", {}, title),
        el("p", { class: "journal-meta" }, meta),
        leader && leader.s.good + leader.s.bad > 0
          ? el(
              "p",
              { class: "journal-lean" },
              "Leaning: ",
              el("strong", {}, leader.o.text),
              ` (net ${leader.s.net > 0 ? "+" : ""}${leader.s.net})`
            )
          : null
      )
    );

    const actions = el("div", { class: "journal-actions" });
    actions.append(
      el(
        "button",
        {
          class: "btn btn-primary btn-small",
          type: "button",
          onclick: (e) => withSpinner(e.currentTarget, () => openDecision(rec)),
        },
        el("span", { class: "btn-label" }, "Open")
      ),
      el(
        "button",
        {
          class: "btn btn-ghost btn-small",
          type: "button",
          "aria-label": `Delete decision: ${title}`,
          onclick: () =>
            openModal({
              title: "Delete this decision?",
              body: `"${title}" will be permanently removed from this device. This cannot be undone.`,
              confirmText: "Delete",
              danger: true,
              onConfirm: () => {
                db.decisions = db.decisions.filter((r) => r.id !== rec.id);
                saveDB();
                renderJournal();
                toast("Decision deleted", "info");
              },
            }),
        },
        "Delete"
      )
    );
    card.append(actions);
    return card;
  }

  function renderJournal() {
    const list = $("#journalList");
    list.innerHTML = "";
    if (!db.decisions.length) {
      list.append(
        el(
          "div",
          { class: "journal-empty" },
          el("p", { class: "nudge-title" }, "Nothing here yet"),
          el("p", {}, "Start your first decision above — it will be saved here automatically as you type.")
        )
      );
      return;
    }
    db.decisions.forEach((rec) => list.append(journalCard(rec)));
  }

  // ----------------------------------------------------------
  // Scoring
  // ----------------------------------------------------------

  function scoreOption(opt) {
    const sum = (items) => items.filter((i) => clean(i.text)).reduce((a, i) => a + i.weight, 0);
    const good = sum(opt.pros);
    const bad = sum(opt.cons);
    return { good, bad, net: good - bad };
  }

  // ----------------------------------------------------------
  // Wizard: step navigation
  // ----------------------------------------------------------

  function goTo(step, save = true) {
    if (!current) return;
    current.data.step = Math.max(0, Math.min(STEP_LABELS.length - 1, step));
    if (save) touch();
    $$(".step").forEach((s) => {
      s.hidden = Number(s.dataset.step) !== current.data.step;
    });
    renderNav();
    if (current.data.step === 2) renderProsCons();
    if (current.data.step === 5) renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderNav() {
    const nav = $("#stepNav");
    nav.innerHTML = "";
    STEP_LABELS.forEach((label, i) => {
      nav.append(
        el(
          "button",
          {
            class:
              "step-link" +
              (i === current.data.step ? " active" : "") +
              (i < current.data.step ? " done" : ""),
            type: "button",
            onclick: () => goTo(i),
          },
          el("span", { class: "dot", "aria-hidden": "true" }),
          el("span", { class: "label" }, `${i + 1}. ${label}`)
        )
      );
    });
  }

  // ----------------------------------------------------------
  // Wizard: field binding
  // ----------------------------------------------------------

  const FIELD_IDS = [
    "situation", "decisionTitle", "deadline",
    "premortem", "safeguards", "firstStep", "accountability",
  ];

  function bindFields() {
    FIELD_IDS.forEach((id) => {
      $("#" + id).addEventListener("input", (e) => {
        if (!current) return;
        current.data[id] = e.target.value;
        touch();
      });
    });
    $$('input[name="reversible"]').forEach((r) => {
      r.addEventListener("change", () => {
        if (!current) return;
        current.data.reversible = r.value;
        touch();
      });
    });
  }

  function syncFieldsFromData() {
    const d = current.data;
    FIELD_IDS.forEach((id) => ($("#" + id).value = d[id] || ""));
    $$('input[name="reversible"]').forEach((r) => (r.checked = d.reversible === r.value));
  }

  // ----------------------------------------------------------
  // Wizard: options
  // ----------------------------------------------------------

  function renderOptions() {
    const list = $("#optionsList");
    list.innerHTML = "";
    const opts = current.data.options;
    opts.forEach((opt, i) => {
      const input = el("input", {
        type: "text",
        placeholder:
          i === 0
            ? "e.g. Take the new job"
            : i === 1
            ? "e.g. Stay, but negotiate a new role"
            : "Another path…",
        value: opt.text,
        "aria-label": `Option ${LETTERS[i]}`,
        oninput: (e) => {
          opt.text = e.target.value;
          touch();
        },
      });
      const row = el(
        "div",
        { class: "option-row" },
        el("span", { class: "option-letter", "aria-hidden": "true" }, LETTERS[i]),
        input
      );
      if (opts.length > 2) {
        row.append(
          el(
            "button",
            {
              class: "icon-btn",
              type: "button",
              "aria-label": `Remove option ${LETTERS[i]}`,
              onclick: () =>
                openModal({
                  title: "Remove this option?",
                  body: opt.text
                    ? `"${opt.text}" and its pros & cons will be removed.`
                    : "This empty option will be removed.",
                  confirmText: "Remove",
                  danger: true,
                  onConfirm: () => {
                    opts.splice(i, 1);
                    touch();
                    renderOptions();
                    toast("Option removed", "info");
                  },
                }),
            },
            "✕"
          )
        );
      }
      list.append(row);
    });
    $("#addOptionBtn").disabled = opts.length >= MAX_OPTIONS;
  }

  // ----------------------------------------------------------
  // Wizard: pros & cons
  // ----------------------------------------------------------

  function weightControl(item) {
    const wrap = el("div", { class: "weight", role: "group", "aria-label": "Weight, 1 to 5" });
    for (let w = 1; w <= MAX_WEIGHT; w++) {
      wrap.append(
        el("button", {
          type: "button",
          class: w <= item.weight ? "on" : "",
          title: `Weight ${w} of ${MAX_WEIGHT}`,
          "aria-label": `Set weight ${w}`,
          "aria-pressed": String(w <= item.weight),
          onclick: () => {
            item.weight = w;
            touch();
            [...wrap.children].forEach((b, idx) => {
              b.classList.toggle("on", idx < w);
              b.setAttribute("aria-pressed", String(idx < w));
            });
          },
        })
      );
    }
    return wrap;
  }

  function pcColumn(opt, kind) {
    const items = opt[kind];
    const isGood = kind === "pros";
    const col = el("div", { class: "pc-col " + (isGood ? "good" : "bad") });
    col.append(el("p", { class: "pc-col-title" }, isGood ? "Good — reasons for" : "Bad — reasons against"));
    items.forEach((item, i) => {
      const input = el("input", {
        type: "text",
        placeholder: isGood ? "Something good about this…" : "Something bad about this…",
        value: item.text,
        oninput: (e) => {
          item.text = e.target.value;
          touch();
        },
      });
      const row = el("div", { class: "pc-item" }, input, weightControl(item));
      if (items.length > 1) {
        row.append(
          el(
            "button",
            {
              class: "icon-btn",
              type: "button",
              "aria-label": "Remove this item",
              onclick: () => {
                items.splice(i, 1);
                touch();
                renderProsCons();
              },
            },
            "✕"
          )
        );
      }
      col.append(row);
    });
    col.append(
      el(
        "button",
        {
          class: "pc-add",
          type: "button",
          onclick: () => {
            items.push(blankItem());
            touch();
            renderProsCons();
          },
        },
        isGood ? "+ Add a pro" : "+ Add a con"
      )
    );
    return col;
  }

  function renderProsCons() {
    const area = $("#prosConsArea");
    area.innerHTML = "";
    const opts = current.data.options;
    const named = opts.filter((o) => clean(o.text));
    if (!named.length) {
      area.append(
        el(
          "div",
          { class: "nudge" },
          el("p", { class: "nudge-title" }, "No options yet"),
          el("p", {}, "Go back one step and write at least one option first.")
        )
      );
      return;
    }
    opts.forEach((opt, i) => {
      if (!clean(opt.text)) return;
      area.append(
        el(
          "section",
          { class: "option-block" },
          el("h2", {}, el("span", { class: "option-letter" }, LETTERS[i] + " ·"), " " + opt.text),
          el("div", { class: "pc-columns" }, pcColumn(opt, "pros"), pcColumn(opt, "cons")),
          el(
            "p",
            { class: "pc-hint" },
            "Weight: 1 = barely matters · 5 = life-shaping. Franklin's trick — if a pro and a con feel equal, mentally cross both out."
          )
        )
      );
    });
  }

  // ----------------------------------------------------------
  // Wizard: bias checklist
  // ----------------------------------------------------------

  function renderBiases() {
    const list = $("#biasChecklist");
    list.innerHTML = "";
    BIASES.forEach((b) => {
      const cb = el("input", {
        type: "checkbox",
        onchange: (e) => {
          current.data.biases[b.id] = e.target.checked;
          touch();
        },
      });
      cb.checked = !!current.data.biases[b.id];
      list.append(
        el(
          "label",
          { class: "check-item" },
          cb,
          el(
            "span",
            {},
            el("span", { class: "check-title" }, b.title),
            el("span", { class: "check-desc" }, b.desc)
          )
        )
      );
    });
  }

  // ----------------------------------------------------------
  // Wizard: summary
  // ----------------------------------------------------------

  function beamSVG(good, bad) {
    const total = good + bad || 1;
    const angle = ((bad - good) / total) * 14;
    return `
      <svg viewBox="0 0 420 150" role="img" aria-label="Balance of pros (${good}) versus cons (${bad})">
        <line x1="210" y1="60" x2="210" y2="128" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
        <path d="M180 132 h60" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
        <g class="beam-group" style="transform: rotate(${angle}deg)">
          <line x1="60" y1="60" x2="360" y2="60" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
          <line x1="60" y1="60" x2="60" y2="82" stroke="var(--ink)" stroke-width="3"/>
          <line x1="360" y1="60" x2="360" y2="82" stroke="var(--ink)" stroke-width="3"/>
          <circle cx="60" cy="96" r="15" fill="var(--go)"/>
          <circle cx="360" cy="96" r="15" fill="var(--stop)"/>
          <text x="60" y="101" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Inter, sans-serif">${good}</text>
          <text x="360" y="101" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Inter, sans-serif">${bad}</text>
        </g>
        <circle cx="210" cy="60" r="7" fill="var(--action)"/>
      </svg>`;
  }

  function verdictText(score) {
    const { good, bad, net } = score;
    if (!good && !bad) return "Nothing weighed yet — add pros and cons.";
    const ratio = good / (bad || 0.5);
    if (net > 0 && ratio >= 1.6) return "The weight clearly leans toward doing this.";
    if (net > 0) return "Leaning positive — but it's close. Trust the tie-breakers below.";
    if (net === 0) return "A dead heat. Your gut reaction to a coin flip may tell you more than the numbers.";
    if (ratio > 0.66) return "Leaning negative — but it's close.";
    return "The weight clearly leans against this.";
  }

  function buildWarnings(scores) {
    const d = current.data;
    const warnings = [];
    const named = d.options.filter((o) => clean(o.text));

    if (d.reversible === "one-way") {
      warnings.push("This is a one-way door. Slow down: sleep on it at least once, and stress-test your premortem safeguards before committing.");
    }
    if (d.reversible === "two-way") {
      warnings.push("This is a two-way door — reversible decisions reward speed. A good-enough choice now usually beats a perfect choice later.");
    }
    if (named.length < 2) {
      warnings.push('You\'ve weighed only one option. "Whether or not" decisions fail far more often than "which of these" decisions — try adding a real alternative.');
    }
    const unchecked = BIASES.filter((b) => !d.biases[b.id]);
    if (unchecked.length >= 4) {
      warnings.push("You skipped most of the bias checklist. That's fine — but confirmation bias loves being skipped.");
    }
    const sorted = [...scores].sort((a, b) => b.net - a.net);
    if (sorted.length >= 2 && Math.abs(sorted[0].net - sorted[1].net) <= 2) {
      warnings.push('Your top two options are nearly tied. Research on close calls suggests either is probably fine — pick the one that\'s easier to reverse, and decide quickly.');
    }
    if (!clean(d.premortem)) {
      warnings.push("Your premortem is empty. Even two sentences of imagined failure sharpen a decision.");
    }
    return warnings;
  }

  function renderSummary() {
    const area = $("#summaryArea");
    area.innerHTML = "";
    const d = current.data;

    $("#summaryTitle").textContent = clean(d.decisionTitle) || "Where the weight falls";

    const named = d.options
      .map((o, i) => ({ ...o, letter: LETTERS[i] }))
      .filter((o) => clean(o.text));
    const scores = named.map((o) => ({ ...scoreOption(o), option: o }));
    const best = scores.length ? scores.reduce((a, b) => (b.net > a.net ? b : a)) : null;

    scores.forEach((s) => {
      const isWinner = best && s === best && s.net > 0 && scores.length > 1;
      const card = el("div", { class: "verdict-card" + (isWinner ? " winner" : "") });
      const h = el("h2", {}, el("span", { class: "option-letter" }, s.option.letter + " ·"), " " + s.option.text);
      if (isWinner) h.append(" ", el("span", { class: "winner-tag" }, "Leading"));
      card.append(h);
      card.append(el("div", { class: "beam-wrap", html: beamSVG(s.good, s.bad) }));
      card.append(
        el(
          "div",
          { class: "score-row" },
          el("span", { class: "score-good" }, `Good: ${s.good}`),
          el("span", {}, `Net: ${s.net > 0 ? "+" : ""}${s.net}`),
          el("span", { class: "score-bad" }, `Bad: ${s.bad}`)
        )
      );
      card.append(el("p", { class: "verdict-line" }, verdictText(s)));
      area.append(card);
    });

    if (!scores.length) {
      area.append(
        el(
          "div",
          { class: "nudge" },
          el("p", { class: "nudge-title" }, "Nothing to weigh yet"),
          el("p", {}, "Add options and pros/cons in the earlier steps, then come back.")
        )
      );
    }

    const warnBox = el("div", { class: "summary-warnings" });
    buildWarnings(scores).forEach((w) => warnBox.append(el("p", { class: "warn" }, w)));
    area.append(warnBox);
  }

  // ----------------------------------------------------------
  // Export
  // ----------------------------------------------------------

  function summaryText() {
    const d = current.data;
    const lines = [];
    const push = (s = "") => lines.push(s);
    push("CROSSROADS — DECISION SUMMARY");
    push("Generated " + new Date().toLocaleDateString());
    push("=".repeat(40));
    push();
    push("DECISION: " + (d.decisionTitle || "(untitled)"));
    if (d.deadline) push("DEADLINE: " + d.deadline);
    if (d.reversible)
      push("REVERSIBILITY: " + (d.reversible === "one-way" ? "One-way door (hard to undo)" : "Two-way door (reversible)"));
    push();
    if (clean(d.situation)) {
      push("SITUATION:");
      push(d.situation.trim());
      push();
    }
    d.options.forEach((o, i) => {
      if (!clean(o.text)) return;
      const s = scoreOption(o);
      push(`OPTION ${LETTERS[i]}: ${o.text}  (good ${s.good} / bad ${s.bad} / net ${s.net > 0 ? "+" : ""}${s.net})`);
      o.pros.filter((p) => clean(p.text)).forEach((p) => push(`  + [${p.weight}] ${p.text}`));
      o.cons.filter((c) => clean(c.text)).forEach((c) => push(`  - [${c.weight}] ${c.text}`));
      push();
    });
    const checked = BIASES.filter((b) => d.biases[b.id]).map((b) => b.title);
    if (checked.length) push("BIASES REVIEWED: " + checked.join(", "));
    if (clean(d.premortem)) {
      push();
      push("PREMORTEM (how it could fail):");
      push(d.premortem.trim());
    }
    if (clean(d.safeguards)) {
      push();
      push("SAFEGUARDS / TRIPWIRES:");
      push(d.safeguards.trim());
    }
    push();
    push("NEXT STEP (within 48h): " + (d.firstStep || "—"));
    push("ACCOUNTABILITY: " + (d.accountability || "—"));
    return lines.join("\n");
  }

  function downloadSummary() {
    const blob = new Blob([summaryText()], { type: "text/plain" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "crossroads-decision.txt" });
    document.body.append(a);
    a.click();
    a.remove();
    toast("Summary downloaded");
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText());
      toast("Summary copied to clipboard");
    } catch (_) {
      toast("Couldn't access clipboard — use Download instead", "error");
    }
  }

  // ----------------------------------------------------------
  // Wire everything up
  // ----------------------------------------------------------

  function init() {
    initModal();
    bindFields();

    // Home
    $("#newDecisionBtn").addEventListener("click", (e) =>
      withSpinner(e.currentTarget, () => {
        const rec = newDecisionRecord();
        db.decisions.unshift(rec);
        saveDB();
        openDecision(rec);
        toast("New decision started");
      })
    );

    // Wizard chrome
    $("#backHomeBtn").addEventListener("click", showHome);

    $("#addOptionBtn").addEventListener("click", () => {
      if (current.data.options.length < MAX_OPTIONS) {
        current.data.options.push({ text: "", pros: [blankItem()], cons: [blankItem()] });
        touch();
        renderOptions();
      }
    });

    $$("[data-next]").forEach((b) =>
      b.addEventListener("click", (e) => withSpinner(e.currentTarget, () => goTo(current.data.step + 1)))
    );
    $$("[data-prev]").forEach((b) => b.addEventListener("click", () => goTo(current.data.step - 1)));

    $("#resetBtn").addEventListener("click", () =>
      openModal({
        title: "Clear this decision?",
        body: "All answers in this decision will be erased. The decision itself stays in your journal, empty.",
        confirmText: "Clear it",
        danger: true,
        onConfirm: () => {
          current.data = blankData();
          touch();
          syncFieldsFromData();
          renderOptions();
          renderBiases();
          goTo(0);
          toast("Decision cleared", "info");
        },
      })
    );

    $("#exportBtn").addEventListener("click", (e) => withSpinner(e.currentTarget, downloadSummary));
    $("#copyBtn").addEventListener("click", (e) => withSpinner(e.currentTarget, copySummary));

    // Restore last open decision, or land on home
    const last = db.decisions.find((r) => r.id === db.currentId);
    if (last) openDecision(last);
    else showHome();

    // Hide the page loader
    setTimeout(() => {
      const loader = $("#pageLoader");
      loader.classList.add("hide");
      setTimeout(() => loader.remove(), 400);
    }, 350);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
