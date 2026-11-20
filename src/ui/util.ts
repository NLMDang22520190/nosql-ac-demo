import type { Dataset } from '../core/dataset'
import type { Ctx } from '../core/condition'

/** Tên đầy đủ để người dùng chọn: đường đi bỏ tên database. */
export function nodeLabel(ds: Dataset, id: string): string {
  if (!ds.tree) return id
  const n = ds.tree.nodes[id]
  if (!n) return id
  const parts: string[] = []
  for (let cur: string | null = id; cur; cur = ds.tree.nodes[cur].parentId) parts.unshift(ds.tree.nodes[cur].label)
  return parts.slice(1).join(' › ') || n.label
}

export const shortLabel = (ds: Dataset, id: string) => ds.tree?.nodes[id]?.label ?? id

/** "gio=9, mucdo=2" -> { gio: 9, mucdo: 2 } */
export function parseCtx(text: string): Ctx {
  const out: Ctx = {}
  for (const part of text.split(/[,;\s]+/)) {
    const m = /^([A-Za-z_]\w*)=(-?\d+(?:\.\d+)?)$/.exec(part)
    if (m) out[m[1]] = Number(m[2])
  }
  return out
}

export const pretty = (v: unknown) => JSON.stringify(v, null, 2)
export const ACTIONS = [
  { id: 'read', vi: 'Đọc' },
  { id: 'write', vi: 'Ghi' },
  { id: 'delete', vi: 'Xóa' },
] as const
