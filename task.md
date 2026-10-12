# Task Checklist: On-Device Voice Calling Agent (AURA) - Step 1

- [x] Pre-implementation repo inspection (package.json, app.json, eas.json, routes, services, tokens)
- [x] Package verification & installation (`expo-speech-recognition`, `llama.rn`, `expo-speech`, `expo-file-system`)
- [x] Step 1: Config & permissions update (`app.json`, `eas.json`)
- [x] Step 2: Model download service (`src/services/voice/modelManager.ts`)
- [x] Step 3: Speech Recognition service (`src/services/voice/asr.ts`)
- [x] Step 4: Persona prompt (`src/services/voice/persona.ts`) & LLM inference service (`src/services/voice/llm.ts`)
- [x] Step 5: Text-to-Speech queue service (`src/services/voice/tts.ts`)
- [x] Step 6a: Agent loop orchestrator (`src/services/voice/callAgent.ts`)
- [x] Step 6b: Full-screen Call UI with debug overlay (`app/call.tsx`)
- [x] Step 6c: Add "Call AURA" button on assistant screen (`app/(tabs)/assistant.tsx`)
- [x] Step 7: TypeScript strict check (`npx tsc --noEmit` passed with 0 errors) & test checklist
