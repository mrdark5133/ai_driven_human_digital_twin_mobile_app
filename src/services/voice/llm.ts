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

let activeLlamaContext: LlamaContext | null = null;
let isInitializing = false;

/**
 * Initializes and caches the LlamaContext for Qwen2.5-1.5B on the device.
 */
export async function initLlmContext(
  onProgress?: (progress: number) => void
): Promise<LlamaContext> {
  if (activeLlamaContext) {
    return activeLlamaContext;
  }

  if (isInitializing) {
    // Wait for in-flight init to settle
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (activeLlamaContext) return activeLlamaContext;
  }

  const downloaded = await isModelDownloaded();
  if (!downloaded) {
    throw new Error('On-device model is not downloaded. Please download the model first.');
  }

  isInitializing = true;
  const modelPath = getModelPath();

  try {
    console.log('[LLM] Initializing Llama context with model:', modelPath);
    activeLlamaContext = await initLlama(
      {
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_threads: 4,
        n_gpu_layers: 0, // CPU 4 threads for reliable on-device execution
      },
      (progress) => {
        if (onProgress) {
          onProgress(progress);
        }
      }
    );
    return activeLlamaContext;
  } catch (error: any) {
    activeLlamaContext = null;
    throw new Error(`Failed to initialize Llama context: ${error?.message || String(error)}`);
  } finally {
    isInitializing = false;
  }
}

/**
 * Checks whether the LLM context is loaded in memory.
 */
export function isLlmLoaded(): boolean {
  return activeLlamaContext !== null;
}

/**
 * Generates a streaming response for the conversational turn.
 * Keeps conversation history trimmed to the last few turns for optimal speed.
 */
export async function streamLlmResponse(
  conversationHistory: ChatTurn[],
  onToken: (token: string) => void
): Promise<{ text: string; metrics: LlmGenerationMetrics }> {
  if (!activeLlamaContext) {
    await initLlmContext();
  }
  const context = activeLlamaContext;
  if (!context) {
    throw new Error('Llama context is not available.');
  }

  // Keep only the last 4 turns (2 user, 2 assistant) to minimize context processing latency
  const recentTurns = conversationHistory.slice(-4);

  const messages = [
    {
      role: 'system',
      content: AURA_PERSONA_PROMPT,
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

  try {
    const result = await context.completion(
      {
        messages,
        n_predict: 60,
        temperature: 0.65,
        stop: AURA_STOP_TOKENS,
      },
      (data) => {
        const token = data.token;
        if (!token) return;

        if (firstTokenTime === null) {
          firstTokenTime = Date.now();
        }
        tokenCount += 1;
        fullGeneratedText += token;
        onToken(token);
      }
    );

    const endTime = Date.now();
    const totalDurationMs = Math.max(1, endTime - startTime);
    const ttftMs = firstTokenTime ? firstTokenTime - startTime : totalDurationMs;
    const tps = tokenCount > 0 ? (tokenCount / (totalDurationMs / 1000)) : 0;

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
  }
}

/**
 * Releases the active Llama context from device memory.
 */
export async function releaseLlmContext(): Promise<void> {
  if (activeLlamaContext) {
    try {
      await activeLlamaContext.release();
    } catch (err) {
      console.warn('[LLM] Error releasing context:', err);
    } finally {
      activeLlamaContext = null;
    }
  }
}
