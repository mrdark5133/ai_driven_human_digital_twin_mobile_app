import { initLlama, LlamaContext } from 'llama.rn';
import { getModelPath, isModelDownloaded } from './modelManager';
import {
  AURA_PERSONA_PROMPT,
  MORNING_GOAL,
  EVENING_GOAL,
  TANGALISH_FEW_SHOTS,
  USER_TANGALISH_HINT,
  AURA_STOP_TOKENS,
} from './persona';

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

export interface WarmupOptions {
  systemPrompt?: string;
  slot?: 'morning' | 'evening';
  mode?: 'call' | 'chat';
}

let activeLlamaContext: LlamaContext | null = null;
let initPromise: Promise<LlamaContext> | null = null;
let generationLock: Promise<void> = Promise.resolve();

// Thread benchmarking state
let optimalThreads = 4;
let benchmarkDone = false;
let isWarmupRunning = false;
let abortWarmupRequested = false;

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
 * Runs a benchmark test comparing 4 vs 6 threads for prompt evaluation.
 * Logs prompt-eval tokens/sec for each and retains the faster configuration.
 */
async function runThreadBenchmark(context: LlamaContext): Promise<number> {
  if (benchmarkDone) return optimalThreads;
  benchmarkDone = true;

  try {
    console.log('[LLM] Benchmarking prompt-eval speed (4 threads vs 6 threads)...');
    const testMessages = [
      { role: 'system', content: 'You are Pallavi, a friendly digital twin and health companion.' },
      { role: 'user', content: 'Hi Pallavi, epdi irukkeenga? Innaiku weather epdi irukku?' },
    ];

    // Measure prompt-eval with 4 threads
    const t0 = Date.now();
    await context.completion({
      messages: testMessages,
      n_predict: 1,
      temperature: 0.1,
      n_threads: 4,
    });
    const elapsed4 = Math.max(1, Date.now() - t0);
    const tokens = 35; // approx token length of test prompt
    const speedPp4 = tokens / (elapsed4 / 1000);
    console.log(`[LLM] Benchmark (4 threads): ${speedPp4.toFixed(1)} t/s prompt-eval (${elapsed4}ms)`);

    // Measure prompt-eval with 6 threads
    const t1 = Date.now();
    await context.completion({
      messages: testMessages,
      n_predict: 1,
      temperature: 0.1,
      n_threads: 6,
    });
    const elapsed6 = Math.max(1, Date.now() - t1);
    const speedPp6 = tokens / (elapsed6 / 1000);
    console.log(`[LLM] Benchmark (6 threads): ${speedPp6.toFixed(1)} t/s prompt-eval (${elapsed6}ms)`);

    // Pick the faster setting (with slight preference for 4 threads for thermals/battery if close)
    if (speedPp6 > speedPp4 * 1.05) {
      optimalThreads = 6;
    } else {
      optimalThreads = 4;
    }
    console.log(`[LLM] Keeping faster configuration: ${optimalThreads} threads`);
    return optimalThreads;
  } catch (err) {
    console.warn('[LLM] Thread benchmark could not complete, defaulting to 4 threads:', err);
    optimalThreads = 4;
    return 4;
  }
}

/**
 * Initializes and caches the singleton LlamaContext for Qwen2.5-1.5B on the device.
 * Configured with n_batch: 512, n_ctx: 2048, and benchmarked threads.
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
          n_batch: 512,
          n_threads: optimalThreads,
          n_gpu_layers: 0, // CPU execution for stability
        },
        (progress) => {
          onProgress?.(progress);
        }
      );

      // Run benchmark once in background after initialization
      runThreadBenchmark(activeLlamaContext).catch(() => {});

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
 * Structured with system message + alternating few-shot chat turns + clean user turns with inference hints.
 */
export async function streamLlmResponse(
  conversationHistory: ChatTurn[],
  onToken: (token: string) => void,
  options?: StreamLlmOptions
): Promise<{ text: string; metrics: LlmGenerationMetrics }> {
  // If warm-up is in-flight, signal it to abort so real turns take precedence
  if (isWarmupRunning) {
    abortWarmupRequested = true;
  }

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

    // PART 1.a: Measure system prompt in tokens and log it
    try {
      const sysTokens = await context.tokenize(systemContent);
      console.log(`[LLM] system prompt tokens: ${sysTokens.tokens.length}`);
    } catch {}

    // PART 1.b & 1.c:
    // Real chat turns: System message + 4 few-shot chat turns (prefix) + recent conversation turns
    // User messages get the inference hint appended for Tanglish enforcement while stored history stays clean.
    const messages = [
      {
        role: 'system',
        content: systemContent,
      },
      ...TANGALISH_FEW_SHOTS.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
      ...recentTurns.map((turn) => {
        if (turn.role === 'user') {
          return {
            role: 'user',
            content: `${turn.content} ${USER_TANGALISH_HINT}`,
          };
        }
        return {
          role: 'assistant',
          content: turn.content,
        };
      }),
    ];

    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    let fullGeneratedText = '';

    const lastUserTurn = recentTurns.filter((t) => t.role === 'user').pop();
    console.log(`[LLM] called with user query: "${lastUserTurn?.content || ''}"`);

    const result = await context.completion(
      {
        messages,
        n_predict: options?.maxTokens ?? 50,
        temperature: options?.temperature ?? 0.5,
        top_p: 0.9,
        penalty_repeat: 1.1,
        stop: AURA_STOP_TOKENS,
        n_threads: optimalThreads,
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
 * Warms up the LLM by evaluating the REAL prefix (system prompt + 4 few-shot chat turns + dummy user message)
 * with n_predict = 1 so that the KV cache is already primed for the first conversational turn.
 */
export async function warmupLlmContext(options?: WarmupOptions): Promise<void> {
  if (isWarmupRunning) return;
  isWarmupRunning = true;
  abortWarmupRequested = false;

  const releaseLock = await acquireLlmLock();
  try {
    if (abortWarmupRequested) {
      console.log('[LLM] Warm-up aborted: real turn took precedence');
      return;
    }

    if (!activeLlamaContext) {
      await initLlmContext();
    }
    const context = activeLlamaContext;
    if (!context) return;

    let systemContent = options?.systemPrompt;
    if (!systemContent) {
      if (options?.slot === 'morning') systemContent = MORNING_GOAL;
      else if (options?.slot === 'evening') systemContent = EVENING_GOAL;
      else systemContent = AURA_PERSONA_PROMPT;
    }

    // Exact same prefix: System prompt + 4 Few-shot turns + dummy user turn with hint
    const messages = [
      {
        role: 'system',
        content: systemContent,
      },
      ...TANGALISH_FEW_SHOTS.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
      {
        role: 'user',
        content: `Hi da ${USER_TANGALISH_HINT}`,
      },
    ];

    const start = Date.now();
    let prefixTokensCount = 0;
    try {
      const formatted = await context.getFormattedChat(messages);
      const tokenized = await context.tokenize(formatted.prompt || '');
      prefixTokensCount = tokenized.tokens.length;
    } catch {}

    if (abortWarmupRequested) return;

    await context.completion({
      messages,
      n_predict: 1,
      temperature: 0.1,
      n_threads: optimalThreads,
    });

    const elapsedMs = Date.now() - start;
    console.log(`[LLM] prefix warm-up done in ${elapsedMs} ms (${prefixTokensCount} tokens)`);
  } catch (err) {
    console.warn('[LLM] Warm-up failed (non-critical):', err);
  } finally {
    isWarmupRunning = false;
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
