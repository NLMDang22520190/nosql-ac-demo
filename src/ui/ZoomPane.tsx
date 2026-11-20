import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  width: number
  height: number
  label: string
  children: ReactNode
  /** Tọa độ x (trong hình gốc) cần đưa vào giữa khung nhìn lúc mới mở. */
  centerX?: number
  /** Đổi giá trị này thì khung nhìn được đặt lại (ví dụ khi đổi dữ liệu). */
  resetKey: unknown
}

const MIN = 0.2
const MAX = 3
const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s))

/** Khung hiển thị hình SVG có phóng to, thu nhỏ, vừa khung và kéo để di chuyển. */
export function ZoomPane({ width, height, label, children, centerX, resetKey }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const scaleRef = useRef(1)
  const drag = useRef<{ x: number; y: number; sl: number; st: number; moved: boolean } | null>(null)

  const setZoom = useCallback((s: number, anchor?: { px: number; py: number }) => {
    const b = box.current
    const old = scaleRef.current
    const ns = clamp(s)
    scaleRef.current = ns
    setScale(ns)
    if (b && anchor) {
      requestAnimationFrame(() => {
        b.scrollLeft = ((b.scrollLeft + anchor.px) / old) * ns - anchor.px
        b.scrollTop = ((b.scrollTop + anchor.py) / old) * ns - anchor.py
      })
    }
  }, [])

  const fitScale = useCallback(() => {
    const b = box.current
    return b ? Math.min(b.clientWidth / width, b.clientHeight / height) : 1
  }, [width, height])

  const center = (s: number) => requestAnimationFrame(() => {
    const b = box.current
    if (b && centerX !== undefined) b.scrollLeft = Math.max(0, centerX * s - b.clientWidth / 2)
  })

  useEffect(() => {
    // mở lần đầu: vừa khung nhưng không nhỏ hơn 55% để chữ còn đọc được
    const s = clamp(Math.min(1, Math.max(0.55, fitScale())))
    scaleRef.current = s
    setScale(s)
    center(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, width, height])

  useEffect(() => {
    const b = box.current
    if (!b) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return // cuộn thường vẫn là cuộn
      e.preventDefault()
      const r = b.getBoundingClientRect()
      setZoom(scaleRef.current * Math.exp(-e.deltaY * 0.002), { px: e.clientX - r.left, py: e.clientY - r.top })
    }
    b.addEventListener('wheel', onWheel, { passive: false })
    return () => b.removeEventListener('wheel', onWheel)
  }, [setZoom])

  const step = (f: number) => {
    const b = box.current
    setZoom(scaleRef.current * f, b ? { px: b.clientWidth / 2, py: b.clientHeight / 2 } : undefined)
  }
  const fit = () => { setZoom(fitScale()); requestAnimationFrame(() => { const b = box.current; if (b) { b.scrollLeft = 0; b.scrollTop = 0 } }) }

  return (
    <div className="viz-wrap">
      <div className="viz-bar">
      <span className="viz-tip">Ctrl + lăn chuột để phóng to hoặc thu nhỏ, kéo thả để di chuyển.</span>
      <div className="viz-tools" role="toolbar" aria-label="Phóng to thu nhỏ">
        <button onClick={() => step(1 / 1.25)} aria-label="Thu nhỏ" title="Thu nhỏ">−</button>
        <span className="pct" aria-live="polite">{Math.round(scale * 100)}%</span>
        <button onClick={() => step(1.25)} aria-label="Phóng to" title="Phóng to">+</button>
        <button onClick={fit} title="Thu vừa khung để xem toàn bộ">Vừa khung</button>
        <button onClick={() => { setZoom(1); center(1) }} title="Kích thước thật">100%</button>
      </div>
      </div>
      <div
        className="viz-scroll"
        ref={box}
        onPointerDown={(e) => {
          const b = box.current
          if (b && e.button === 0) drag.current = { x: e.clientX, y: e.clientY, sl: b.scrollLeft, st: b.scrollTop, moved: false }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          const b = box.current
          if (!d || !b || e.buttons !== 1) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (!d.moved && Math.hypot(dx, dy) < 5) return
          d.moved = true
          b.scrollLeft = d.sl - dx
          b.scrollTop = d.st - dy
        }}
        onPointerUp={() => { setTimeout(() => { drag.current = null }, 0) }}
        onPointerLeave={() => { if (drag.current) setTimeout(() => { drag.current = null }, 0) }}
        onClickCapture={(e) => { if (drag.current?.moved) { e.stopPropagation(); e.preventDefault() } }}
      >
        <svg width={width * scale} height={height * scale} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
          {children}
        </svg>
      </div>
    </div>
  )
}
