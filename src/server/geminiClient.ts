import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
let isQuotaExhausted = false;
let quotaExhaustedUntil = 0;

export function markQuotaExhausted(retryDelaySeconds?: number) {
  isQuotaExhausted = true;
  const delayMs = (retryDelaySeconds && retryDelaySeconds > 0) ? retryDelaySeconds * 1000 : 3600 * 1000;
  quotaExhaustedUntil = Date.now() + Math.min(delayMs, 24 * 3600 * 1000);
}

export function isGeminiQuotaExhausted(): boolean {
  if (isQuotaExhausted) {
    if (Date.now() < quotaExhaustedUntil) {
      return true;
    }
    isQuotaExhausted = false;
  }
  return false;
}

export function handleGeminiError(context: string, err: any) {
  const errMsg = typeof err === 'string' ? err : err?.message || '';
  const is429 = err?.status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded');
  if (is429) {
    markQuotaExhausted();
  }
}

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
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
