// Language Translation Tool - CodeAlpha AI Internship (Task 1)
// The page sends the text to our own Python server (app.py), which asks Google Translate.

const MAX_CHARS = 1000;
const RTL = new Set(["ar", "ur", "he", "fa", "ps", "sd", "ug", "yi"]);
const SPEECH = {
  en: "en-IN", hi: "hi-IN", pa: "pa-IN", ur: "ur-PK", bn: "bn-IN", ta: "ta-IN", te: "te-IN",
  mr: "mr-IN", gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", es: "es-ES", fr: "fr-FR", de: "de-DE",
  it: "it-IT", pt: "pt-PT", ru: "ru-RU", ar: "ar-SA", ja: "ja-JP", ko: "ko-KR", tr: "tr-TR", nl: "nl-NL"
};

const $ = (id) => document.getElementById(id);
const els = {
  input: $("inputText"), output: $("outputText"), srcSel: $("srcSel"), tgtSel: $("tgtSel"),
  detected: $("detected"), engine: $("engine"),
  count: $("charCount"), busy: $("busy"), translateBtn: $("translateBtn"), auto: $("autoToggle"),
  mic: $("micBtn"), star: $("starBtn"), copy: $("copyBtn"), download: $("downloadBtn"),
  listenOut: $("listenOut"), list: $("listEl"), toast: $("toast")
};

let LANGS = {};
const state = { lang: { src: "auto", tgt: "hi" }, rid: 0, timer: null, last: null, history: [], saved: [], tab: "recent", recog: null, listening: false };

const langName = (code) => (code === "auto" ? "Auto-detect" : LANGS[code] || code);

/* ---------- storage ---------- */
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
}

/* ---------- language pickers ---------- */
function buildSide(side, sel, withAuto) {
  sel.textContent = "";
  if (withAuto) sel.add(new Option("Auto-detect", "auto"));
  Object.entries(LANGS).sort((a, b) => a[1].localeCompare(b[1])).forEach(([code, name]) => sel.add(new Option(name, code)));
  sel.addEventListener("change", () => { setLang(side, sel.value); onLangChange(); });
}

function setLang(side, code) {
  state.lang[side] = code;
  (side === "src" ? els.srcSel : els.tgtSel).value = code;
}

function onLangChange() {
  if (els.input.value.trim() && els.auto.checked) translate();
}

/* ---------- output helpers ---------- */
function setOutput(text, kind = "") {
  els.output.textContent = text;
  els.output.className = "output" + (kind ? " " + kind : "");
}

function updateTools() {
  const has = !!state.last;
  [els.copy, els.download, els.listenOut, els.star].forEach((b) => (b.disabled = !has));
  const saved = has && isSaved(state.last);
  els.star.classList.toggle("on", saved);
  els.star.querySelector("span").textContent = saved ? "Starred" : "Star";
}

function updateCount() {
  els.count.textContent = els.input.value.length + " / " + MAX_CHARS;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => els.toast.classList.remove("show"), 1600);
}

function clearOutput() {
  state.rid++;
  state.last = null;
  setOutput("Your translation will appear here...", "placeholder");
  els.output.dir = "ltr";
  els.detected.classList.add("hidden");
  els.engine.textContent = "";
  els.busy.textContent = "";
  els.translateBtn.disabled = false;
  updateTools();
}

/* ---------- translation ---------- */
async function translate() {
  clearTimeout(state.timer);
  const text = els.input.value.trim();
  if (!text) { clearOutput(); return; }
  const from = state.lang.src;
  const to = state.lang.tgt;
  if (from === to) { showError("Please choose two different languages."); return; }

  const id = ++state.rid;
  els.translateBtn.disabled = true;
  els.busy.textContent = "Translating...";
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: from, target: to })
    });
    const data = await res.json().catch(() => ({}));
    if (id !== state.rid) return;
    if (!res.ok) throw new Error(data.error || "Translation failed.");
    showResult(data, text, from, to, true);
  } catch (err) {
    if (id !== state.rid) return;
    showError(err instanceof TypeError ? "Cannot reach the server. Start it with: python app.py" : err.message);
  } finally {
    if (id === state.rid) {
      els.translateBtn.disabled = false;
      els.busy.textContent = "";
    }
  }
}

function showError(message) {
  state.last = null;
  setOutput(message, "error");
  els.output.dir = "ltr";
  els.detected.classList.add("hidden");
  els.engine.textContent = "";
  updateTools();
}

function showResult(data, text, from, to, addToHistory) {
  setOutput(data.translation);
  els.output.dir = RTL.has(to) ? "rtl" : "ltr";
  els.engine.textContent = data.engine ? "via " + data.engine : "";

  const realFrom = from === "auto" && data.detected ? data.detected : from;
  if (from === "auto" && data.detected) {
    els.detected.textContent = "Detected: " + (data.detected_name || langName(data.detected));
    els.detected.classList.remove("hidden");
  } else {
    els.detected.classList.add("hidden");
  }

  state.last = { text, translation: data.translation, from: realFrom, to, engine: data.engine || "" };
  if (addToHistory) addHistory(state.last);
  updateTools();
}

/* ---------- history and starred ---------- */
const sameItem = (a, b) => a.text === b.text && a.to === b.to;
const isSaved = (item) => state.saved.some((s) => sameItem(s, item));

function addHistory(item) {
  state.history = [item, ...state.history.filter((h) => !sameItem(h, item))].slice(0, 10);
  store("tr_history", state.history);
  if (state.tab === "recent") renderList();
}

function toggleStar() {
  if (!state.last) return;
  if (isSaved(state.last)) {
    state.saved = state.saved.filter((s) => !sameItem(s, state.last));
    toast("Removed from starred");
  } else {
    state.saved = [state.last, ...state.saved].slice(0, 50);
    toast("Starred");
  }
  store("tr_saved", state.saved);
  updateTools();
  if (state.tab === "saved") renderList();
}

function renderList() {
  const items = state.tab === "saved" ? state.saved : state.history;
  els.list.textContent = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = state.tab === "saved" ? "Star a translation to keep it here." : "Your recent translations will appear here.";
    els.list.appendChild(li);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item";
    const meta = document.createElement("span");
    meta.className = "item-meta";
    meta.textContent = langName(item.from) + "  to  " + langName(item.to);
    const src = document.createElement("span");
    src.className = "item-src";
    src.textContent = item.text;
    const out = document.createElement("span");
    out.className = "item-out";
    out.textContent = item.translation;
    btn.append(meta, src, out);
    btn.addEventListener("click", () => restore(item));
    li.appendChild(btn);
    els.list.appendChild(li);
  });
}

function restore(item) {
  setLang("src", item.from);
  setLang("tgt", item.to);
  els.input.value = item.text;
  updateCount();
  showResult({ translation: item.translation, engine: item.engine }, item.text, item.from, item.to, false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- speech ---------- */
function speak(text, code) {
  if (!("speechSynthesis" in window)) { toast("Speech is not supported in this browser"); return; }
  if (!text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH[code] || code;
  window.speechSynthesis.speak(u);
}

function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Voice input works in Chrome or Edge"); return; }
  if (state.listening && state.recog) { state.recog.stop(); return; }
  const rec = new SR();
  const src = state.lang.src;
  rec.lang = SPEECH[src] || "en-IN";
  rec.interimResults = false;
  rec.onstart = () => {
    state.listening = true;
    els.mic.classList.add("live");
    els.mic.querySelector("span").textContent = "Listening";
  };
  rec.onresult = (e) => {
    els.input.value = e.results[0][0].transcript.slice(0, MAX_CHARS);
    updateCount();
    translate();
  };
  rec.onerror = () => toast("Could not hear you. Try again.");
  rec.onend = () => {
    state.listening = false;
    els.mic.classList.remove("live");
    els.mic.querySelector("span").textContent = "Speak";
  };
  state.recog = rec;
  rec.start();
}

/* ---------- other actions ---------- */
async function copyOutput() {
  if (!state.last) return;
  try {
    await navigator.clipboard.writeText(state.last.translation);
    toast("Copied");
  } catch {
    toast("Copy failed");
  }
}

function downloadOutput() {
  if (!state.last) return;
  const blob = new Blob([state.last.translation], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "translation.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

function swapLanguages() {
  let from = state.lang.src;
  const to = state.lang.tgt;
  if (from === "auto") from = (state.last && state.last.from) || (to === "en" ? "hi" : "en");
  setLang("src", to);
  setLang("tgt", from);
  if (state.last) {
    els.input.value = state.last.translation;
    updateCount();
  }
  if (els.input.value.trim()) translate();
}

/* ---------- start ---------- */
function bindEvents() {
  els.translateBtn.addEventListener("click", translate);
  $("swapBtn").addEventListener("click", swapLanguages);
  els.mic.addEventListener("click", toggleMic);
  $("listenIn").addEventListener("click", () => {
    const src = state.lang.src;
    speak(els.input.value, src === "auto" ? (state.last ? state.last.from : "en") : src);
  });
  els.listenOut.addEventListener("click", () => state.last && speak(state.last.translation, state.last.to));
  els.copy.addEventListener("click", copyOutput);
  els.download.addEventListener("click", downloadOutput);
  els.star.addEventListener("click", toggleStar);
  $("clearBtn").addEventListener("click", () => {
    els.input.value = "";
    updateCount();
    clearOutput();
    els.input.focus();
  });
  els.input.addEventListener("input", () => {
    updateCount();
    clearTimeout(state.timer);
    if (!els.input.value.trim()) { clearOutput(); return; }
    if (els.auto.checked) state.timer = setTimeout(translate, 700);
  });
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) translate();
  });
  document.querySelectorAll(".seg button").forEach((b) =>
    b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      document.querySelectorAll(".seg button").forEach((x) => x.classList.toggle("on", x === b));
      renderList();
    }));
  $("clearList").addEventListener("click", () => {
    if (state.tab === "saved") { state.saved = []; store("tr_saved", []); } else { state.history = []; store("tr_history", []); }
    renderList();
    updateTools();
  });
}

async function init() {
  bindEvents();
  state.history = load("tr_history", []);
  state.saved = load("tr_saved", []);
  updateCount();
  updateTools();
  try {
    const res = await fetch("/api/languages");
    const list = await res.json();
    list.forEach((l) => (LANGS[l.code] = l.name));
  } catch {
    setOutput("Cannot reach the server. Start it with: python app.py", "error");
    return;
  }
  buildSide("src", els.srcSel, true);
  buildSide("tgt", els.tgtSel, false);
  setLang("src", "auto");
  setLang("tgt", "hi");
  renderList();
}

init();
