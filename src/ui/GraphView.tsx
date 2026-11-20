import { useMemo } from 'react'
import type { GNode, GraphModel } from '../core/types'
import { fitText } from './fit'
import { edgeKey, type GMarks } from './marks'
import { ZoomPane } from './ZoomPane'

const LX = 270 // khoảng cách giữa các cột
const LY = 78 // khoảng cách giữa các hàng
const W = 156
const H = 36
const PAD = 40

const TYPE_ORDER = ['user', 'group', 'org', 'file']
const TYPE_VI: Record<string, string> = { user: 'người dùng', group: 'nhóm', org: 'đơn vị', file: 'tệp' }
const TYPE_FILL: Record<string, string> = { user: '#E3E9F5', group: '#E9E4F3', org: '#DDEEEA', file: '#F6E9D6' }
const TYPE_STROKE: Record<string, string> = { user: '#3B4F7A', group: '#5E4B8B', org: '#2F6F62', file: '#9A6A22' }

interface Props {
  graph: GraphModel
  marks?: GMarks
  selected?: string[]
  focus?: string
  onSelect?: (id: string) => void
  /** Chỉ vẽ rõ các nút/cạnh đã được tạo tới bước này (A4). */
  visible?: { nodes: Set<string>; edges: Set<string> }
}

/** Xếp cột theo khoảng cách tới nút đích (đơn vị lớn nhất ở bên phải), rồi sắp thứ tự trong cột để ít cạnh cắt nhau. */
function layoutGraph(graph: GraphModel) {
  const plain = graph.edges.filter((e) => !e.action)
  const rank: Record<string, number> = {}
  graph.nodes.forEach((n) => (rank[n.id] = 0))
  for (let i = 0; i < graph.nodes.length; i++) {
    let changed = false
    for (const e of plain) {
      if (rank[e.from] < rank[e.to] + 1 && rank[e.to] + 1 <= graph.nodes.length) { rank[e.from] = rank[e.to] + 1; changed = true }
    }
    if (!changed) break
  }
  const maxRank = Math.max(...Object.values(rank))
  const col: Record<string, number> = {}
  graph.nodes.forEach((n) => (col[n.id] = maxRank - rank[n.id]))
  const cols: GNode[][] = Array.from({ length: maxRank + 1 }, () => [])
  const byType = (a: GNode, b: GNode) => TYPE_ORDER.indexOf(a.type ?? 'zz') - TYPE_ORDER.indexOf(b.type ?? 'zz') || a.id.localeCompare(b.id)
  for (const n of [...graph.nodes].sort(byType)) cols[col[n.id]].push(n)
  const idx: Record<string, number> = {}
  const reindex = () => cols.forEach((c) => c.forEach((n, i) => (idx[n.id] = i)))
  reindex()
  const bary = (n: GNode, toward: 'left' | 'right') => {
    const nb = plain.filter((e) => (toward === 'left' ? e.to === n.id : e.from === n.id)).map((e) => (toward === 'left' ? e.from : e.to))
    return nb.length ? nb.reduce((s, id) => s + idx[id], 0) / nb.length : idx[n.id]
  }
  for (let sweep = 0; sweep < 6; sweep++) {
    const order = sweep % 2 === 0 ? cols.map((_, i) => i).slice(1) : cols.map((_, i) => i).slice(0, -1).reverse()
    for (const ci of order) {
      const toward = sweep % 2 === 0 ? 'left' : 'right'
      cols[ci] = [...cols[ci]].sort((a, b) => bary(a, toward) - bary(b, toward) || byType(a, b))
      reindex()
    }
  }
  const rows = Math.max(...cols.map((c) => c.length))
  const pos: Record<string, { x: number; y: number }> = {}
  cols.forEach((c, ci) => {
    const off = ((rows - c.length) * LY) / 2
    c.forEach((n, i) => (pos[n.id] = { x: PAD + ci * LX, y: PAD + off + i * LY }))
  })
  return { pos, col, w: PAD * 2 + (cols.length - 1) * LX + W, h: PAD * 2 + (rows - 1) * LY + H + 16 }
}

export function GraphView({ graph, marks, selected = [], focus, onSelect, visible }: Props) {
  const layout = useMemo(() => layoutGraph(graph), [graph])
  return (
    <ZoomPane width={layout.w} height={layout.h} label="Đồ thị có hướng" resetKey={graph}>
      <>
        <defs>
          {['#8A96AB', '#2447D0', '#D9650B', '#0E9F6E', '#C8302A'].map((c) => (
            <marker key={c} id={'ar' + c.slice(1)} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
        </defs>
        {graph.edges.map((e, i) => {
          const a = layout.pos[e.from]
          const b = layout.pos[e.to]
          const ca = layout.col[e.from]
          const cb = layout.col[e.to]
          const k = edgeKey(e.from, e.to)
          const hl = marks?.edges[k]
          const color = hl ?? (e.action ? (e.deny ? '#C8302A' : '#0E9F6E') : '#8A96AB')
          const hidden = visible && !visible.edges.has(k)
          let d: string
          let lx: number
          let ly: number
          if (ca === cb) {
            // cùng một cột (ví dụ cạnh quyền giữa nhóm và tệp): vòng ra ngoài mép trái để không đè lên nút khác
            const x = a.x
            const y1 = a.y + H / 2
            const y2 = b.y + H / 2
            const bulge = 46 + Math.abs(y2 - y1) * 0.18
            d = `M${x},${y1} C${x - bulge},${y1} ${x - bulge},${y2} ${x},${y2}`
            lx = x - bulge * 0.75 - 6
            ly = (y1 + y2) / 2
          } else {
            const fwd = cb > ca
            const x1 = fwd ? a.x + W : a.x
            const x2 = fwd ? b.x : b.x + W
            const y1 = a.y + H / 2
            const y2 = b.y + H / 2
            const dx = Math.max(60, Math.abs(x2 - x1) * 0.45) * (fwd ? 1 : -1)
            d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
            const t = 0.3
            lx = (1 - t) ** 3 * x1 + 3 * (1 - t) ** 2 * t * (x1 + dx) + 3 * (1 - t) * t * t * (x2 - dx) + t ** 3 * x2
            ly = (1 - t) ** 3 * y1 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3 * y2
          }
          return (
            <g key={i} opacity={hidden ? 0.1 : 1}>
              <path d={d} fill="none" stroke={color} strokeWidth={hl ? 2.8 : 1.4} strokeDasharray={e.action ? '6 4' : undefined} markerEnd={`url(#ar${color.slice(1)})`} />
              <text x={lx} y={ly - 5} fontSize={10.5} textAnchor="middle" fill={e.action ? color : '#4A5568'} fontWeight={e.action ? 700 : 500} stroke="#F4F6F9" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{e.label}</text>
            </g>
          )
        })}
        {graph.nodes.map((n) => {
          const p = layout.pos[n.id]
          const t = n.type ?? 'other'
          const mk = marks?.nodes[n.id]
          const isSel = selected.includes(n.id)
          const ring = isSel ? '#17202E' : focus === n.id ? '#F2B01E' : mk?.ring
          const hidden = visible && !visible.nodes.has(n.id)
          const rx = t === 'user' ? H / 2 : t === 'org' ? 3 : t === 'group' ? 12 : 2
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} onClick={() => onSelect?.(n.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(n.id) } }} tabIndex={onSelect ? 0 : undefined} role={onSelect ? 'button' : undefined} aria-label={`${TYPE_VI[t] ?? 'nút'}: ${n.id}`} style={{ cursor: onSelect ? 'pointer' : 'default' }} opacity={hidden ? 0.15 : 1} data-node={n.id}>
              <title>{`${n.id}${n.type ? ' (' + (TYPE_VI[n.type] ?? n.type) + ')' : ''}`}</title>
              <rect width={W} height={H} rx={rx} fill={TYPE_FILL[t] ?? '#EEF0F4'} stroke={TYPE_STROKE[t] ?? '#7A8599'} strokeWidth={1.2} />
              {mk?.tint && <rect width={W} height={H} rx={rx} fill={mk.tint} opacity={mk.tintOpacity ?? 0.4} />}
              {t === 'file' && <path d={`M${W - 14},0 L${W},14 L${W - 14},14 z`} fill={TYPE_STROKE.file} opacity={0.5} />}
              <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={mk?.bold || isSel ? 700 : 500} fill="#17202E">{fitText(n.id, W - 22)}</text>
              <text x={W / 2} y={H + 12} textAnchor="middle" fontSize={9.5} fill="#5B6678">{TYPE_VI[t] ?? ''}</text>
              {mk?.tag && <text x={W} y={-4} fontSize={10} fill="#17202E" textAnchor="end" fontWeight={700}>{mk.tag}</text>}
              {ring && <rect x={-3} y={-3} width={W + 6} height={H + 6} rx={rx + 3} fill="none" stroke={ring} strokeWidth={isSel || focus === n.id ? 3 : 2.5} />}
            </g>
          )
        })}
      </>
    </ZoomPane>
  )
}
