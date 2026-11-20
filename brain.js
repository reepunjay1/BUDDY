// The "brain": calls Google Gemini directly from the phone. No server of yours.
const MODES = {
  friend: `MODE: Friend chat. Be warm, funny, and caring like a close friend. Ask about their day. If they seem stressed or sad, comfort them first.`,
  study: `MODE: Study helper. Explain simply with small real-life examples, then check understanding with one short question. Break big topics into small steps. Guide to the answer instead of just giving it for homework.`,
  quiz: `MODE: Quiz master. Ask ONE question at a time on the topic the student chooses. Wait for the answer, say if it is right or wrong, explain briefly, then ask the next one. Keep score.`,
};

export function buildSystemPrompt(s, mode) {
  const hinglish = s.lang.startsWith('hi');
  return [
    `You are Buddy, a friendly AI companion living in the user's phone, shown as a small robot with a TV-screen face. You are the user's study partner and close friend.`,
    s.name ? `The user's name is ${s.name}. Use it sometimes.` : '',
    MODES[mode],
    `Your replies are spoken aloud, so keep them SHORT (1 to 4 sentences unless explaining a topic), natural and conversational. No markdown, no bullet symbols, no emojis.`,
    hinglish ? `Reply in Hinglish (Hindi written in Roman letters mixed with simple English) unless the user uses another language.` : `Reply in the language the user speaks.`,
    s.memory.length ? `Things you remember about the user:\n- ${s.memory.join('\n- ')}` : '',
    s.todos.length ? `User's to-do list: ${s.todos.filter(t => !t.done).map(t => t.text).join('; ') || 'empty'}` : '',
    `Today is ${new Date().toLocaleString()}.`,
    `Be honest. If you are not sure about a fact, say so instead of guessing.`,
  ].filter(Boolean).join('\n\n');
}

export async function ask(s, mode, history) {
  if (!s.apiKey) throw new Error('Add your Gemini API key in Settings first.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent?key=${encodeURIComponent(s.apiKey)}`;
  const contents = history.slice(-14).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(s, mode) }] },
      contents,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error('Empty reply, try again.');
  return text.trim();
}
