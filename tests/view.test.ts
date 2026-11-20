import { describe, it, expect } from 'vitest'
import { buildTree } from '../src/core/build'
import { treeSpace } from '../src/core/rules'
import { whoCan, accessMatrix, leaves } from '../src/core/view'
import { serializeWithLines } from '../src/core/jsonlines'
import type { Rule } from '../src/core/types'
import { DOC } from './fixtures'

const m = buildTree(DOC, 'document')
const space = treeSpace(m)
const rule: Rule = {
  id: 'R1',
  subjectAttrs: ['CongTyA/nhanvien/phong_KeToan/nhom_thue'],
  objectAttrs: ['CongTyA/tailieu/bophan_TaiChinh'],
  actions: ['read'],
  permission: 'allow',
}
const subjectRoots = ['CongTyA/nhanvien']
const objectRoots = ['CongTyA/tailieu']
const BAOCAO = 'CongTyA/tailieu/bophan_TaiChinh/chinhanh_HN/baocao_Q3.pdf'

describe('view helpers', () => {
  it('leaves lists leaf nodes under roots', () => {
    expect(leaves(m, subjectRoots).map((id) => m.nodes[id].label).sort()).toEqual(['An', 'Binh', 'Chi', 'Dung'])
    expect(leaves(m, objectRoots).length).toBe(3)
  })
  it('whoCan answers "who may access this node" (reverse query)', () => {
    const r = whoCan(space, [rule], leaves(m, subjectRoots), 'read', BAOCAO)
    expect(r.allowed.map((id) => m.nodes[id].label).sort()).toEqual(['An', 'Binh'])
    expect(r.denied.length).toBe(2)
  })
  it('accessMatrix compares database-level with tuple-level and counts over-grants', () => {
    const subjects = leaves(m, subjectRoots)
    const objects = leaves(m, objectRoots)
    const r = accessMatrix(space, [rule], subjects, objects, 'read')
    expect(r.cells.length).toBe(subjects.length * objects.length)
    expect(r.cells.every((c) => c.db === true)).toBe(true)
    expect(r.tupleAllowed).toBe(4)
    expect(r.overGranted).toBe(r.cells.length - 4)
  })
})

describe('serializeWithLines', () => {
  it('maps json paths to line numbers and keeps valid JSON', () => {
    const data = { a: { b: [1, 2], c: 'x' } }
    const s = serializeWithLines(data)
    expect(JSON.parse(s.lines.join('\n'))).toEqual(data)
    expect(s.pathLine(['a'])).toBeGreaterThanOrEqual(0)
    expect(s.pathLine(['a', 'c'])).toBeGreaterThan(s.pathLine(['a']))
    expect(s.pathLine(['a', 'b', 1])).toBe(s.pathLine(['a', 'b']))
  })
})
