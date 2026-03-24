<div align="center">

# 🎙️ FluentFlow — AI English Speaking Coach

**A full-featured, browser-based English speaking trainer powered by Google Gemini AI**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

*Practice speaking. Get real feedback. Level up — all in your browser.*

[🚀 Try It Live](https://fluent-app.vercel.app) · [📖 Docs](#architecture) · [🐛 Report Bug](https://github.com/MidMoh21/FluentAPP/issues) · [✨ Request Feature](https://github.com/MidMoh21/FluentAPP/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [8 Training Modes](#-8-training-modes)
- [Key Features](#-key-features)
- [Architecture](#️-architecture)
- [Scoring System](#-scoring-system)
- [Getting Started](#-getting-started)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)

---

## 🌟 Overview

FluentFlow is a production-grade English speaking coach that runs **entirely in the browser** — no backend, no database. It combines multimodal AI (voice + text), a custom scoring engine, and 8 distinct training modes to create a comprehensive language learning platform.

> Built for Arabic speakers who want to reach fluency in American, British, or Australian English.

### What makes it different?

| Feature | FluentFlow | Generic AI Chat |
|---|---|---|
| Voice-based phoneme analysis | ✅ Real-time | ❌ |
| Arabic-speaker Anti-Bias system | ✅ Custom-built | ❌ |
| 6-level calibrated scoring (A1–C2) | ✅ Mathematical engine | ❌ |
| 8 specialized training modes | ✅ | ❌ |
| Attention Decay mitigation | ✅ System Reminder injection | ❌ |
| Full session history & progress | ✅ localStorage | ❌ |

---

## 🎯 8 Training Modes

### 💬 Mode 1 — Fluency Mode
Natural conversation practice. No scoring, no interruptions — just flowing English.
- Adapts vocabulary complexity to your CEFR level (A1–C2)
- Topic cycling to prevent repetition
- Confidence-building focus

### 🎯 Mode 2 — Precision Mode
The core training mode. Deep forensic audio analysis on every response.
- Phoneme-level pronunciation feedback with IPA transcription
- Mathematical scoring: `SCORE = 100 − Σ(penalties)`
- 8-step deep coaching for scores below 75
- Re-record requests for scores below 70

### 🎧 Mode 3 — Shadowing Mode
Listen → Repeat → Compare. Accent reproduction training.
- Enter any target sentence
- AI reads it via TTS in your chosen accent
- Record your attempt → get word-by-word comparison
- Stress, linking, and rhythm analysis

### 🗣️ Mode 4 — Debate Mode
Argumentation and persuasion under pressure.
- AI argues the opposite side of a chosen topic
- **Smart Conviction System**: dynamic % tracking based on argument quality
- Level-adapted rules: A1 generous, C1–C2 skeptical
- 10-round structure with real-time conviction updates

### 📖 Mode 5 — Story Mode
Collaborative creative writing with implicit grammar correction.
- Choose a genre (Mystery, Sci-Fi, Fantasy, Romance, Thriller)
- 2–4 sentence turns each, building a narrative together
- AI corrects errors naturally via recasting — never interrupts
- Final story exported with full evaluation

### 🎯 Mode 6 — Vocabulary Practice
Use your target words, don't just recognize them.
- Input up to 10 words or phrases to practice
- AI creates natural conversation opportunities to use them
- Contextual questions — not "make a sentence with X"
- Full mastery report at session end

### 👥 Mode 7 — Role Play Mode
12 real-world scenarios with immersive AI characters.

> Job Interview · Doctor Visit · Restaurant Order · Airport Check-in ·  
> Hotel Complaint · Shopping · Bank · Police Report · Date · Debate · Presentation · Custom

- AI stays fully in character throughout
- Errors corrected subtly via rephrasing (never lecture-style)
- Final performance and appropriateness feedback

### 🎧 Mode 8 — Listening Challenge
Comprehension-first practice with TTS-narrated stories.
- AI generates a level-appropriate story
- Story read aloud in your chosen accent
- 3 comprehension questions, one at a time
- Score: X/3 with explanation for wrong answers

---

## ✨ Key Features

### 🧠 Intelligent Prompt System (153KB)
The core of FluentFlow is a 2,800+ line prompt engineering system in `constants.ts`:

- **Anti-Bias Engine**: prevents AI from assuming pronunciation errors based on nationality — only reports what it *actually hears*
- **Attention Decay Fix**: injects a mode-specific System Reminder at the end of each message to prevent model drift over long sessions
- **Penalty Engine**: fully parametric scoring with per-level multipliers
- **Level Calibration**: 6 distinct behavioural profiles (A1–C2) with scoring guides and acceptable/unacceptable error thresholds

### 🎙️ Audio Pipeline
```
Microphone
    ↓  [getUserMedia + MediaRecorder]
Audio Blob (WebM)
    ↓  [blobToBase64 utility]
Base64 String
    ↓  [Gemini Multimodal API]
Transcription + Phoneme Analysis + Feedback
```
- Cancel recording without submitting
- Automatic stream cleanup on unmount (no microphone leaks)
- Shared `blobToBase64()` utility used across all components

### 📊 Progress Dashboard
- 3-tab view: Overview / Mode Sessions / Phrase Library
- Mini bar chart for score history
- Trend indicators (↑ improving / → stable / ↓ declining)
- Per-mode session logs with full feedback history

### 💾 Chunk Library
- Save useful phrases from any conversation
- Auto-categorized: Work / Sports / Opinions / Daily Life / Interview / Other
- Keyword detection from AI responses using pattern matching

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FluentFlow                          │
├─────────────────────────────────────────────────────────────┤
│  App.tsx  (State Orchestrator)                              │
│  ├── Mode Router → 8 specialized mode components           │
│  ├── Audio Pipeline → MediaRecorder → Base64 → Gemini      │
│  ├── Session Manager → start / end / save                  │
│  └── Settings → Level, Accent, Goals, Topics, NL, TTS      │
├─────────────────────────────────────────────────────────────┤
│  services/                                                  │
│  ├── geminiService.ts   (API layer + model routing)        │
│  ├── storageService.ts  (localStorage abstraction)         │
│  ├── ttsService.ts      (Web Speech API wrapper)           │
│  └── audioRecorder.ts   (MediaRecorder wrapper)            │
├─────────────────────────────────────────────────────────────┤
│  constants.ts           (AI Prompt System — 2,800+ lines)  │
│  ├── CORE_INSTRUCTION   (Modes 1–3: full audio analysis)   │
│  ├── CORE_LITE          (Modes 4–8: conversation-focused)  │
│  ├── Scoring Weights    (per CEFR level)                   │
│  ├── Penalty Engine     (parametric, with level multiplier)│
│  ├── Level Calibration  (A1–C2 behavioural profiles)       │
│  └── Accent Phoneme Rules (US / GB / AU)                   │
├─────────────────────────────────────────────────────────────┤
│  utils/                                                     │
│  ├── scoreParser.ts     (3-pattern Regex score extraction) │
│  ├── audioUtils.ts      (Blob → Base64)                    │
│  ├── historyUtils.ts    (Message → Gemini History format)  │
│  └── textAnalysis.ts    (chunk/phrase detection)           │
└─────────────────────────────────────────────────────────────┘
```

### Model Routing

| Mode | Model | Reason |
|------|-------|--------|
| Fluency (1) | `gemini-2.5-flash` | Speed — conversational responses |
| Precision (2) | `gemini-2.5-flash` | Audio + phoneme analysis |
| Shadowing (3) | `gemini-2.5-flash` | Comparison accuracy |
| Modes 4–8 | `gemini-2.5-flash` | Speed + creativity |
| Fallback | `gemini-2.5-flash` | Auto-fallback on failure |

---

## 📊 Scoring System

### Penalty Engine (Mode 2)

All scores use: **`FINAL SCORE = 100 − Σ(penalties)`**

| Issue | Base Penalty | Multiplier (B1) | Max Cap |
|-------|-------------|-----------------|---------|
| Filler word (um/uh/you know) | -2 | ×1.0 | -10 |
| Unnatural pause (>1s) | -2 | ×1.0 | -6 |
| Word-by-word speech | -6 | ×1.0 | -6 |
| Missing reduction/linking | -1 | ×1.0 | -4 |
| Basic grammar error | -3 | ×1.0 | -12 |
| Unnatural rhythm | -3 | ×1.0 | -3 |
| Phoneme substitution | -2 | ×1.0 | -8 |
| Repeated phoneme error (3+) | -5 | ×1.0 | -5 |

### Level Multipliers

| Level | Multiplier | Filler Penalty | Grammar Penalty |
|-------|-----------|----------------|-----------------|
| A1 | ×0.5 | -1 each | -2 each |
| A2 | ×0.75 | -2 each | -2 each |
| B1 | ×1.0 | -2 each | -3 each |
| B2 | ×1.5 | -3 each | -5 each |
| C1 | ×2.0 | -4 each | -6 each |
| C2 | ×3.0 | -6 each | -9 each |

### Score Actions

| Score | Rating | Action |
|-------|--------|--------|
| 90–100 | 🟢 Excellent | Quick praise → next question |
| 75–89 | 🟡 Good | Brief note → next question |
| 70–74 | 🟠 Moderate | Full 8-step analysis → continue |
| <70 | 🔴 Critical | Full 8-step analysis → re-record |

---

## 🚀 Getting Started

### 🌐 Try it Live (No Setup Required)

> **[https://fluent-app.vercel.app](https://fluent-app.vercel.app)**
>
> Just open the link, paste your free Gemini API key in the settings screen, and start speaking.
> Each user brings their own key — your data never leaves your browser.

---

### 🛠️ Run Locally

#### Prerequisites
- Node.js 18+
- A Google Gemini API key — [get one free here](https://aistudio.google.com/apikey)

#### Installation

```bash
# Clone the repository
git clone https://github.com/MidMoh21/FluentAPP.git
cd FluentAPP

# Install dependencies
npm install
```

#### Environment Setup (Local Only)

Create a `.env.local` file in the root directory:

```env
API_KEY=your_gemini_api_key_here
```

> ⚠️ For the **hosted version**, no `.env` is needed — users enter their API key directly in the app UI.
> For **local development**, you can use either the `.env.local` file or the in-app key field.

#### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Build for Production

```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build** | Vite 6 |
| **AI** | Google Gemini API (`@google/genai` v1.36) |
| **Audio Input** | Web Audio API + MediaRecorder |
| **Audio Output** | Web Speech API (TTS) |
| **Styling** | Tailwind CSS (CDN) |
| **Icons** | Lucide React |
| **Markdown** | react-markdown |
| **Storage** | localStorage (no backend) |
| **Font** | Inter (Google Fonts) |

---

## 📁 Project Structure

```
FluentApp/
├── App.tsx                    # Main app — state, routing, audio pipeline
├── constants.ts               # AI prompt system (153KB, 2,800+ lines)
├── types.ts                   # All TypeScript interfaces and enums
├── index.tsx / index.html / index.css
│
├── components/
│   ├── AudioRecorder.tsx      # Voice recording with cancel support
│   ├── AudioPlayer.tsx        # TTS playback button
│   ├── ChatMessage.tsx        # Chat bubble with markdown + TTS
│   ├── Settings.tsx           # User profile setup
│   ├── ProgressDashboard.tsx  # 3-tab analytics dashboard
│   ├── ProgressReport.tsx     # End-of-session report
│   ├── ChunkLibrary.tsx       # Saved phrases with categories
│   ├── ErrorBoundary.tsx      # Per-mode error isolation
│   ├── ShadowingMode.tsx      # Mode 3
│   ├── DebateMode.tsx         # Mode 4
│   ├── StoryMode.tsx          # Mode 5
│   ├── VocabPractice.tsx      # Mode 6
│   ├── RolePlayMode.tsx       # Mode 7
│   └── ListeningMode.tsx      # Mode 8
│
├── services/
│   ├── geminiService.ts       # Gemini API + model routing + retry logic
│   ├── storageService.ts      # localStorage abstraction layer
│   ├── ttsService.ts          # Web Speech API with accent mapping
│   └── audioRecorder.ts      # MediaRecorder service
│
└── utils/
    ├── scoreParser.ts         # Score extraction (3 regex patterns)
    ├── audioUtils.ts          # Blob → Base64 conversion
    ├── historyUtils.ts        # Message[] → Gemini HistoryItem[]
    └── textAnalysis.ts        # Phrase/chunk detection
```

### Data Persistence (localStorage Keys)

| Key | Contents |
|-----|----------|
| `fluentflow_settings` | User profile (level, accent, goals, topics) |
| `fluentflow_scores` | Mode 2 score history |
| `fluentflow_summaries` | Session summaries |
| `fluentflow_chunks` | Saved phrases library |
| `fluentflow_debate_sessions` | Debate results |
| `fluentflow_story_sessions` | Story sessions |
| `fluentflow_vocab_sessions` | Vocab practice logs |
| `fluentflow_roleplay_sessions` | Role play logs |
| `fluentflow_listening_sessions` | Listening challenge results |
| `fluentflow_learner_profile` | Central learner memory |

---

## 🗺️ Roadmap

- [ ] **v3.0** — Backend integration (Supabase) for cross-device sync
- [ ] **v3.1** — Whisper integration for offline transcription
- [ ] **v3.2** — Mobile PWA support
- [ ] **v3.3** — Community features & language exchange
- [ ] **v4.0** — Subscription model with advanced analytics

---

## 📄 License

MIT © [MidMoh21](https://github.com/MidMoh21)

---

<div align="center">

**If FluentFlow helped you, give it a ⭐ on GitHub!**

Made with ❤️ for Arabic speakers learning English

</div>
