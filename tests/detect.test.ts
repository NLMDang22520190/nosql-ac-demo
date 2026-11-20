import { describe, it, expect } from 'vitest'
import { detectKind } from '../src/core/detect'
import { DOC, KV, WC, GRAPH } from './fixtures'

describe('detectKind', () => {
  it('graph: has nodes and edges, with evidence', () => {
    const r = detectKind(GRAPH)
    expect(r.kind).toBe('graph')
    expect(r.evidence.join(' ')).toMatch(/nodes/)
    expect(r.evidence.join(' ')).toMatch(/edges/)
  })
  it('document: collection holds an array of objects', () => {
    expect(detectKind(DOC).kind).toBe('document')
  })
  it('key-value: scalars sit at depth 3 (db>table>key>value)', () => {
    expect(detectKind(KV).kind).toBe('key-value')
  })
  it('wide-column: scalars sit at depth 4 (db>cf>row>column>value)', () => {
    expect(detectKind(WC).kind).toBe('wide-column')
  })
  it('unknown for non-object input', () => {
    expect(detectKind(42).kind).toBe('unknown')
    expect(detectKind([1, 2]).kind).toBe('unknown')
  })
  it('every verdict explains itself', () => {
    for (const d of [DOC, KV, WC, GRAPH]) expect(detectKind(d).evidence.length).toBeGreaterThan(0)
  })
})
