import { ScoreEntry, PenaltyEntry } from '../types';

export const parseScoreFromResponse = (text: string): number | null => {
    // Try multiple patterns from most specific to least specific

    // Pattern 1: "SCORE: 73/100" or "FINAL SCORE: 73/100" or "Score = 73/100"
    const pattern1 = text.match(/(?:FINAL\s+)?SCORE[\s:=]+(\d+)\s*\/\s*100/i);
    if (pattern1 && pattern1[1]) return parseInt(pattern1[1], 10);

    // Pattern 2: "Score: 73 out of 100" or "score is 73 out of 100"
    const pattern2 = text.match(/SCORE[\s:=]+(?:is\s+)?(\d+)\s+out\s+of\s+100/i);
    if (pattern2 && pattern2[1]) return parseInt(pattern2[1], 10);

    // Pattern 3: "73/100" standalone (with word boundary to avoid false matches like dates)
    const pattern3 = text.match(/\b(\d{1,3})\/100\b/);
    if (pattern3 && pattern3[1]) {
        const score = parseInt(pattern3[1], 10);
        if (score >= 0 && score <= 100) return score;
    }

    return null;
};

export const parsePenaltiesFromResponse = (text: string): PenaltyEntry[] => {
    const penalties: PenaltyEntry[] = [];

    // Regex to find lines like "- Fillers (uh, um): -4" or "- Grammar: -2 points"
    // It looks for a hyphen, some text, a negative number, and optional "points"
    const regex = /-\s*([a-zA-Z\s/(),]+?):\s*-(\d+)/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        penalties.push({
            type: match[1].trim(),
            points: parseInt(match[2], 10)
        });
    }

    return penalties;
};

export const createScoreEntry = (text: string, userResponse: string): ScoreEntry | null => {
    const score = parseScoreFromResponse(text);
    if (score === null) return null;

    return {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        score,
        penalties: parsePenaltiesFromResponse(text),
        userResponse,
        aiFeedback: text
    };
};
