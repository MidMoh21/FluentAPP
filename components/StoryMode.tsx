import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, BookOpen, Send, AlertCircle, Sparkles } from 'lucide-react';
import { Message, TrainingMode, RecorderState } from '../types';
import ChatMessage from './ChatMessage';
import AudioRecorder from './AudioRecorder';
import { generateSystemInstruction } from '../constants';
import { sendMessageToGemini } from '../services/geminiService';
import { blobToBase64 } from '../utils/audioUtils';
import { saveStorySession } from '../services/storageService';

interface StoryModeProps {
    onBack: () => void;
    settings: any;
}

const GENRES = ["Mystery", "Sci-Fi", "Fantasy", "Comedy", "Thriller", "Romance"];

const StoryMode: React.FC<StoryModeProps> = ({ onBack, settings }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
    const [error, setError] = useState<string | null>(null);
    const [sessionActive, setSessionActive] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const startStory = async (genre: string) => {
        setSelectedGenre(genre);
        setSessionActive(true);
        setRecorderState(RecorderState.PROCESSING);
        setMessages([]);

        try {
            const instruction = generateSystemInstruction(settings, TrainingMode.STORY);
            // Pass genre in input data so geminiService can inject it
            const response = await sendMessageToGemini([], { storyGenre: genre }, instruction, TrainingMode.STORY, settings.apiKey);

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
            text: content || (audioBlob ? "[Story Continuation]" : ""),
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

            const instruction = generateSystemInstruction(settings, TrainingMode.STORY);

            const apiHistory = newHistory.map(m => ({
                role: m.role,
                parts: [{ text: m.text || (m.isAudio ? "[User Audio]" : "") }]
            }));

            const response = await sendMessageToGemini(
                apiHistory.slice(0, -1),
                { text: content, audio: base64Audio },
                instruction,
                TrainingMode.STORY
            );

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: response
            }]);

            if (content?.toLowerCase() === 'stop') {
                saveStorySession({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    genre: selectedGenre || "Unknown",
                    storyText: newHistory.map(m => m.text).join('\n'),
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
                    <BookOpen className="text-purple-500" size={20} /> Story Mode
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {!sessionActive && messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-8">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <Sparkles size={32} className="text-purple-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Create a Story Together</h3>
                            <p className="text-gray-400">Select a genre to begin.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                            {GENRES.map(genre => (
                                <button
                                    key={genre}
                                    onClick={() => startStory(genre)}
                                    className="p-4 bg-gray-800 hover:bg-purple-900/40 border border-gray-700 hover:border-purple-500/50 rounded-xl transition-all font-medium text-white"
                                >
                                    {genre}
                                </button>
                            ))}
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
                        <div className="flex-1 flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 border border-gray-700 focus-within:border-purple-500/50">
                            <input
                                type="text"
                                className="flex-1 bg-transparent outline-none text-white text-sm"
                                placeholder="Add the next sentence..."
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={recorderState === RecorderState.PROCESSING}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!inputText.trim() || recorderState === RecorderState.PROCESSING}
                                className="p-2 bg-purple-600 rounded-lg disabled:opacity-50 text-white"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => handleSend('stop')}
                            className="p-3 text-purple-400 hover:bg-gray-800 rounded-lg text-xs font-bold uppercase"
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

export default StoryMode;
