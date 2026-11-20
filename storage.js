// Everything is saved on the phone itself. No server.
const KEY = 'buddy:v1';
const defaults = {
  apiKey: '',
  model: 'gemini-2.5-flash',
  name: '',
  lang: 'en-IN',       // voice language: en-IN, hi-IN, en-US ...
  speak: true,
  memory: [],          // things the user asked Buddy to remember
  todos: [],
  messages: [],
};
export function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}
export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}
