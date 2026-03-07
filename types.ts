export interface Message {
  id: string;
  role: 'user' | 'model';
  text?: string;
  audioUrl?: string;
  isAudio?: boolean;
  timestamp?: string;
}

export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface HistoryItem {
  role: 'user' | 'model';
  parts: ContentPart[];
}

export enum RecorderState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}

export enum TrainingMode {
  FLUENCY = 'FLUENCY',
  PRECISION = 'PRECISION',
  SHADOWING = 'SHADOWING',
  DEBATE = 'DEBATE',
  STORY = 'STORY',
  VOCAB_PRACTICE = 'VOCAB_PRACTICE',
  ROLE_PLAY = 'ROLE_PLAY',
  LISTENING = 'LISTENING'
}

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type AccentType = 'American' | 'British' | 'Australian';

export interface UserSettings {
  level: EnglishLevel;
  goals: string;
  topics: string;
  accent: AccentType;
  nativeLanguage: string;
  ttsEnabled: boolean;
}

export interface SessionRecord {
  id: string;
  date: string;
  messageCount: number;
  modeUsed: TrainingMode; // Primary mode or last mode
}

export interface ScoringWeights {
  pronunciation: number;
  grammar: number;
  fluency: number;
  vocabulary: number;
  naturalness: number;
}

// --- NEW TYPES FOR FEATURES ---

export interface PenaltyEntry {
  type: string;
  points: number;
}

export interface ScoreEntry {
  id: string;
  timestamp: string;
  score: number;
  penalties: PenaltyEntry[];
  userResponse?: string; // Transcription
  aiFeedback?: string;
}

export interface SessionSummary {
  id: string;
  date: string;
  duration: number; // seconds
  questionCount: number;
  scores: number[]; // Only Mode 2 scores
  averageScore: number;
  mode: TrainingMode;
}

export type ChunkCategory = 'work' | 'sports' | 'opinions' | 'daily_life' | 'interview' | 'other';

export interface Chunk {
  id: string;
  phrase: string;
  category: ChunkCategory;
  savedAt: string;
  context?: string; // Optional context from conversation
}

// --- NEW SESSION TYPES FOR MODES 4, 5, 6, 7, 8 ---

export interface DebateSession {
  id: string;
  date: string;
  topic: string;
  rounds: number;
  finalConviction: number; // 0-100%
  winner: 'user' | 'ai';   // Who won the debate
  feedback: string;
}

export interface DebateStats {
  totalDebates: number;
  wins: number;
  losses: number;
}

export interface StorySession {
  id: string;
  date: string;
  genre: string;
  storyText: string;
  feedback: string;
}

export interface VocabSession {
  id: string;
  date: string;
  targetWords: string[];
  usedWords: string[];
  feedback: string;
}

export interface RolePlaySession {
  id: string;
  date: string;
  scenario: string;
  role: string;
  feedback: string;
}

export interface ListeningSession {
  id: string;
  date: string;
  topic: string;
  score: number; // e.g. 3/3 questions correct
  difficulty: string;
}

// --- LEARNER PROFILE (Central Memory) ---

export interface SkillScoresSnapshot {
  pronunciation: number;  // 0-100
  grammar: number;        // 0-100
  fluency: number;        // 0-100
  vocabulary: number;     // 0-100
  listening: number;      // 0-100
  confidence: number;     // 0-100
  updatedAt: string;      // ISO date
}

export interface LearnerProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  totalSessionsCompleted: number;
  currentStreak: number;          // days in a row
  lastSessionDate: string;
  skillScores: SkillScoresSnapshot;
  strengths: string[];            // e.g. ["vocabulary", "listening"]
  weaknesses: string[];           // e.g. ["pronunciation", "grammar"]
  recurringErrors: string[];      // e.g. ["past tense", "th sound"]
  notes: string;                  // AI-generated summary of overall progress
}
