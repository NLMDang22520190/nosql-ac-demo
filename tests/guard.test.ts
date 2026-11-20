import { describe, it, expect } from 'vitest'
import { scanInjection } from '../src/core/guard'
import { parseCondition, evalCondition } from '../src/core/condition'

describe('scanInjection', () => {
  it('blocks $where javascript (paper 4.2)', () => {
    const r = scanInjection('{"$where": "sleep(5000)"}')
    expect(r.safe).toBe(false)
    expect(r.findings[0].reason).toMatch(/\$where/)
  })
  it('blocks other server-side js and operators', () => {
    const bad = ['function(){return true}', "'; return true; var x='", '$function', 'eval(x)', '() => 1', '$accumulator']
    for (const s of bad) expect(scanInjection(s).safe, s).toBe(false)
  })
  it('lets ordinary text and simple conditions through', () => {
    for (const s of ['nhom_thue', 'gio <= 17', 'Kế toán và Tài chính']) expect(scanInjection(s).safe, s).toBe(true)
  })
})

describe('conditions', () => {
  it('parses and evaluates comparisons joined by and', () => {
    expect(evalCondition('gio >= 8 and gio < 17', { gio: 8 }).value).toBe(true)
    expect(evalCondition('gio >= 8 and gio < 17', { gio: 17 }).value).toBe(false)
    expect(evalCondition('mucdo != 3', { mucdo: 2 }).value).toBe(true)
    expect(evalCondition('class <= 10', { class: 10 }).value).toBe(true)
  })
  it('missing variable is false with an explanation', () => {
    const r = evalCondition('gio >= 8', {})
    expect(r.value).toBe(false)
    expect(r.error).toMatch(/gio/)
  })
  it('rejects anything outside the tiny grammar (no eval)', () => {
    expect(parseCondition('gio >= 8 or x').ok).toBe(false)
    expect(parseCondition('process.exit()').ok).toBe(false)
    expect(parseCondition('gio >= 8; drop').ok).toBe(false)
    expect(parseCondition('').ok).toBe(false)
  })
})
