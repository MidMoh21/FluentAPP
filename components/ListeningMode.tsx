import React, { useState } from 'react';
import { Play, Check, X, Headphones, RefreshCw, Volume2 } from 'lucide-react';
import { UserSettings, Message, TrainingMode, ListeningSession } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { speakText } from '../services/ttsService';
import { saveListeningSession } from '../services/storageService';
import { generateSystemInstruction } from '../constants';
import { buildHistoryForApi } from '../utils/historyUtils';

interface ListeningModeProps {
    settings: UserSettings;
    onBack: () => void;
}

const ListeningMode: React.FC<ListeningModeProps> = ({ settings, onBack }) => {
    const [status, setStatus] = useState<'IDLE' | 'GENERATING' | 'READY_TO_LISTEN' | 'PLAYING' | 'TESTING' | 'FINISHED'>('IDLE');
    const [storyText, setStoryText] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState('');
    const [score, setScore] = useState(0);
    const [questionCount, setQuestionCount] = useState(0);

    // Messages history for Gemini context
    const [messages, setMessages] = useState<Message[]>([]);

    // History conversion is now handled by the shared buildHistoryForApi utility

    // 1. Generate new story
    const generateStory = async () => {
        setStatus('GENERATING');
        setStoryText('');
        setFeedback('');
        setScore(0);
        setQuestionCount(0);
        setMessages([]);

        const startInput = 'Generate a new listening challenge now.';

        try {
            const systemInstruction = generateSystemInstruction(settings, TrainingMode.LISTENING);

            // Initial call has no history
            const response = await sendMessageToGemini(
                [],
                { text: startInput },
                systemInstruction,
                TrainingMode.LISTENING,
                settings.apiKey
            );

            // Extract text between markers [TEXT_TO_READ]...[/TEXT_TO_READ]
            const textMatch = response.match(/\[TEXT_TO_READ\]([\s\S]*?)\[\/TEXT_TO_READ\]/);

            const startMsg: Message = { id: '0', role: 'user', text: startInput };
            const aiMsg: Message = { id: '1', role: 'model', text: response };

            if (textMatch && textMatch[1]) {
                setStoryText(textMatch[1].trim());
                setMessages([startMsg, aiMsg]);
                setStatus('READY_TO_LISTEN');
            } else {
                // Fallback if AI messes up format
                setStoryText(response);
                setMessages([startMsg, aiMsg]);
                setStatus('READY_TO_LISTEN');
            }

        } catch (e) {
            console.error(e);
            setStatus('IDLE');
        }
    };

    // 2. Play Audio (The core feature)
    const playAudio = () => {
        if (!storyText) return;
        setStatus('PLAYING');
        speakText(storyText, settings.accent, () => {
            setStatus('READY_TO_LISTEN'); // Callback when done
        });
    };

    // 3. Start Quiz
    const startQuiz = async () => {
        setStatus('TESTING');

        const readyInput = 'Ready';
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: readyInput };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);

        try {
            const systemInstruction = generateSystemInstruction(settings, TrainingMode.LISTENING);
            const historyForApi = buildHistoryForApi(newMessages);

            const response = await sendMessageToGemini(
                historyForApi,
                { text: readyInput },
                systemInstruction,
                TrainingMode.LISTENING,
                settings.apiKey
            );

            setCurrentQuestion(response);

            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response };
            setMessages(prev => [...prev, aiMsg]);

        } catch (e) {
            console.error(e);
            setStatus('IDLE');
        }
    };

    // 4. Submit Answer
    const submitAnswer = async () => {
        if (!userAnswer.trim()) return;

        // Preserve previous status or show loading differently?
        // Let's keep input disabled

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: userAnswer
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages); // Optimistic update
        setUserAnswer('');

        try {
            const systemInstruction = generateSystemInstruction(settings, TrainingMode.LISTENING);
            const historyForApi = buildHistoryForApi(newMessages);

            const response = await sendMessageToGemini(
                historyForApi,
                { text: userAnswer },
                systemInstruction,
                TrainingMode.LISTENING,
                settings.apiKey
            );

            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response };
            setMessages(prev => [...prev, aiMsg]);

            // Parse if the answer was correct to track score
            const isCorrect = response.includes('✅') ||
                response.toLowerCase().includes('correct') ||
                response.toLowerCase().includes('right!') ||
                response.toLowerCase().includes('well done');
            const isIncorrect = response.includes('❌') ||
                response.toLowerCase().includes('incorrect') ||
                response.toLowerCase().includes('not quite') ||
                response.toLowerCase().includes('wrong');

            // Only update score if we can determine correctness
            let newScore = score;
            if (isCorrect && !isIncorrect) {
                newScore = score + 1;
                setScore(newScore);
            }

            const newQuestionCount = questionCount + 1;
            setQuestionCount(newQuestionCount);

            // Check if quiz is done (3 questions answered, or AI outputs final score)
            if (newQuestionCount >= 3 || response.toLowerCase().includes('score') || response.includes('/3')) {
                setStatus('FINISHED');
                setFeedback(response);

                // Try to parse score from AI response (e.g., "2/3 Correct" or "Score: 2/3")
                const scoreMatch = response.match(/(\d)\s*\/\s*3/);
                const finalScore = scoreMatch ? parseInt(scoreMatch[1]) : newScore;

                // Save session
                const session: ListeningSession = {
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    topic: 'Random Story',
                    score: finalScore,
                    difficulty: settings.level
                };
                saveListeningSession(session);
            } else {
                // Next question
                setCurrentQuestion(response);
            }

        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 p-6 items-center overflow-y-auto">

            {/* HEADER */}
            <div className="w-full max-w-2xl flex justify-between items-center mb-8 shrink-0">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-800">
                    Back
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                    <Headphones className="text-blue-600" /> Listening Challenge
                </h1>
                <div className="w-10"></div>
            </div>

            {/* MAIN CARD */}
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 text-center min-h-[400px] flex flex-col justify-center">

                {/* STATE: IDLE */}
                {status === 'IDLE' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Headphones size={48} className="text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Ready to test your ears?</h2>
                        <p className="text-slate-600">
                            I will narrate a short story for level <span className="font-bold text-blue-600">{settings.level}</span>.
                            You listen, then answer questions.
                        </p>
                        <button
                            onClick={generateStory}
                            className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-md"
                        >
                            Start New Challenge
                        </button>
                    </div>
                )}

                {/* STATE: GENERATING */}
                {status === 'GENERATING' && (
                    <div className="animate-pulse space-y-4 flex flex-col items-center">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        <div className="text-slate-400 mt-4 flex items-center gap-2">
                            <RefreshCw size={16} className="animate-spin" /> Generating story...
                        </div>
                    </div>
                )}

                {/* STATE: READY / PLAYING */}
                {(status === 'READY_TO_LISTEN' || status === 'PLAYING') && (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-700">Listen Carefully!</h2>

                        {/* Visualizer Placeholder */}
                        <div className="flex justify-center items-center gap-1 h-16">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`w-3 bg-blue-500 rounded-full transition-all duration-300 ${status === 'PLAYING' ? 'h-12 animate-bounce' : 'h-3 opacity-50'}`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button
                                onClick={playAudio}
                                disabled={status === 'PLAYING'}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 transition-colors shadow-md"
                            >
                                {status === 'PLAYING' ? <Volume2 className="animate-pulse" /> : <Play size={20} />}
                                {status === 'PLAYING' ? 'Playing...' : 'Play Audio'}
                            </button>

                            <button
                                onClick={startQuiz}
                                disabled={status === 'PLAYING'}
                                className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-full hover:border-blue-500 hover:text-blue-500 disabled:opacity-50 transition-colors font-medium"
                            >
                                I'm Ready for Questions
                            </button>
                        </div>
                    </div>
                )}

                {/* STATE: TESTING */}
                {status === 'TESTING' && (
                    <div className="text-left space-y-6 animate-fade-in w-full">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-400 uppercase tracking-wide font-bold">Question {questionCount + 1}/3</div>

                            {/* 🎧 LISTEN AGAIN BUTTON */}
                            <button
                                onClick={playAudio}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors text-sm font-medium"
                            >
                                <Headphones size={16} />
                                Listen Again
                            </button>
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                            <p className="text-sm text-blue-700">
                                💡 <strong>Tip:</strong> You can listen to the passage as many times as you need before answering!
                            </p>
                        </div>

                        <h3 className="text-xl font-semibold text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            {currentQuestion}
                        </h3>


                        <textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                            rows={3}
                        />

                        <button
                            onClick={submitAnswer}
                            disabled={!userAnswer.trim()}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
                        >
                            Submit Answer
                        </button>
                    </div>
                )}

                {/* STATE: FINISHED */}
                {status === 'FINISHED' && (
                    <div className="text-left space-y-6 animate-fade-in w-full">
                        <div className="flex items-center gap-2 text-green-600 font-bold text-xl mb-4 justify-center">
                            <Check size={28} /> Challenge Complete!
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed">
                            {feedback}
                        </div>

                        <div className="mt-8">
                            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <Volume2 size={16} /> Original Text:
                            </h4>
                            <div className="p-4 bg-yellow-50 text-slate-800 rounded-xl italic border border-yellow-100 text-sm">
                                "{storyText}"
                            </div>
                        </div>

                        <button
                            onClick={generateStory}
                            className="w-full py-4 mt-6 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg"
                        >
                            <RefreshCw size={20} /> Try Another One
                        </button>
                    </div>
                )}

            </div>
        </div >
    );
};

export default ListeningMode;
