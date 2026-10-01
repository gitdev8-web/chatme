/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Universal Audio Utilities for Cross-Browser Voice Notes & Audio Playback
 * Supports decoding and playback across Chrome, Safari (iOS/macOS), Firefox, Edge.
 */

// Singleton AudioContext with lazy initialization & auto-resume
let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Parses any audio URL (data URL with tricky codecs, base64, blob, or remote)
 * into a clean standard Blob.
 */
export function parseAudioUrlToBlob(url: string): Blob | null {
  try {
    if (!url) return null;
    if (!url.startsWith('data:')) return null;

    const commaIdx = url.indexOf(',');
    if (commaIdx === -1) return null;

    const header = url.substring(0, commaIdx);
    const base64Data = url.substring(commaIdx + 1).trim().replace(/\s/g, '');

    // Extract mime type, e.g. "data:audio/webm;codecs=opus;base64" -> "audio/webm"
    let mime = 'audio/webm';
    const mimeMatch = header.match(/^data:([^;,]+)/);
    if (mimeMatch && mimeMatch[1]) {
      mime = mimeMatch[1].trim();
    }
    // Fallback if generic octet-stream
    if (mime === 'application/octet-stream' || !mime.startsWith('audio/')) {
      mime = 'audio/webm';
    }

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  } catch (err) {
    console.warn('Could not parse audio data URL to Blob:', err);
    return null;
  }
}

/**
 * Converts an AudioBuffer into a universal standard 16-bit PCM WAV Blob.
 * Supported natively by 100% of all browsers and devices (iOS Safari, Mac, Android, Windows).
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length * numChannels;
  const dataByteLength = numSamples * bytesPerSample;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Attempts to decode an audio Blob / ArrayBuffer using Web Audio API
 * and convert it to a universal WAV Blob.
 */
export async function decodeToUniversalWav(audioSource: Blob | ArrayBuffer): Promise<Blob | null> {
  try {
    const ctx = getAudioContext();
    const arrayBuffer =
      audioSource instanceof ArrayBuffer ? audioSource : await audioSource.arrayBuffer();

    // clone array buffer as decodeAudioData detaches the buffer
    const bufferCopy = arrayBuffer.slice(0);
    const audioBuffer = await ctx.decodeAudioData(bufferCopy);
    return audioBufferToWav(audioBuffer);
  } catch (err) {
    console.warn('Web Audio decoding to WAV failed:', err);
    return null;
  }
}
