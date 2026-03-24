import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { HistoryItem, TrainingMode } from '../types';
import { MODEL_CONFIG } from '../constants';

interface InputData {
  text?: string;
  audio?: string;
  mimeType?: string;
  targetSentence?: string; // For Mode 3
  vocabWords?: string[]; // For Mode 6
  storyGenre?: string; // For Mode 5
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessageToGemini = async (
  history: HistoryItem[],
  input: InputData | undefined,
  systemInstruction: string,
  mode: TrainingMode,
  userApiKey?: string
): Promise<string> => {

  const apiKey = userApiKey || process.env.API_KEY || '';
  if (!apiKey) throw new Error('No API key provided. Please add your Gemini API key in Settings.');

  const ai = new GoogleGenAI({ apiKey });

  // 🎯 ROUTING LOGIC: Select primary model based on mode
  // Mode 2 & 3 use high-reasoning model
  // Modes 4, 5, 6 use standard model for speed/creativity unless complex analysis needed
  // Using Mode 2 config for debate analysis could be good, but stick to flash for speed in conversation
  const targetModel = (mode === TrainingMode.PRECISION || mode === TrainingMode.SHADOWING)
    ? MODEL_CONFIG.mode2
    : MODEL_CONFIG.mode1;

  // 🛡️ FUNCTION TO CALL API
  const callModel = async (modelName: string, isFallback: boolean): Promise<string> => {

    // 🧠 SMART HISTORY TRUNCATION LOGIC
    let historyToUse = history;

    // Truncate ONLY if Precision Mode AND Primary Model
    if (mode === TrainingMode.PRECISION && !isFallback) {
      historyToUse = history.slice(-6);
      console.log(`✂️ [Mode 2] Truncating history for ${modelName}: 6 turns used.`);
    } else {
      console.log(`📜 [${isFallback ? 'Fallback' : mode}] Using full history for ${modelName}.`);
    }

    // Prepare Contents
    const contents = historyToUse.map(item => ({
      role: item.role,
      parts: item.parts
    }));

    if (input) {
      const parts: any[] = [];

      // SPECIAL CASE FOR MODE 3: Inject Target Sentence clearly
      if (mode === TrainingMode.SHADOWING && input.targetSentence) {
        parts.push({ text: `TARGET SENTENCE: "${input.targetSentence}"` });
      }

      // SPECIAL CASE FOR MODE 6: Inject Target Words
      if (mode === TrainingMode.VOCAB_PRACTICE && input.vocabWords) {
        parts.push({ text: `TARGET WORDS TO PRACTICE: ${input.vocabWords.join(', ')}` });
      }

      // SPECIAL CASE FOR MODE 5: Inject Genre
      if (mode === TrainingMode.STORY && input.storyGenre && history.length === 0) {
        parts.push({ text: `STORY GENRE: ${input.storyGenre}. Start the story now.` });
      }

      if (input.audio) {
        parts.push({
          inlineData: {
            mimeType: input.mimeType || 'audio/webm',
            data: input.audio
          }
        });
      }

      if (input.text) {
        parts.push({ text: input.text });
      }

      if (parts.length > 0) {
        contents.push({
          role: 'user',
          parts: parts
        });
      }
    } else if (contents.length === 0) {
      // ✅ Dynamic Mode Start Message (If starting fresh)
      let startText = "Start the session now.";
      if (mode === TrainingMode.DEBATE) startText = "Start the debate. Pick a topic.";

      contents.push({
        role: 'user',
        parts: [{ text: startText }]
      });
    }

    // 🔥 CRITICAL: SYSTEM INJECTION (THE "REMINDER")
    // We append this to the END of the conversation to force the model to look at it.
    // This overcomes "Attention Decay".
    let reminderText = "";

    if (mode === TrainingMode.FLUENCY) {
      reminderText = `[SYSTEM REMINDER]: You are in MODE 1 (FLUENCY). 
         - DO NOT give feedback. 
         - DO NOT score. 
         - Just chat naturally.
         - Remember what user said earlier.
         - Vary topics.`;
    } else if (mode === TrainingMode.PRECISION) {
      reminderText = `[SYSTEM REMINDER]: You are in MODE 2 (PRECISION).
         🔴 LISTEN TO THE ENTIRE AUDIO - DO NOT SKIP ANY PART!
         Write COMPLETE transcription in "What I Heard" (everything user said).
         
         🔴🔴🔴 CRITICAL MATH RULE 🔴🔴🔴
         SCORE = 100 - (Sum of penalties you list)
         If penalties = -18, score MUST be 82! NOT 72!
         VERIFY YOUR MATH BEFORE SHOWING SCORE!
         
         ⚠️ PENALTY CONSISTENCY RULE ⚠️
         DO NOT invent penalties that contradict your transcription!
         Example: If you transcribed "dreams", do NOT say "s was dropped"!
         Only penalize errors you ACTUALLY heard in the audio!
         
         📊 SCORE ACTIONS:
         - Score 90-100: Quick praise + next question
         - Score 75-89: Brief note + next question
         - Score 70-74: Full 8-step analysis + MOVE TO NEXT QUESTION (NO re-record!)
         - Score BELOW 70: Full 8-step analysis + Re-record required
         
         ⚠️ If score >= 70: DO NOT ask for re-record!
         
         CRITICAL - DO ALL OF THIS:
         1. Analyze RAW AUDIO: pauses, confidence, filler words (count them!)
         2. Calculate score = 100 - Total Penalties
         3. Apply correct action based on score range above
         4. Include mouth position details, linking, stress patterns
         5. Note confidence: trailing off? mumbled endings?
         6. Praise any self-corrections
         7. End positively`;
    } else if (mode === TrainingMode.SHADOWING) {
      reminderText = `[SYSTEM REMINDER]: You are in MODE 3 (SHADOWING).
         
         🎧 SHADOWING COMPARISON MODE
         You received a TARGET SENTENCE and USER'S AUDIO attempt.
         
         YOUR TASK:
         1. Transcribe EXACTLY what the user said
         2. Compare to the TARGET SENTENCE word-by-word
         3. Identify STRESS differences (show stressed syllables in CAPS: "com-PO-sure")
         4. Identify PHONEME errors (e.g., /θ/ → /s/)
         5. Identify LINKING issues (missed connections)
         6. Score out of 100
         
         📊 OUTPUT FORMAT:
         ┌────────────────────────────────────┐
         │ 📊 SHADOWING COMPARISON            │
         ├────────────────────────────────────┤
         │ Target:  "[original sentence]"    │
         │ You said: "[transcription]"       │
         ├────────────────────────────────────┤
         │ ✅ Correct: [what was good]        │
         │ ❌ Errors:                         │
         │   • Stress: [word] → [correct]    │
         │   • Phoneme: [sound] → [sound]    │
         │   • Linking: [missed connection]  │
         ├────────────────────────────────────┤
         │ Score: [X]/100                    │
         │ Tip: [one specific improvement]   │
         └────────────────────────────────────┘
         
         BE PRECISE and HONEST. If pronunciation is wrong, say it clearly.`;
    } else if (mode === TrainingMode.DEBATE) {
      reminderText = `[SYSTEM REMINDER]: MODE 4 (DEBATE - SMART CONVICTION).
         🧠 BEFORE responding, CLASSIFY user's argument:
         🟢 Strong Attack | 🟡 Decent Defense | 🟠 Wavering | 🔴 Concession | ⚫ Deflection
         
         Then adjust conviction based on classification + level rules.
         Show: Round X/10 | Conviction: XX% [↑/↓] | [classification emoji + label]
         
         ⚠️ NO grammar/pronunciation feedback during debate!
         ⚠️ If user is wavering → PRESS harder. If conceding → conviction DECREASES.
         ⚠️ Check: MOMENTUM + CONSISTENCY + ENGAGEMENT before updating.
         ⚠️ Anti-stinginess: conviction below 30% by Round 5 with decent args = TOO HARSH!`;
    } else if (mode === TrainingMode.STORY) {
      reminderText = `[SYSTEM REMINDER]: MODE 5 (STORY MODE).
         📖 Collaborative storytelling. You and user take turns.
         YOUR TURN: 2-4 sentences continuing the plot.
         ⚠️ CORRECT IMPLICITLY — recast grammar errors in YOUR turn.
         ⚠️ Do NOT stop to teach or explain grammar during the story.
         ⚠️ Keep it exciting — plot twists, suspense, surprises!
         If user says "stop", write THE ENDING + full evaluation report.`;
    } else if (mode === TrainingMode.VOCAB_PRACTICE) {
      reminderText = `[SYSTEM REMINDER]: MODE 6 (VOCAB PRACTICE).
         🎯 Help user USE their target words naturally.
         ⚠️ Do NOT say "Make a sentence with X" — ask contextual questions.
         ⚠️ Track which words used correctly vs. not yet.
         ⚠️ If word used correctly, acknowledge and move to next word.
         ⚠️ If word used wrongly, gently correct and re-prompt.
         If user says "stop", show full vocab mastery report.`;
    } else if (mode === TrainingMode.ROLE_PLAY) {
      reminderText = `[SYSTEM REMINDER]: MODE 7 (ROLE PLAY).
         Stay in character at all times.
         React naturally and realistically to what the user says.
         Correct language errors SUBTLY within the conversation (rephrase their sentence correctly in your reply).
         Keep the scenario engaging and push the conversation forward.
         If user says "stop", end the role play and give a brief feedback summary.`;
    } else if (mode === TrainingMode.LISTENING) {
      reminderText = `[SYSTEM REMINDER]: MODE 8 (LISTENING CHALLENGE).
         🎧 You are running a listening comprehension exercise.
         ⚠️ Ask questions ONE AT A TIME. Wait for user's answer before asking next.
         ⚠️ Grade each answer clearly: ✅ Correct or ❌ Incorrect.
         ⚠️ Explain WHY incorrect answers are wrong briefly.
         ⚠️ After 3 questions, show FULL results report with Score: X/3.
         Keep questions appropriate for the user's level.`;
    }

    // We add this as a 'user' message effectively "whispering" to the model right before it speaks
    contents.push({
      role: 'user',
      parts: [{ text: reminderText }]
    });

    // ⚙️ CONFIGURATION
    const temperature = (mode === TrainingMode.PRECISION || mode === TrainingMode.SHADOWING) ? 1.0 : 0.9;

    let config: any = {
      systemInstruction: systemInstruction,
      temperature: temperature,
      maxOutputTokens: 8192,
      topP: 0.95,
      topK: 40,
    };

    // Note: thinkingConfig removed - not supported by gemini-1.5-flash-latest
    // Was only available for gemini-3-flash-preview
    // if ((mode === TrainingMode.PRECISION || mode === TrainingMode.SHADOWING) && !isFallback) {
    //   config = {
    //     ...config,
    //     thinkingConfig: { thinkingBudget: 2048 },
    //   };
    // }

    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: config
        });
        return response.text || "Sorry, I couldn't generate a response.";
      } catch (error: any) {
        console.warn(`${modelName} Attempt ${attempt + 1} failed:`, error);

        const isQuotaError = error.status === 429 || error.message?.includes('429');
        if (isQuotaError && attempt < MAX_RETRIES - 1) {
          await delay(2000 * Math.pow(2, attempt));
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Failed to call ${modelName} after retries`);
  };

  try {
    return await callModel(targetModel, false);
  } catch (error: any) {
    if (targetModel === MODEL_CONFIG.mode2) {
      console.warn("⚠️ Primary Model failed. Switching to Fallback...");
      try {
        return await callModel(MODEL_CONFIG.fallback, true);
      } catch (fallbackError: any) {
        throw new Error(`Service Unavailable: ${fallbackError.message}`);
      }
    }
    throw error;
  }
};
