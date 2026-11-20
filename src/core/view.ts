import { ancestorsOrSelf } from './build'
import type { Ctx } from './condition'
import { decide } from './rules'
import type { Action, Rule, Space, TreeModel } from './types'

/** Các nút lá nằm dưới một trong các gốc (dùng để liệt kê chủ thể và đối tượng). */
export function leaves(m: TreeModel, roots: string[]): string[] {
  return m.order.filter((id) => m.nodes[id].children.length === 0 && ancestorsOrSelf(m, id).some((a) => roots.includes(a)))
}

/** B2: "ai được truy cập nút này?" (bài nêu việc này khó trên NoSQL, mục 3.2). */
export function whoCan(space: Space, rules: Rule[], subjects: string[], action: Action, object: string, ctx: Ctx = {}) {
  const allowed: string[] = []
  const denied: string[] = []
  for (const s of subjects) (decide(space, rules, s, action, object, ctx).allowed ? allowed : denied).push(s)
  return { allowed, denied }
}

export interface Cell { subject: string; object: string; db: boolean; tuple: boolean }

/** B1: phân quyền mức database (ai có vai trò trên DB thì thấy hết) so với phân quyền theo tuple. */
export function accessMatrix(space: Space, rules: Rule[], subjects: string[], objects: string[], action: Action, ctx: Ctx = {}) {
  const cells: Cell[] = []
  for (const s of subjects) for (const o of objects) cells.push({ subject: s, object: o, db: true, tuple: decide(space, rules, s, action, o, ctx).allowed })
  const tupleAllowed = cells.filter((c) => c.tuple).length
  return { cells, tupleAllowed, overGranted: cells.filter((c) => c.db && !c.tuple).length }
}
