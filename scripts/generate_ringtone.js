const fs = require('fs');
const path = require('path');

// Ensure assets/sounds directory exists
const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

const sampleRate = 22050; // 22.05 kHz
const durationSec = 27; // 27 seconds
const numSamples = sampleRate * durationSec;
const bytesPerSample = 2; // 16-bit mono
const dataSize = numSamples * bytesPerSample;

const buffer = Buffer.alloc(44 + dataSize);

// 1. RIFF Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);

// 2. fmt Sub-chunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
buffer.writeUInt16LE(1, 22); // NumChannels (1 mono)
buffer.writeUInt32LE(sampleRate, 24); // SampleRate
buffer.writeUInt32LE(sampleRate * bytesPerSample, 28); // ByteRate
buffer.writeUInt16LE(bytesPerSample, 32); // BlockAlign
buffer.writeUInt16LE(16, 34); // BitsPerSample

// 3. data Sub-chunk
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Frequencies: 440 Hz + 480 Hz (Standard telephone ring)
const freq1 = 440;
const freq2 = 480;

// Ring pattern: 2.0s ON, 3.0s OFF (5.0s period)
const cycleSec = 5.0;
const ringSec = 2.0;
const fadeSamples = Math.floor(sampleRate * 0.03); // 30ms fade in/out

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const cycleTime = t % cycleSec;

  let sample = 0;
  if (cycleTime < ringSec) {
    // Generate dual-tone
    const s1 = Math.sin(2 * Math.PI * freq1 * t);
    const s2 = Math.sin(2 * Math.PI * freq2 * t);
    let raw = (s1 + s2) * 0.45; // amplitude 0.45 each, max 0.90

    // Apply envelope to prevent pops
    let envelope = 1.0;
    const ringSample = Math.floor(cycleTime * sampleRate);
    const ringTotalSamples = Math.floor(ringSec * sampleRate);

    if (ringSample < fadeSamples) {
      envelope = ringSample / fadeSamples;
    } else if (ringSample > ringTotalSamples - fadeSamples) {
      envelope = Math.max(0, (ringTotalSamples - ringSample) / fadeSamples);
    }

    sample = raw * envelope;
  }

  // Convert float to 16-bit signed integer
  const intVal = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
  buffer.writeInt16LE(intVal, 44 + i * 2);
}

const targetPath = path.join(soundsDir, 'pallavi_ring.wav');
fs.writeFileSync(targetPath, buffer);
console.log(`Generated ${targetPath} (${(buffer.length / 1024).toFixed(1)} KB, ${durationSec}s duration)`);
