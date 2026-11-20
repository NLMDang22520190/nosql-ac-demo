export type DbKind = 'key-value' | 'wide-column' | 'document' | 'graph'
export type TreeKind = Exclude<DbKind, 'graph'>
export type Action = 'read' | 'write' | 'delete' | '*'
export type JsonPath = (string | number)[]

export interface TNode {
  id: string
  label: string
  level: number
  levelName: string
  parentId: string | null
  children: string[]
  jsonPath: JsonPath
  isValue: boolean
}

export interface BuildStep {
  nodeId: string
  marker: string
  jsonPath: JsonPath
  text: string
}

export interface TreeModel {
  kind: TreeKind
  rootId: string
  nodes: Record<string, TNode>
  order: string[]
  maxLevel: number
  warnings: string[]
  steps: BuildStep[]
}

export interface GNode { id: string; type?: string; label?: string }
export interface GEdge { from: string; to: string; label: string; action?: 'read' | 'write' | 'delete'; deny?: boolean }
export interface GraphModel {
  nodes: GNode[]
  edges: GEdge[]
  steps: BuildStep[]
}

/** Tuple of the paper (section 3.2.2), simplified: node ids instead of free attributes. */
export interface Rule {
  id: string
  subjectAttrs: string[]
  subjectLeaf?: string
  objectAttrs: string[]
  objectLeaf?: string
  actions: Action[]
  permission: 'allow' | 'deny'
  condition?: string
  note?: string
}

export interface Match {
  ruleId: string
  permission: 'allow' | 'deny'
  subjectVia: string[]
  objectVia: string[]
  subjectPath: string[][]
  objectPath: string[][]
}

export interface Decision {
  allowed: boolean
  outcome: 'allow' | 'deny' | 'default-deny'
  matched: Match[]
  trace: string[]
  subjectChain: string[]
  objectChain: string[]
}

/** closure(id): every node reachable "upward" from id (itself included) with the path to it. */
export interface Space {
  closure(id: string): Map<string, string[]>
  label(id: string): string
}

export interface Meta {
  subjectRoots: string[]
  objectRoots: string[]
}
