// sfx.js —— 轻量合成音效(购买/出售/拾取/丢弃),无需音频文件
let ctx = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* no audio */ } }
  return ctx;
}
function tone(freq, dur, type = "square", vol = 0.12, when = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  const t0 = c.currentTime + when;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
export const sfx = {
  buy() { tone(660, 0.12); tone(880, 0.16, "square", 0.12, 0.08); },
  sell() { tone(540, 0.12); tone(400, 0.16, "square", 0.12, 0.07); },
  pickup() { tone(760, 0.10, "triangle", 0.12); tone(1000, 0.12, "triangle", 0.12, 0.06); },
  drop() { tone(320, 0.14, "square", 0.10); tone(210, 0.20, "square", 0.10, 0.05); },
  hurtMonster() { tone(180, 0.12, "sawtooth", 0.14); tone(130, 0.16, "sawtooth", 0.12, 0.08); },
  hurtPlayer() { tone(140, 0.18, "square", 0.16); tone(90, 0.22, "sawtooth", 0.14, 0.06); },
  monsterDie() { tone(300, 0.10, "sawtooth", 0.12); tone(200, 0.14, "square", 0.10, 0.08); tone(120, 0.2, "sawtooth", 0.10, 0.16); },
  eat() { tone(500, 0.06, "square", 0.10); tone(420, 0.06, "square", 0.10, 0.08); tone(560, 0.08, "triangle", 0.10, 0.16); },
  equip() { tone(440, 0.08, "square", 0.12); tone(660, 0.10, "square", 0.12, 0.07); tone(880, 0.12, "triangle", 0.10, 0.14); },
  levelUp() { tone(523, 0.10, "triangle", 0.12); tone(659, 0.10, "triangle", 0.12, 0.09); tone(784, 0.10, "triangle", 0.12, 0.18); tone(1047, 0.18, "triangle", 0.12, 0.27); },
};