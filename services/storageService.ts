import { ScoreEntry, SessionSummary, Chunk, ChunkCategory, TrainingMode, DebateSession, DebateStats, StorySession, VocabSession, RolePlaySession, ListeningSession, LearnerProfile } from '../types';

const KEYS = {
    SCORES: 'fluentflow_scores',
    SUMMARIES: 'fluentflow_summaries',
    CHUNKS: 'fluentflow_chunks',
    CURRENT_SESSION_SCORES: 'fluentflow_current_scores',
    DEBATE_SESSIONS: 'fluentflow_debate_sessions',
    STORY_SESSIONS: 'fluentflow_story_sessions',
    VOCAB_SESSIONS: 'fluentflow_vocab_sessions',
    ROLE_PLAY_SESSIONS: 'fluentflow_roleplay_sessions',
    LISTENING_SESSIONS: 'fluentflow_listening_sessions',
    LEARNER_PROFILE: 'fluentflow_learner_profile',
};

// --- SCORING ---

export const saveScore = (entry: ScoreEntry) => {
    const current = getCurrentSessionScores();
    const updated = [...current, entry];
    localStorage.setItem(KEYS.CURRENT_SESSION_SCORES, JSON.stringify(updated));
};

export const getCurrentSessionScores = (): ScoreEntry[] => {
    const data = localStorage.getItem(KEYS.CURRENT_SESSION_SCORES);
    return data ? JSON.parse(data) : [];
};

export const clearCurrentSessionScores = () => {
    localStorage.removeItem(KEYS.CURRENT_SESSION_SCORES);
};

export const saveSessionSummary = (summary: SessionSummary) => {
    const allSummaries = getSessionSummaries();
    const updated = [summary, ...allSummaries];
    localStorage.setItem(KEYS.SUMMARIES, JSON.stringify(updated));
    clearCurrentSessionScores();
};

export const getSessionSummaries = (): SessionSummary[] => {
    const data = localStorage.getItem(KEYS.SUMMARIES);
    return data ? JSON.parse(data) : [];
};

export const getProgressData = () => {
    const summaries = getSessionSummaries();
    const scores = summaries.flatMap(s => s.scores);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
        totalSessions: summaries.length,
        totalQuestions: summaries.reduce((a, b) => a + b.questionCount, 0),
        averageScore: avgScore,
        history: summaries,
    };
};

// --- CHUNKS ---

export const saveChunk = (chunk: Chunk) => {
    const chunks = getChunks();
    // Avoid duplicates
    if (chunks.some(c => c.phrase.toLowerCase() === chunk.phrase.toLowerCase())) return;

    const updated = [chunk, ...chunks];
    localStorage.setItem(KEYS.CHUNKS, JSON.stringify(updated));
};

export const getChunks = (): Chunk[] => {
    const data = localStorage.getItem(KEYS.CHUNKS);
    return data ? JSON.parse(data) : [];
};

export const deleteChunk = (id: string) => {
    const chunks = getChunks();
    const updated = chunks.filter(c => c.id !== id);
    localStorage.setItem(KEYS.CHUNKS, JSON.stringify(updated));
};

export const getChunksByCategory = (category: ChunkCategory): Chunk[] => {
    return getChunks().filter(c => c.category === category);
};

// --- DEBATE MODE ---
export const saveDebateSession = (session: DebateSession) => {
    const sessions = getDebateSessions();
    localStorage.setItem(KEYS.DEBATE_SESSIONS, JSON.stringify([session, ...sessions]));
};
export const getDebateSessions = (): DebateSession[] => {
    const data = localStorage.getItem(KEYS.DEBATE_SESSIONS);
    return data ? JSON.parse(data) : [];
};

export const getDebateStats = (): DebateStats => {
    const sessions = getDebateSessions();
    const wins = sessions.filter(s => s.winner === 'user').length;
    const losses = sessions.filter(s => s.winner === 'ai').length;
    return {
        totalDebates: sessions.length,
        wins,
        losses
    };
};

// --- STORY MODE ---
export const saveStorySession = (session: StorySession) => {
    const sessions = getStorySessions();
    localStorage.setItem(KEYS.STORY_SESSIONS, JSON.stringify([session, ...sessions]));
};
export const getStorySessions = (): StorySession[] => {
    const data = localStorage.getItem(KEYS.STORY_SESSIONS);
    return data ? JSON.parse(data) : [];
};

// --- VOCAB MODE ---
export const saveVocabSession = (session: VocabSession) => {
    const sessions = getVocabSessions();
    localStorage.setItem(KEYS.VOCAB_SESSIONS, JSON.stringify([session, ...sessions]));
};
export const getVocabSessions = (): VocabSession[] => {
    const data = localStorage.getItem(KEYS.VOCAB_SESSIONS);
    return data ? JSON.parse(data) : [];
};

// --- ROLE PLAY MODE ---
export const saveRolePlaySession = (session: RolePlaySession) => {
    const sessions = getRolePlaySessions();
    localStorage.setItem(KEYS.ROLE_PLAY_SESSIONS, JSON.stringify([session, ...sessions]));
};
export const getRolePlaySessions = (): RolePlaySession[] => {
    const data = localStorage.getItem(KEYS.ROLE_PLAY_SESSIONS);
    return data ? JSON.parse(data) : [];
};

// --- LISTENING MODE ---
export const saveListeningSession = (session: ListeningSession) => {
    const sessions = getListeningSessions();
    localStorage.setItem(KEYS.LISTENING_SESSIONS, JSON.stringify([session, ...sessions]));
};
export const getListeningSessions = (): ListeningSession[] => {
    const data = localStorage.getItem(KEYS.LISTENING_SESSIONS);
    return data ? JSON.parse(data) : [];
};

// --- LEARNER PROFILE (Central Memory) ---

const DEFAULT_SKILL_SCORES: LearnerProfile['skillScores'] = {
    pronunciation: 50,
    grammar: 50,
    fluency: 50,
    vocabulary: 50,
    listening: 50,
    confidence: 50,
    updatedAt: new Date().toISOString()
};

export const getLearnerProfile = (): LearnerProfile => {
    const data = localStorage.getItem(KEYS.LEARNER_PROFILE);
    if (data) return JSON.parse(data);

    // Return a default new profile if none exists
    const defaultProfile: LearnerProfile = {
        id: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalSessionsCompleted: 0,
        currentStreak: 0,
        lastSessionDate: '',
        skillScores: { ...DEFAULT_SKILL_SCORES },
        strengths: [],
        weaknesses: [],
        recurringErrors: [],
        notes: ''
    };
    return defaultProfile;
};

export const saveLearnerProfile = (profile: LearnerProfile) => {
    profile.updatedAt = new Date().toISOString();
    localStorage.setItem(KEYS.LEARNER_PROFILE, JSON.stringify(profile));
};

export const updateProfileAfterSession = (updates: Partial<LearnerProfile>) => {
    const profile = getLearnerProfile();
    const updated = { ...profile, ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEYS.LEARNER_PROFILE, JSON.stringify(updated));
    return updated;
};
