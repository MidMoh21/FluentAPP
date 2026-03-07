import React from 'react';
import { X, Trophy, Activity, TrendingUp, AlertTriangle, Sparkles, Clock, Target } from 'lucide-react';
import { SessionSummary, ScoreEntry } from '../types';

interface ProgressReportProps {
    summary: SessionSummary | null;
    scores: ScoreEntry[];
    onClose: () => void;
    onViewDashboard?: () => void;
}

const ProgressReport: React.FC<ProgressReportProps> = ({ summary, scores, onClose, onViewDashboard }) => {
    if (!summary) return null;

    // Calculate duration in minutes
    const durationMinutes = Math.round(summary.duration / 60);

    // Extract recurring errors from AI feedback
    const analyzeErrors = () => {
        const errorPatterns: Record<string, number> = {};

        scores.forEach(entry => {
            const feedback = entry.aiFeedback || '';

            // Check for common error patterns
            if (feedback.match(/th[→-]/i) || feedback.match(/\/θ\/|\/ð\//)) {
                errorPatterns['TH sound (/θ/ and /ð/)'] = (errorPatterns['TH sound (/θ/ and /ð/)'] || 0) + 1;
            }
            if (feedback.match(/v[→-]f/i) || feedback.match(/\/v\/.*\/f\//)) {
                errorPatterns['V sound (/v/ → /f/)'] = (errorPatterns['V sound (/v/ → /f/)'] || 0) + 1;
            }
            if (feedback.match(/missing.*article|"a"|"the"/i)) {
                errorPatterns['Missing articles (a, the)'] = (errorPatterns['Missing articles (a, the)'] || 0) + 1;
            }
            if (feedback.match(/filler|uh|um/i)) {
                errorPatterns['Filler words (uh, um)'] = (errorPatterns['Filler words (uh, um)'] || 0) + 1;
            }
            if (feedback.match(/subject.*verb|agreement/i)) {
                errorPatterns['Subject-verb agreement'] = (errorPatterns['Subject-verb agreement'] || 0) + 1;
            }
            if (feedback.match(/pause|hesitation/i)) {
                errorPatterns['Long pauses/hesitations'] = (errorPatterns['Long pauses/hesitations'] || 0) + 1;
            }
        });

        return Object.entries(errorPatterns)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
    };

    // Detect strengths
    const analyzeStrengths = () => {
        const strengths: string[] = [];

        // Score improvement
        if (summary.scores.length >= 2) {
            const first = summary.scores[0];
            const last = summary.scores[summary.scores.length - 1];
            if (last > first) {
                strengths.push(`📈 Improved from ${first} to ${last} during session`);
            }
        }

        // Check for vocabulary praise
        const hasGoodVocab = scores.some(s =>
            s.aiFeedback?.match(/excellent|great|fantastic|good.*vocabulary|advanced/i)
        );
        if (hasGoodVocab) {
            strengths.push('🧩 Strong vocabulary usage');
        }

        // High average
        if (summary.averageScore >= 75) {
            strengths.push('⭐ Consistently good performance');
        }

        return strengths.slice(0, 3);
    };

    const recurringErrors = analyzeErrors();
    const strengths = analyzeStrengths();

    // Score trend as text
    const scoreTrend = summary.scores.join(' → ');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative my-8">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                        <Trophy className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Session Complete! 🎉</h2>
                    <p className="text-gray-400 text-sm">Here's your detailed performance report.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Target size={12} className="text-emerald-400" />
                        </div>
                        <p className="text-xl font-bold text-emerald-400">{summary.averageScore}<span className="text-xs text-gray-500">/100</span></p>
                        <p className="text-[10px] text-gray-500 uppercase">Avg Score</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Activity size={12} className="text-indigo-400" />
                        </div>
                        <p className="text-xl font-bold text-indigo-400">{summary.questionCount}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Questions</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock size={12} className="text-purple-400" />
                        </div>
                        <p className="text-xl font-bold text-purple-400">{durationMinutes}<span className="text-xs text-gray-500">m</span></p>
                        <p className="text-[10px] text-gray-500 uppercase">Duration</p>
                    </div>
                </div>

                {/* Score Trend */}
                {summary.scores.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                            <TrendingUp size={16} className="text-indigo-400" /> Score Trend
                        </h3>
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                            <div className="flex items-end justify-between h-20 gap-2 mb-3">
                                {summary.scores.map((score, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                        <span className="text-xs text-gray-400 font-mono">{score}</span>
                                        <div
                                            className={`w-full rounded-t-sm transition-all ${score >= 80 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ height: `${score * 0.6}px` }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-xs text-gray-500 font-mono">{scoreTrend}</p>
                        </div>
                    </div>
                )}

                {/* Recurring Errors */}
                {recurringErrors.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-400" /> Areas to Improve
                        </h3>
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-2">
                            {recurringErrors.map(([error, count], i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">• {error}</span>
                                    <span className="text-xs text-amber-400 font-bold">{count}×</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Strengths */}
                {strengths.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                            <Sparkles size={16} className="text-emerald-400" /> Strengths
                        </h3>
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-emerald-500/20 space-y-2">
                            {strengths.map((strength, i) => (
                                <p key={i} className="text-sm text-emerald-300">{strength}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                    {onViewDashboard && (
                        <button
                            onClick={onViewDashboard}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            View Progress
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProgressReport;
