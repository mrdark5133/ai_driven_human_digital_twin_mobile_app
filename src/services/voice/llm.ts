import { initLlama, LlamaContext } from 'llama.rn';
import { getModelPath, isModelDownloaded } from './modelManager';
import { AURA_PERSONA_PROMPT, AURA_STOP_TOKENS } from './persona';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmGenerationMetrics {
  timeToFirstTokenMs: number;
  totalTimeMs: number;
  tokensGenerated: number;
  tokensPerSecond: number;
}

export interface StreamLlmOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  onFirstToken?: (ttftMs: number) => void;
}

let activeLlamaContext: LlamaContext | null = null;
let initPromise: Promise<LlamaContext> | null = null;
let generationLock: Promise<void> = Promise.resolve();

/**
 * Mutex lock ensuring only ONE LLM generation runs at any time across chat and voice calls.
 * Essential on mobile to prevent out-of-memory crashes and thread contention.
 */
export async function acquireLlmLock(): Promise<() => void> {
  let release: () => void = () => {};
  const currentLock = generationLock;
  generationLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await currentLock;
  return release;
}

/**
 * Initializes and caches the singleton LlamaContext for Qwen2.5-1.5B on the device.
 */
export async function initLlmContext(
  onProgress?: (progress: number) => void
): Promise<LlamaContext> {
  if (activeLlamaContext) {
    return activeLlamaContext;
  }

  if (initPromise) {
    return initPromise;
  }

  const downloaded = await isModelDownloaded();
  if (!downloaded) {
    throw new Error('On-device model is not downloaded. Please download the model first.');
  }

  initPromise = (async () => {
    const modelPath = getModelPath();
    console.log('[LLM] Initializing singleton Llama context with model:', modelPath);
    try {
      activeLlamaContext = await initLlama(
        {
          model: modelPath,
          use_mlock: true,
          n_ctx: 2048,
          n_threads: 4,
          n_gpu_layers: 0, // CPU 4 threads for stable on-device execution
        },
        (progress) => {
          onProgress?.(progress);
        }
      );
      return activeLlamaContext;
    } catch (error: any) {
      activeLlamaContext = null;
      throw new Error(`Failed to initialize Llama context: ${error?.message || String(error)}`);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Checks whether the LLM context is loaded in memory.
 */
export function isLlmLoaded(): boolean {
  return activeLlamaContext !== null;
}

/**
 * Generates a streaming response for a conversational turn with concurrency protection.
 * Keeps conversation history trimmed to the last few turns for optimal speed.
 */
export async function streamLlmResponse(
  conversationHistory: ChatTurn[],
  onToken: (token: string) => void,
  options?: StreamLlmOptions
): Promise<{ text: string; metrics: LlmGenerationMetrics }> {
  // Acquire generation lock so calls and chat never overlap
  const releaseLock = await acquireLlmLock();

  try {
    if (!activeLlamaContext) {
      await initLlmContext();
    }
    const context = activeLlamaContext;
    if (!context) {
      throw new Error('Llama context is not available.');
    }

    // Keep only the last 4 turns (2 user, 2 assistant) to minimize context processing latency
    const recentTurns = conversationHistory.slice(-4);
    const systemContent = options?.systemPrompt || AURA_PERSONA_PROMPT;

    const messages = [
      {
        role: 'system',
        content: systemContent,
      },
      ...recentTurns.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    ];

    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    let fullGeneratedText = '';

    const userPrompt = messages[messages.length - 1]?.content || '';
    console.log(`[LLM] called with: "${userPrompt}"`);

    const result = await context.completion(
      {
        messages,
        n_predict: options?.maxTokens ?? 60,
        temperature: options?.temperature ?? 0.65,
        stop: AURA_STOP_TOKENS,
      },
      (data) => {
        const token = data.token;
        if (!token) return;

        if (firstTokenTime === null) {
          firstTokenTime = Date.now();
          const ttftMs = firstTokenTime - startTime;
          console.log(`[LLM] first token: ${ttftMs}ms`);
          options?.onFirstToken?.(ttftMs);
        }
        tokenCount += 1;
        fullGeneratedText += token;
        onToken(token);
      }
    );

    const endTime = Date.now();
    const totalDurationMs = Math.max(1, endTime - startTime);
    const ttftMs = firstTokenTime ? firstTokenTime - startTime : totalDurationMs;
    const tps = tokenCount > 0 ? tokenCount / (totalDurationMs / 1000) : 0;

    const finalText = (result.text || fullGeneratedText).trim();

    return {
      text: finalText,
      metrics: {
        timeToFirstTokenMs: ttftMs,
        totalTimeMs: totalDurationMs,
        tokensGenerated: tokenCount,
        tokensPerSecond: Math.round(tps * 10) / 10,
      },
    };
  } catch (error: any) {
    throw new Error(`LLM generation error: ${error?.message || String(error)}`);
  } finally {
    releaseLock();
  }
}

/**
 * Releases the active Llama context from device memory.
 */
export async function releaseLlmContext(): Promise<void> {
  const releaseLock = await acquireLlmLock();
  try {
    if (activeLlamaContext) {
      await activeLlamaContext.release();
      activeLlamaContext = null;
    }
  } catch (err) {
    console.warn('[LLM] Error releasing context:', err);
  } finally {
    activeLlamaContext = null;
    releaseLock();
  }
}
