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

export function resetQuotaState() {
  isQuotaExhausted = false;
  quotaExhaustedUntil = 0;
}

export function handleGeminiError(context: string, err: any) {
  const errMsg = typeof err === 'string' ? err : err?.message || '';
  const is429 = err?.status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded');
  if (is429) {
    markQuotaExhausted();
  }
}

export function getQuotaStatus() {
  return {
    isExhausted: isGeminiQuotaExhausted(),
    quotaExhaustedUntil: isQuotaExhausted ? new Date(quotaExhaustedUntil).toISOString() : null,
    hasApiKey: !!process.env.GEMINI_API_KEY,
    keyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
    model: MODELS.DEFAULT_FAST
  };
}

export async function pingGemini(): Promise<{ success: boolean; latencyMs: number; error?: string; model: string }> {
  const start = Date.now();
  try {
    const ai = getGeminiClient();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Probe timeout: Gemini API response took > 3000ms')), 3000)
    );
    const callPromise = ai.models.generateContent({
      model: MODELS.DEFAULT_FAST,
      contents: "ping",
      config: {
        maxOutputTokens: 5,
        temperature: 0.1
      }
    });
    await Promise.race([callPromise, timeoutPromise]);
    const latencyMs = Date.now() - start;
    return {
      success: true,
      latencyMs,
      model: MODELS.DEFAULT_FAST
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      latencyMs,
      error: err?.message || String(err),
      model: MODELS.DEFAULT_FAST
    };
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
