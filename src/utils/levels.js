// Các cấp tiến hóa của Chibi (design.md – mục 2.5)
export const LEVELS = [
  { cap: 1, ten: 'Hạt Mầm Tinh Nghịch', min: 0, img: '/assets/chibi/lv1.jpg' },
  { cap: 2, ten: 'Cây Non Đáng Yêu', min: 101, img: '/assets/chibi/lv2.jpg' },
  { cap: 3, ten: 'Hiệp Sĩ Lá Xanh', min: 301, img: '/assets/chibi/lv3.jpg' },
  { cap: 4, ten: 'Thần Rừng Tí Hon', min: 601, img: '/assets/chibi/lv4.jpg' },
]

export function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return LEVELS[i]
  }
  return LEVELS[0]
}

export function getNextLevel(xp) {
  return LEVELS.find((l) => l.min > xp) || null
}

/** Tiến độ trong cấp hiện tại, từ 0 → 1 */
export function getProgress(xp) {
  const cur = getLevel(xp)
  const next = getNextLevel(xp)
  if (!next) return 1
  return Math.min(1, Math.max(0, (xp - cur.min) / (next.min - cur.min)))
}
