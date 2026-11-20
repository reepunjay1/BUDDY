import React, { useEffect, useRef, useState } from 'react';
import { RobotHead } from 'robot-heads';
import { load, save } from './storage.js';
import { ask } from './brain.js';
import { listen, stopListening, speak, stopSpeaking } from './voice.js';

const FOCUS_MIN = 25;
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function App() {
  const [s, setS] = useState(load);
  const [mode, setMode] = useState('friend');
  const [robot, setRobot] = useState('idle');
  const [input, setInput] = useState('');
  const [panel, setPanel] = useState(null); // null | 'settings' | 'todos'
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null); // seconds, null = off
  const listRef = useRef(null);
  const busy = useRef(false);

  const update = (patch) => setS((old) => { const n = { ...old, ...patch }; save(n); return n; });

  useEffect(() => { listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, [s.messages.length]);

  // Fall asleep after 2 minutes of nothing.
  useEffect(() => {
    if (robot !== 'idle') return;
    const t = setTimeout(() => setRobot('sleeping'), 120000);
    return () => clearTimeout(t);
  }, [robot]);

  // Study timer (runs while the app is open).
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      setTimeLeft(null);
      say(`Time's up! You focused for ${FOCUS_MIN} minutes. Take a 5 minute break, you earned it.`, true);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => (t === null ? null : t - 1)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  async function say(text, happy = false) {
    setRobot(happy ? 'happy' : 'speaking');
    if (s.speak) { try { await speak(text, s.lang); } catch {} }
    else await new Promise((r) => setTimeout(r, 1200));
    setRobot(timeLeft !== null ? 'working' : 'idle');
  }

  function addMsg(role, text) {
    setS((old) => { const n = { ...old, messages: [...old.messages, { role, text }].slice(-60) }; save(n); return n; });
  }

  // Simple commands handled on the phone, without the AI.
  function localCommand(text) {
    let m;
    if ((m = text.match(/^(?:please\s+)?(?:remember|yaad rakh(?:o|na)?)(?:\s+that)?\s+(.+)/i))) {
      update({ memory: [...s.memory, m[1]].slice(-40) });
      return `Okay, I'll remember that: ${m[1]}.`;
    }
    if ((m = text.match(/^add\s+(?:a\s+)?(?:task|todo|to-do)(?:\s+to)?\s*:?\s*(.+)/i))) {
      update({ todos: [...s.todos, { id: Date.now(), text: m[1], done: false }] });
      return `Added to your list: ${m[1]}.`;
    }
    if (/^(start|begin)\s+(a\s+)?(study|focus)/i.test(text)) {
      setTimeLeft(FOCUS_MIN * 60); setRobot('working');
      return `Focus mode on for ${FOCUS_MIN} minutes. I'll be quiet and cheer for you. Go!`;
    }
    if (/^(stop|cancel)\s+(the\s+)?(study|focus|timer)/i.test(text)) {
      setTimeLeft(null);
      return `Timer stopped. No problem.`;
    }
    return null;
  }

  async function send(raw) {
    const text = raw.trim();
    if (!text || busy.current) return;
    busy.current = true; setError(''); setInput('');
    addMsg('user', text);
    try {
      const local = localCommand(text);
      let reply = local;
      if (!reply) {
        setRobot('thinking');
        reply = await ask(s, mode, [...s.messages, { role: 'user', text }]);
      }
      addMsg('model', reply);
      await say(reply);
    } catch (e) {
      setError(e.message); setRobot('error');
      setTimeout(() => setRobot('idle'), 2500);
    } finally { busy.current = false; }
  }

  async function onMic() {
    if (robot === 'speaking') { await stopSpeaking(); setRobot('idle'); return; }
    if (robot === 'listening') { await stopListening(); return; }
    if (busy.current) return;
    setError(''); setRobot('listening');
    try {
      const heard = await listen(s.lang);
      if (heard) await send(heard); else setRobot('idle');
    } catch (e) { setError(e.message); setRobot('error'); setTimeout(() => setRobot('idle'), 2500); }
  }

  const robotLabel = { idle: 'Hey, I am here', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking (tap mic to stop)', working: 'Focus mode', happy: 'Yay!', error: 'Oops', sleeping: 'Zzz... tap me' }[robot];

  return (
    <div className="app">
      <header>
        <button className="icon" onClick={() => setPanel(panel === 'todos' ? null : 'todos')}>☰ Tasks</button>
        {timeLeft !== null && <span className="timer">⏱ {fmt(timeLeft)}</span>}
        <button className="icon" onClick={() => setPanel(panel === 'settings' ? null : 'settings')}>⚙ Settings</button>
      </header>

      <div className="stage" onClick={() => robot === 'sleeping' && setRobot('idle')}>
        <RobotHead shape="rectangle" state={robot} size={170} color="#2b49a3" />
        <div className="label">{robotLabel}</div>
      </div>

      <div className="modes">
        {[['friend', '💬 Friend'], ['study', '📚 Study'], ['quiz', '🧠 Quiz']].map(([k, t]) => (
          <button key={k} className={mode === k ? 'chip on' : 'chip'} onClick={() => setMode(k)}>{t}</button>
        ))}
        <button className="chip" onClick={() => send('start study timer')}>⏱ Focus {FOCUS_MIN}m</button>
      </div>

      <div className="chat" ref={listRef}>
        {s.messages.length === 0 && (
          <p className="hint">Tap the mic and talk to me. Try: "Explain gravity simply", "Quiz me on chemistry", or "Remember that my physics exam is on Friday".</p>
        )}
        {s.messages.map((m, i) => (<div key={i} className={`bubble ${m.role}`}>{m.text}</div>))}
        {error && <div className="bubble err">{error}</div>}
      </div>

      <div className="bar">
        <input value={input} placeholder="Type a message..." onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)} />
        <button className="send" onClick={() => send(input)}>Send</button>
        <button className={robot === 'listening' ? 'mic live' : 'mic'} onClick={onMic}>🎤</button>
      </div>

      {panel === 'settings' && (
        <div className="panel">
          <h3>Settings</h3>
          <label>Your name<input value={s.name} onChange={(e) => update({ name: e.target.value })} /></label>
          <label>Gemini API key (free from aistudio.google.com)
            <input type="password" value={s.apiKey} onChange={(e) => update({ apiKey: e.target.value.trim() })} /></label>
          <label>Model<input value={s.model} onChange={(e) => update({ model: e.target.value.trim() })} /></label>
          <label>Voice language
            <select value={s.lang} onChange={(e) => update({ lang: e.target.value })}>
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">Hindi / Hinglish</option>
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
            </select></label>
          <label className="row"><input type="checkbox" checked={s.speak} onChange={(e) => update({ speak: e.target.checked })} /> Speak replies aloud</label>
          <h4>What I remember ({s.memory.length})</h4>
          {s.memory.map((m, i) => (
            <div className="item" key={i}><span>{m}</span><button onClick={() => update({ memory: s.memory.filter((_, j) => j !== i) })}>✕</button></div>
          ))}
          <button className="danger" onClick={() => update({ messages: [] })}>Clear chat</button>
          <button className="icon" onClick={() => setPanel(null)}>Close</button>
        </div>
      )}

      {panel === 'todos' && (
        <div className="panel">
          <h3>Tasks</h3>
          <div className="row">
            <input id="newtodo" placeholder="New task..." onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) { update({ todos: [...s.todos, { id: Date.now(), text: e.target.value.trim(), done: false }] }); e.target.value = ''; }
            }} />
          </div>
          {s.todos.length === 0 && <p className="hint">Nothing yet. Say "add task finish maths homework".</p>}
          {s.todos.map((t) => (
            <div className="item" key={t.id}>
              <label className="row"><input type="checkbox" checked={t.done}
                onChange={() => update({ todos: s.todos.map((x) => x.id === t.id ? { ...x, done: !x.done } : x) })} />
                <span style={{ textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span></label>
              <button onClick={() => update({ todos: s.todos.filter((x) => x.id !== t.id) })}>✕</button>
            </div>
          ))}
          <button className="icon" onClick={() => setPanel(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
