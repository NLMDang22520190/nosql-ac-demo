import type { Decision, GraphModel, Rule, TreeModel } from '../core/types'

export const COLORS = { subject: '#2447D0', object: '#D9650B', allow: '#0E9F6E', deny: '#C8302A', focus: '#F2B01E', ink: '#17202E' }

export interface Mark { ring?: string; tint?: string; tintOpacity?: number; bold?: boolean; tag?: string; dim?: boolean }
export type Marks = Record<string, Mark>

function descendants(m: TreeModel, id: string, out: string[] = []): string[] {
  for (const c of m.nodes[id]?.children ?? []) { out.push(c); descendants(m, c, out) }
  return out
}

const sideNodes = (a: string[], leaf?: string) => [...a, ...(leaf ? [leaf] : [])]

/** A7: nút bị luật tác động tô đậm, nút con kế thừa tô nhạt. `only` = chỉ vẽ một luật. */
export function ruleMarksTree(m: TreeModel, rules: Rule[], only?: string): Marks {
  const marks: Marks = {}
  for (const r of rules) {
    if (only && r.id !== only) continue
    const tint = r.permission === 'allow' ? COLORS.allow : COLORS.deny
    const sides: [string[], string][] = [
      [sideNodes(r.subjectAttrs, r.subjectLeaf), COLORS.subject],
      [sideNodes(r.objectAttrs, r.objectLeaf), COLORS.object],
    ]
    for (const [ids, ring] of sides) {
      for (const id of ids) {
        for (const d of descendants(m, id)) if (!marks[d]?.tint) marks[d] = { ...marks[d], tint, tintOpacity: 0.22 }
        marks[id] = { ...marks[id], ring, tint, tintOpacity: 0.6, tag: r.id }
      }
    }
  }
  return marks
}

/** A8: đường đi của quyết định: chuỗi tổ tiên hai phía và nút của luật khớp. */
export function decisionMarksTree(d: Decision, subject: string, object: string): Marks {
  const marks: Marks = {}
  for (const id of d.subjectChain) marks[id] = { ring: COLORS.subject }
  for (const id of d.objectChain) marks[id] = { ...marks[id], ring: COLORS.object }
  for (const m of d.matched) {
    const tint = m.permission === 'allow' ? COLORS.allow : COLORS.deny
    for (const id of [...m.subjectVia, ...m.objectVia]) marks[id] = { ...marks[id], tint, tintOpacity: 0.7, bold: true, tag: m.ruleId }
  }
  marks[subject] = { ...marks[subject], bold: true }
  marks[object] = { ...marks[object], bold: true }
  return marks
}

export interface GMarks { nodes: Marks; edges: Record<string, string>; dimEdges?: Set<string> }
export const edgeKey = (a: string, b: string) => `${a}->${b}`

export function ruleMarksGraph(g: GraphModel, rules: Rule[], only?: string): GMarks {
  const nodes: Marks = {}
  const edges: Record<string, string> = {}
  for (const r of rules) {
    if (only && r.id !== only) continue
    const tint = r.permission === 'allow' ? COLORS.allow : COLORS.deny
    for (const id of sideNodes(r.subjectAttrs, r.subjectLeaf)) nodes[id] = { ring: COLORS.subject, tint, tintOpacity: 0.45, tag: r.id }
    for (const id of sideNodes(r.objectAttrs, r.objectLeaf)) nodes[id] = { ring: COLORS.object, tint, tintOpacity: 0.45, tag: r.id }
  }
  for (const e of g.edges) {
    if (e.action && (!only || only === `edge:${e.from}-[${e.label}]->${e.to}`)) edges[edgeKey(e.from, e.to)] = e.deny ? COLORS.deny : COLORS.allow
  }
  return { nodes, edges }
}

export function decisionMarksGraph(d: Decision, subject: string, object: string): GMarks {
  const nodes: Marks = {}
  const edges: Record<string, string> = {}
  const walk = (paths: string[][], color: string) => {
    for (const p of paths) for (let i = 0; i < p.length; i++) {
      nodes[p[i]] = { ...nodes[p[i]], ring: color }
      if (i > 0) edges[edgeKey(p[i - 1], p[i])] = color
    }
  }
  for (const m of d.matched) {
    walk(m.subjectPath, COLORS.subject)
    walk(m.objectPath, COLORS.object)
    const tint = m.permission === 'allow' ? COLORS.allow : COLORS.deny
    for (const id of [...m.subjectVia, ...m.objectVia]) nodes[id] = { ...nodes[id], tint, tintOpacity: 0.6, bold: true, tag: m.ruleId.startsWith('edge:') ? undefined : m.ruleId }
    const mm = /^edge:(.+)-\[.*\]->(.+)$/.exec(m.ruleId)
    if (mm) edges[edgeKey(mm[1], mm[2])] = tint
  }
  nodes[subject] = { ...nodes[subject], bold: true, ring: COLORS.subject }
  nodes[object] = { ...nodes[object], bold: true, ring: COLORS.object }
  return { nodes, edges }
}
