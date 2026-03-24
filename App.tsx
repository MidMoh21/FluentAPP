import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Sparkles, AlertCircle, Send, CheckCircle2, Zap, Settings as SettingsIcon, BookOpen, BarChart3, Mic2, Gavel, Target, PenTool, Users, Headphones } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import AudioRecorder from './components/AudioRecorder';
import Settings from './components/Settings';
import ProgressDashboard from './components/ProgressDashboard';
import ChunkLibrary from './components/ChunkLibrary';
import ShadowingMode from './components/ShadowingMode';
import DebateMode from './components/DebateMode';
import StoryMode from './components/StoryMode';
import VocabPractice from './components/VocabPractice';
import RolePlayMode from './components/RolePlayMode';
import ListeningMode from './components/ListeningMode';
import ErrorBoundary from './components/ErrorBoundary';
import { sendMessageToGemini } from './services/geminiService';
import { blobToBase64 } from './utils/audioUtils';
import { createScoreEntry } from './utils/scoreParser';
import { saveScore, saveSessionSummary, getCurrentSessionScores } from './services/storageService';
import { generateSystemInstruction, DEFAULT_SETTINGS } from './constants';
import { Message, HistoryItem, RecorderState, TrainingMode, UserSettings, SessionRecord, SessionSummary } from './types';

enum AppView {
  CHAT = 'CHAT',
  SHADOWING = 'SHADOWING',
  DASHBOARD = 'DASHBOARD',
  LIBRARY = 'LIBRARY',
  DEBATE = 'DEBATE',
  STORY = 'STORY',
  VOCAB = 'VOCAB',
  ROLE_PLAY = 'ROLE_PLAY',
  LISTENING = 'LISTENING'
}

const App: React.FC = () => {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(TrainingMode.FLUENCY);
  const [currentView, setCurrentView] = useState<AppView>(AppView.CHAT);

  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);

  // Settings & History State
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isApplyingSettings, setIsApplyingSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // --- Effects ---

  useEffect(() => {
    const storedSettings = localStorage.getItem('fluentflow_settings');
    const storedSessions = localStorage.getItem('fluentflow_sessions');

    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      setSettings(parsed);

      // Check if settings are actually complete (not just exist)
      // If goals, topics, or apiKey are empty, treat as first visit
      if (!parsed.goals?.trim() || !parsed.topics?.trim() || !parsed.apiKey?.trim()) {
        setIsFirstVisit(true);
        setShowSettings(true);
      } else {
        setIsFirstVisit(false);
      }
    } else {
      // No settings at all - definitely first visit
      setIsFirstVisit(true);
      setShowSettings(true);
    }

    if (storedSessions) {
      setSessions(JSON.parse(storedSessions));
    }
    setIsSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (isSettingsLoaded && !isFirstVisit && messages.length === 0 && !sessionEnded && currentView === AppView.CHAT) {
      startNewSession().catch(err => console.error("Auto-start failed:", err));
    }
  }, [isSettingsLoaded, isFirstVisit, messages.length, currentView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Logic ---

  const startNewSession = async (settingsOverride?: UserSettings) => {
    setMessages([]);
    setSessionEnded(false);
    setError(null);
    setRecorderState(RecorderState.PROCESSING);
    startTimeRef.current = Date.now();

    const currentSettings = settingsOverride || settings;

    try {
      const startMode = trainingMode;
      const dynamicInstruction = generateSystemInstruction(currentSettings, startMode);

      const responseText = await sendMessageToGemini([], undefined, dynamicInstruction, startMode, currentSettings.apiKey);

      const botMessage: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: responseText
      };
      setMessages([botMessage]);
    } catch (err: any) {
      setRecorderState(RecorderState.IDLE);
      setError(err.message || "Failed to start conversation.");
      throw err;
    } finally {
      setRecorderState(RecorderState.IDLE);
    }
  };

  const endSession = () => {
    setSessionEnded(true);

    // Save Session Record for history list
    const newSession: SessionRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      messageCount: messages.length,
      modeUsed: trainingMode
    };
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    localStorage.setItem('fluentflow_sessions', JSON.stringify(updatedSessions));

    // Process Mode 2 Scores for Dashboard
    if (trainingMode === TrainingMode.PRECISION) {
      const scores = getCurrentSessionScores();
      const scoreValues = scores.map(s => s.score);
      const avg = scoreValues.length ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0;

      const summary: SessionSummary = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
        questionCount: scores.length,
        scores: scoreValues,
        averageScore: avg,
        mode: TrainingMode.PRECISION
      };

      saveSessionSummary(summary);
    }
  };

  // Request AI to generate detailed session summary
  const requestSessionSummary = async () => {
    const stopMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: 'stop',
      isAudio: false
    };
    const newMessages = [...messages, stopMessage];
    setMessages(newMessages);

    setRecorderState(RecorderState.PROCESSING);

    try {
      const history: HistoryItem[] = newMessages.map(m => {
        if (m.isAudio && m.role === 'user') {
          return { role: m.role, parts: [{ text: "[User Audio]" }] };
        }
        return { role: m.role, parts: [{ text: m.text || "" }] };
      });

      // Remove the last message (the "stop" we just added) for the history array passed to Gemini
      // because geminiService adds the input part manually.
      const historyForApi = history.slice(0, -1);

      const scores = getCurrentSessionScores();
      const scoreValues = scores.map(s => s.score);
      const avg = scoreValues.length ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0;
      const duration = Math.round((Date.now() - startTimeRef.current) / 60000);

      const summaryPrompt = `[SYSTEM COMMAND]: User said "stop". Generate a SESSION FINAL REPORT.

SESSION DATA:
- Questions answered: ${scores.length}
- Scores: ${scoreValues.join(', ')}
- Average Score: ${avg}/100
- Duration: ${duration} minutes

Based on ALL the feedback you gave during this session, generate a comprehensive report in this EXACT format:

┌─────────────────────────────────────────────────────────────┐
│ 📊 SESSION FINAL REPORT                                     │
├─────────────────────────────────────────────────────────────┤
│ 🎯 OVERALL SCORE: ${avg}/100                                │
│                                                             │
│ Category Breakdown:                                         │
│  • Pronunciation: X/100                                     │
│  • Grammar: X/100                                           │
│  • Fluency: X/100                                           │
│  • Vocabulary: X/100                                        │
│  • Naturalness: X/100                                       │
├─────────────────────────────────────────────────────────────┤
│ 🎙️ AUDIO ANALYSIS SUMMARY:                                  │
│  • Total Filler Words: X                                    │
│  • Self-Corrections: X                                      │
│  • Overall Confidence: 🟢/🟡/🔴                             │
├─────────────────────────────────────────────────────────────┤
│ 💪 TOP 3 STRENGTHS:                                         │
│  1. [Strength based on session]                             │
│  2. [Strength based on session]                             │
│  3. [Strength based on session]                             │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ TOP 3 WEAKNESSES:                                        │
│  1. [Weakness to work on]                                   │
│  2. [Weakness to work on]                                   │
│  3. [Weakness to work on]                                   │
├─────────────────────────────────────────────────────────────┤
│ 🔄 RECURRING ERROR PATTERNS:                                │
│  • [Error type]: Occurred X times                           │
├─────────────────────────────────────────────────────────────┤
│ 📚 VOCABULARY & CHUNKS LEARNED:                             │
│  • "[Chunk]" (meaning)                                      │
├─────────────────────────────────────────────────────────────┤
│ 🎯 ACTION PLAN FOR NEXT SESSION:                            │
│  1. PRONUNCIATION FOCUS: [specific advice]                  │
│  2. FLUENCY GOAL: [specific goal]                           │
│  3. CHUNKS TO MEMORIZE: [list 2-3 chunks]                   │
├─────────────────────────────────────────────────────────────┤
│ 🌟 SESSION HIGHLIGHT:                                       │
│ [Best moment from the session]                              │
│                                                             │
│ 💬 CLOSING MESSAGE:                                         │
│ [Encouraging personalized message]                          │
└─────────────────────────────────────────────────────────────┘

Great session! See you next time! 🎤

Be SPECIFIC and reference actual errors/improvements from this session. Analyze the conversation history to provide accurate feedback.`;

      // Use a NEUTRAL system instruction for the summary to prevent strict Mode 2 rules (like re-recording) from triggering
      const summarySystemInstruction = "You are a helpful data analyst acting as an English coach assistant. Your only job is to generate a final report based on the session history provided.";

      const responseText = await sendMessageToGemini(
        historyForApi,
        { text: summaryPrompt },
        summarySystemInstruction,
        trainingMode,
        settings.apiKey
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, botMessage]);

      endSession();

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate session summary.");
      endSession();
    } finally {
      setRecorderState(RecorderState.IDLE);
    }
  };

  const saveSettings = async (newSettings: UserSettings) => {
    setIsApplyingSettings(true);
    try {
      setSettings(newSettings);
      localStorage.setItem('fluentflow_settings', JSON.stringify(newSettings));

      // Restart session to apply new settings
      await startNewSession(newSettings);

      setIsFirstVisit(false);
      setShowSettings(false);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setIsApplyingSettings(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      isAudio: false
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Command handling with confirmation messages
    if (textToSend.toLowerCase().trim() === 'mode 1') {
      setTrainingMode(TrainingMode.FLUENCY);
      const confirmMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "🟢 **Switched to Mode 1 (Fluency)!**\n\nI'll focus on natural conversation now. No scoring, no detailed feedback — just flowing English practice.\n\nWhat would you like to talk about?"
      };
      setMessages(prev => [...prev, confirmMsg]);
      return;
    }
    if (textToSend.toLowerCase().trim() === 'mode 2') {
      setTrainingMode(TrainingMode.PRECISION);
      const confirmMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "🎯 **Precision Mode ON!**\n\nFrom now on, I'll analyze your audio for:\n- 🗣️ Phoneme precision\n- 📝 Grammar accuracy\n- 🎵 American rhythm & stress\n- 🔗 Connected speech\n\n**Record your voice** to get detailed feedback and a score out of 100!"
      };
      setMessages(prev => [...prev, confirmMsg]);
      return;
    }
    if (textToSend.toLowerCase().trim() === 'stop') {
      requestSessionSummary();
      return;
    }

    setRecorderState(RecorderState.PROCESSING);
    try {
      const history: HistoryItem[] = newMessages.map(m => {
        if (m.isAudio && m.role === 'user') {
          return { role: m.role, parts: [{ text: "[User Audio]" }] };
        }
        return { role: m.role, parts: [{ text: m.text || "" }] };
      });

      const previousHistory = history.slice(0, -1);
      const dynamicInstruction = generateSystemInstruction(settings, trainingMode);

      const responseText = await sendMessageToGemini(
        previousHistory,
        { text: textToSend },
        dynamicInstruction,
        trainingMode,
        settings.apiKey
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (err: any) {
      setError(err.message || "Failed to send message.");
    } finally {
      setRecorderState(RecorderState.IDLE);
    }
  };

  // Shared Logic for Mode 1, 2 and 3
  const processAudioInput = async (blob: Blob, targetSentence?: string) => {
    if (sessionEnded && !targetSentence) return;

    setRecorderState(RecorderState.PROCESSING);
    setError(null);

    try {
      const base64Audio = await blobToBase64(blob);
      const audioUrl = URL.createObjectURL(blob);

      // UI Update (Only for Chat modes)
      if (currentView === AppView.CHAT) {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          audioUrl: audioUrl,
          isAudio: true
        };
        setMessages(prev => [...prev, userMessage]);
      }

      // History Logic
      // NOTE: We must construct history carefully. If we use 'messages' here, 
      // it might be stale if we just called setMessages in the block above.
      // However, App.tsx handles state updates differently than the sub-components.
      // For safety, we should reconstruct based on the same logic as handleSendMessage.

      const currentMessages = currentView === AppView.CHAT ? [...messages, {
        id: Date.now().toString(),
        role: 'user',
        audioUrl: audioUrl,
        isAudio: true
      } as Message] : [];

      const history: HistoryItem[] = currentView === AppView.CHAT
        ? currentMessages.map(m => {
          if (m.isAudio && m.role === 'user') {
            return { role: m.role, parts: [{ text: "[User Audio]" }] };
          }
          return { role: m.role, parts: [{ text: m.text || "" }] };
        })
        : [];

      // We pass the history MINUS the last one (the current audio) because the service appends input
      const historyForApi = history.slice(0, -1);

      const activeMode = currentView === AppView.SHADOWING ? TrainingMode.SHADOWING : trainingMode;
      const dynamicInstruction = generateSystemInstruction(settings, activeMode);

      const responseText = await sendMessageToGemini(
        historyForApi,
        { audio: base64Audio, targetSentence },
        dynamicInstruction,
        activeMode,
        settings.apiKey
      );

      // Score Tracking (Only Mode 2)
      if (activeMode === TrainingMode.PRECISION) {
        const scoreEntry = createScoreEntry(responseText, "[User Audio]");
        if (scoreEntry) saveScore(scoreEntry);
      }

      // Output Handling
      if (currentView === AppView.CHAT) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: responseText
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Return response for Shadowing Mode
        return responseText;
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze speech.");
      throw err;
    } finally {
      setRecorderState(RecorderState.IDLE);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-sans selection:bg-indigo-500/30">

      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={saveSettings}
        sessions={sessions}
        onClearHistory={() => { setSessions([]); localStorage.removeItem('fluentflow_sessions'); }}
        isFirstVisit={isFirstVisit}
        isApplyingSettings={isApplyingSettings}
        saveError={error}
      />

      {currentView === AppView.DASHBOARD && (
        <ProgressDashboard onClose={() => setCurrentView(AppView.CHAT)} />
      )}

      {currentView === AppView.LIBRARY && (
        <ChunkLibrary onClose={() => setCurrentView(AppView.CHAT)} />
      )}

      {/* Header */}
      <header className="flex-none p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                FluentFlow
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide">
                {settings.accent.toUpperCase()} • {settings.level}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto scrollbar-hide">
            {/* View Switchers */}
            <div className="flex bg-gray-800 rounded-full p-1 border border-gray-700">
              <button
                onClick={() => setCurrentView(AppView.CHAT)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.CHAT ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Chat Mode"
              >
                <Mic size={18} />
              </button>
              <button
                onClick={() => setCurrentView(AppView.SHADOWING)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.SHADOWING ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Shadowing Mode"
              >
                <Mic2 size={18} />
              </button>
              <button
                onClick={() => setCurrentView(AppView.DEBATE)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.DEBATE ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Debate Mode"
              >
                <Gavel size={18} />
              </button>
              <button
                onClick={() => setCurrentView(AppView.STORY)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.STORY ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Story Mode"
              >
                <PenTool size={18} />
              </button>
              <button
                onClick={() => setCurrentView(AppView.VOCAB)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.VOCAB ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Vocab Practice"
              >
                <Target size={18} />
              </button>
              <button
                onClick={() => setCurrentView(AppView.ROLE_PLAY)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.ROLE_PLAY ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Role Play Mode"
              >
                <Users size={18} />
              </button>
              <button
                onClick={() => setCurrentView(AppView.LISTENING)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.LISTENING ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Listening Challenge"
              >
                <Headphones size={18} />
              </button>
              <div className="w-px h-6 bg-gray-700 mx-1"></div>
              <button
                onClick={() => setCurrentView(AppView.LIBRARY)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.LIBRARY ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Phrase Library"
              >
                <BookOpen size={18} />
              </button>
              <button
                onClick={() => setCurrentView(AppView.DASHBOARD)}
                className={`p-2 rounded-full transition-all ${currentView === AppView.DASHBOARD ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Progress Dashboard"
              >
                <BarChart3 size={18} />
              </button>
            </div>

            {/* Mode Indicator (Only show in Chat) */}
            {currentView === AppView.CHAT && (
              <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${trainingMode === TrainingMode.FLUENCY
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                {trainingMode === TrainingMode.FLUENCY ? <Zap size={14} fill="currentColor" /> : <CheckCircle2 size={14} />}
                <span className="text-xs font-bold tracking-wide">
                  {trainingMode === TrainingMode.FLUENCY ? 'FLUENCY' : 'PRECISION'}
                </span>
              </div>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
              title="Settings"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 scrollbar-hide relative">
        <div className="max-w-3xl mx-auto h-full flex flex-col">

          {currentView === AppView.SHADOWING ? (
            <ErrorBoundary fallbackMessage="Shadowing mode encountered an error.">
              <ShadowingMode
                onBack={() => setCurrentView(AppView.CHAT)}
                onAnalyze={async (target, blob) => {
                  const result = await processAudioInput(blob, target);
                  return result;
                }}
                recorderState={recorderState}
                accent={settings.accent}
              />
            </ErrorBoundary>
          ) : currentView === AppView.DEBATE ? (
            <ErrorBoundary fallbackMessage="Debate mode encountered an error.">
              <DebateMode onBack={() => setCurrentView(AppView.CHAT)} settings={settings} />
            </ErrorBoundary>
          ) : currentView === AppView.STORY ? (
            <ErrorBoundary fallbackMessage="Story mode encountered an error.">
              <StoryMode onBack={() => setCurrentView(AppView.CHAT)} settings={settings} />
            </ErrorBoundary>
          ) : currentView === AppView.VOCAB ? (
            <ErrorBoundary fallbackMessage="Vocab practice encountered an error.">
              <VocabPractice onBack={() => setCurrentView(AppView.CHAT)} settings={settings} />
            </ErrorBoundary>
          ) : currentView === AppView.ROLE_PLAY ? (
            <ErrorBoundary fallbackMessage="Role play mode encountered an error.">
              <RolePlayMode onBack={() => setCurrentView(AppView.CHAT)} settings={settings} />
            </ErrorBoundary>
          ) : currentView === AppView.LISTENING ? (
            <ErrorBoundary fallbackMessage="Listening mode encountered an error.">
              <ListeningMode onBack={() => setCurrentView(AppView.CHAT)} settings={settings} />
            </ErrorBoundary>
          ) : (
            <>
              {/* CHAT VIEW */}
              <div className="flex-1 overflow-y-auto pb-8">
                {messages.length === 0 && recorderState !== RecorderState.PROCESSING && !isFirstVisit && (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-50 animate-pulse">
                    <Volume2 size={48} className="text-gray-600" />
                    <p className="text-gray-400">Loading conversation...</p>
                  </div>
                )}

                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    accent={settings.accent}
                    ttsEnabled={settings.ttsEnabled}
                  />
                ))}

                {error && !showSettings && (
                  <div className="flex items-center justify-center mb-6 animate-fade-in">
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Input Area (Only in CHAT mode) */}
      {currentView === AppView.CHAT && (
        <div className="flex-none bg-gray-900/95 backdrop-blur border-t border-gray-800 pb-6 pt-4 safe-area-bottom">
          <div className="max-w-3xl mx-auto px-4 flex flex-col gap-4">

            {!sessionEnded && (
              <div className="flex justify-center -mt-10 relative z-20">
                <div className="bg-gray-900 rounded-full p-2">
                  <AudioRecorder
                    onRecordingComplete={(blob) => processAudioInput(blob)}
                    state={recorderState}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-xl border border-gray-700/50 focus-within:border-indigo-500/50 focus-within:bg-gray-800 transition-all">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                placeholder={sessionEnded ? "Session ended." : "Type 'mode 1', 'mode 2', 'stop'..."}
                disabled={sessionEnded || recorderState === RecorderState.PROCESSING}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-200 placeholder-gray-500 px-3 py-2"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || sessionEnded || recorderState === RecorderState.PROCESSING}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>

            {!sessionEnded && (
              <div className="flex justify-center gap-4 text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                <span>Commands:</span>
                <button onClick={() => { setInputText('mode 1'); }} className="hover:text-indigo-400 transition-colors">mode 1</button>
                <span className="text-gray-700">•</span>
                <button onClick={() => { setInputText('mode 2'); }} className="hover:text-indigo-400 transition-colors">mode 2</button>
                <span className="text-gray-700">•</span>
                <button onClick={() => { setInputText('stop'); }} className="hover:text-red-400 transition-colors">stop</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default App;