import { Vibration } from 'react-native';

let audioModule: any = null;
let audioChecked = false;
let activePlayer: any = null;
let isRingingActive = false;

/**
 * Safely checks if expo-audio native module is available without throwing.
 */
export function isAudioAvailable(): boolean {
  if (audioChecked) return audioModule !== null;
  audioChecked = true;

  try {
    const mod = require('expo-audio');
    if (mod && (mod.createAudioPlayer || mod.default?.createAudioPlayer)) {
      audioModule = mod.default || mod;
    }
  } catch (err) {
    console.log('[RingtonePlayer] expo-audio native module unavailable (e.g. in Expo Go):', err);
    audioModule = null;
  }

  return audioModule !== null;
}

/**
 * Starts looping the ringtone audio and continuous vibration pattern.
 * Uses expo-audio with playsInSilentMode: true at full volume.
 * If expo-audio is unavailable (e.g. Expo Go), vibrations still loop safely.
 */
export async function startRingtone(): Promise<void> {
  if (isRingingActive) return;
  isRingingActive = true;

  // 1. Loop vibration pattern: [0, 800, 400, 800]
  try {
    Vibration.vibrate([0, 800, 400, 800], true);
  } catch (vibErr) {
    console.warn('[RingtonePlayer] Vibration error:', vibErr);
  }

  // 2. Loop custom ringtone audio with expo-audio
  if (isAudioAvailable()) {
    try {
      if (audioModule.setAudioModeAsync) {
        await audioModule.setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
        });
      }

      const ringSource = require('../../assets/sounds/pallavi_ring.wav');
      const createPlayer = audioModule.createAudioPlayer;

      if (createPlayer) {
        const player = createPlayer(ringSource);
        if (player) {
          player.loop = true;
          player.volume = 1.0;
          player.play();
          activePlayer = player;
        }
      }
    } catch (err) {
      console.warn('[RingtonePlayer] Failed to play ringtone audio:', err);
    }
  }
}

/**
 * Stops both audio playback and vibration immediately.
 */
export function stopRingtone(): void {
  isRingingActive = false;

  // Stop vibration
  try {
    Vibration.cancel();
  } catch (vibErr) {
    console.warn('[RingtonePlayer] Vibration cancel error:', vibErr);
  }

  // Stop & release audio player
  if (activePlayer) {
    try {
      activePlayer.pause();
      if (typeof activePlayer.remove === 'function') {
        activePlayer.remove();
      }
    } catch (err) {
      console.warn('[RingtonePlayer] Error releasing audio player:', err);
    }
    activePlayer = null;
  }
}
