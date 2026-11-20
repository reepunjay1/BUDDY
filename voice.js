import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const native = Capacitor.isNativePlatform();

// Remove markdown so the voice does not read "star star".
export function cleanForSpeech(t) {
  return t.replace(/```[\s\S]*?```/g, ' ').replace(/[*_#`>~]/g, '').replace(/\s+/g, ' ').trim();
}

export async function listen(lang) {
  if (native) {
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== 'granted') throw new Error('Microphone permission denied');
    const res = await SpeechRecognition.start({
      language: lang, maxResults: 1, prompt: '', partialResults: false, popup: false,
    });
    return (res.matches && res.matches[0]) || '';
  }
  // Browser fallback, only for testing on a computer.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) throw new Error('Speech recognition not supported here');
  return new Promise((resolve, reject) => {
    const r = new SR();
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => resolve(e.results[0][0].transcript);
    r.onerror = (e) => reject(new Error(e.error));
    r.onend = () => resolve('');
    r.start();
  });
}

export async function stopListening() {
  try { if (native) await SpeechRecognition.stop(); } catch {}
}

export async function speak(text, lang) {
  const t = cleanForSpeech(text);
  if (!t) return;
  if (native) {
    await TextToSpeech.speak({ text: t, lang, rate: 1.0, pitch: 1.0, volume: 1.0, category: 'ambient' });
    return;
  }
  await new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang; u.onend = resolve; u.onerror = resolve;
    window.speechSynthesis.speak(u);
  });
}

export async function stopSpeaking() {
  try { native ? await TextToSpeech.stop() : window.speechSynthesis.cancel(); } catch {}
}
