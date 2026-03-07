import React, { useState } from 'react';
import { ArrowLeft, Play, RefreshCw, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AudioRecorder from './AudioRecorder';
import { speakText } from '../services/ttsService';
import { AccentType, RecorderState } from '../types';

interface ShadowingModeProps {
    onBack: () => void;
    // Adjusted to return promise so component can await it
    onAnalyze: (target: string, blob: Blob) => Promise<string | undefined>;
    recorderState: RecorderState;
    accent: AccentType;
}

const ShadowingMode: React.FC<ShadowingModeProps> = ({ onBack, onAnalyze, recorderState, accent }) => {
    const [targetSentence, setTargetSentence] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleStart = () => {
        if (targetSentence.trim()) {
            setIsReady(true);
            setResult(null);
        }
    };

    const handlePlayTTS = () => {
        speakText(targetSentence, accent);
    };

    const handleRecordComplete = async (blob: Blob) => {
        const responseText = await onAnalyze(targetSentence, blob);
        if (responseText) {
            setResult(responseText);
        }
    };

    const handleReset = () => {
        setIsReady(false);
        setResult(null);
    };

    return (
        <div className="flex flex-col h-full p-4 max-w-2xl mx-auto overflow-y-auto scrollbar-hide">
            <div className="mb-6 flex items-center gap-3 flex-shrink-0">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-white">Shadowing Practice</h2>
            </div>

            {!isReady ? (
                <div className="flex-1 flex flex-col justify-center gap-6 animate-fade-in">
                    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 text-center">
                        <h3 className="text-lg font-semibold text-white mb-2">Step 1: Choose a Sentence</h3>
                        <p className="text-gray-400 text-sm mb-6">Type a sentence you want to master.</p>

                        <textarea
                            value={targetSentence}
                            onChange={(e) => setTargetSentence(e.target.value)}
                            placeholder="e.g. I've been working on this project for two weeks."
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
                        />

                        <button
                            onClick={handleStart}
                            disabled={!targetSentence.trim()}
                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Practice
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col animate-fade-in pb-10">

                    {/* Target Display */}
                    <div className="bg-gray-800 rounded-2xl p-8 mb-8 text-center border border-gray-700 relative overflow-hidden group flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-2xl font-medium text-white mb-6 leading-relaxed">"{targetSentence}"</p>

                        <button
                            onClick={handlePlayTTS}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg shadow-indigo-600/20"
                        >
                            <Play size={20} fill="currentColor" /> Listen
                        </button>
                    </div>

                    {/* Result Area */}
                    {result && (
                        <div className="bg-gray-900/80 border border-emerald-500/30 rounded-2xl p-6 mb-8 animate-fade-in">
                            <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{result}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Recording Area */}
                    <div className="flex flex-col items-center justify-center gap-4 mt-auto">
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                            {result ? 'Try again or change sentence' : 'Now repeat it exactly'}
                        </p>
                        <div className="bg-gray-900 p-2 rounded-full shadow-2xl">
                            <AudioRecorder
                                onRecordingComplete={handleRecordComplete}
                                state={recorderState}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleReset}
                        className="mt-6 mx-auto flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
                    >
                        <RefreshCw size={14} /> Change Sentence
                    </button>
                </div>
            )}
        </div>
    );
};

export default ShadowingMode;
