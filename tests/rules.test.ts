import { describe, it, expect } from 'vitest'
import { buildTree, buildGraph } from '../src/core/build'
import { decide, treeSpace, graphSpace, graphEdgeRules, describeRule } from '../src/core/rules'
import type { Rule } from '../src/core/types'
import { DOC, GRAPH } from './fixtures'

const m = buildTree(DOC, 'document')
const space = treeSpace(m)
const AN = 'CongTyA/nhanvien/phong_KeToan/nhom_thue/An'
const CHI = 'CongTyA/nhanvien/phong_KeToan/nhom_kiemtoan/Chi'
const BAOCAO = 'CongTyA/tailieu/bophan_TaiChinh/chinhanh_HN/baocao_Q3.pdf'
const BAOCAO_HCM = 'CongTyA/tailieu/bophan_TaiChinh/chinhanh_HCM/baocao_HCM_Q3.pdf'
const LUONG = 'CongTyA/tailieu/bophan_NhanSu/chinhanh_HN/luong_T10.xlsx'

const grant: Rule = {
  id: 'R1',
  subjectAttrs: ['CongTyA/nhanvien/phong_KeToan/nhom_thue'],
  objectAttrs: ['CongTyA/tailieu/bophan_TaiChinh'],
  actions: ['read'],
  permission: 'allow',
}

describe('decide on a tree', () => {
  it('default deny when no rule', () => {
    const d = decide(space, [], AN, 'read', BAOCAO)
    expect(d.allowed).toBe(false)
    expect(d.outcome).toBe('default-deny')
  })
  it('one node on each side is enough, rights inherit to descendants', () => {
    expect(decide(space, [grant], AN, 'read', BAOCAO).allowed).toBe(true)
    expect(decide(space, [grant], AN, 'read', BAOCAO_HCM).allowed).toBe(true)
    const d = decide(space, [grant], AN, 'read', BAOCAO)
    expect(d.matched[0].ruleId).toBe('R1')
    expect(d.matched[0].subjectVia).toEqual(['CongTyA/nhanvien/phong_KeToan/nhom_thue'])
  })
  it('does not leak to other subjects, objects or actions', () => {
    expect(decide(space, [grant], CHI, 'read', BAOCAO).allowed).toBe(false)
    expect(decide(space, [grant], AN, 'read', LUONG).allowed).toBe(false)
    expect(decide(space, [grant], AN, 'write', BAOCAO).allowed).toBe(false)
  })
  it('all attributes of a side must hold; leaf narrows to one subject', () => {
    const r: Rule = { ...grant, subjectLeaf: AN }
    expect(decide(space, [r], AN, 'read', BAOCAO).allowed).toBe(true)
    const binh = 'CongTyA/nhanvien/phong_KeToan/nhom_thue/Binh'
    expect(decide(space, [r], binh, 'read', BAOCAO).allowed).toBe(false)
    const two: Rule = { ...grant, subjectAttrs: [grant.subjectAttrs[0], 'CongTyA/nhanvien/phong_NhanSu'] }
    expect(decide(space, [two], AN, 'read', BAOCAO).allowed).toBe(false)
  })
  it('deny wins over allow, even from a more specific allow', () => {
    const deny: Rule = {
      id: 'R2', subjectAttrs: ['CongTyA/nhanvien'], objectLeaf: BAOCAO, objectAttrs: [],
      actions: ['read'], permission: 'deny',
    }
    const d = decide(space, [grant, deny], AN, 'read', BAOCAO)
    expect(d.allowed).toBe(false)
    expect(d.outcome).toBe('deny')
    expect(d.matched.map((x) => x.ruleId).sort()).toEqual(['R1', 'R2'])
    expect(decide(space, [grant, deny], AN, 'read', BAOCAO_HCM).allowed).toBe(true)
  })
  it('wildcard action * covers all actions', () => {
    const all: Rule = { ...grant, actions: ['*'] }
    expect(decide(space, [all], AN, 'delete', BAOCAO).allowed).toBe(true)
  })
  it('condition gates the rule using the request context', () => {
    const c: Rule = { ...grant, condition: 'gio >= 8 and gio <= 17' }
    expect(decide(space, [c], AN, 'read', BAOCAO, { gio: 9 }).allowed).toBe(true)
    expect(decide(space, [c], AN, 'read', BAOCAO, { gio: 22 }).allowed).toBe(false)
    const d = decide(space, [c], AN, 'read', BAOCAO, { gio: 22 })
    expect(d.trace.join(' ')).toMatch(/R1/)
  })
  it('trace explains the decision in plain text', () => {
    const d = decide(space, [grant], AN, 'read', BAOCAO)
    expect(d.trace.length).toBeGreaterThan(1)
    expect(d.subjectChain[0]).toBe(AN)
  })
  it('describeRule renders a sentence naming the nodes', () => {
    const s = describeRule(m, grant)
    expect(s).toContain('nhom_thue')
    expect(s).toContain('bophan_TaiChinh')
    expect(s).toMatch(/đọc/)
    expect(s).toMatch(/cho phép|được/i)
  })
})

describe('decide on a graph', () => {
  const g = buildGraph(GRAPH)
  const gs = graphSpace(g)
  const edgeRules = graphEdgeRules(g)
  it('closure follows outgoing non-action edges and records paths', () => {
    const c = gs.closure('An')
    expect([...c.keys()].sort()).toEqual(['An', 'CongTyA', 'NhomThue', 'PhongKeToan'])
    expect(c.get('CongTyA')).toEqual(['An', 'NhomThue', 'PhongKeToan', 'CongTyA'])
  })
  it('the edge itself is the permission (Fig 10 style)', () => {
    const d = decide(gs, edgeRules, 'An', 'read', 'baocao_Q3.pdf')
    expect(d.allowed).toBe(true)
    expect(d.matched[0].ruleId).toMatch(/NhomThue/)
    expect(decide(gs, edgeRules, 'Chi', 'read', 'baocao_Q3.pdf').allowed).toBe(false)
    expect(decide(gs, edgeRules, 'An', 'write', 'baocao_Q3.pdf').allowed).toBe(false)
  })
  it('explicit attribute-chain rules work on graphs', () => {
    const r: Rule = {
      id: 'G1', subjectAttrs: ['NhomKiemToan'], objectAttrs: ['BoPhanTaiChinh'],
      actions: ['read'], permission: 'allow',
    }
    expect(decide(gs, [...edgeRules, r], 'Chi', 'read', 'baocao_Q3.pdf').allowed).toBe(true)
  })
  it('a cannot-edge denies and wins', () => {
    const g2 = buildGraph({ ...GRAPH, edges: [...GRAPH.edges, { from: 'An', to: 'baocao_Q3.pdf', label: 'cannot read' }] })
    const d = decide(graphSpace(g2), graphEdgeRules(g2), 'An', 'read', 'baocao_Q3.pdf')
    expect(d.allowed).toBe(false)
    expect(d.outcome).toBe('deny')
  })
  it('terminates on cycles', () => {
    const cyc = buildGraph({
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ from: 'a', to: 'b', label: 'x' }, { from: 'b', to: 'a', label: 'y' }],
    })
    expect([...graphSpace(cyc).closure('a').keys()].sort()).toEqual(['a', 'b'])
  })
})
