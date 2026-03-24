import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Target, Send, AlertCircle, Plus, X } from 'lucide-react';
import { Message, TrainingMode, RecorderState } from '../types';
import ChatMessage from './ChatMessage';
import AudioRecorder from './AudioRecorder';
import { generateSystemInstruction } from '../constants';
import { sendMessageToGemini } from '../services/geminiService';
import { blobToBase64 } from '../utils/audioUtils';
import { saveVocabSession } from '../services/storageService';

interface VocabPracticeProps {
    onBack: () => void;
    settings: any;
}

const VocabPractice: React.FC<VocabPracticeProps> = ({ onBack, settings }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
    const [error, setError] = useState<string | null>(null);
    const [sessionActive, setSessionActive] = useState(false);
    const [targetWords, setTargetWords] = useState<string[]>([]);
    const [wordInput, setWordInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const addWord = () => {
        if (wordInput.trim() && targetWords.length < 10) {
            setTargetWords([...targetWords, wordInput.trim()]);
            setWordInput('');
        }
    };

    const removeWord = (index: number) => {
        setTargetWords(targetWords.filter((_, i) => i !== index));
    };

    const startPractice = async () => {
        setSessionActive(true);
        setRecorderState(RecorderState.PROCESSING);
        setMessages([]);

        try {
            const instruction = generateSystemInstruction(settings, TrainingMode.VOCAB_PRACTICE);
            // Pass vocab words to geminiService
            const response = await sendMessageToGemini([], { vocabWords: targetWords }, instruction, TrainingMode.VOCAB_PRACTICE, settings.apiKey);

            setMessages([{
                id: Date.now().toString(),
                role: 'model',
                text: response
            }]);
        } catch (err: any) {
            setError(err.message);
            setSessionActive(false);
        } finally {
            setRecorderState(RecorderState.IDLE);
        }
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
            text: content || (audioBlob ? "[Answer]" : ""),
            isAudio: !!audioBlob,
            audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : undefined
        };

        const newHistory = [...messages, userMsg];
        setMessages(newHistory);

        if (content?.toLowerCase() === 'stop') {
            setSessionActive(false);
        }

        try {
            let base64Audio = undefined;
            if (audioBlob) {
                base64Audio = await blobToBase64(audioBlob);
            }

            const instruction = generateSystemInstruction(settings, TrainingMode.VOCAB_PRACTICE);

            const apiHistory = newHistory.map(m => ({
                role: m.role,
                parts: [{ text: m.text || (m.isAudio ? "[User Audio]" : "") }]
            }));

            const response = await sendMessageToGemini(
                apiHistory.slice(0, -1),
                { text: content, audio: base64Audio },
                instruction,
                TrainingMode.VOCAB_PRACTICE
            );

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: response
            }]);

            if (content?.toLowerCase() === 'stop') {
                saveVocabSession({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    targetWords: targetWords,
                    usedWords: [], // Would need sophisticated parsing to fill this accurately from just the chat, leaving empty for now
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
            <div className="flex-none p-4 border-b border-gray-800 flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Target className="text-emerald-500" size={20} /> Vocab Practice
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {!sessionActive && messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <Target size={32} className="text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Target Vocabulary</h3>
                            <p className="text-gray-400 text-sm">Add up to 10 words you want to practice.</p>
                        </div>

                        <div className="w-full max-w-md space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={wordInput}
                                    onChange={e => setWordInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addWord()}
                                    placeholder="Enter a word (e.g. Resilience)"
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                />
                                <button onClick={addWord} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white">
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 justify-center min-h-[50px]">
                                {targetWords.map((word, i) => (
                                    <span key={i} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm flex items-center gap-2 border border-emerald-500/30">
                                        {word}
                                        <button onClick={() => removeWord(i)} className="hover:text-white"><X size={14} /></button>
                                    </span>
                                ))}
                            </div>

                            <button
                                onClick={startPractice}
                                disabled={targetWords.length === 0}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Start Practice
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map(m => (
                            <ChatMessage key={m.id} message={m} accent={settings.accent} ttsEnabled={settings.ttsEnabled} />
                        ))}
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
                        <div className="flex-1 flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 border border-gray-700 focus-within:border-emerald-500/50">
                            <input
                                type="text"
                                className="flex-1 bg-transparent outline-none text-white text-sm"
                                placeholder="Use your target words..."
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={recorderState === RecorderState.PROCESSING}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!inputText.trim() || recorderState === RecorderState.PROCESSING}
                                className="p-2 bg-emerald-600 rounded-lg disabled:opacity-50 text-white"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => handleSend('stop')}
                            className="p-3 text-emerald-400 hover:bg-gray-800 rounded-lg text-xs font-bold uppercase"
                            disabled={recorderState === RecorderState.PROCESSING}
                        >
                            End
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VocabPractice;
