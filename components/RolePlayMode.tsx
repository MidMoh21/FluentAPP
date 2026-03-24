import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, StopCircle, ChevronLeft, User, Briefcase, Coffee, MapPin, Stethoscope, Plane, Hotel } from 'lucide-react';
import { UserSettings, Message, TrainingMode, RolePlaySession, HistoryItem } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { speakText } from '../services/ttsService';
import { saveRolePlaySession } from '../services/storageService';
import { recordAudio, stopRecording } from '../services/audioRecorder';
import { SCENARIOS, generateSystemInstruction } from '../constants';
import ChatMessage from './ChatMessage';

interface RolePlayModeProps {
    settings: UserSettings;
    onBack: () => void;
}

const RolePlayMode: React.FC<RolePlayModeProps> = ({ settings, onBack }) => {
    const [scenario, setScenario] = useState<typeof SCENARIOS[0] | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Cleanup recorder on unmount to prevent resource leaks
    useEffect(() => {
        return () => {
            stopRecording().catch(() => {}); // Ignore error if not recording
        };
    }, []);

    // Helper to convert internal messages to Gemini history format
    const getHistory = (msgs: Message[]): HistoryItem[] => {
        return msgs.map(m => {
            // If it's an audio message, use a descriptive tag or the text fallback if available
            // but prevent sending "(Audio Message)" as literal spoken text if possible
            if (m.isAudio) {
                return { role: m.role, parts: [{ text: "[User Audio Input]" }] };
            }
            return { role: m.role, parts: [{ text: m.text || '' }] };
        });
    };

    // Start Scenario
    const startScenario = async (selected: typeof SCENARIOS[0]) => {
        setScenario(selected);
        setIsProcessing(true);
        setMessages([]); // Clear previous messages

        // Initial hidden prompt to set the context
        const initialInput = `SCENARIO: ${selected.name} | YOUR ROLE: ${selected.aiRole} | USER ROLE: ${selected.userRole}. Start now!`;

        try {
            const systemInstruction = generateSystemInstruction(settings, TrainingMode.ROLE_PLAY);

            const response = await sendMessageToGemini(
                [],
                { text: initialInput },
                systemInstruction,
                TrainingMode.ROLE_PLAY,
                settings.apiKey
            );

            const aiMsg: Message = {
                id: Date.now().toString(),
                role: 'model',
                text: response,
                timestamp: new Date().toISOString()
            };
            setMessages([aiMsg]);

            if (settings.ttsEnabled) {
                speakText(response, settings.accent);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() && !isRecording) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText,
            timestamp: new Date().toISOString()
        };

        // Update state with new message
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        
        setInputText('');
        setIsProcessing(true);

        try {
            const systemInstruction = generateSystemInstruction(settings, TrainingMode.ROLE_PLAY);
            // Use newMessages to ensure we aren't using stale state, 
            // but slice off the last one because geminiService adds the current input
            const history = getHistory(newMessages).slice(0, -1);

            const response = await sendMessageToGemini(
                history,
                { text: inputText },
                systemInstruction,
                TrainingMode.ROLE_PLAY,
                settings.apiKey
            );

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, aiMsg]);

            // Check for end of roleplay feedback
            if (response.includes("Appropriateness:") || response.includes("Success:")) {
                if (scenario) {
                    const session: RolePlaySession = {
                        id: Date.now().toString(),
                        date: new Date().toISOString(),
                        scenario: scenario.name,
                        role: scenario.userRole,
                        feedback: response
                    };
                    saveRolePlaySession(session);
                }
            }

            if (settings.ttsEnabled) {
                speakText(response, settings.accent);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRecordToggle = async () => {
        if (isRecording) {
            try {
                const audioBlob = await stopRecording();
                setIsRecording(false);
                handleSendAudio(audioBlob);
            } catch (err) {
                console.error("Failed to stop recording:", err);
                setIsRecording(false);
            }
        } else {
            try {
                await recordAudio();
                setIsRecording(true);
            } catch (err) {
                console.error("Failed to start recording:", err);
            }
        }
    };

    const handleSendAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);
        // Create a temporary message for UI
        const audioUrl = URL.createObjectURL(audioBlob);
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: '(Audio Message)',
            audioUrl: audioUrl,
            isAudio: true,
            timestamp: new Date().toISOString()
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);

        try {
            // Convert blob to base64 string
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];

                const systemInstruction = generateSystemInstruction(settings, TrainingMode.ROLE_PLAY);
                // Use newMessages, slice off current
                const history = getHistory(newMessages).slice(0, -1);

                const response = await sendMessageToGemini(
                    history,
                    { audio: base64Audio, mimeType: audioBlob.type || 'audio/webm' },
                    systemInstruction,
                    TrainingMode.ROLE_PLAY,
                    settings.apiKey
                );

                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    text: response,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsg]);
                if (settings.ttsEnabled) speakText(response, settings.accent);
                setIsProcessing(false);
            };
        } catch (e) {
            console.error(e);
            setIsProcessing(false);
        }
    };

    const getIcon = (id: string) => {
        switch (id) {
            case 'cafe': return <Coffee size={24} />;
            case 'interview': return <Briefcase size={24} />;
            case 'hotel': return <Hotel size={24} />;
            case 'directions': return <MapPin size={24} />;
            case 'doctor': return <Stethoscope size={24} />;
            case 'flight': return <Plane size={24} />;
            default: return <User size={24} />;
        }
    }

    if (!scenario) {
        return (
            <div className="flex flex-col h-full p-6 bg-slate-50 overflow-y-auto w-full">
                <button onClick={onBack} className="mb-6 flex items-center text-slate-600 hover:text-slate-900 w-fit">
                    <ChevronLeft size={20} /> Back
                </button>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">🎭 Choose a Scenario</h1>
                <p className="text-slate-600 mb-8">Select a roleplay situation to practice real-world conversations.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SCENARIOS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => startScenario(s)}
                            className="flex items-start p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 text-left group w-full"
                        >
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {getIcon(s.id)}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">{s.name}</h3>
                                <p className="text-sm text-slate-500 mb-2">{s.description}</p>
                                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">You: {s.userRole}</span>
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">AI: {s.aiRole}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
                <div className="flex items-center">
                    <button onClick={() => setScenario(null)} className="mr-4 p-2 hover:bg-slate-100 rounded-full">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            {getIcon(scenario.id)} {scenario.name}
                        </h2>
                        <div className="text-xs text-slate-500 hidden sm:block">
                            You: <span className="font-semibold">{scenario.userRole}</span> vs <span className="font-semibold">{scenario.aiRole}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => { setScenario(null); setMessages([]); }}
                    className="text-red-500 text-sm hover:bg-red-50 px-3 py-1 rounded transition-colors"
                >
                    End Roleplay
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <ChatMessage
                        key={msg.id || idx}
                        message={msg}
                        accent={settings.accent}
                        ttsEnabled={settings.ttsEnabled}
                    />
                ))}
                {isProcessing && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm pl-4 animate-pulse">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                        {scenario.aiRole} is typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t shrink-0">
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <button
                        onClick={handleRecordToggle}
                        className={`p-4 rounded-full transition-all flex-shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {isRecording ? <StopCircle size={24} /> : <Mic size={24} />}
                    </button>

                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={`Reply as ${scenario.userRole}...`}
                        className="flex-1 px-4 border rounded-full focus:outline-none focus:border-blue-500 min-w-0"
                        disabled={isRecording || isProcessing}
                    />

                    <button
                        onClick={handleSend}
                        disabled={(!inputText.trim() && !isRecording) || isProcessing}
                        className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
                    >
                        <Send size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RolePlayMode;