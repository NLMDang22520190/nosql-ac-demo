let ctx: CanvasRenderingContext2D | null | undefined

/** Cắt chữ theo độ rộng thật (pixel) để không tràn khỏi ô; thêm dấu … khi bị cắt. */
export function fitText(s: string, maxPx: number, font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'): string {
  if (ctx === undefined) ctx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  if (!ctx) return s.length > 16 ? s.slice(0, 15) + '…' : s
  ctx.font = font
  if (ctx.measureText(s).width <= maxPx) return s
  let lo = 0
  let hi = s.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (ctx.measureText(s.slice(0, mid) + '…').width <= maxPx) lo = mid
    else hi = mid - 1
  }
  return s.slice(0, lo) + '…'
}
