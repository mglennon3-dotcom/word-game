(() => {
  const ROWS = 6, COLS = 5;
  const WORD_SET = new Set([...WORDS, ...(typeof GUESSES !== "undefined" ? GUESSES : [])]);
  const STORE_KEY = "fiveLetters.v1";

  const $ = (id) => document.getElementById(id);
  const boardEl = $("board"), kbEl = $("keyboard"), toastEl = $("toast");

  // ---------- persistence ----------
  const defaults = {
    mode: "daily",
    stats: newStats(),         // daily games only (streaks live here)
    practiceStats: newStats(), // unlimited practice games
    games: {}, // keyed by game id -> { guesses, done, won }
  };
  function newStats() { return { played: 0, wins: 0, streak: 0, maxStreak: 0, dist: [0, 0, 0, 0, 0, 0] }; }
  let store;
  try { store = { ...defaults, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") }; }
  catch { store = structuredClone(defaults); }
  const modeStats = () => (store.mode === "daily" ? store.stats : store.practiceStats);
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {} };

  // ---------- game selection ----------
  const dayNumber = () => {
    const start = new Date(2026, 0, 1);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - start) / 86400000);
  };
  // deterministic shuffle so daily words don't follow alphabetical order
  const dailyWord = (n) => {
    let h = (n * 2654435761) >>> 0;
    return WORDS[h % WORDS.length];
  };

  let gameId, answer, guesses, current, done;

  function startGame() {
    if (store.mode === "daily") {
      const n = dayNumber();
      gameId = "daily-" + n;
      answer = dailyWord(n);
    } else {
      if (!store.practice || store.games[store.practice.id]?.done) {
        // random word, but never today's daily word (no spoilers)
        const today = dailyWord(dayNumber());
        let word;
        do word = WORDS[Math.floor(Math.random() * WORDS.length)]; while (word === today);
        store.practice = { id: "practice-" + Date.now(), word };
      }
      gameId = store.practice.id;
      answer = store.practice.word;
      // only the current practice game needs saving
      for (const id of Object.keys(store.games)) if (id.startsWith("practice-") && id !== gameId) delete store.games[id];
    }
    const saved = store.games[gameId] || { guesses: [], done: false, won: false };
    store.games[gameId] = saved;
    guesses = saved.guesses;
    done = saved.done;
    current = "";
    $("modeBtn").textContent = store.mode === "daily" ? "Daily" : "Practice";
    save();
    renderBoard();
    renderKeyboard();
    guesses.forEach((g, r) => paintRow(r, g, false));
    updateHint();
  }

  function nextDailyIn() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const mins = Math.ceil((midnight - now) / 60000);
    return `New daily word in ${Math.floor(mins / 60)}h ${mins % 60}m.`;
  }
  setInterval(() => {
    const c = $("countdown");
    if (c) c.textContent = nextDailyIn();
    // roll over to the new daily word if the page is left open past midnight
    if (store.mode === "daily" && gameId !== "daily-" + dayNumber() && !busy) startGame();
  }, 30000);

  function playPractice() {
    store.mode = "practice";
    store.practice = null;
    if ($("statsDialog").open) $("statsDialog").close();
    toastEl.classList.remove("show");
    startGame();
    toast("Practice mode — unlimited words");
  }

  // ---------- hint (shown before the final guess) ----------
  const HINT_AFTER = ROWS - 1;
  function updateHint() {
    const el = $("hint");
    if (done) {
      el.innerHTML = store.mode === "daily"
        ? `<span id="countdown">${nextDailyIn()}</span> <button class="link-btn" data-action="keep-playing">Keep playing →</button>`
        : `<button class="link-btn" data-action="new-word">Next word →</button>`;
      return;
    }
    if (guesses.length < HINT_AFTER) { el.innerHTML = ""; return; }
    // reveal the first position the player hasn't already got green
    let pos = 0;
    while (pos < COLS && guesses.some((g) => g[pos] === answer[pos])) pos++;
    if (pos === COLS) pos = 0;
    const ordinal = ["1st", "2nd", "3rd", "4th", "5th"][pos];
    el.innerHTML = `Hint: the ${ordinal} letter is <b>${answer[pos]}</b>`;
  }

  // ---------- scoring ----------
  function score(guess, target) {
    const res = Array(COLS).fill("absent");
    const counts = {};
    for (let i = 0; i < COLS; i++) {
      if (guess[i] === target[i]) res[i] = "correct";
      else counts[target[i]] = (counts[target[i]] || 0) + 1;
    }
    for (let i = 0; i < COLS; i++) {
      if (res[i] !== "correct" && counts[guess[i]] > 0) {
        res[i] = "present";
        counts[guess[i]]--;
      }
    }
    return res;
  }

  // ---------- rendering ----------
  function renderBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement("div");
      row.className = "row";
      for (let c = 0; c < COLS; c++) {
        const t = document.createElement("div");
        t.className = "tile";
        row.appendChild(t);
      }
      boardEl.appendChild(row);
    }
  }

  const KB = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];
  function renderKeyboard() {
    kbEl.innerHTML = "";
    KB.forEach((line) => {
      const row = document.createElement("div");
      row.className = "kb-row";
      for (const ch of line) {
        const b = document.createElement("button");
        b.className = "key";
        if (ch === "+") { b.textContent = "Enter"; b.dataset.key = "Enter"; b.classList.add("wide"); }
        else if (ch === "-") { b.textContent = "⌫"; b.dataset.key = "Backspace"; b.classList.add("wide"); b.setAttribute("aria-label", "Backspace"); }
        else { b.textContent = ch; b.dataset.key = ch; }
        row.appendChild(b);
      }
      kbEl.appendChild(row);
    });
  }

  const rank = { absent: 1, present: 2, correct: 3 };
  function paintKey(letter, state) {
    const k = kbEl.querySelector(`[data-key="${letter}"]`);
    if (!k) return;
    const prev = k.dataset.state;
    if (!prev || rank[state] > rank[prev]) {
      k.dataset.state = state;
      k.classList.remove("absent", "present", "correct");
      k.classList.add(state);
    }
  }

  function updateCurrentRow() {
    const row = boardEl.children[guesses.length];
    if (!row) return;
    [...row.children].forEach((t, i) => {
      t.textContent = current[i] || "";
      t.classList.toggle("filled", !!current[i]);
    });
  }

  function paintRow(r, word, animate) {
    const res = score(word, answer);
    const tiles = boardEl.children[r].children;
    return new Promise((resolve) => {
      [...tiles].forEach((t, i) => {
        t.textContent = word[i];
        const apply = () => { t.classList.add(res[i]); paintKey(word[i], res[i]); };
        if (animate) {
          setTimeout(() => {
            t.classList.add("flip");
            setTimeout(apply, 250);
          }, i * 250);
        } else apply();
      });
      setTimeout(resolve, animate ? COLS * 250 + 300 : 0);
    });
  }

  let toastTimer;
  function toast(msg, ms = 1500) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  function shake() {
    const row = boardEl.children[guesses.length];
    row.classList.remove("shake");
    void row.offsetWidth;
    row.classList.add("shake");
  }

  // ---------- input ----------
  let busy = false;
  async function handleKey(key) {
    if (done || busy) return;
    if (key === "Enter") return submit();
    if (key === "Backspace") { current = current.slice(0, -1); return updateCurrentRow(); }
    if (/^[a-z]$/i.test(key) && current.length < COLS) {
      current += key.toLowerCase();
      updateCurrentRow();
    }
  }

  async function submit() {
    if (current.length < COLS) { shake(); return toast("Not enough letters"); }
    if (!WORD_SET.has(current)) { shake(); return toast("Not in word list"); }
    busy = true;
    const word = current;
    guesses.push(word);
    current = "";
    save();
    await paintRow(guesses.length - 1, word, true);
    busy = false;

    const won = word === answer;
    if (won || guesses.length === ROWS) finish(won);
    updateHint();
    if (!done && guesses.length === HINT_AFTER) toast("Last try — here's a hint!", 2000);
  }

  function finish(won) {
    done = true;
    const g = store.games[gameId];
    g.done = true;
    g.won = won;
    const s = modeStats();
    s.played++;
    if (won) {
      s.wins++;
      if (store.mode === "daily") {
        // a daily streak only continues if yesterday's word was also solved
        const n = dayNumber();
        s.streak = s.lastWinDay === n - 1 ? s.streak + 1 : 1;
        s.lastWinDay = n;
      } else s.streak++;
      s.maxStreak = Math.max(s.maxStreak, s.streak);
      s.dist[guesses.length - 1]++;
      const praise = ["Genius!", "Brilliant!", "Impressive!", "Splendid!", "Great!", "Phew!"];
      toast(praise[guesses.length - 1], 2000);
      [...boardEl.children[guesses.length - 1].children].forEach((t, i) =>
        setTimeout(() => t.classList.add("win"), i * 100));
    } else {
      s.streak = 0;
      toast(answer.toUpperCase(), 0);
    }
    save();
    setTimeout(showStats, 2200);
  }

  // ---------- stats ----------
  function showStats() {
    const s = modeStats();
    $("statsTitle").textContent = store.mode === "daily" ? "Daily statistics" : "Practice statistics";
    // daily streak is broken if the last solved daily was before yesterday
    const n = dayNumber();
    if (store.mode === "daily" && s.lastWinDay !== undefined && s.lastWinDay < n - 1) s.streak = 0;
    $("sPlayed").textContent = s.played;
    $("sWin").textContent = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    $("sStreak").textContent = s.streak;
    $("sMax").textContent = s.maxStreak;
    const max = Math.max(1, ...s.dist);
    const g = store.games[gameId];
    $("dist").innerHTML = s.dist.map((n, i) => {
      const cur = g?.won && g.guesses.length === i + 1 ? " current" : "";
      return `<div class="dist-row"><span>${i + 1}</span><div class="dist-bar${cur}" style="width:${Math.max(7, (n / max) * 100)}%">${n}</div></div>`;
    }).join("");
    $("shareBtn").style.display = done ? "" : "none";
    const nb = $("newBtn");
    nb.style.display = done || store.mode === "practice" ? "" : "none";
    nb.textContent = store.mode === "daily" ? "Keep playing" : "New word";
    $("statsDialog").showModal();
  }

  function shareText() {
    const g = store.games[gameId];
    const label = store.mode === "daily" ? `Five Letters #${dayNumber()}` : "Five Letters (practice)";
    const grid = g.guesses.map((w) =>
      score(w, answer).map((s) => (s === "correct" ? "🟩" : s === "present" ? "🟨" : "⬛")).join("")
    ).join("\n");
    const hinted = g.guesses.length >= ROWS ? " 💡" : "";
    return `${label} ${g.won ? g.guesses.length : "X"}/${ROWS}${hinted}\n\n${grid}`;
  }

  // ---------- events ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || $("statsDialog").open) return;
    handleKey(e.key);
  });
  kbEl.addEventListener("click", (e) => {
    const k = e.target.closest("[data-key]");
    if (k) { handleKey(k.dataset.key); k.blur(); }
  });
  $("statsBtn").onclick = showStats;
  $("closeBtn").onclick = () => $("statsDialog").close();
  $("modeBtn").onclick = () => {
    store.mode = store.mode === "daily" ? "practice" : "daily";
    toastEl.classList.remove("show");
    startGame();
    toast(store.mode === "daily" ? "Daily word" : "Practice mode");
  };
  $("newBtn").onclick = playPractice;
  $("hint").addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (b) playPractice();
  });
  $("shareBtn").onclick = async () => {
    const text = shareText();
    try { await navigator.clipboard.writeText(text); toast("Copied to clipboard"); }
    catch { toast("Couldn't copy"); }
  };

  startGame();
})();
