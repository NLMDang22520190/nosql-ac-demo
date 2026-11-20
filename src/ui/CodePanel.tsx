import { useEffect, useRef } from 'react'

interface Props {
  source: string
  marker?: string
  title: string
  height?: number
}

/** Hiển thị mã nguồn thật của hàm đang chạy; dòng có chú thích `@marker` được tô sáng. */
export function CodePanel({ source, marker, title, height = 260 }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const hit = useRef<HTMLDivElement>(null)
  const lines = source.split('\n')
  useEffect(() => {
    const b = box.current
    const h = hit.current
    if (b && h) b.scrollTop = Math.max(0, h.offsetTop - b.clientHeight / 2)
  }, [marker, source])
  return (
    <figure className="code">
      <figcaption>{title}</figcaption>
      <div className="code-body" ref={box} style={{ maxHeight: height }}>
        {lines.map((ln, i) => {
          const on = !!marker && ln.includes('@' + marker) && /@\w+:[\w-]+(\s|$)/.test(ln) && new RegExp(`@${marker.replace(/[-]/g, '\\-')}(\\s|$)`).test(ln)
          const [code, note] = ln.split(/\s*\/\/ (?=@)/)
          return (
            <div key={i} className={'cl' + (on ? ' on' : '')} ref={on ? hit : undefined}>
              <span className="ln">{i + 1}</span>
              <span className="tx">{code || ' '}{note !== undefined && <i> // {note}</i>}</span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}
