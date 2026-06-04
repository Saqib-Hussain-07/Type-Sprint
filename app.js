// ─── DOM REFERENCES ───────────────────────────────────────────────────────────
const testItem = document.getElementById("textDisplay");
const inputItem = document.getElementById("textInput");
const timeName = document.getElementById("timeName");
const time = document.getElementById("time");
const cwName = document.getElementById("cwName");
const cw = document.getElementById("cw");
const restartBtn = document.getElementById("restartBtn");
const thirty = document.getElementById("thirty");
const sixty = document.getElementById("sixty");
const beg = document.getElementById("beg");
const pro = document.getElementById("pro");

// New feature DOM refs
const customBtn    = document.getElementById("custom");
const customModeSection = document.getElementById("customModeSection");
const customTextInputEl = document.getElementById("customTextInput");
const loadCustomBtn = document.getElementById("loadCustomBtn");
const drillBtn     = document.getElementById("drill");
// Tier 3 & 4 DOM refs
const wordsBtn     = document.getElementById("words");
const wc25Btn      = document.getElementById("wc25");
const wc50Btn      = document.getElementById("wc50");
const wc100Btn     = document.getElementById("wc100");
const suddenBtn    = document.getElementById("sudden");
const zenBtn       = document.getElementById("zen");
const codeBtn      = document.getElementById("code");
const themeToggle  = document.getElementById("themeToggle");
const soundToggle  = document.getElementById("soundToggle");
const capsWarning  = document.getElementById("capsWarning");
const wcOptions    = document.getElementById("wordCountOptions");

// ─── STATE (existing) ─────────────────────────────────────────────────────────
var wordNo = 1;
var wordsSubmitted = 0;
var wordsCorrect = 0;
var timer = 30;
var flag = 0;
var factor = 2;
var seconds;
var difficulty = 1;

// ─── STATE (new features) ─────────────────────────────────────────────────────
var wpmHistory = [];                // [Feature 1] WPM per second
var errorKeys = {};                 // [Feature 2] key -> error count map
var backspaceCount = 0;             // [Feature 3] backspaces on current word
var problemWords = new Set();       // [Feature 3] rage-quit detected words
var elapsedSeconds = 0;             // elapsed time since test start
var ghostBestWPM = parseInt(localStorage.getItem('tsGhostBestWPM') || '0'); // [Feature 5]
var customMode = false;             // [Feature 4] custom text mode toggle
var customWordList = [];            // [Feature 4] user-pasted word array
var wasCorrectBefore = true;        // for error key tracking transition detection
var wpmChart = null;                // Chart.js instance
var prevGhostWordIdx = -1;          // last word index with ghost cursor on it

// ─── STATE (Tier 2 features) ──────────────────────────────────────────────────
var personalRecord = JSON.parse(localStorage.getItem('tsPR') || 'null'); // [Feature 6]
var sessionHistory = JSON.parse(localStorage.getItem('tsSH') || '[]');   // [Feature 9]
if (sessionHistory.length > 25) {
  sessionHistory = sessionHistory.slice(0, 25);
  localStorage.setItem('tsSH', JSON.stringify(sessionHistory));
}
var weakWordsAll = JSON.parse(localStorage.getItem('tsWW') || '[]');     // [Feature 7]
var drillMode = false;              // [Feature 7] drill mode toggle
var wrongWordsThisTest = [];        // [Feature 7 & 8] words mistyped this test
var userScreenIndex = 0;            // tracks active display screen index for ghost cursor syncing

// ─── STATE (Tier 3 & 4) ───────────────────────────────────────────────────────
var wordCountMode  = false;         // [F11] count words instead of time
var targetWordCount = 25;           // [F11] target: 25/50/100
var suddenDeath    = false;         // [F10] one wrong word = game over
var zenMode        = false;         // [F12] no timer, no score, calming
var codeMode       = false;         // [F14] programming vocab
var soundEnabled   = (localStorage.getItem('tsSound') !== 'off'); // [F17]
var audioCtx       = null;          // [F17] Web Audio context
var themes         = ['dark','light','hacker','dracula']; // [F16]
var currentTheme   = localStorage.getItem('tsTheme') || 'dark'; // [F16]

// ─── INIT ─────────────────────────────────────────────────────────────────────
// Apply saved theme immediately (inline, no function call needed)
document.documentElement.setAttribute('data-theme', currentTheme);
// Sound toggle initial visual state
if (!soundEnabled) soundToggle.classList.add('muted');
// Streak badge initial state
(function() {
  var streak = parseInt(localStorage.getItem('tsStreak') || '0');
  var badge = document.getElementById('streakBadge');
  if (badge && streak >= 1) {
    badge.innerHTML = (streak >= 2 ? '\uD83D\uDD25 ' + streak + '-day streak \u2014 keep it up!' : '\uD83D\uDD25 Day 1 streak \u2014 come back tomorrow!');
    badge.style.display = 'block';
  }
})();
displayTest(difficulty);
initChart();
renderGhostBadge();
renderSessionHistory();

// ─── [FEATURE 5] GHOST BADGE ──────────────────────────────────────────────────
function renderGhostBadge() {
  var badge = document.getElementById('ghostBadge');
  if (!badge) return;
  if (ghostBestWPM > 0) {
    badge.innerHTML = '&#128123; Ghost: <span class="yellow">' + ghostBestWPM + ' WPM</span> best &mdash; beat it!';
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// ─── [FEATURE 1] CHART INIT ───────────────────────────────────────────────────
function initChart() {
  var canvas = document.getElementById('wpmChart');
  if (!canvas || typeof Chart === 'undefined') return;
  var ctx = canvas.getContext('2d');
  wpmChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'WPM',
        data: [],
        borderColor: '#ffd369',
        backgroundColor: 'rgba(255, 211, 105, 0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#ffd369',
        pointBorderColor: '#ffd369',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 200 },
      scales: {
        x: {
          ticks: { color: '#52575d', font: { family: "'Source Code Pro', monospace", size: 11 } },
          grid: { color: 'rgba(82, 87, 93, 0.2)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#52575d', font: { family: "'Source Code Pro', monospace", size: 11 } },
          grid: { color: 'rgba(82, 87, 93, 0.2)' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// ─── [FEATURE 4] CUSTOM TEXT MODE ────────────────────────────────────────────
customBtn.addEventListener("click", function(e) {
  e.preventDefault();
  var isOpen = customModeSection.style.display === 'block';
  if (isOpen) {
    customModeSection.style.display = 'none';
    customBtn.classList.remove('yellow');
  } else {
    customModeSection.style.display = 'block';
    customBtn.classList.add('yellow');
    customTextInputEl.focus();
  }
});

loadCustomBtn.addEventListener("click", function(e) {
  e.preventDefault();
  var rawText = customTextInputEl.value.trim();
  if (!rawText) return;
  var words = rawText.split(/\s+/).filter(function(w) { return w.length > 0; });
  if (words.length < 5) return;
  customWordList = words;
  customMode = true;
  customModeSection.style.display = 'none';
  customBtn.classList.add('yellow');
  codeMode = false;
  codeBtn.classList.remove('yellow');
  drillMode = false;
  drillBtn.classList.remove('yellow');
  doRestart();
  inputItem.focus();
});

// ─── INPUT LISTENER (existing + enhanced) ────────────────────────────────────
inputItem.addEventListener('input', function(event) {
  if (flag === 0) {
    flag = 1;
    timeStart();
  }
  var charEntered = event.data;
  if (/\s/g.test(charEntered)) {
    checkWord();
  } else {
    currentWord();
  }
});

// [Feature 3] Backspace tracking for rage quit detection
inputItem.addEventListener('keydown', function(event) {
  if (flag === 0) return;
  if (event.key === 'Backspace') {
    backspaceCount++;
    if (backspaceCount > 5) {
      var span = document.getElementById('word ' + wordNo);
      if (span) {
        var wordText = span.innerText.trim();
        if (wordText && !problemWords.has(wordText)) {
          problemWords.add(wordText);
          span.classList.add('problem-word-highlight');
        }
      }
    }
  }
});

// ─── [FEATURE 7] DRILL MODE ─────────────────────────────────────────────────
drillBtn.addEventListener("click", function(e) {
  e.preventDefault();
  if (weakWordsAll.length < 5) {
    // Flash red to signal not enough weak words collected yet
    drillBtn.style.color = '#e84545';
    setTimeout(function() { drillBtn.style.color = ''; }, 1400);
    return;
  }
  drillMode = !drillMode;
  if (drillMode) {
    drillBtn.classList.add('yellow');
    customMode = false;
    customBtn.classList.remove('yellow');
    customModeSection.style.display = 'none';
    codeMode = false;
    codeBtn.classList.remove('yellow');
    doRestart();
  } else {
    drillBtn.classList.remove('yellow');
    doRestart();
  }
});

// ─── TIME SELECTION (existing + enhanced to reset word count mode and restart) ───
thirty.addEventListener("click", function() {
  timer = 30;
  factor = 2;
  limitColor(thirty, sixty);
  wordCountMode = false;
  wcOptions.style.display = 'none';
  wordsBtn.classList.remove('yellow');
  doRestart();
});
sixty.addEventListener("click", function() {
  timer = 60;
  factor = 1;
  limitColor(sixty, thirty);
  wordCountMode = false;
  wcOptions.style.display = 'none';
  wordsBtn.classList.remove('yellow');
  doRestart();
});

// ─── DIFFICULTY SELECTION (existing + reset custom) ───────────────────────────
beg.addEventListener("click", function() {
  difficulty = 1;
  customMode = false;
  customWordList = [];
  customBtn.classList.remove('yellow');
  customModeSection.style.display = 'none';
  codeMode = false;
  codeBtn.classList.remove('yellow');
  drillMode = false;
  drillBtn.classList.remove('yellow');
  doRestart();
  limitColor(beg, pro);
});
pro.addEventListener("click", function() {
  difficulty = 2;
  customMode = false;
  customWordList = [];
  customBtn.classList.remove('yellow');
  customModeSection.style.display = 'none';
  codeMode = false;
  codeBtn.classList.remove('yellow');
  drillMode = false;
  drillBtn.classList.remove('yellow');
  doRestart();
  limitColor(pro, beg);
});

// ─── LIMIT COLOR (existing) ───────────────────────────────────────────────────
function limitColor(itema, itemr) {
  itema.classList.add('yellow');
  itemr.classList.remove('yellow');
}

// ─── RESTART (existing + new state reset) ─────────────────────────────────────
restartBtn.addEventListener("click", function() {
  doRestart();
  clearInterval(seconds);
  limitVisible();
  // Hide result panels
  document.getElementById('wpmGraphContainer').style.display = 'none';
  document.getElementById('keyboardContainer').style.display = 'none';
  document.getElementById('problemWordsContainer').style.display = 'none';
  document.getElementById('accuracyBreakdown').style.display = 'none';
  var pb = document.getElementById('newPBBadge');
  if (pb) pb.style.display = 'none';
  // Keep session history visible if it has data
  renderSessionHistory();
});

function doRestart() {
  wordsSubmitted = 0;
  wordsCorrect = 0;
  flag = 0;
  // Reset feature state
  wpmHistory = [];
  errorKeys = {};
  backspaceCount = 0;
  problemWords.clear();
  elapsedSeconds = 0;
  wasCorrectBefore = true;
  prevGhostWordIdx = -1;
  userScreenIndex = 0;       // reset screen index
  wrongWordsThisTest = [];   // [Feature 7 & 8] reset wrong words for new test

  time.classList.remove("current");
  cw.classList.remove("current");
  if (wordCountMode) {
    time.innerText = targetWordCount + 'w';
    timeName.innerText = "Time";
  } else if (zenMode) {
    time.innerText = '\u221e';
    timeName.innerText = "Zen";
  } else {
    time.innerText = timer;
    timeName.innerText = "Time";
  }
  cw.innerText = 0;
  cwName.innerText = "CW";
  inputItem.disabled = false;
  inputItem.value = '';
  inputItem.focus();

  // Reset chart data
  if (wpmChart) {
    wpmChart.data.labels = [];
    wpmChart.data.datasets[0].data = [];
    wpmChart.update();
  }

  displayTest(difficulty);
}

// ─── TIME START (existing + WPM tracking + ghost cursor + word count + zen) ───
function timeStart() {
  limitInvisible();
  elapsedSeconds = 0;

  // [F12] Zen mode: display infinity, no countdown
  if (zenMode) {
    time.innerText = '\u221e';
    timeName.innerText = 'Zen';
  } else if (wordCountMode) {
    // [F11] Word count: count UP, show elapsed
    timeName.innerText = 'Time';
    time.innerText = '0s';
  }

  // Show live WPM graph
  document.getElementById('wpmGraphContainer').style.display = 'block';

  seconds = setInterval(function() {
    elapsedSeconds++;

    if (!zenMode && !wordCountMode) {
      // Normal countdown
      time.innerText--;
      if (time.innerText == '-1') {
        timeOver();
        clearInterval(seconds);
        return;
      }
    } else if (wordCountMode) {
      // [F11] Count up display
      time.innerText = elapsedSeconds + 's';
    }
    // [F12] zen: time display stays '\u221e'

    // [Feature 1] Track live WPM
    var currentWPM = elapsedSeconds > 0 ? Math.round((wordsCorrect / elapsedSeconds) * 60) : 0;
    wpmHistory.push(currentWPM);
    if (wpmChart) {
      wpmChart.data.labels.push(elapsedSeconds + 's');
      wpmChart.data.datasets[0].data.push(currentWPM);
      wpmChart.update('none');
    }

    // [Feature 5] Move ghost cursor
    if (ghostBestWPM > 0 && !zenMode && !wordCountMode) {
      updateGhostCursor();
    }
  }, 1000);
}

// ─── LIMIT VISIBILITY (existing + custom + drill + tier3 buttons) ─────────────
function limitVisible() {
  thirty.style.visibility = 'visible';
  sixty.style.visibility = 'visible';
  beg.style.visibility = 'visible';
  pro.style.visibility = 'visible';
  customBtn.style.visibility = 'visible';
  drillBtn.style.visibility = 'visible';
  wordsBtn.style.visibility = 'visible';
  suddenBtn.style.visibility = 'visible';
  zenBtn.style.visibility = 'visible';
  codeBtn.style.visibility = 'visible';
}
function limitInvisible() {
  thirty.style.visibility = 'hidden';
  sixty.style.visibility = 'hidden';
  beg.style.visibility = 'hidden';
  pro.style.visibility = 'hidden';
  customBtn.style.visibility = 'hidden';
  drillBtn.style.visibility = 'hidden';
  wordsBtn.style.visibility = 'hidden';
  suddenBtn.style.visibility = 'hidden';
  zenBtn.style.visibility = 'hidden';
  codeBtn.style.visibility = 'hidden';
}

// ─── [FEATURE 5] GHOST CURSOR ─────────────────────────────────────────────────
function updateGhostCursor() {
  var totalWords = wordCountMode ? targetWordCount : 40;
  var ghostWordsTyped = Math.floor((ghostBestWPM / 60) * elapsedSeconds);
  var ghostScreenIndex = Math.floor(ghostWordsTyped / totalWords);

  // Remove ghost highlight from previous position
  if (prevGhostWordIdx >= 1) {
    var prev = document.getElementById('word ' + prevGhostWordIdx);
    if (prev) prev.classList.remove('ghost-word');
    prevGhostWordIdx = -1;
  }

  // Apply ghost highlight to new position if on the same screen
  if (ghostScreenIndex === userScreenIndex) {
    var ghostIdx = (ghostWordsTyped % totalWords) + 1;
    var target = document.getElementById('word ' + ghostIdx);
    if (target) {
      target.classList.add('ghost-word');
      prevGhostWordIdx = ghostIdx;
    }
  }
}

// ─── TIME OVER (+ Tier 2: PR, session, weak words + Tier 3: sound, animate) ──
function timeOver() {
  inputItem.disabled = true;
  restartBtn.focus();
  document.body.classList.remove('zen-mode');

  var finalWPM, rawWPM, accuracy;

  // [F11] Word count mode: calculate factor from elapsed time
  if (wordCountMode && elapsedSeconds > 0) {
    factor = 60 / elapsedSeconds;
  }

  finalWPM  = Math.round(factor * wordsCorrect);
  rawWPM    = Math.round(factor * wordsSubmitted);
  accuracy  = wordsSubmitted > 0 ? Math.floor((wordsCorrect / wordsSubmitted) * 100) : 0;
  var modeStr = (codeMode ? 'code' : customMode ? 'custom' : drillMode ? 'drill' :
                wordCountMode ? targetWordCount + 'w' : zenMode ? 'zen' :
                suddenDeath ? 'sudden' : (difficulty === 1 ? 'beg' : 'pro'));
  var modeLabel = (wordCountMode ? elapsedSeconds + 's' : timer + 's') + ' \u00b7 ' + modeStr;

  // [Feature 5] Ghost best WPM
  if (finalWPM > ghostBestWPM && finalWPM > 0) {
    ghostBestWPM = finalWPM;
    localStorage.setItem('tsGhostBestWPM', ghostBestWPM);
    renderGhostBadge();
  }

  // [Feature 6] Personal Record: tracked separately from ghost (includes accuracy + date)
  var isPB = false;
  if (finalWPM > 0 && (!personalRecord || finalWPM > personalRecord.wpm)) {
    personalRecord = { wpm: finalWPM, accuracy: accuracy, rawWpm: rawWPM, date: new Date().toLocaleDateString() };
    localStorage.setItem('tsPR', JSON.stringify(personalRecord));
    isPB = true;
  }
  var pbEl = document.getElementById('newPBBadge');
  if (pbEl) pbEl.style.display = isPB ? 'inline-block' : 'none';

  // [Feature 7] Persist wrong words for future drill sessions
  if (wrongWordsThisTest.length > 0) {
    wrongWordsThisTest.forEach(function(w) {
      if (weakWordsAll.indexOf(w) === -1) weakWordsAll.push(w);
    });
    if (weakWordsAll.length > 80) weakWordsAll = weakWordsAll.slice(-80); // cap at 80
    localStorage.setItem('tsWW', JSON.stringify(weakWordsAll));
  }

  // [Feature 9] Save this session to history (max 10)
  if (finalWPM > 0) {
    updateStreak();
    var session = { wpm: finalWPM, accuracy: accuracy, rawWpm: rawWPM, mode: modeLabel, isPB: isPB, ts: Date.now() };
    sessionHistory.unshift(session);
    if (sessionHistory.length > 25) sessionHistory.length = 25;
    localStorage.setItem('tsSH', JSON.stringify(sessionHistory));
  }

  displayScore();
  showExtraResults(finalWPM, accuracy, rawWPM);
  renderSessionHistory();
}

// ─── DISPLAY SCORE (existing, unchanged) ──────────────────────────────────────
function displayScore() {
  var percentageAcc = 0;
  if (wordsSubmitted !== 0) {
    percentageAcc = Math.floor((wordsCorrect / wordsSubmitted) * 100);
  }
  time.classList.add("current");
  cw.classList.add("current");
  time.innerText = percentageAcc + "%";
  timeName.innerText = "PA";
  cw.innerText = factor * wordsCorrect;
  cwName.innerText = "WPM";
}

// ─── SHOW EXTRA RESULTS (Tier 1 F1-F4, Tier 2 F8, Tier 4 F18 animated) ───────
function showExtraResults(wpm, accuracy, rawWpm) {
  // [Feature 8] Accuracy breakdown (with animated counting)
  renderAccuracyBreakdown(wpm, accuracy, rawWpm);
  document.getElementById('accuracyBreakdown').style.display = 'block';

  // [F18] Animate results panel sliding in
  var panel = document.getElementById('extraResultsPanel');
  panel.classList.remove('results-visible');
  void panel.offsetWidth; // force reflow
  panel.classList.add('results-visible');

  // [F18] Count up animation for stat values
  panel.querySelectorAll('.accuracy-stat-value').forEach(function(el) {
    var originalText = el.innerText.trim();
    var hasPercent = originalText.endsWith('%');
    var finalVal = parseInt(originalText);
    if (isNaN(finalVal)) return;
    var duration = 700;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var currentVal = Math.floor(progress * finalVal);
      el.innerText = currentVal + (hasPercent ? '%' : '');
      if (progress < 1) requestAnimationFrame(step);
      else el.innerText = originalText; // restore original text completely
    }
    requestAnimationFrame(step);
  });

  // [Feature 1] Final chart update
  if (wpmChart) wpmChart.update();

  // [Feature 3] Show problem words (rage quit)
  if (problemWords.size > 0) {
    var list = document.getElementById('problemWordsList');
    list.innerHTML = '';
    problemWords.forEach(function(word) {
      var tag = document.createElement('span');
      tag.className = 'problem-word-tag';
      tag.innerText = word;
      list.appendChild(tag);
    });
    document.getElementById('problemWordsContainer').style.display = 'block';
  }

  // [Feature 2] Keyboard heatmap
  renderKeyboardHeatmap();
  document.getElementById('keyboardContainer').style.display = 'block';
}

// ─── [FEATURE 2] KEYBOARD HEATMAP ─────────────────────────────────────────────
function renderKeyboardHeatmap() {
  var rows = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m']
  ];
  var indents = ['0px', '18px', '36px'];
  var container = document.getElementById('keyboardHeatmap');
  container.innerHTML = '';

  var vals = Object.values(errorKeys);
  var maxErrors = vals.length > 0 ? Math.max.apply(null, vals) : 1;

  rows.forEach(function(row, ri) {
    var rowDiv = document.createElement('div');
    rowDiv.className = 'key-row';
    rowDiv.style.marginLeft = indents[ri];

    row.forEach(function(key) {
      var keyDiv = document.createElement('div');
      keyDiv.className = 'key';
      keyDiv.innerText = key.toUpperCase();

      var errs = errorKeys[key] || 0;
      if (errs > 0) {
        var ratio = errs / maxErrors;
        if (ratio <= 0.33) keyDiv.classList.add('heat-1');
        else if (ratio <= 0.66) keyDiv.classList.add('heat-2');
        else keyDiv.classList.add('heat-3');
        keyDiv.title = errs + ' error' + (errs !== 1 ? 's' : '');
      }
      rowDiv.appendChild(keyDiv);
    });
    container.appendChild(rowDiv);
  });

  // Add a "no errors" note if all keys are clean
  if (vals.length === 0) {
    var note = document.createElement('div');
    note.style.color = '#29bb89';
    note.style.fontSize = '14px';
    note.style.marginTop = '8px';
    note.innerText = '✓ Perfect — no key errors recorded';
    container.appendChild(note);
  }
}

// ─── CURRENT WORD (existing + [Feature 2] error key tracking) ────────────────
function currentWord() {
  var wordEntered = inputItem.value;
  var currentID = "word " + wordNo;
  var currentSpan = document.getElementById(currentID);
  var curSpanWord = currentSpan.innerText;

  if (wordEntered == curSpanWord.substring(0, wordEntered.length)) {
    colorSpan(currentID, 2);
    wasCorrectBefore = true;
  } else {
    // [Feature 2] Record which key triggered the first error on this word
    if (wasCorrectBefore && wordEntered.length > 0) {
      var errorChar = wordEntered[wordEntered.length - 1].toLowerCase();
      if (/^[a-z]$/.test(errorChar)) {
        errorKeys[errorChar] = (errorKeys[errorChar] || 0) + 1;
      }
    }
    colorSpan(currentID, 3);
    wasCorrectBefore = false;
  }
}

// ─── CHECK WORD (existing + [Feature 3] backspace reset) ─────────────────────
function checkWord() {
  var wordEntered = inputItem.value;
  inputItem.value = '';

  // [Feature 3] Reset backspace counter and correctness flag for next word
  backspaceCount = 0;
  wasCorrectBefore = true;

  var wordID = "word " + wordNo;
  var checkSpan = document.getElementById(wordID);
  if (checkSpan) checkSpan.classList.remove('problem-word-highlight');

  wordNo++;
  wordsSubmitted++;

  if (checkSpan.innerText === wordEntered) {
    colorSpan(wordID, 1);
    wordsCorrect++;
    cw.innerText = wordsCorrect;
  } else {
    colorSpan(wordID, 3);
    // [Feature 7 & 8] track mistyped words
    var wrongWord = checkSpan.innerText.trim();
    if (wrongWord && wrongWordsThisTest.indexOf(wrongWord) === -1) {
      wrongWordsThisTest.push(wrongWord);
    }
    // [F10] Sudden Death: end on first wrong word
    if (suddenDeath) {
      clearInterval(seconds);
      timeOver();
      return;
    }
  }

  // [F11] Word count mode: end when target reached
  if (wordCountMode && wordsSubmitted >= targetWordCount) {
    clearInterval(seconds);
    timeOver();
    return;
  }

  var totalWords = wordCountMode ? targetWordCount : 40;
  if (wordNo > totalWords) {
    userScreenIndex++;
    displayTest(difficulty);
  } else {
    var nextID = "word " + wordNo;
    colorSpan(nextID, 2);
  }
}

// ─── COLOR SPAN (existing) ────────────────────────────────────────────────────
function colorSpan(id, color) {
  var span = document.getElementById(id);
  if (!span) return;
  if (color === 1) {
    span.classList.remove('wrong');
    span.classList.remove('current');
    span.classList.add('correct');
  } else if (color === 2) {
    span.classList.remove('correct');
    span.classList.remove('wrong');
    span.classList.add('current');
  } else {
    span.classList.remove('correct');
    span.classList.remove('current');
    span.classList.add('wrong');
  }
}

// ─── DISPLAY TEST (existing + [Feature 4] custom mode) ────────────────────────
function displayTest(diff) {
  wordNo = 1;
  testItem.innerHTML = '';
  prevGhostWordIdx = -1;

  var count = 40;
  if (wordCountMode) {
    count = targetWordCount;
  }

  var newTest;
  // [Feature 7] Drill mode uses persisted weak words
  if (drillMode && weakWordsAll.length >= 5) {
    newTest = [];
    var shuffled = weakWordsAll.slice().sort(function() { return Math.random() - 0.5; });
    for (var i = 0; i < count; i++) {
      newTest.push(shuffled[i % shuffled.length] + " ");
    }
  // [F14] Code mode: programming vocabulary
  } else if (codeMode) {
    var codeWords = ["function","return","const","let","var","if","else","while","for","class","import","export","async","await","new","this","true","false","null","array","object","string","number","boolean","undefined","switch","case","break","continue","try","catch","throw","promise","resolve","reject","module","require","console","debug","fetch","then","callback","closure","scope","prototype","static","extends","constructor","interface","push","pop","map","filter","reduce","find","index","length","render","state","props","effect","hook","event","listener","error","parse","stringify","assign","create","freeze","timeout","interval","element","document","window","component","middleware","router","controller","service","repository","model","view","context","provider","type","generic","algorithm","recursion","iteration","data","structure","stack","queue","graph","node","edge","search","sort","binary","linear","hash","cache","pointer","memory","compile","runtime","syntax","debug","deploy","server","client","request","response","header","token","session","cookie","database","query","schema","index","join","transaction","migration","endpoint","payload","format","encode","decode","encrypt","stream","buffer","thread","process","signal","socket","protocol","method","property","value","result","output","input","config","option","flag","param","argument","variable","constant","operator","expression","statement","block","scope","namespace","package","library","framework","version","update","install","build","test","validate","assert","expect","mock","stub","fixture","benchmark","profile","optimize"];
    newTest = [];
    for (var i = 0; i < count; i++) {
      var idx = Math.floor(Math.random() * codeWords.length);
      newTest.push(codeWords[idx] + " ");
    }
  // [Feature 4] Custom pasted text
  } else if (customMode && customWordList.length >= 5) {
    newTest = [];
    for (var i = 0; i < count; i++) {
      newTest.push(customWordList[i % customWordList.length] + " ");
    }
  } else {
    newTest = randomWords(diff, count);
  }

  newTest.forEach(function(word, i) {
    var wordSpan = document.createElement('span');
    wordSpan.innerText = word;
    wordSpan.setAttribute("id", "word " + (i + 1));
    testItem.appendChild(wordSpan);
  });

  colorSpan("word " + wordNo, 2);
}

//Generate an array of random words
function randomWords(diff, count){
  if (!count) count = 40;

  var topWords = ["ability", "able", "about", "above", "accept", "according", "account", "across", "action", "activity", "actually",  "address", "administration", "admit", "adult", "affect", "after", "again", "against",  "agency", "agent", "ago", "agree", "agreement", "ahead",  "allow", "almost", "alone", "along", "already", "also", "although", "always", "American", "among", "amount", "analysis", "and", "animal", "another", "answer",  "anyone", "anything", "appear", "apply", "approach", "area", "argue",  "around", "arrive", "article", "artist",  "assume", "attack", "attention", "attorney", "audience", "author", "authority", "available", "avoid", "away", "baby", "back",   "ball", "bank",  "beat", "beautiful", "because", "become",  "before", "begin", "behavior", "behind", "believe", "benefit", "best", "better", "between", "beyond",  "bill", "billion",  "black", "blood", "blue", "board", "body", "book", "born", "both", "break", "bring", "brother", "budget", "build", "building", "business", "call", "camera", "campaign",  "cancer", "candidate", "capital", "card", "care", "career", "carry", "case", "catch", "cause", "cell", "center", "central", "century", "certain", "certainly", "chair", "challenge", "chance", "change", "character", "charge", "check", "child", "choice", "choose", "church", "citizen", "city", "civil", "claim", "class", "clear", "clearly", "close", "coach", "cold", "collection", "college", "color", "come", "commercial", "common", "community", "company", "compare", "computer", "concern", "condition", "conference", "congress", "consider", "consumer", "contain", "continue", "control", "cost", "could", "country", "couple", "course", "court", "cover", "create", "crime", "cultural", "culture", "cup", "current", "customer",  "dark", "data", "daughter",  "dead", "deal", "death", "debate", "decade", "decide", "decision", "deep", "defense", "degree", "Democrat", "democratic", "describe", "design", "despite", "detail", "determine", "develop", "development",  "difference", "different", "difficult", "dinner", "direction", "director", "discover", "discuss", "discussion", "disease", "doctor",  "door", "down", "draw", "dream", "drive", "drop", "drug", "during", "each", "early", "east", "easy",  "economic", "economy", "edge", "education", "effect", "effort", "eight", "either", "election", "else", "employee",  "energy", "enjoy", "enough", "enter", "entire", "environment", "environmental", "especially", "establish", "even", "evening", "event", "ever", "every", "everybody", "everyone", "everything", "evidence", "exactly", "example", "executive", "exist", "expect", "experience", "expert", "explain", "eye", "face", "fact", "factor", "fail", "fall", "family", "far", "fast", "father", "fear", "federal", "feel", "feeling",  "field", "fight", "figure", "fill", "film", "final", "finally", "financial", "find", "fine", "finger", "finish", "fire", "firm", "first", "fish", "five", "floor", "fly", "focus", "follow", "food", "foot",  "force", "foreign", "forget", "form", "former", "forward", "four", "free", "friend", "from", "front", "full", "fund", "future", "game", "garden",  "general", "generation",  "girl", "give", "glass", "goal", "good", "government", "great", "green", "ground", "group", "grow", "growth", "guess", "guy", "hair", "half", "hand", "hang", "happen", "happy", "hard", "have",  "head", "health", "hear", "heart", "heat", "heavy", "help", "here", "herself", "high", "him", "himself", "his", "history",  "hold", "home", "hope", "hospital", "hot", "hotel", "hour", "house", "how", "however", "huge", "human", "hundred", "husband", "I", "idea", "identify", "if", "image", "imagine", "impact", "important", "improve",  "include", "including", "increase", "indeed", "indicate", "individual", "industry", "information", "inside", "instead", "institution", "interest", "interesting", "international", "interview", "into", "investment", "involve", "issue",  "item", "it's", "itself", "join", "just", "keep",  "kill", "kind", "kitchen", "know", "knowledge", "land", "language", "large", "last", "late", "later", "laugh", "law", "lawyer", "lead", "leader", "learn", "least", "leave", "left",  "legal", "less",  "letter", "level",  "life", "light", "like", "likely", "line", "list", "listen", "little", "live", "local", "long", "look", "lose", "loss", "love", "machine", "magazine", "main", "maintain", "major", "majority", "make", "man", "manage", "management", "manager", "many", "market", "marriage", "material", "matter", "maybe",  "mean", "measure", "media", "medical", "meet", "meeting", "member", "memory", "mention", "message", "method", "middle", "might", "military", "million", "mind", "minute", "miss", "magic", "model", "modern", "moment", "money", "month", "more", "morning", "most", "mother", "mouth", "move", "movement", "movie", "Mr", "Mrs", "much", "music", "must", "my", "myself", "name", "nation", "national", "natural", "nature", "near", "nearly", "necessary", "need", "network", "never",  "news", "newspaper", "next", "nice", "night",  "none",  "north",  "note", "nothing", "notice",  "number", "occur", "off", "offer", "office", "officer", "official", "often", "once", "only", "onto", "open", "operation", "opportunity", "option",  "order", "organization", "other", "others",  "outside", "over", "own", "owner", "page", "pain", "painting", "paper", "parent", "part", "participant", "particular", "particularly", "partner", "party", "pass", "past", "patient", "pattern", "peace", "people", "perform", "performance", "perhaps", "period", "person", "personal", "phone", "physical", "pick", "picture", "piece", "place", "plan", "plant", "play", "player", "PM", "point", "police", "policy", "political", "politics", "poor", "popular", "population", "position", "positive", "possible", "power", "practice", "prepare", "present", "president", "pressure", "pretty", "prevent", "price", "private", "probably", "problem", "process", "produce", "product", "production", "professional", "professor", "program", "project", "property", "protect", "prove", "provide", "public", "pull", "purpose", "push",  "quality", "question", "quickly", "quite", "race", "radio", "raise", "range", "rate", "rather", "reach", "read", "ready", "real", "reality", "realize", "really", "reason", "receive", "recent", "recently", "recognize", "record", "red", "reduce", "reflect", "region", "relate", "relationship", "religious", "remain", "remember", "remove", "report", "represent", "republican", "require", "research", "resource", "respond", "response", "responsibility", "rest", "result", "return", "reveal", "rich", "right", "rise", "risk", "road", "rock", "role", "room", "rule",  "safe", "same", "save",  "scene", "school", "science", "scientist", "score", "sea", "season", "seat", "second", "section", "security", "see", "seek", "seem", "sell", "send", "senior", "sense", "series", "serious", "serve", "service", "set", "seven", "several", "sex", "sexual", "shake", "share", "she", "shoot", "short", "shot", "should", "shoulder", "show", "side", "sign", "significant", "similar", "simple", "simply", "since", "sing", "single", "sister",   "situation", "size", "skill", "skin", "small", "smile",  "social", "society", "soldier", "some", "somebody", "someone", "something", "sometimes", "song", "soon", "sort", "sound", "source", "south", "southern", "space", "speak", "special", "specific", "speech", "spend", "sport", "spring", "staff", "stage", "stand", "standard", "star", "start", "state", "statement", "station", "stay", "step", "still", "stock", "stop", "store", "storm", "story",  "street", "study", "stupid",  "such", "sugar",  "sun", "sunny",  "sure",  "sweet", "swim", "sword", "table", "take", "talk", "task", "tax", "teach", "teacher", "team", "technology", "television", "tell",  "tend", "term", "test", "than", "thank", "that",  "their", "them", "themselves", "then", "theory", "there", "these", "they", "thing", "think", "third", "this",  "threat", "three", "through", "throughout", "throw", "thus", "time", "today", "together", "tonight",  "total", "tough", "toward", "town", "trade", "traditional", "training", "travel", "treat", "treatment", "tree", "trial", "trip", "trouble", "true", "truth", "try", "turn", "TV",  "type", "under", "understand", "unit", "until", "usually", "value", "various", "very", "victim", "view", "violence", "visit", "voice", "vote", "wait", "walk", "warm", "was", "wash", "waste", "watch", "water", "way", "we", "weak", "wear",  "week", "weight",  "were", "well", "west", "wet", "what", "wheel", "when", "where", "whether", "which", "while", "white",  "whole", "whom", "whose",  "wide", "wife", "will", "wind", "window", "wish", "with", "within", "without", "woman", "wonder", "word", "work", "worker", "world", "worry", "would", "write", "writer", "wrong", "yard", "yeah", "year", "young", "your", "zero", "zoo"];

  var basicWords = ["a", "about", "above", "across", "act",  "add", "afraid", "after", "again", "age", "ago", "agree", "air", "all", "alone", "along", "always", "am", "amount", "an", "and", "angry", "another", "answer", "any", "anyone",  "appear", "apple", "are", "area", "arm", "army", "around", "arrive", "art", "as", "ask", "at", "aunt",  "away", "baby", "back", "bad", "bag", "ball", "bank", "base",  "bath", "be", "bean", "bear",  "bed", "beer", "before", "begin", "bell", "below", "best", "big", "bird", "birth",  "bit", "bite", "black", "bleed", "block", "blood", "blow", "blue", "board", "boat", "body", "boil", "bone", "book", "border", "born", "both",  "bowl", "box", "boy", "branch", "brave", "bread", "break", "breathe", "bridge", "bright", "bring", "brother", "brown", "brush", "build", "burn",  "bus", "busy", "but", "buy", "by", "cake", "call", "can",  "cap", "car", "card", "care", "carry", "case", "cat", "catch",  "chair", "chase", "cheap", "cheese",  "child",   "choice",  "circle", "city", "class", "clever", "clean", "clear", "climb", "clock", "cloth",  "cloud",  "close", "coffee", "coat", "coin", "cold",  "colour", "comb",  "common", "compare", "come",  "control", "cook", "cool", "copper", "corn", "corner", "correct", "cost",  "count",   "cover", "crash", "cross", "cry", "cup",  "cut", "dance",  "dark",  "day", "dead", "decide", "deep", "deer",  "desk",   "die",  "dirty",  "dish", "do", "dog", "door",  "down", "draw", "dream", "dress", "drink", "drive", "drop", "dry", "duck", "dust", "duty", "each", "ear", "early", "earn", "earth", "east", "easy", "eat", "effect", "egg", "eight",   "else", "empty", "end", "enemy", "enjoy",  "enter", "equal",  "even",  "event", "ever", "every",  "exact",   "except",  "expect",  "explain",  "eye", "face", "fact", "fail", "fall", "false", "family", "famous", "far", "farm",  "fast", "fat", "fault", "fear", "feed", "feel", "fever", "few", "fight", "fill", "film", "find", "fine",  "fire", "first", "fish", "fit", "five", "fix", "flag", "flat", "float", "floor", "flour",  "fly", "fold", "food", "fool", "foot", "for", "force",  "forest", "forget",  "fork", "form", "fox", "four", "free", "freeze", "fresh", "friend",  "from", "front", "fruit", "full", "fun", "funny",   "future", "game",  "gate","get", "gift", "give", "glad", "glass", "go", "goat", "god", "gold", "good",   "grass", "grave", "great", "green", "gray",  "group", "grow", "gun", "hair", "half", "hall",  "hand",  "happy", "hard", "hat", "hate", "have", "he", "head",  "hear", "heavy", "heart",  "hello", "help", "hen", "her", "here", "hers", "hide", "high", "hill", "him", "his", "hit", "hobby", "hold", "hole",  "home", "hope", "horse",  "hot", "hotel", "house", "how",  "hour", "hurry",  "hurt", "I", "ice", "idea", "if",  "in",   "into", "invent", "iron",  "is", "island", "it", "its", "jelly", "job", "join", "juice", "jump", "just", "keep", "key", "kill", "kind", "king",  "knee", "knife", "knock", "know", "lady", "lamp", "land", "large", "last", "late", "laugh", "lazy", "lead", "leaf", "learn", "leave", "leg", "left", "lend", "length", "less", "lesson", "let", "letter", "lie", "life", "light", "like", "lion", "lip", "list",  "live", "lock", "lonely", "long", "look", "lose", "lot", "love", "low", "lower", "luck",  "main", "make", "male", "man", "many", "map", "mark", "may", "me", "meal", "mean", "meat",  "meet",  "milk", "mind",  "miss",  "mix", "model",   "money",  "month", "moon", "more",  "most",  "mouth", "move", "much", "music", "must", "my", "name",  "near", "neck", "need", "needle",  "net", "never", "new", "news",  "next", "nice", "night", "nine", "no", "noble", "noise", "none", "nor", "north", "nose", "not",  "notice", "now",  "obey",  "ocean", "of", "off", "offer", "office", "often", "oil", "old", "on", "one", "only", "open",  "or", "orange", "order", "other", "our", "out",  "over", "own", "page", "paint", "pair", "pan", "paper",  "park", "part",  "party", "pass", "past", "path", "pay", "peace", "pen",   "per",  "piano", "pick",  "piece", "pig", "pin", "pink", "place", "plane", "plant",  "plate", "play", "please",  "plenty",  "point",  "polite", "pool", "poor",    "pour", "power",  "press", "pretty",  "price", "prince", "prison",  "prize",      "pull", "punish", "pupil", "push", "put", "queen",  "quick", "quiet", "radio", "rain", "rainy", "raise", "reach", "read", "ready", "real",  "red",   "rent",   "reply", "rest",  "rice", "rich", "ride", "right", "ring", "rise", "road", "rob", "rock", "room", "round", "rude", "rule", "ruler", "run", "rush", "sad", "safe", "sail", "salt", "same", "sand", "save", "say", "school",  "search", "seat", "second", "see", "seem", "sell", "send",  "serve", "seven", "sex", "shade",  "shake", "shape", "share", "sharp", "she", "sheep", "sheet",  "shine", "ship", "shirt", "shoe", "shoot", "shop", "short",   "shout", "show", "sick", "side",   "silly", "silver",  "simple", "single", "since", "sing", "sink", "sister", "sit", "six", "size", "skill", "skin", "skirt", "sky", "sleep", "slip", "slow", "small", "smell", "smile", "smoke", "snow", "so", "soap", "sock", "soft", "some",  "son", "soon", "sorry", "sound", "soup", "south", "space", "speak",  "speed", "spell", "spend", "spoon", "sport", "spread", "spring", "square", "stamp", "stand", "star", "start",  "stay", "steal", "steam", "step", "still",  "stone", "stop", "store", "storm", "story",  "street", "study", "stupid",  "such", "sugar",  "sun", "sunny",  "sure",  "sweet", "swim", "sword", "table", "take", "talk", "tall", "taste", "taxi", "tea", "teach", "team", "tear",   "tell", "ten", "tennis", "test", "than", "that", "the", "their", "then", "there",  "these", "thick", "thin", "thing", "think", "third", "this",  "threat", "three", "tidy", "tie", "title", "to", "today", "toe", "too", "tool", "tooth", "top", "total", "touch", "town", "train", "tram",  "tree",  "true", "trust", "twice", "try", "turn", "type", "ugly", "uncle", "under",  "unit", "until", "up", "use", "useful", "usual", "usually",  "very",  "voice", "visit", "wait", "wake", "walk", "want", "warm", "was", "wash", "waste", "watch", "water", "way", "we", "weak", "wear",  "week", "weight",  "were", "well", "west", "wet", "what", "wheel", "when", "where", "which", "while", "white",  "whole", "whom", "whose",  "wide", "wife", "will", "wind", "window", "wish", "with", "within", "without", "woman", "wonder", "word", "work", "worker", "world", "worry", "yard", "yell",  "yet", "you", "young", "your", "zero", "zoo"];

  if(diff==1){
    wordArray = basicWords;
  }
  else{
    wordArray =topWords;
  }

  var selectedWords = [];
  for(var i=0;i<count;i++){
    var randomNumber = Math.floor(Math.random()*wordArray.length);
    selectedWords.push(wordArray[randomNumber]+" ");
  }
  return selectedWords;
}

// ══════════════════════════════════════════════════════════════════════════════
// TIER 3 & 4 FEATURES — ALL NEW FUNCTIONS & LISTENERS
// ══════════════════════════════════════════════════════════════════════════════

// ─── [F17] SOUND ENGINE (Web Audio API) ─────────────────────────────────────
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playKeyClick() {
  if (!soundEnabled) return;
  try {
    var ctx = getAudioCtx();
    var osc = ctx.createOscillator(); var g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = 700 + Math.random() * 200;
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(); osc.stop(ctx.currentTime + 0.04);
  } catch(e) {}
}
function playError() {
  if (!soundEnabled) return;
  try {
    var ctx = getAudioCtx();
    var osc = ctx.createOscillator(); var g = ctx.createGain();
    osc.type = 'sawtooth'; osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = 140;
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(); osc.stop(ctx.currentTime + 0.12);
  } catch(e) {}
}
function playComplete() {
  if (!soundEnabled) return;
  try {
    var ctx = getAudioCtx();
    [523, 659, 784].forEach(function(freq, i) {
      var osc = ctx.createOscillator(); var g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = freq;
      var t = ctx.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t); osc.stop(t + 0.45);
    });
  } catch(e) {}
}

// ─── [F17] SOUND TOGGLE ──────────────────────────────────────────────────────
function updateSoundToggle() {
  if (soundEnabled) soundToggle.classList.remove('muted');
  else              soundToggle.classList.add('muted');
}
soundToggle.addEventListener('click', function(e) {
  e.preventDefault();
  soundEnabled = !soundEnabled;
  localStorage.setItem('tsSound', soundEnabled ? 'on' : 'off');
  updateSoundToggle();
});

// Hook sound into existing input listener
inputItem.addEventListener('input', function() {
  if (flag === 1) playKeyClick();
}, true); // capture phase so it fires before other input listener

// ─── [F16] THEME SWITCHER ────────────────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  currentTheme = t;
  localStorage.setItem('tsTheme', t);
}
themeToggle.addEventListener('click', function(e) {
  e.preventDefault();
  var idx = (themes.indexOf(currentTheme) + 1) % themes.length;
  applyTheme(themes[idx]);
});

// ─── [F19] CAPS LOCK DETECTION ───────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (typeof e.getModifierState === 'function') {
    capsWarning.style.display = e.getModifierState('CapsLock') ? 'block' : 'none';
  }
  // [F12] Zen mode Esc to stop
  if (e.key === 'Escape' && zenMode && flag === 1) {
    clearInterval(seconds);
    timeOver();
  }
});

// ─── [F13] STREAK COUNTER ────────────────────────────────────────────────────
function updateStreak() {
  var today = new Date().toDateString();
  var lastDate = localStorage.getItem('tsLastDate') || '';
  var streak = parseInt(localStorage.getItem('tsStreak') || '0');
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toDateString();

  if (lastDate === today) {
    // Already tested today — streak unchanged
  } else if (lastDate === yesterdayStr) {
    streak++; // Consecutive day!
    localStorage.setItem('tsStreak', streak);
  } else if (lastDate === '') {
    streak = 1;
    localStorage.setItem('tsStreak', streak);
  } else {
    streak = 1; // Streak broken
    localStorage.setItem('tsStreak', streak);
  }
  localStorage.setItem('tsLastDate', today);
  updateStreakBadge();
}
function updateStreakBadge() {
  var badge = document.getElementById('streakBadge');
  if (!badge) return;
  var streak = parseInt(localStorage.getItem('tsStreak') || '0');
  if (streak >= 2) {
    badge.innerHTML = '\uD83D\uDD25 ' + streak + '-day streak \u2014 keep it up!';
    badge.style.display = 'block';
  } else if (streak === 1) {
    badge.innerHTML = '\uD83D\uDD25 Day 1 streak \u2014 come back tomorrow!';
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// ─── [F11] WORD COUNT MODE ───────────────────────────────────────────────────
wordsBtn.addEventListener('click', function(e) {
  e.preventDefault();
  wordCountMode = true;
  wcOptions.style.display = 'flex';
  wordsBtn.classList.add('yellow');
  thirty.classList.remove('yellow');
  sixty.classList.remove('yellow');
  time.innerText = targetWordCount + 'w';
  doRestart();
});
function setWordCount(n, el) {
  targetWordCount = n;
  [wc25Btn, wc50Btn, wc100Btn].forEach(function(b) { b.classList.remove('yellow'); });
  el.classList.add('yellow');
  time.innerText = n + 'w';
  doRestart();
}
wc25Btn.addEventListener('click',  function(e) { e.preventDefault(); setWordCount(25, wc25Btn); });
wc50Btn.addEventListener('click',  function(e) { e.preventDefault(); setWordCount(50, wc50Btn); });
wc100Btn.addEventListener('click', function(e) { e.preventDefault(); setWordCount(100, wc100Btn); });



// ─── [F10] SUDDEN DEATH MODE ─────────────────────────────────────────────────
suddenBtn.addEventListener('click', function(e) {
  e.preventDefault();
  suddenDeath = !suddenDeath;
  zenMode = false;
  zenBtn.classList.remove('yellow');
  document.body.classList.remove('zen-mode');
  suddenBtn.classList.toggle('yellow', suddenDeath);
  doRestart();
});

// ─── [F12] ZEN MODE ──────────────────────────────────────────────────────────
zenBtn.addEventListener('click', function(e) {
  e.preventDefault();
  zenMode = !zenMode;
  suddenDeath = false;
  suddenBtn.classList.remove('yellow');
  zenBtn.classList.toggle('yellow', zenMode);
  if (zenMode) {
    document.body.classList.add('zen-mode');
    timer = 9999;
    time.innerText = '\u221e';
    timeName.innerText = 'Zen';
  } else {
    document.body.classList.remove('zen-mode');
    timer = 30; time.innerText = 30;
    timeName.innerText = 'Time';
  }
  doRestart();
});

// ─── [F14] CODE MODE ─────────────────────────────────────────────────────────
codeBtn.addEventListener('click', function(e) {
  e.preventDefault();
  codeMode = !codeMode;
  if (codeMode) {
    codeBtn.classList.add('yellow');
    customMode = false; drillMode = false;
    customBtn.classList.remove('yellow');
    drillBtn.classList.remove('yellow');
    customModeSection.style.display = 'none';
  } else {
    codeBtn.classList.remove('yellow');
  }
  doRestart();
});

// ─── [F17] Also play error sound when currentWord detects mismatch ───────────
// Patch: re-export currentWord to call playError on first mistake
var _origCurrentWord = currentWord;
currentWord = function() {
  var wasBefore = wasCorrectBefore;
  _origCurrentWord();
  if (!wasCorrectBefore && wasBefore) playError();
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 NEW FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// ─── [FEATURE 8] ACCURACY BREAKDOWN ─────────────────────────────────────────
function renderAccuracyBreakdown(wpm, accuracy, rawWpm) {
  var grid = document.getElementById('accuracyGrid');
  if (!grid) return;
  var wrong = wordsSubmitted - wordsCorrect;
  grid.innerHTML = '';
  var stats = [
    { value: wpm,              label: 'WPM',     color: '#ffd369' },
    { value: rawWpm,           label: 'Raw WPM', color: '#eeeeee' },
    { value: accuracy + '%',   label: 'Accuracy',color: accuracy >= 95 ? '#29bb89' : accuracy >= 80 ? '#ffd369' : '#e84545' },
    { value: wordsCorrect,     label: 'Correct', color: '#29bb89' },
    { value: wrong,            label: 'Wrong',   color: wrong > 0 ? '#e84545' : '#29bb89' }
  ];
  stats.forEach(function(s) {
    var div = document.createElement('div');
    div.className = 'accuracy-stat';
    div.innerHTML =
      '<div class="accuracy-stat-value" style="color:' + s.color + '">' + s.value + '</div>' +
      '<div class="accuracy-stat-label">' + s.label + '</div>';
    grid.appendChild(div);
  });
}

// ─── [FEATURE 9] SESSION HISTORY ────────────────────────────────────────────
function renderSessionHistory() {
  var container = document.getElementById('sessionHistoryContainer');
  var tbody = document.getElementById('historyBody');
  if (!tbody || !container) return;

  if (sessionHistory.length === 0) {
    container.style.display = 'none';
    return;
  }

  tbody.innerHTML = '';
  sessionHistory.forEach(function(s, idx) {
    var tr = document.createElement('tr');
    if (s.isPB) tr.classList.add('pb-row');
    var d = new Date(s.ts);
    var timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var pbStar = s.isPB ? ' &#9733;' : '';
    tr.innerHTML =
      '<td>' + timeStr + '</td>' +
      '<td>' + s.wpm + pbStar + '</td>' +
      '<td>' + s.accuracy + '%</td>' +
      '<td>' + s.mode + '</td>';
    tbody.appendChild(tr);
  });

  container.style.display = 'block';
}
