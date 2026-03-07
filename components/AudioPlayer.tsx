import React from 'react';
import { Volume2, StopCircle } from 'lucide-react';
import { speakText, stopSpeaking } from '../services/ttsService';
import { AccentType } from '../types';

interface AudioPlayerProps {
    text: string;
    accent: AccentType;
    enabled?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ text, accent, enabled = true }) => {
    const [isPlaying, setIsPlaying] = React.useState(false);

    const handlePlay = () => {
        if (!enabled) return;

        if (isPlaying) {
            stopSpeaking();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            speakText(text, accent, () => setIsPlaying(false));
        }
    };

    React.useEffect(() => {
        if (!enabled && isPlaying) {
            stopSpeaking();
            setIsPlaying(false);
        }
    }, [enabled, isPlaying]);

    if (!enabled) return null;

    return (
        <button
            onClick={handlePlay}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium transition-colors border border-emerald-500/20"
            title="Listen to pronunciation"
        >
            {isPlaying ? <StopCircle size={14} /> : <Volume2 size={14} />}
            {isPlaying ? 'Stop' : 'Listen'}
        </button>
    );
};

export default AudioPlayer;
