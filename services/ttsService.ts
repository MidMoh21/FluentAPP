import { AccentType } from '../types';

export const speakText = (
    text: string,
    accent: AccentType = 'American',
    onEnd?: () => void
) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set Language based on Accent
    switch (accent) {
        case 'British':
            utterance.lang = 'en-GB';
            break;
        case 'Australian':
            utterance.lang = 'en-AU';
            break;
        default:
            utterance.lang = 'en-US';
    }

    // Attempt to find a specific voice for better quality
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.lang === utterance.lang);
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
    window.speechSynthesis.cancel();
};
