// Hiệu ứng âm thanh nhỏ bằng Web Audio — không cần file âm thanh.
let ctx

function tone(freq, dur = 0.12, type = 'sine', vol = 0.08, when = 0) {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    const t = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + dur)
  } catch {
    /* Trình duyệt không hỗ trợ âm thanh — bỏ qua */
  }
}

export const sfx = {
  tap: () => tone(880, 0.05, 'sine', 0.04),
  correct: () => {
    tone(660, 0.1, 'triangle')
    tone(990, 0.16, 'triangle', 0.08, 0.08)
  },
  wrong: () => tone(200, 0.22, 'sawtooth', 0.04),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, i * 0.12)),
}
