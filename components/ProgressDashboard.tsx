import React, { useEffect, useState } from 'react';
import { X, TrendingUp, Calendar, Target, Award, Gavel, BookOpen, Users, Headphones, Mic2, Zap, Trophy, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getProgressData, getDebateSessions, getDebateStats, getStorySessions, getVocabSessions, getRolePlaySessions, getListeningSessions, getChunks } from '../services/storageService';
import { SessionSummary, DebateSession, StorySession, VocabSession, RolePlaySession, ListeningSession, Chunk } from '../types';

interface DashboardProps {
    onClose: () => void;
}

// Simple sparkline-like bar chart component
const MiniBarChart: React.FC<{ scores: number[]; maxBars?: number }> = ({ scores, maxBars = 10 }) => {
    const display = scores.slice(-maxBars);
    if (display.length === 0) return <div className="text-xs text-gray-600">No data yet</div>;

    return (
        <div className="flex items-end gap-1 h-16">
            {display.map((score, i) => {
                const height = Math.max(4, (score / 100) * 100);
                const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400';
                return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <div
                            className={`w-full min-w-[6px] max-w-[20px] rounded-t ${color} transition-all`}
                            style={{ height: `${height}%` }}
                            title={`${score}/100`}
                        />
                    </div>
                );
            })}
        </div>
    );
};

// Score trend indicator
const TrendBadge: React.FC<{ scores: number[] }> = ({ scores }) => {
    if (scores.length < 2) return null;
    const recent = scores.slice(-3);
    const older = scores.slice(-6, -3);
    if (older.length === 0) return null;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const diff = Math.round(recentAvg - olderAvg);

    if (Math.abs(diff) < 2) return <span className="text-xs text-gray-500 font-medium">Stable</span>;

    return diff > 0
        ? <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><ChevronUp size={12} />+{diff}</span>
        : <span className="text-xs text-red-400 font-bold flex items-center gap-1"><ChevronDown size={12} />{diff}</span>;
};

const ProgressDashboard: React.FC<DashboardProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'modes' | 'history'>('overview');

    const [data, setData] = useState<{
        totalSessions: number;
        totalQuestions: number;
        averageScore: number;
        history: SessionSummary[];
    } | null>(null);

    // Mode-specific data
    const [debateStats, setDebateStats] = useState({ totalDebates: 0, wins: 0, losses: 0 });
    const [storySessions, setStorySessions] = useState<StorySession[]>([]);
    const [vocabSessions, setVocabSessions] = useState<VocabSession[]>([]);
    const [rolePlaySessions, setRolePlaySessions] = useState<RolePlaySession[]>([]);
    const [listeningSessions, setListeningSessions] = useState<ListeningSession[]>([]);
    const [savedChunks, setSavedChunks] = useState<Chunk[]>([]);

    useEffect(() => {
        setData(getProgressData());
        setDebateStats(getDebateStats());
        setStorySessions(getStorySessions());
        setVocabSessions(getVocabSessions());
        setRolePlaySessions(getRolePlaySessions());
        setListeningSessions(getListeningSessions());
        setSavedChunks(getChunks());
    }, []);

    if (!data) return null;

    const allScores = data.history.flatMap(s => s.scores);
    const totalModeActivities = debateStats.totalDebates + storySessions.length + vocabSessions.length + rolePlaySessions.length + listeningSessions.length;
    const totalEverything = data.totalSessions + totalModeActivities;

    // Best score
    const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;

    // Listening accuracy
    const listeningTotalCorrect = listeningSessions.reduce((a, s) => a + s.score, 0);
    const listeningTotalQuestions = listeningSessions.length * 3; // assuming 3 questions per session
    const listeningAccuracy = listeningTotalQuestions > 0 ? Math.round((listeningTotalCorrect / listeningTotalQuestions) * 100) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                            <TrendingUp className="text-indigo-400 w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Your Progress</h2>
                            <p className="text-xs text-gray-500">{totalEverything} total activities across all modes</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition-colors"><X size={22} /></button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-800 flex-shrink-0">
                    {(['overview', 'modes', 'history'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === tab
                                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">

                    {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in">

                            {/* Top Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-gray-800/70 p-4 rounded-xl border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="text-purple-400 w-4 h-4" />
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Sessions</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{data.totalSessions}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Precision Mode</p>
                                </div>
                                <div className="bg-gray-800/70 p-4 rounded-xl border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target className="text-blue-400 w-4 h-4" />
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Answers</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{data.totalQuestions}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Evaluated</p>
                                </div>
                                <div className="bg-gray-800/70 p-4 rounded-xl border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Award className="text-emerald-400 w-4 h-4" />
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Avg Score</span>
                                    </div>
                                    <p className={`text-2xl font-bold ${data.averageScore >= 80 ? 'text-emerald-400' : data.averageScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {data.averageScore > 0 ? data.averageScore : '—'}
                                    </p>
                                    <div className="mt-1"><TrendBadge scores={allScores} /></div>
                                </div>
                                <div className="bg-gray-800/70 p-4 rounded-xl border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="text-yellow-400 w-4 h-4" />
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Best Score</span>
                                    </div>
                                    <p className="text-2xl font-bold text-yellow-400">{bestScore > 0 ? bestScore : '—'}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Personal Best</p>
                                </div>
                            </div>

                            {/* Score History Chart */}
                            {allScores.length > 0 && (
                                <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700/50">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Score Progression</h3>
                                        <span className="text-[10px] text-gray-500">Last {Math.min(allScores.length, 10)} scores</span>
                                    </div>
                                    <MiniBarChart scores={allScores} />
                                    <div className="flex justify-between mt-2 text-[10px] text-gray-600">
                                        <span>Oldest</span>
                                        <span>Latest</span>
                                    </div>
                                </div>
                            )}

                            {/* Saved Phrases */}
                            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="text-indigo-400 w-4 h-4" />
                                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Saved Phrases</h3>
                                </div>
                                <p className="text-2xl font-bold text-white">{savedChunks.length}</p>
                                <p className="text-[10px] text-gray-500 mt-1">Chunks saved from conversations</p>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════ MODES TAB ═══════════════ */}
                    {activeTab === 'modes' && (
                        <div className="space-y-4 animate-fade-in">

                            {/* Fluency & Precision (from main sessions) */}
                            <div className="bg-gradient-to-br from-emerald-900/30 to-gray-800/50 p-4 rounded-xl border border-emerald-500/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg"><Mic2 size={18} className="text-emerald-400" /></div>
                                    <div>
                                        <h3 className="text-white font-bold">Fluency & Precision</h3>
                                        <p className="text-[10px] text-gray-400">Main chat sessions</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-lg font-bold text-white">{data!.totalSessions}</p>
                                        <p className="text-[10px] text-gray-400">sessions</p>
                                    </div>
                                </div>
                                {allScores.length > 0 && (
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-gray-400">Avg: <span className={`font-bold ${data!.averageScore >= 80 ? 'text-emerald-400' : data!.averageScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{data!.averageScore}</span></span>
                                        <span className="text-gray-400">Best: <span className="font-bold text-yellow-400">{bestScore}</span></span>
                                        <span className="text-gray-400">Q's: <span className="font-bold text-white">{data!.totalQuestions}</span></span>
                                    </div>
                                )}
                            </div>

                            {/* Debate */}
                            <div className="bg-gradient-to-br from-red-900/20 to-gray-800/50 p-4 rounded-xl border border-red-500/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-red-500/20 rounded-lg"><Gavel size={18} className="text-red-400" /></div>
                                    <div>
                                        <h3 className="text-white font-bold">Debate Mode</h3>
                                        <p className="text-[10px] text-gray-400">Persuasion challenges</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-lg font-bold text-white">{debateStats.totalDebates}</p>
                                        <p className="text-[10px] text-gray-400">debates</p>
                                    </div>
                                </div>
                                {debateStats.totalDebates > 0 && (
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1 text-emerald-400"><Trophy size={14} /> {debateStats.wins} Wins</span>
                                        <span className="flex items-center gap-1 text-red-400"><XCircle size={14} /> {debateStats.losses} Losses</span>
                                        <span className="text-gray-400">Win Rate: <span className="font-bold text-white">{debateStats.totalDebates > 0 ? Math.round((debateStats.wins / debateStats.totalDebates) * 100) : 0}%</span></span>
                                    </div>
                                )}
                            </div>

                            {/* Story */}
                            <div className="bg-gradient-to-br from-purple-900/20 to-gray-800/50 p-4 rounded-xl border border-purple-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg"><BookOpen size={18} className="text-purple-400" /></div>
                                    <div>
                                        <h3 className="text-white font-bold">Story Mode</h3>
                                        <p className="text-[10px] text-gray-400">Collaborative stories</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-lg font-bold text-white">{storySessions.length}</p>
                                        <p className="text-[10px] text-gray-400">stories</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vocab */}
                            <div className="bg-gradient-to-br from-emerald-900/20 to-gray-800/50 p-4 rounded-xl border border-emerald-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg"><Target size={18} className="text-emerald-400" /></div>
                                    <div>
                                        <h3 className="text-white font-bold">Vocab Practice</h3>
                                        <p className="text-[10px] text-gray-400">Targeted vocabulary</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-lg font-bold text-white">{vocabSessions.length}</p>
                                        <p className="text-[10px] text-gray-400">sessions</p>
                                    </div>
                                </div>
                            </div>

                            {/* Role Play */}
                            <div className="bg-gradient-to-br from-orange-900/20 to-gray-800/50 p-4 rounded-xl border border-orange-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/20 rounded-lg"><Users size={18} className="text-orange-400" /></div>
                                    <div>
                                        <h3 className="text-white font-bold">Role Play</h3>
                                        <p className="text-[10px] text-gray-400">Real-life scenarios</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-lg font-bold text-white">{rolePlaySessions.length}</p>
                                        <p className="text-[10px] text-gray-400">scenarios</p>
                                    </div>
                                </div>
                            </div>

                            {/* Listening */}
                            <div className="bg-gradient-to-br from-cyan-900/20 to-gray-800/50 p-4 rounded-xl border border-cyan-500/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-cyan-500/20 rounded-lg"><Headphones size={18} className="text-cyan-400" /></div>
                                    <div>
                                        <h3 className="text-white font-bold">Listening Challenge</h3>
                                        <p className="text-[10px] text-gray-400">Comprehension exercises</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-lg font-bold text-white">{listeningSessions.length}</p>
                                        <p className="text-[10px] text-gray-400">challenges</p>
                                    </div>
                                </div>
                                {listeningSessions.length > 0 && (
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-gray-400">Accuracy: <span className={`font-bold ${listeningAccuracy >= 80 ? 'text-emerald-400' : listeningAccuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{listeningAccuracy}%</span></span>
                                        <span className="text-gray-400">Total Correct: <span className="font-bold text-white">{listeningTotalCorrect}</span></span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════ HISTORY TAB ═══════════════ */}
                    {activeTab === 'history' && (
                        <div className="space-y-3 animate-fade-in">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Recent Precision Sessions</h3>
                            {data.history.length === 0 ? (
                                <div className="text-center py-12">
                                    <Mic2 size={40} className="text-gray-700 mx-auto mb-3" />
                                    <p className="text-gray-500">No precision sessions yet.</p>
                                    <p className="text-gray-600 text-sm mt-1">Complete a session in Mode 2 to see your history here.</p>
                                </div>
                            ) : (
                                data.history.map((session) => (
                                    <div key={session.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-white font-medium">
                                                    {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    <span className="text-gray-500 ml-2 text-xs">
                                                        {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                                    <span>{session.questionCount} answers</span>
                                                    <span className="text-gray-700">•</span>
                                                    <span>{Math.round(session.duration / 60)} min</span>
                                                    <span className="text-gray-700">•</span>
                                                    <span className="capitalize">{session.mode}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${session.averageScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    session.averageScore >= 60 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                        'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    {session.averageScore > 0 ? `${session.averageScore}/100` : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Mini score bars for this session */}
                                        {session.scores.length > 1 && (
                                            <div className="mt-3 pt-3 border-t border-gray-700/50">
                                                <div className="flex items-center gap-1">
                                                    {session.scores.map((score, i) => (
                                                        <div
                                                            key={i}
                                                            className={`h-1.5 flex-1 rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                            title={`Q${i + 1}: ${score}/100`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex justify-between mt-1 text-[9px] text-gray-600">
                                                    <span>Q1</span>
                                                    <span>Q{session.scores.length}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgressDashboard;
