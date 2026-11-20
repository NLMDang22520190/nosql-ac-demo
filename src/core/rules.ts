import { ancestorsOrSelf } from './build'
import { evalCondition, type Ctx } from './condition'
import type { Action, Decision, GraphModel, Match, Rule, Space, TreeModel } from './types'

/** Cây: nút kế thừa quyền từ cha (mục 3.2.2), nên "closure" của một nút là chuỗi tổ tiên. */
export function treeSpace(m: TreeModel): Space {
  return {
    label: (id) => m.nodes[id]?.label ?? id,
    closure(id) {
      const out = new Map<string, string[]>()
      const chain = ancestorsOrSelf(m, id) // @rule:tree-closure
      chain.forEach((anc, i) => out.set(anc, chain.slice(0, i + 1)))
      return out
    },
  }
}

/** Graph: "thuộc tính" của một nút là mọi nút đi tới được qua cạnh có hướng, trừ cạnh mang quyền. */
export function graphSpace(g: GraphModel): Space {
  const out = new Map<string, string[]>()
  for (const e of g.edges) if (!e.action) (out.get(e.from) ?? out.set(e.from, []).get(e.from)!).push(e.to)
  return {
    label: (id) => id,
    closure(id) {
      const seen = new Map<string, string[]>([[id, [id]]])
      const queue = [id]
      while (queue.length) { // @rule:graph-closure
        const cur = queue.shift()!
        for (const nxt of out.get(cur) ?? []) {
          if (seen.has(nxt)) continue
          seen.set(nxt, [...seen.get(cur)!, nxt])
          queue.push(nxt)
        }
      }
      return seen
    },
  }
}

/** Graph Fig. 10: cạnh "can read"/"cannot read" chính là luật nhúng trong cơ sở dữ liệu. */
export function graphEdgeRules(g: GraphModel): Rule[] {
  return g.edges
    .filter((e) => e.action)
    .map((e) => ({
      id: `edge:${e.from}-[${e.label}]->${e.to}`,
      subjectAttrs: [e.from],
      objectAttrs: [e.to],
      actions: [e.action as Action],
      permission: e.deny ? ('deny' as const) : ('allow' as const),
      note: 'Luật nằm trong cạnh của đồ thị',
    }))
}

const ACTION_VI: Record<string, string> = { read: 'đọc', write: 'ghi', delete: 'xóa', '*': 'mọi thao tác' }
export const actionVi = (a: string) => ACTION_VI[a] ?? a

export function describeRule(lab: TreeModel | ((id: string) => string), r: Rule): string {
  const name = (id: string) => (typeof lab === 'function' ? lab(id) : `${lab.nodes[id]?.label ?? id} (${lab.nodes[id]?.levelName ?? '?'})`)
  const side = (attrs: string[], leaf: string | undefined, any: string) => {
    const parts = [...attrs.map(name), ...(leaf ? [name(leaf)] : [])]
    return parts.length ? parts.join(' và ') : any
  }
  const verb = r.actions.map(actionVi).join(', ')
  const who = side(r.subjectAttrs, r.subjectLeaf, 'bất kỳ chủ thể nào')
  const what = side(r.objectAttrs, r.objectLeaf, 'bất kỳ đối tượng nào')
  const cond = r.condition ? `, khi ${r.condition}` : ''
  return `${r.permission === 'allow' ? 'Cho phép' : 'Cấm'} chủ thể thuộc ${who} ${verb} đối tượng thuộc ${what}${cond}.`
}

const covers = (r: Rule, a: Action) => r.actions.includes('*') || r.actions.includes(a)

export function decide(space: Space, rules: Rule[], subject: string, action: Action, object: string, ctx: Ctx = {}): Decision {
  const sc = space.closure(subject)
  const oc = space.closure(object)
  const trace: string[] = []
  const matched: Match[] = []
  const L = space.label
  trace.push(`Chủ thể "${L(subject)}" có các nút thuộc tính: ${[...sc.keys()].map(L).join(' → ')}.`)
  trace.push(`Đối tượng "${L(object)}" có các nút thuộc tính: ${[...oc.keys()].map(L).join(' → ')}.`)
  for (const r of rules) {
    if (!covers(r, action)) continue
    const sNeed = [...r.subjectAttrs, ...(r.subjectLeaf ? [r.subjectLeaf] : [])]
    const oNeed = [...r.objectAttrs, ...(r.objectLeaf ? [r.objectLeaf] : [])]
    if (!sNeed.every((n) => sc.has(n)) || !oNeed.every((n) => oc.has(n))) continue // @rule:match
    if (r.condition) {
      const c = evalCondition(r.condition, ctx)
      if (!c.value) {
        trace.push(`Luật ${r.id} khớp nút nhưng điều kiện "${r.condition}" không thỏa${c.error ? ` (${c.error})` : ''}: bỏ qua.`)
        continue
      }
    }
    matched.push({
      ruleId: r.id, permission: r.permission, subjectVia: sNeed, objectVia: oNeed,
      subjectPath: sNeed.map((n) => sc.get(n)!), objectPath: oNeed.map((n) => oc.get(n)!),
    })
    trace.push(`Luật ${r.id} (${r.permission === 'allow' ? 'cho phép' : 'cấm'}) khớp: chủ thể qua ${sNeed.map(L).join(', ') || 'mọi chủ thể'}, đối tượng qua ${oNeed.map(L).join(', ') || 'mọi đối tượng'}.`)
  }
  const hasDeny = matched.some((m) => m.permission === 'deny')
  const hasAllow = matched.some((m) => m.permission === 'allow')
  let outcome: Decision['outcome']
  if (hasDeny) { // @rule:deny-wins
    outcome = 'deny'
    trace.push('Có luật cấm khớp: TỪ CHỐI (cấm thắng cho phép, lựa chọn của nhóm, bài không quy định).')
  } else if (hasAllow) {
    outcome = 'allow'
    trace.push('Có luật cho phép khớp và không có luật cấm: CHO PHÉP.')
  } else {
    outcome = 'default-deny' // @rule:default-deny
    trace.push('Không có luật nào khớp: TỪ CHỐI mặc định (lựa chọn của nhóm).')
  }
  return { allowed: outcome === 'allow', outcome, matched, trace, subjectChain: [...sc.keys()], objectChain: [...oc.keys()] }
}
