import type { BuildStep, GEdge, GNode, GraphModel, JsonPath, TNode, TreeKind, TreeModel } from './types'

// Mô hình cây của NIST IR 8504, mục 3.1 / Fig. 5: tối đa 5 tầng (key-value: 4 tầng).
export const LEVEL_NAMES: Record<TreeKind, string[]> = {
  'key-value': ['Database', 'Table', 'Key', 'Value'],
  'wide-column': ['Database', 'Column family', 'Row', 'Column', 'Value'],
  document: ['Database', 'Collection', 'Document', 'Field', 'Value'],
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isScalar = (v: unknown) => !isObj(v) && !Array.isArray(v)
const show = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v))

export function buildTree(data: unknown, kind: TreeKind): TreeModel {
  const names = LEVEL_NAMES[kind]
  const nodes: Record<string, TNode> = {}
  const order: string[] = []
  const steps: BuildStep[] = []
  const warnings: string[] = []

  function add(parentId: string | null, label: string, level: number, jsonPath: JsonPath, marker: string): TNode {
    let id = parentId ? `${parentId}/${label}` : label
    for (let n = 2; nodes[id]; n++) id = `${parentId ? parentId + '/' : ''}${label}#${n}`
    const node: TNode = {
      id, label, level, levelName: names[level - 1], parentId, children: [], jsonPath,
      isValue: level === names.length,
    }
    nodes[id] = node
    order.push(id)
    if (parentId) nodes[parentId].children.push(id)
    steps.push({
      nodeId: id, marker, jsonPath,
      text: `Tạo nút tầng ${level} (${node.levelName}) "${label}" từ ${jsonPath.length ? 'JSON ' + jsonPath.join('.') : 'gốc JSON'}`,
    })
    return node
  }

  /** Giá trị ở tầng cuối: phần JSON sâu hơn bị gộp thành một Value và cảnh báo. */
  function addValue(parent: TNode, v: unknown, jsonPath: JsonPath, merge: boolean): void {
    if (isScalar(v)) {
      add(parent.id, show(v), parent.level + 1, jsonPath, 'value') // @step:value
      return
    }
    const node = add(parent.id, JSON.stringify(v), parent.level + 1, jsonPath, 'value-merged') // @step:value-merged
    if (merge) warnings.push(`Dữ liệu tại ${jsonPath.join('.')} sâu hơn tầng ${names.length}: được gộp thành một Value, không phân quyền mịn hơn được (Fig. 5).`)
    void node
  }

  const dbKeys = isObj(data) ? Object.keys(data as object) : []
  const single = dbKeys.length === 1 && isObj((data as Record<string, unknown>)[dbKeys[0]])
  const dbName = single ? dbKeys[0] : 'database'
  const dbBody = (single ? (data as Record<string, unknown>)[dbName] : data) as Record<string, unknown>
  const dbPath: JsonPath = single ? [dbName] : []
  const root = add(null, dbName, 1, dbPath, 'database') // @step:database

  for (const [tName, tVal] of Object.entries(dbBody ?? {})) {
    const tPath = [...dbPath, tName]
    const table = add(root.id, tName, 2, tPath, 'level2') // @step:level2
    if (kind === 'document') {
      const docs: [string, unknown, JsonPath][] = Array.isArray(tVal)
        ? tVal.map((d, i): [string, unknown, JsonPath] => [isObj(d) ? String(d._id ?? d.id ?? `doc${i}`) : `doc${i}`, d, [...tPath, i]])
        : isObj(tVal) ? Object.entries(tVal).map(([k, d]): [string, unknown, JsonPath] => [k, d, [...tPath, k]]) : []
      for (const [dName, d, dPath] of docs) {
        const doc = add(table.id, dName, 3, dPath, 'document') // @step:document
        if (!isObj(d)) continue
        for (const [f, fv] of Object.entries(d)) {
          if (f === '_id') continue
          const field = add(doc.id, f, 4, [...dPath, f], 'field') // @step:field
          if (Array.isArray(fv)) fv.forEach((x, i) => addValue(field, x, [...dPath, f, i], !isScalar(x)))
          else addValue(field, fv, [...dPath, f], !isScalar(fv))
        }
      }
    } else if (kind === 'wide-column') {
      for (const [rName, rVal] of isObj(tVal) ? Object.entries(tVal) : []) {
        const row = add(table.id, rName, 3, [...tPath, rName], 'row') // @step:row
        for (const [cName, cVal] of isObj(rVal) ? Object.entries(rVal) : []) {
          const col = add(row.id, cName, 4, [...tPath, rName, cName], 'column') // @step:column
          if (Array.isArray(cVal)) cVal.forEach((x, i) => addValue(col, x, [...tPath, rName, cName, i], !isScalar(x)))
          else addValue(col, cVal, [...tPath, rName, cName], !isScalar(cVal))
        }
      }
    } else {
      for (const [k, v] of isObj(tVal) ? Object.entries(tVal) : []) {
        const key = add(table.id, k, 3, [...tPath, k], 'key') // @step:key
        addValue(key, v, [...tPath, k], false)
      }
    }
  }
  const maxLevel = Math.max(...order.map((id) => nodes[id].level))
  return { kind, rootId: root.id, nodes, order, maxLevel, warnings, steps }
}

export function ancestorsOrSelf(m: TreeModel, id: string): string[] {
  const out: string[] = []
  for (let cur: string | null = id; cur; cur = m.nodes[cur]?.parentId ?? null) out.push(cur)
  return out
}

const ACTION_EDGE = /^(can|cannot)\s+(read|write|delete)$/i

// Graph, mục 3.2.3 / Fig. 6: đồ thị có hướng gồm nút và cạnh.
export function buildGraph(data: unknown): GraphModel {
  const d = data as { nodes?: GNode[]; edges?: { from: string; to: string; label?: string }[] }
  const nodes: GNode[] = []
  const edges: GEdge[] = []
  const steps: BuildStep[] = []
  const known = new Set<string>()
  ;(d.nodes ?? []).forEach((n, i) => {
    nodes.push({ id: String(n.id), type: n.type, label: n.label })
    known.add(String(n.id))
    steps.push({ nodeId: String(n.id), marker: 'graph-node', jsonPath: ['nodes', i], text: `Tạo nút "${n.id}"${n.type ? ` (loại ${n.type})` : ''} từ nodes[${i}]` }) // @step:graph-node
  })
  ;(d.edges ?? []).forEach((e, i) => {
    for (const end of [e.from, e.to]) if (!known.has(end)) throw new Error(`Cạnh edges[${i}] trỏ tới nút không tồn tại: ${end}`)
    const label = e.label ?? ''
    const m = ACTION_EDGE.exec(label.trim())
    const edge: GEdge = { from: e.from, to: e.to, label }
    if (m) {
      edge.action = m[2].toLowerCase() as 'read' | 'write' | 'delete'
      if (m[1].toLowerCase() === 'cannot') edge.deny = true
    }
    edges.push(edge)
    steps.push({ nodeId: `${e.from}->${e.to}`, marker: 'graph-edge', jsonPath: ['edges', i], text: `Tạo cạnh có hướng ${e.from} --${label}--> ${e.to}${edge.action ? ' (cạnh mang quyền ' + edge.action + ')' : ''}` }) // @step:graph-edge
  })
  return { nodes, edges, steps }
}
