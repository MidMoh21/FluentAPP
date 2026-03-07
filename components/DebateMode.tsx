import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, AlertCircle, Gavel, Trophy, XCircle } from 'lucide-react';
import { Message, TrainingMode, RecorderState } from '../types';
import ChatMessage from './ChatMessage';
import AudioRecorder from './AudioRecorder';
import { generateSystemInstruction } from '../constants';
import { sendMessageToGemini } from '../services/geminiService';
import { blobToBase64 } from '../utils/audioUtils';
import { saveDebateSession, getDebateStats } from '../services/storageService';

interface DebateModeProps {
    onBack: () => void;
    settings: any;
}

const DebateMode: React.FC<DebateModeProps> = ({ onBack, settings }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
    const [error, setError] = useState<string | null>(null);
    const [sessionActive, setSessionActive] = useState(false);
    const [debateEnded, setDebateEnded] = useState(false);
    const [winner, setWinner] = useState<'user' | 'ai' | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get stats for display
    const stats = getDebateStats();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const startDebate = async () => {
        setSessionActive(true);
        setDebateEnded(false);
        setWinner(null);
        setRecorderState(RecorderState.PROCESSING);
        setMessages([]);

        try {
            const instruction = generateSystemInstruction(settings, TrainingMode.DEBATE);
            const response = await sendMessageToGemini([], undefined, instruction, TrainingMode.DEBATE);

            setMessages([{
                id: Date.now().toString(),
                role: 'model',
                text: response
            }]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRecorderState(RecorderState.IDLE);
        }
    };

    const parseDebateResult = (response: string) => {
        // Check for user win (conviction >= 80% or explicit winner)
        const userWinMatch = response.match(/WINNER:\s*YOU/i) ||
            response.match(/🏆\s*WINNER:\s*YOU/i) ||
            response.match(/You've convinced me/i);

        // Check for AI win
        const aiWinMatch = response.match(/WINNER:\s*AI/i) ||
            response.match(/🏆\s*WINNER:\s*AI/i) ||
            response.match(/I remain unconvinced/i);

        // Parse conviction
        const convictionMatch = response.match(/(?:Final )?Conviction:\s*(\d+)%/i);
        const conviction = convictionMatch ? parseInt(convictionMatch[1]) : 0;

        // Determine winner
        if (userWinMatch || conviction >= 80) {
            return { winner: 'user' as const, conviction };
        } else if (aiWinMatch || response.includes('Round 10/10')) {
            return { winner: 'ai' as const, conviction };
        }

        return { winner: null, conviction };
    };

    const handleSend = async (text?: string, audioBlob?: Blob) => {
        const content = text || inputText;
        if (!content && !audioBlob) return;

        setInputText('');
        setError(null);
        setRecorderState(RecorderState.PROCESSING);

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: content || (audioBlob ? "[Audio Argument]" : ""),
            isAudio: !!audioBlob,
            audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : undefined
        };

        const newHistory = [...messages, userMsg];
        setMessages(newHistory);

        try {
            let base64Audio = undefined;
            if (audioBlob) {
                base64Audio = await blobToBase64(audioBlob);
            }

            const instruction = generateSystemInstruction(settings, TrainingMode.DEBATE);

            // Map history for API
            const apiHistory = newHistory.map(m => ({
                role: m.role,
                parts: [{ text: m.text || (m.isAudio ? "[User Audio]" : "") }]
            }));

            const response = await sendMessageToGemini(
                apiHistory.slice(0, -1),
                { text: content, audio: base64Audio },
                instruction,
                TrainingMode.DEBATE
            );

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: response
            }]);

            // Check if debate ended (user win, AI win after round 10, or "stop" command)
            const result = parseDebateResult(response);
            const isStopCommand = content?.toLowerCase() === 'stop';

            if (result.winner || isStopCommand) {
                setDebateEnded(true);
                setSessionActive(false);

                const finalWinner = result.winner || (result.conviction >= 80 ? 'user' : 'ai');
                setWinner(finalWinner);

                // Extract topic from first AI message
                const topicMatch = messages[0]?.text?.match(/(?:topic|debate|discuss).*?[:\?]\s*(.+?)[\?\n]/i);
                const topic = topicMatch ? topicMatch[1].trim() : "Debate Topic";

                saveDebateSession({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    topic: topic,
                    rounds: Math.floor((newHistory.length + 1) / 2),
                    finalConviction: result.conviction,
                    winner: finalWinner,
                    feedback: response
                });
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setRecorderState(RecorderState.IDLE);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="flex-none p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Gavel className="text-red-500" size={20} /> Debate Mode
                    </h2>
                </div>
                {/* Stats Badge */}
                <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-400">
                        <Trophy size={14} /> {stats.wins}
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="flex items-center gap-1 text-red-400">
                        <XCircle size={14} /> {stats.losses}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {!sessionActive && messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                            <Gavel size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Challenge the AI</h3>
                        <p className="text-gray-400 max-w-sm">
                            Test your persuasion skills. Convince the AI to reach 80% conviction to win!
                            You have 10 rounds.
                        </p>
                        <div className="flex gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Trophy size={14} className="text-green-400" /> Wins: {stats.wins}
                            </span>
                            <span className="flex items-center gap-1">
                                <XCircle size={14} className="text-red-400" /> Losses: {stats.losses}
                            </span>
                        </div>
                        <button
                            onClick={startDebate}
                            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-all transform hover:scale-105"
                        >
                            Start Debate
                        </button>
                    </div>
                ) : (
                    <>
                        {messages.map(m => (
                            <ChatMessage key={m.id} message={m} accent={settings.accent} ttsEnabled={settings.ttsEnabled} />
                        ))}

                        {/* Winner Banner */}
                        {debateEnded && winner && (
                            <div className={`flex justify-center my-4`}>
                                <div className={`flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold ${winner === 'user'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }`}>
                                    {winner === 'user' ? (
                                        <><Trophy size={20} /> You Won!</>
                                    ) : (
                                        <><XCircle size={20} /> AI Won</>
                                    )}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex justify-center mb-4">
                                <span className="bg-red-900/50 text-red-200 px-3 py-1 rounded-lg text-sm border border-red-500/30 flex items-center gap-2">
                                    <AlertCircle size={14} /> {error}
                                </span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {sessionActive && (
                <div className="flex-none p-4 border-t border-gray-800 bg-gray-900/95 backdrop-blur">
                    <div className="flex items-center gap-2 max-w-3xl mx-auto">
                        <AudioRecorder
                            onRecordingComplete={(blob) => handleSend(undefined, blob)}
                            state={recorderState}
                        />
                        <div className="flex-1 flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 border border-gray-700 focus-within:border-red-500/50">
                            <input
                                type="text"
                                className="flex-1 bg-transparent outline-none text-white text-sm"
                                placeholder="Make your argument..."
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={recorderState === RecorderState.PROCESSING}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!inputText.trim() || recorderState === RecorderState.PROCESSING}
                                className="p-2 bg-red-600 rounded-lg disabled:opacity-50 text-white"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => handleSend('stop')}
                            className="p-3 text-red-400 hover:bg-gray-800 rounded-lg text-xs font-bold uppercase"
                            disabled={recorderState === RecorderState.PROCESSING}
                        >
                            End
                        </button>
                    </div>
                </div>
            )}

            {/* New Debate Button after ended */}
            {debateEnded && (
                <div className="flex-none p-4 border-t border-gray-800 bg-gray-900/95">
                    <button
                        onClick={startDebate}
                        className="w-full max-w-md mx-auto block py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                    >
                        Start New Debate
                    </button>
                </div>
            )}
        </div>
    );
};

export default DebateMode;
