import { useMemo } from 'react'
import type { GNode, GraphModel } from '../core/types'
import { edgeKey, type GMarks } from './marks'

const LX = 230
const LY = 62
const W = 150
const H = 34

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

export function GraphView({ graph, marks, selected = [], focus, onSelect, visible }: Props) {
  const layout = useMemo(() => {
    const layer: Record<string, number> = {}
    graph.nodes.forEach((n) => (layer[n.id] = 0))
    for (let i = 0; i < graph.nodes.length; i++) {
      let changed = false
      for (const e of graph.edges) {
        if (e.action) continue
        if (layer[e.to] < layer[e.from] + 1 && layer[e.from] + 1 <= graph.nodes.length) { layer[e.to] = layer[e.from] + 1; changed = true }
      }
      if (!changed) break
    }
    const cols: GNode[][] = []
    for (const n of graph.nodes) (cols[layer[n.id]] ??= []).push(n)
    const pos: Record<string, { x: number; y: number }> = {}
    cols.forEach((c, i) => {
      const sorted = [...c].sort((a, b) => TYPE_ORDER.indexOf(a.type ?? 'zz') - TYPE_ORDER.indexOf(b.type ?? 'zz') || a.id.localeCompare(b.id))
      sorted.forEach((n, j) => (pos[n.id] = { x: 30 + i * LX, y: 30 + j * LY }))
    })
    const rows = Math.max(...cols.map((c) => c.length))
    return { pos, w: cols.length * LX + 40, h: rows * LY + 40 }
  }, [graph])
  return (
    <div className="viz-scroll">
      <svg width={layout.w} height={layout.h} role="img" aria-label="Đồ thị có hướng">
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
          const x1 = a.x + W
          const y1 = a.y + H / 2
          const x2 = b.x
          const y2 = b.y + H / 2
          const k = edgeKey(e.from, e.to)
          const hl = marks?.edges[k]
          const color = hl ?? (e.action ? (e.deny ? '#C8302A' : '#0E9F6E') : '#8A96AB')
          const hidden = visible && !visible.edges.has(k)
          const bow = x2 - x1 > LX ? -26 : 0
          const mx = (x1 + x2) / 2
          const my = (y1 + y2) / 2 + bow
          return (
            <g key={i} opacity={hidden ? 0.1 : 1}>
              <path d={`M${x1},${y1} Q${mx},${my + (bow ? 0 : 0)} ${x2},${y2}`} fill="none" stroke={color} strokeWidth={hl ? 2.8 : 1.4} strokeDasharray={e.action ? '6 4' : undefined} markerEnd={`url(#ar${color.slice(1)})`} />
              <text x={mx} y={my - 4} fontSize={10.5} textAnchor="middle" fill={e.action ? color : '#5B6678'} fontWeight={e.action ? 700 : 400} stroke="#EBEEF3" strokeWidth={3} paintOrder="stroke">{e.label}</text>
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
            <g key={n.id} transform={`translate(${p.x},${p.y})`} onClick={() => onSelect?.(n.id)} style={{ cursor: onSelect ? 'pointer' : 'default' }} opacity={hidden ? 0.15 : 1} data-node={n.id}>
              <title>{`${n.id}${n.type ? ' (' + (TYPE_VI[n.type] ?? n.type) + ')' : ''}`}</title>
              <rect width={W} height={H} rx={rx} fill={TYPE_FILL[t] ?? '#EEF0F4'} stroke={TYPE_STROKE[t] ?? '#7A8599'} strokeWidth={1.2} />
              {mk?.tint && <rect width={W} height={H} rx={rx} fill={mk.tint} opacity={mk.tintOpacity ?? 0.4} />}
              {t === 'file' && <path d={`M${W - 14},0 L${W},14 L${W - 14},14 z`} fill={TYPE_STROKE.file} opacity={0.5} />}
              <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={mk?.bold || isSel ? 700 : 500} fill="#17202E">{n.id.length > 20 ? n.id.slice(0, 19) + '…' : n.id}</text>
              <text x={W / 2} y={H + 12} textAnchor="middle" fontSize={9.5} fill="#5B6678">{TYPE_VI[t] ?? ''}</text>
              {mk?.tag && <text x={W} y={-4} fontSize={10} fill="#17202E" textAnchor="end" fontWeight={700}>{mk.tag}</text>}
              {ring && <rect x={-3} y={-3} width={W + 6} height={H + 6} rx={rx + 3} fill="none" stroke={ring} strokeWidth={isSel || focus === n.id ? 3 : 2.5} />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
