import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, AccentType } from '../types';
import { Bot, User, Play, Pause, Volume2, StopCircle, Bookmark, Check } from 'lucide-react';
import { detectChunkInResponse, detectModelSentence, guessChunkCategory } from '../utils/textAnalysis';
import { saveChunk } from '../services/storageService';
import AudioPlayer from './AudioPlayer';

interface ChatMessageProps {
  message: Message;
  accent?: AccentType;
  ttsEnabled?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, accent = 'American', ttsEnabled = true }) => {
  const isUser = message.role === 'user';

  // Audio Recording Player State (for User audio)
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // TTS State (for Bot text)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Chunk Saving State
  const [detectedChunk, setDetectedChunk] = useState<string | null>(null);
  const [isChunkSaved, setIsChunkSaved] = useState(false);
  const [modelSentence, setModelSentence] = useState<string | null>(null);

  // Analysis Effect
  useEffect(() => {
    if (!isUser && message.text) {
      const chunk = detectChunkInResponse(message.text);
      setDetectedChunk(chunk);

      const sentence = detectModelSentence(message.text);
      setModelSentence(sentence);
    }
  }, [message.text, isUser]);

  const handleSaveChunk = () => {
    if (detectedChunk) {
      saveChunk({
        id: Date.now().toString(),
        phrase: detectedChunk,
        category: guessChunkCategory(detectedChunk),
        savedAt: new Date().toISOString()
      });
      setIsChunkSaved(true);
    }
  };

  // Toggle User Recording
  const toggleRecordingAudio = () => {
    if (audioRef.current) {
      if (isPlayingRecording) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlayingRecording(!isPlayingRecording);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlayingRecording(false);
    }
  }, []);

  // Handle Text-to-Speech
  const handleTTS = () => {
    if (!ttsEnabled) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!message.text) return;

    // Clean text for speech (remove markdown symbols roughly)
    const textToSpeak = message.text
      .replace(/[*#_]/g, '') // remove basic markdown chars
      .replace(/👉/g, '')
      .replace(/❌|✅|🇺🇸|🗣️|🎵|🔗|🔹|🧩|🎤|📊|⚠️|🔴|🟡|🟢/g, ''); // Remove emojis

    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Attempt to set accent
    const voices = window.speechSynthesis.getVoices();
    let targetLang = 'en-US';
    if (accent === 'British') targetLang = 'en-GB';
    if (accent === 'Australian') targetLang = 'en-AU';

    const preferredVoice = voices.find(voice => voice.lang.includes(targetLang));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!ttsEnabled && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [ttsEnabled, isSpeaking]);

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>

        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
          {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col p-4 rounded-2xl ${isUser
            ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-50 rounded-tr-none'
            : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-none'
          }`}>

          {/* Audio Player for User */}
          {isUser && message.audioUrl && (
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={toggleRecordingAudio}
                className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center hover:bg-indigo-400 transition-colors"
              >
                {isPlayingRecording ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
              </button>
              <div className="text-xs font-medium text-indigo-200 uppercase tracking-wider">
                Voice Recording
              </div>
              <audio ref={audioRef} src={message.audioUrl} className="hidden" />
            </div>
          )}

          {/* Text Content */}
          {message.text && (
            <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-emerald-400 mt-4 mb-2" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-base font-bold text-emerald-300 mt-4 mb-2" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-gray-300 mt-3 mb-1" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-bold text-white bg-white/10 px-1 rounded" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                  li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                  code: ({ node, ...props }) => <code className="bg-gray-900 px-1 py-0.5 rounded text-yellow-300 font-mono text-xs" {...props} />,
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          )}

          {/* Action Footer for Bot */}
          {!isUser && message.text && (
            <div className="mt-3 pt-3 border-t border-gray-700 flex flex-wrap items-center gap-3">
              {/* Main Read Aloud */}
              {ttsEnabled && (
                <button
                  onClick={handleTTS}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${isSpeaking
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                >
                  {isSpeaking ? <StopCircle size={12} /> : <Volume2 size={12} />}
                  {isSpeaking ? 'Stop Reading' : 'Read All'}
                </button>
              )}

              {/* Model Sentence Player */}
              {ttsEnabled && modelSentence && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Model Answer:</span>
                  <AudioPlayer text={modelSentence} accent={accent} enabled={ttsEnabled} />
                </div>
              )}

              {/* Save Chunk */}
              {detectedChunk && (
                <button
                  onClick={handleSaveChunk}
                  disabled={isChunkSaved}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-colors border ${isChunkSaved
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-transparent'
                    }`}
                >
                  {isChunkSaved ? <Check size={12} /> : <Bookmark size={12} />}
                  {isChunkSaved ? 'Saved' : 'Save Phrase'}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
