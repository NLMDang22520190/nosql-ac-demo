import { useMemo } from 'react'
import { LEVEL_NAMES } from '../core/build'
import type { TreeModel } from '../core/types'
import type { Marks } from './marks'

// Độ sâu của tầng thể hiện bằng độ đậm của một tông xanh (tầng 1 đậm nhất).
export const DEPTH = ['#1B2B4B', '#2F4A7D', '#4A6FA5', '#7497C4', '#A5BEDB']
const COL = 196
const ROW = 27
const BW = 172
const TOP = 54

interface Props {
  model: TreeModel
  marks?: Marks
  selected?: string[]
  onSelect?: (id: string) => void
  subjectRoots?: string[]
  objectRoots?: string[]
  focus?: string
}

export function TreeView({ model, marks = {}, selected = [], onSelect, subjectRoots = [], objectRoots = [], focus }: Props) {
  const layout = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    let row = 0
    const walk = (id: string): number => {
      const n = model.nodes[id]
      const kids = n.children.map(walk)
      const y = kids.length ? (kids[0] + kids[kids.length - 1]) / 2 : row++ * ROW
      pos[id] = { x: (n.level - 1) * COL + 12, y: y + TOP }
      return y
    }
    walk(model.rootId)
    return { pos, h: row * ROW + TOP + 24 }
  }, [model])
  const names = LEVEL_NAMES[model.kind].slice(0, model.maxLevel)
  const w = model.maxLevel * COL + 24
  const inRoot = (id: string, roots: string[]) => roots.some((r) => id === r || id.startsWith(r + '/'))
  return (
    <div className="viz-scroll">
      <svg width={w} height={layout.h} role="img" aria-label="Cây phân tầng">
        {names.map((nm, i) => (
          <g key={nm}>
            <rect x={i * COL} y={0} width={COL} height={layout.h} fill={i % 2 ? 'rgba(23,32,46,0.035)' : 'rgba(255,255,255,0.55)'} />
            <text x={i * COL + 12} y={22} fontFamily="Bricolage Grotesque, sans-serif" fontSize={15} fontWeight={700} fill={DEPTH[i]}>{`Tầng ${i + 1}`}</text>
            <text x={i * COL + 12} y={40} fontSize={12} fill="#5B6678">{nm}</text>
          </g>
        ))}
        {model.order.map((id) => {
          const n = model.nodes[id]
          if (!n.parentId) return null
          const a = layout.pos[n.parentId]
          const b = layout.pos[id]
          const x1 = a.x + BW
          const y1 = a.y + 11
          const x2 = b.x
          const y2 = b.y + 11
          const dim = marks[id]?.dim
          return <path key={'e' + id} d={`M${x1},${y1} C${x1 + 14},${y1} ${x2 - 14},${y2} ${x2},${y2}`} fill="none" stroke="#B3BCCB" strokeWidth={1.2} opacity={dim ? 0.15 : 1} />
        })}
        {model.order.map((id) => {
          const n = model.nodes[id]
          const p = layout.pos[id]
          const mk = marks[id]
          const base = DEPTH[n.level - 1]
          const isSel = selected.includes(id)
          const role = inRoot(id, subjectRoots) ? 'S' : inRoot(id, objectRoots) ? 'O' : ''
          const label = n.label.length > 21 ? n.label.slice(0, 20) + '…' : n.label
          const ring = isSel ? '#17202E' : focus === id ? '#F2B01E' : mk?.ring
          return (
            <g key={id} transform={`translate(${p.x},${p.y})`} onClick={() => onSelect?.(id)} style={{ cursor: onSelect ? 'pointer' : 'default' }} opacity={mk?.dim ? 0.18 : 1} data-node={id}>
              <title>{`${n.levelName}: ${n.label}\n${id}`}</title>
              <rect width={BW} height={22} rx={3} fill="#fff" stroke="#9AA6BA" strokeWidth={1} />
              {mk?.tint && <rect width={BW} height={22} rx={3} fill={mk.tint} opacity={mk.tintOpacity ?? 0.3} />}
              <rect width={5} height={22} rx={1.5} fill={base} />
              {role && <circle cx={BW - 10} cy={11} r={3.5} fill={role === 'S' ? '#2447D0' : '#D9650B'} />}
              <text x={12} y={15} fontSize={12} fontWeight={mk?.bold || isSel || focus === id ? 700 : 400} fill="#17202E">{label}</text>
              {mk?.tag && <text x={BW} y={-3} fontSize={10} fill="#17202E" textAnchor="end" fontWeight={700}>{mk.tag}</text>}
              {ring && <rect x={-3} y={-3} width={BW + 6} height={28} rx={5} fill="none" stroke={ring} strokeWidth={isSel || focus === id ? 3 : 2.5} />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
