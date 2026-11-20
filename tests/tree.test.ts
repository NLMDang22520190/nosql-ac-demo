import { describe, it, expect } from 'vitest'
import { buildTree, buildGraph, ancestorsOrSelf } from '../src/core/build'
import { DOC, KV, WC, GRAPH } from './fixtures'

describe('buildTree document', () => {
  const m = buildTree(DOC, 'document')
  it('assigns the 5 levels of the paper', () => {
    expect(m.nodes['CongTyA'].level).toBe(1)
    expect(m.nodes['CongTyA/nhanvien'].level).toBe(2)
    expect(m.nodes['CongTyA/nhanvien/phong_KeToan'].level).toBe(3)
    expect(m.nodes['CongTyA/nhanvien/phong_KeToan/nhom_thue'].level).toBe(4)
    expect(m.nodes['CongTyA/nhanvien/phong_KeToan/nhom_thue/An'].level).toBe(5)
    expect(m.nodes['CongTyA/nhanvien/phong_KeToan/nhom_thue/An'].levelName).toBe('Value')
    expect(m.nodes['CongTyA/nhanvien'].levelName).toBe('Collection')
  })
  it('links parent and children', () => {
    expect(m.nodes['CongTyA/nhanvien/phong_KeToan/nhom_thue'].children).toEqual([
      'CongTyA/nhanvien/phong_KeToan/nhom_thue/An',
      'CongTyA/nhanvien/phong_KeToan/nhom_thue/Binh',
    ])
    expect(m.nodes['CongTyA'].parentId).toBeNull()
  })
  it('records the json path and a step for each node, in creation order', () => {
    const n = m.nodes['CongTyA/nhanvien/phong_KeToan/nhom_thue/An']
    expect(n.jsonPath).toEqual(['CongTyA', 'nhanvien', 0, 'nhom_thue', 0])
    expect(m.steps.length).toBe(Object.keys(m.nodes).length)
    expect(m.steps[0].nodeId).toBe('CongTyA')
    expect(m.steps.every((s) => s.marker.length > 0)).toBe(true)
  })
  it('ancestorsOrSelf walks to the root', () => {
    expect(ancestorsOrSelf(m, 'CongTyA/nhanvien/phong_KeToan/nhom_thue/An')).toEqual([
      'CongTyA/nhanvien/phong_KeToan/nhom_thue/An',
      'CongTyA/nhanvien/phong_KeToan/nhom_thue',
      'CongTyA/nhanvien/phong_KeToan',
      'CongTyA/nhanvien',
      'CongTyA',
    ])
  })
})

describe('buildTree other kinds', () => {
  it('key-value has 4 levels', () => {
    const m = buildTree(KV, 'key-value')
    expect(m.nodes['CongTyA/KeToan'].levelName).toBe('Table')
    expect(m.nodes['CongTyA/KeToan/nhom_thue'].levelName).toBe('Key')
    expect(m.nodes['CongTyA/KeToan/nhom_thue/An'].level).toBe(4)
    expect(m.nodes['CongTyA/KeToan/nhom_thue/An'].levelName).toBe('Value')
    expect(m.maxLevel).toBe(4)
  })
  it('wide-column has 5 levels', () => {
    const m = buildTree(WC, 'wide-column')
    expect(m.nodes['CongTyA/nhanvien'].levelName).toBe('Column family')
    expect(m.nodes['CongTyA/nhanvien/phong_KeToan'].levelName).toBe('Row')
    expect(m.nodes['CongTyA/nhanvien/phong_KeToan/nhom_thue'].levelName).toBe('Column')
    expect(m.nodes['CongTyA/nhanvien/phong_KeToan/nhom_thue/An'].level).toBe(5)
  })
  it('merges data deeper than level 5 and warns', () => {
    const deep = { D: { c: [{ _id: 'd1', f: { x: { y: 1 } } }] } }
    const m = buildTree(deep, 'document')
    const v = Object.values(m.nodes).filter((n) => n.level === 5)
    expect(v.length).toBe(1)
    expect(v[0].label).toContain('y')
    expect(m.warnings.length).toBe(1)
    expect(m.warnings[0]).toMatch(/5/)
    expect(Math.max(...Object.values(m.nodes).map((n) => n.level))).toBe(5)
  })
  it('gives duplicate sibling values distinct ids', () => {
    const m = buildTree({ D: { c: [{ _id: 'd', f: ['a', 'a'] }] } }, 'document')
    const kids = m.nodes['D/c/d/f'].children
    expect(new Set(kids).size).toBe(2)
  })
})

describe('buildGraph', () => {
  const g = buildGraph(GRAPH)
  it('keeps nodes and directed edges', () => {
    expect(g.nodes.length).toBe(8)
    expect(g.edges.length).toBe(7)
    expect(g.nodes.find((n) => n.id === 'An')?.type).toBe('user')
  })
  it('flags action edges', () => {
    expect(g.edges.find((e) => e.label === 'can read')?.action).toBe('read')
    expect(g.edges.find((e) => e.label === 'in')?.action).toBeUndefined()
  })
  it('has a step per node and per edge', () => {
    expect(g.steps.length).toBe(15)
  })
  it('rejects edges pointing at unknown nodes', () => {
    const bad = { nodes: [{ id: 'a' }], edges: [{ from: 'a', to: 'zz', label: 'x' }] }
    expect(() => buildGraph(bad)).toThrow(/zz/)
  })
})
