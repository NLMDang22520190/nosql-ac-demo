import { describe, it, expect } from 'vitest'
import { SAMPLES } from '../src/core/samples'
import { detectKind } from '../src/core/detect'
import { makeDataset } from '../src/core/dataset'
import { decide } from '../src/core/rules'

describe('bundled samples', () => {
  it('has the four NoSQL kinds', () => {
    expect(SAMPLES.map((s) => s.kind).sort()).toEqual(['document', 'graph', 'key-value', 'wide-column'])
  })
  for (const s of SAMPLES) {
    describe(s.id, () => {
      const ds = makeDataset(s.data, s.kind, s.subjectRoots, s.objectRoots)
      it('is detected as its own kind', () => {
        expect(detectKind(s.data).kind).toBe(s.kind)
      })
      it('every rule node exists in the model', () => {
        const known = (id: string) => (ds.tree ? !!ds.tree.nodes[id] : ds.graph!.nodes.some((n) => n.id === id))
        for (const r of s.rules) for (const id of [...r.subjectAttrs, ...r.objectAttrs, ...(r.subjectLeaf ? [r.subjectLeaf] : []), ...(r.objectLeaf ? [r.objectLeaf] : [])]) {
          expect(known(id), `${s.id}/${r.id}: ${id}`).toBe(true)
        }
      })
      it('has subjects and objects', () => {
        expect(ds.subjects.length).toBeGreaterThan(0)
        expect(ds.objects.length).toBeGreaterThan(0)
      })
      it('every scenario gives the documented decision', () => {
        for (const sc of s.scenarios) {
          const d = decide(ds.space, [...ds.edgeRules, ...s.rules], sc.subject, sc.action, sc.object, sc.ctx)
          expect(d.allowed ? 'allow' : 'deny', sc.title).toBe(sc.expect)
        }
      })
    })
  }
})
