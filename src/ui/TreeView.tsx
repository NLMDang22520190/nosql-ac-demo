import { useMemo } from 'react'
import { LEVEL_NAMES } from '../core/build'
import type { TreeModel } from '../core/types'
import { fitText } from './fit'
import type { Marks } from './marks'
import { ZoomPane } from './ZoomPane'

// Độ sâu của tầng thể hiện bằng độ đậm của một tông xanh (tầng 1 đậm nhất).
export const DEPTH = ['#1B2B4B', '#2F4A7D', '#4A6FA5', '#7497C4', '#A5BEDB']
const GUT = 118 // cột nhãn tầng bên trái
const SP = 170 // khoảng cách ngang giữa hai nút lá
const BW = 156
const BH = 26
const ROWH = 96 // chiều cao mỗi dải tầng
const HEAD = 8

interface Props {
  model: TreeModel
  marks?: Marks
  selected?: string[]
  onSelect?: (id: string) => void
  subjectRoots?: string[]
  objectRoots?: string[]
  focus?: string
}

/** Cây vẽ từ trên xuống như Fig. 5 của bài: mỗi tầng là một dải ngang, gốc ở trên cùng. */
export function TreeView({ model, marks = {}, selected = [], onSelect, subjectRoots = [], objectRoots = [], focus }: Props) {
  const layout = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    let leaf = 0
    const walk = (id: string): number => {
      const n = model.nodes[id]
      const kids = n.children.map(walk)
      const x = kids.length ? (kids[0] + kids[kids.length - 1]) / 2 : leaf++ * SP
      pos[id] = { x: GUT + 12 + x, y: HEAD + (n.level - 1) * ROWH + (ROWH - BH) / 2 }
      return x
    }
    walk(model.rootId)
    return { pos, w: GUT + 24 + Math.max(leaf, 1) * SP, h: HEAD * 2 + model.maxLevel * ROWH }
  }, [model])
  const names = LEVEL_NAMES[model.kind].slice(0, model.maxLevel)
  const inRoot = (id: string, roots: string[]) => roots.some((r) => id === r || id.startsWith(r + '/'))
  return (
    <ZoomPane width={layout.w} height={layout.h} label="Cây phân tầng" centerX={layout.pos[model.rootId].x + BW / 2} resetKey={model}>
      <>
        {names.map((nm, i) => (
          <g key={nm}>
            <rect x={0} y={HEAD + i * ROWH} width={layout.w} height={ROWH} fill={i % 2 ? 'rgba(23,32,46,0.04)' : 'rgba(255,255,255,0.6)'} />
            <text x={14} y={HEAD + i * ROWH + ROWH / 2 - 2} fontFamily="Bricolage Grotesque, sans-serif" fontSize={16} fontWeight={700} fill={DEPTH[i]}>{`Tầng ${i + 1}`}</text>
            <text x={14} y={HEAD + i * ROWH + ROWH / 2 + 16} fontSize={12} fill="#5B6678">{nm}</text>
          </g>
        ))}
        {model.order.map((id) => {
          const n = model.nodes[id]
          if (!n.parentId) return null
          const a = layout.pos[n.parentId]
          const b = layout.pos[id]
          const x1 = a.x + BW / 2
          const y1 = a.y + BH
          const x2 = b.x + BW / 2
          const y2 = b.y
          const my = (y1 + y2) / 2
          return <path key={'e' + id} d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`} fill="none" stroke="#B3BCCB" strokeWidth={1.3} opacity={marks[id]?.dim ? 0.15 : 1} />
        })}
        {model.order.map((id) => {
          const n = model.nodes[id]
          const p = layout.pos[id]
          const mk = marks[id]
          const base = DEPTH[n.level - 1]
          const isSel = selected.includes(id)
          const role = inRoot(id, subjectRoots) ? 'S' : inRoot(id, objectRoots) ? 'O' : ''
          const label = fitText(n.label, BW - 30)
          const ring = isSel ? '#17202E' : focus === id ? '#F2B01E' : mk?.ring
          return (
            <g key={id} transform={`translate(${p.x},${p.y})`} onClick={() => onSelect?.(id)} style={{ cursor: onSelect ? 'pointer' : 'default' }} opacity={mk?.dim ? 0.18 : 1} data-node={id}>
              <title>{`${n.levelName}: ${n.label}\n${id}`}</title>
              <rect width={BW} height={BH} rx={3} fill="#fff" stroke="#9AA6BA" strokeWidth={1} />
              {mk?.tint && <rect width={BW} height={BH} rx={3} fill={mk.tint} opacity={mk.tintOpacity ?? 0.3} />}
              <rect width={BW} height={4} rx={1.5} fill={base} />
              {role && <circle cx={BW - 9} cy={BH / 2 + 2} r={3.5} fill={role === 'S' ? '#2447D0' : '#D9650B'} />}
              <text x={9} y={BH / 2 + 6} fontSize={12} fontWeight={mk?.bold || isSel || focus === id ? 700 : 400} fill="#17202E">{label}</text>
              {mk?.tag && <text x={BW} y={-4} fontSize={10} fill="#17202E" textAnchor="end" fontWeight={700}>{mk.tag}</text>}
              {ring && <rect x={-3} y={-3} width={BW + 6} height={BH + 6} rx={5} fill="none" stroke={ring} strokeWidth={isSel || focus === id ? 3 : 2.5} />}
            </g>
          )
        })}
      </>
    </ZoomPane>
  )
}
