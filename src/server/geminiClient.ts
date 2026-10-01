import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Real AI generation calls will fail unless provided or in test simulation mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy_key_for_offline_simulation",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export const MODELS = {
  DEFAULT_FAST: 'gemini-3.8-flash',
  REASONING: 'gemini-3.8-flash',
  EMBEDDINGS: 'gemini-embedding-2-preview'
};
