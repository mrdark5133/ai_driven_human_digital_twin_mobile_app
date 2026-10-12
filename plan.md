# Implementation Plan: On-Device Voice Calling Agent (AURA)

## 1. Overview & Objective
Build an on-device phone-call style conversational AI agent ("AURA") running fully on an Android phone with zero servers or paid APIs. The conversation runs in casual Tanglish (Tamil + English written in English script) in a continuous loop:
$$\text{Speech Recognition (ASR)} \xrightarrow{} \text{On-Device LLM (GGUF via llama.rn)} \xrightarrow{} \text{System TTS (expo-speech)}$$

## 2. Technical Stack & Dependencies
- **ASR:** `expo-speech-recognition` (^57.1.1) with on-device recognition and locale switching (`en-IN` / `ta-IN`).
- **Inference Engine:** `llama.rn` (^0.13.0-rc.7) running Qwen2.5-1.5B-Instruct (Q4_K_M GGUF, ~1.11 GB).
- **TTS:** `expo-speech` (~57.0.3) targeting `en-IN` voice with sequential sentence queueing.
- **File Management:** `expo-file-system` (~57.0.7) downloading model to `FileSystem.documentDirectory` with resumable progress tracking.
- **Routing:** `expo-router` modal / screen `app/call.tsx` (outside tabs).

## 3. Architecture & Conversational Loop

```
+-----------------------------------------------------------------------------------+
|                              CALL SCREEN (app/call.tsx)                           |
|   Visual States: Listening -> Thinking -> Speaking                               |
|   Controls: Mute Toggle, End Call, Download Progress Bar                          |
|   Telemetry Overlay: Time-to-First-Token, Time-to-First-Audio, LLM Tokens/Sec    |
+-----------------------------------------+-----------------------------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
         [ asr.ts (Speech-to-Text) ]             [ tts.ts (Text-to-Speech) ]
         - expo-speech-recognition               - expo-speech (en-IN)
         - Locale: en-IN (default) / ta-IN       - Sentence queuing
         - End-of-speech silence trigger         - Stop & onDone callbacks
                      |                                       ^
                      | user utterance                        | spoken sentences
                      v                                       |
+---------------------+---------------------------------------+---------------------+
|                          AGENT LOOP (callAgent.ts)                                 |
| 1. User stops speaking -> Stop ASR immediately (prevent hearing AI)              |
| 2. Play immediate casual filler: "Hmm...", "Okay okay...", "Sari..."             |
| 3. Send trimmed conversation history + persona.ts to llm.ts                       |
| 4. Stream LLM tokens; on sentence boundary ([.!?\n]), send sentence to tts.ts   |
| 5. When all sentences finish speaking -> Restart ASR for user response          |
+-------------------------------------+-----------------------------------------------+
                                      |
                                      v
                        [ llm.ts (llama.rn inference) ]
                        - Model: Qwen2.5-1.5B-Instruct-Q4_K_M.gguf
                        - ModelManager: modelManager.ts
                        - n_ctx: 2048, 4 threads, temp: 0.65, n_predict: 60
```

## 4. Implementation Steps

1. **Configuration & Native Plugins**
   - Update `app.json`: Add `RECORD_AUDIO` permission, configure `expo-speech-recognition` and `llama.rn` plugins.
   - Verify `eas.json`: Ensure `developmentClient: true` and `buildType: "apk"`.
2. **Model Download Service (`src/services/voice/modelManager.ts`)**
   - Download Qwen2.5-1.5B-Instruct Q4_K_M GGUF from verified Hugging Face repository.
   - Store in `FileSystem.documentDirectory + 'models/qwen2.5-1.5b-instruct-q4_k_m.gguf'`.
   - Implement existence check, download progress callback, and error handling.
3. **ASR Service (`src/services/voice/asr.ts`)**
   - Manage speech recognition session with `expo-speech-recognition`.
   - Expose start/stop, interim transcripts, final transcripts, and error hooks.
   - Default to `en-IN`, configurable to `ta-IN`.
4. **Persona & LLM Service (`src/services/voice/persona.ts`, `src/services/voice/llm.ts`)**
   - Persona prompt: Casual, caring Tanglish friend, 1-2 short sentences, 1 simple question, no lists, no medical diagnosis.
   - `initLlama` context creation with 4 CPU threads and 2048 context.
   - Streaming token generator with sentence chunking and latency timestamping.
5. **TTS Service (`src/services/voice/tts.ts`)**
   - Queue-based speech synthesizer using `expo-speech` with `en-IN` voice.
   - Sentence-by-sentence playback with `stop()` and `onDone()` event listeners.
6. **Agent Orchestration & Call UI (`src/services/voice/callAgent.ts`, `app/call.tsx`)**
   - Orchestrate conversational turn-taking with instant filler playback to reduce perceived latency.
   - Prevent mic bleed by pausing ASR during TTS audio playback.
   - Build `app/call.tsx` matching project dark aesthetic (`#0c1321` canvas, cyan glow, pulsing orb).
   - Add debug performance overlay displaying:
     - End of speech $\rightarrow$ First token latency (ms)
     - End of speech $\rightarrow$ First audio output latency (ms)
     - LLM generation throughput (tokens/sec)
   - Add single "Call AURA" button on `app/(tabs)/assistant.tsx` navigating to `/call`.
7. **Verification & Type Checking**
   - Execute `npx tsc --noEmit` and resolve all TypeScript diagnostics.
   - Validate documentation and test checklist.
