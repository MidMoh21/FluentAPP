import { ChunkCategory } from '../types';

export const detectChunkInResponse = (text: string): string | null => {
    const patterns = [
        /Try using:\s*["'](.+?)["']/i,
        /Natural chunk:\s*["'](.+?)["']/i,
        /Useful phrase:\s*["'](.+?)["']/i,
        /American expression:\s*["'](.+?)["']/i,
        /Chunk:\s*["'](.+?)["']/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1].split(' ').length > 1) { // Ensure it's not just one word
            return match[1];
        }
    }
    return null;
};

export const detectModelSentence = (text: string): string | null => {
    // Look for the "👉" symbol followed by quotes
    const match = text.match(/👉\s*["'](.+?)["']/);
    return match ? match[1] : null;
};

export const guessChunkCategory = (phrase: string): ChunkCategory => {
    const lower = phrase.toLowerCase();
    if (lower.match(/job|work|office|project|manager|deadline|interview/)) return 'work';
    if (lower.match(/game|match|play|team|sport|score|win|lose/)) return 'sports';
    if (lower.match(/think|believe|opinion|feel|agree|disagree/)) return 'opinions';
    if (lower.match(/home|food|sleep|wake|eat|buy|shop/)) return 'daily_life';
    return 'other';
};
