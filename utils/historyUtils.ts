import { Message, HistoryItem } from '../types';

/**
 * Converts internal Message[] to Gemini-compatible HistoryItem[].
 * Audio messages from users are represented as "[User Audio]" text placeholders.
 * This is the single source of truth for history conversion across all components.
 */
export const buildHistoryFromMessages = (msgs: Message[]): HistoryItem[] => {
    return msgs.map(m => {
        if (m.isAudio && m.role === 'user') {
            return { role: m.role, parts: [{ text: '[User Audio]' }] };
        }
        return { role: m.role, parts: [{ text: m.text || '' }] };
    });
};

/**
 * Builds history and slices off the last message (current input).
 * Use this when you've already added the current user message to the array
 * and need to pass history WITHOUT it (because geminiService adds input separately).
 */
export const buildHistoryForApi = (msgs: Message[]): HistoryItem[] => {
    return buildHistoryFromMessages(msgs).slice(0, -1);
};
