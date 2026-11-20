import { buildGraph, buildTree } from './build'
import { detectKind } from './detect'
import { graphEdgeRules, graphSpace, treeSpace } from './rules'
import type { DbKind, GraphModel, Rule, Space, TreeModel } from './types'
import { leaves } from './view'

export interface Sample {
  id: string
  title: string
  kind: DbKind
  description: string
  data: unknown
  subjectRoots?: string[]
  objectRoots?: string[]
  rules: Rule[]
  scenarios: { title: string; subject: string; action: 'read' | 'write' | 'delete'; object: string; ctx: Record<string, number>; expect: 'allow' | 'deny' }[]
}

export interface Dataset {
  kind: DbKind
  data: unknown
  tree?: TreeModel
  graph?: GraphModel
  space: Space
  edgeRules: Rule[]
  subjectRoots: string[]
  objectRoots: string[]
  subjects: string[]
  objects: string[]
}

/** Dựng toàn bộ mô hình từ JSON thô. Nếu thiếu vùng chủ thể/đối tượng thì đoán: tầng 2 đầu tiên là chủ thể, phần còn lại là đối tượng. */
export function makeDataset(data: unknown, kind: DbKind, subjectRoots?: string[], objectRoots?: string[]): Dataset {
  if (kind === 'graph') {
    const graph = buildGraph(data)
    const incoming = new Set(graph.edges.map((e) => e.to))
    const sources = graph.nodes.filter((n) => !incoming.has(n.id)).map((n) => n.id)
    const byType = (t: string) => graph.nodes.filter((n) => n.type === t).map((n) => n.id)
    return {
      kind, data, graph, space: graphSpace(graph), edgeRules: graphEdgeRules(graph), subjectRoots: [], objectRoots: [],
      subjects: byType('user').length ? byType('user') : sources,
      objects: byType('file').length ? byType('file') : sources,
    }
  }
  const tree = buildTree(data, kind)
  const lvl2 = tree.nodes[tree.rootId].children
  const sRoots = subjectRoots?.length ? subjectRoots : lvl2.slice(0, 1)
  const oRoots = objectRoots?.length ? objectRoots : lvl2.slice(1)
  return {
    kind, data, tree, space: treeSpace(tree), edgeRules: [], subjectRoots: sRoots, objectRoots: oRoots,
    subjects: leaves(tree, sRoots), objects: leaves(tree, oRoots),
  }
}

export function datasetFromJson(data: unknown, forceKind?: DbKind) {
  const det = detectKind(data)
  const kind = forceKind ?? (det.kind === 'unknown' ? undefined : det.kind)
  if (!kind) throw new Error(det.evidence.join(' '))
  return { detection: det, dataset: makeDataset(data, kind) }
}
