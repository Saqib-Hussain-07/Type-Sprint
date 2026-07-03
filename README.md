Type-Sprint is a feature-rich, premium typing practice web application designed to help users measure, analyze, and dramatically improve their typing speed, accuracy, and muscle memory. 

Built with **pure Vanilla JavaScript, CSS3, Bootstrap 4, and HTML5**, Type-Sprint delivers a seamless, distraction-free typing experience paired with deep analytical insights, gamification mechanics, and a polished, modern developer-focused aesthetic.

---

## 🚀 Key Features

### 📊 Performance Analytics & Visualizations
*   **Real-time WPM Graph:** Plots your Word-Per-Minute (WPM) progress second-by-second using a beautiful **Chart.js** line graph, helping you visualize pacing consistency and typing drops.
*   **Mistake Heatmap:** A visual virtual keyboard diagram that dynamically highlights keys you mistype the most. Color-coded by heat levels (`low`, `mid`, `high`) using soft transitions.
*   **Rage Quit & Problem Words Detection:** Automatically tracks words where you backspaced 5 or more times. Highlights them during the test and lists them as "Problem Words" on the results screen for focused practice.
*   **Detailed Results Breakdown:** Animated results card that counts up your final metrics:
    *   **WPM** (Words Per Minute)
    *   **Raw WPM** (Total keypresses / 5 / minutes)
    *   **Accuracy %** (Color-coded: Green for $\ge 95\%$, Yellow for $\ge 80\%$, Red for $< 80\%$)
    *   **Correct Words** count
    *   **Wrong Words** count

### 🎮 Gamification & Progression
*   **Ghost Racer Mode:** Race against your personal best! A highlighted blue ghost cursor moves through the words at the exact speed of your high score record.
*   **Daily Streak System:** Tracks consecutive practice days using `localStorage`. Displays a dynamic flame badge ($\text{🔥}$) to motivate daily practice.
*   **Session Leaderboard:** Displays a rolling history of your last 10 attempts (stored locally) indicating the time, WPM, accuracy, mode, and whether a new Personal Best was achieved.
*   **Audio Feedback Engine:** Synthesizes mechanical keyboard click sounds, warning buzzers for errors, and a pleasant completion sound using the **Web Audio API** (no external audio assets required).

### ⚙️ Content Modes & Rulesets
*   **Interactive Hover Tooltips:** Hovering over any toolbar option reveals detailed, premium CSS-animated tooltip bubbles explaining its functionality.
*   **Zen Mode:** Distraction-free, relaxed typing. There are no timers, no scores, and no pressure. Press `Escape` or the restart button whenever you are ready to stop.
*   **Word Count Mode:** Swap the timer for a word goal! Type **25**, **50**, or **100** words as fast as you can while the timer counts upward. Words are generated dynamically to match the selected goal (e.g. exactly 50 words for 50w mode).
*   **Code Mode:** Practice typing programming vocabulary and common coding symbols to build your coding muscle memory.
*   **Drill Mode:** Automatically extracts words you struggled with in recent tests and generates a custom drill text containing only those weak words.
*   **Custom Paste Mode:** Paste any paragraph, essay, article, or source code snippet into the app to practice typing it.
*   **Sudden Death Mode:** The ultimate challenge. Typing a single incorrect character instantly ends the test, perfect for precision training.

---

## 🎨 Aesthetics & Personalization
Type-Sprint features dynamic, modern custom themes that alter the full-page theme state dynamically:
1.  **Dark (Default):** A sleek dark background with high-contrast yellow accents.
2.  **Light:** A soft, clean, warm-light workspace.
3.  **Hacker Green:** Retro green-on-black monospace terminal appearance.
4.  **Dracula:** A premium cyberpunk palette featuring purple, pink, and yellow details.

**Extra UI Polish:**
*   **Centered Card Layout:** The entire app workspace is hosted inside a modern dark card featuring subtle borders, dropshadows, and balanced padding.
*   **Sleek Toolbar Pill:** Reorganized limits box grouped into a pill shape with vertical separators and custom-aligned sub-pills.
*   **Smooth Blinking Caret:** Smooth, CSS-animated blinking caret highlighting the exact letter you are typing.
*   **Caps Lock Warning:** Automatically shows a warning banner if you start typing with Caps Lock enabled.
*   **Micro-interactions:** Interactive elements rotate, transition, and expand smoothly (e.g. restart button spinning on hover).

---

## 📂 Project Architecture

The application is structured cleanly without bloated build chains or heavy framework overhead:

```text
Type-Sprint/
├── index.html       # Single-page interface structure & library imports
├── styles.css       # Core design system, theme variables, animations & layout grid
├── app.js           # Typing state machine, audio engine, analytics, and LocalStorage layer
├── logo.png         # Modern app icon logo
└── favicon.ico      # Site icon
```

*   **HTML5** semantic layout with **Bootstrap 4** grid for responsive scaling.
*   **Vanilla CSS3** for layouts, caret animations, transition states, and color variables.
*   **Vanilla JavaScript (ES6)** driving the state engine.
*   **Chart.js** (loaded via CDN) for the result graph.
*   **FontAwesome** (loaded via CDN) for modern toolbar icons.

---

## 📝 License & Credits

Feel free to open issues, submit pull requests, or fork this repository to build your own custom typing trainer features!
