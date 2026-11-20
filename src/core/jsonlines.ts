import type { JsonPath } from './types'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isScalar = (v: unknown) => !isObj(v) && !Array.isArray(v)

/** In JSON đẹp và nhớ dòng của mỗi đường dẫn, để tô sáng đoạn JSON sinh ra một nút. */
export function serializeWithLines(data: unknown) {
  const lines: string[] = []
  const map = new Map<string, number>()
  const reg = (p: JsonPath, line: number) => { if (!map.has(JSON.stringify(p))) map.set(JSON.stringify(p), line) }
  const regAll = (v: unknown, p: JsonPath, line: number) => {
    reg(p, line)
    if (isObj(v)) for (const [k, x] of Object.entries(v)) regAll(x, [...p, k], line)
    else if (Array.isArray(v)) v.forEach((x, i) => regAll(x, [...p, i], line))
  }
  const compact = (v: unknown) => (Array.isArray(v) ? v.every(isScalar) : isObj(v) ? Object.values(v).every(isScalar) : true)
  function emit(v: unknown, p: JsonPath, indent: string, prefix: string, comma: string) {
    if (compact(v)) {
      regAll(v, p, lines.length)
      lines.push(`${indent}${prefix}${JSON.stringify(v)}${comma}`)
      return
    }
    const open = Array.isArray(v) ? '[' : '{'
    const close = Array.isArray(v) ? ']' : '}'
    reg(p, lines.length)
    lines.push(`${indent}${prefix}${open}`)
    const entries: [string | number, unknown][] = Array.isArray(v) ? v.map((x, i) => [i, x]) : Object.entries(v as object)
    entries.forEach(([k, x], i) => {
      emit(x, [...p, k], indent + '  ', Array.isArray(v) ? '' : `${JSON.stringify(k)}: `, i < entries.length - 1 ? ',' : '')
    })
    lines.push(`${indent}${close}${comma}`)
  }
  emit(data, [], '', '', '')
  return { lines, pathLine: (p: JsonPath) => map.get(JSON.stringify(p)) ?? -1 }
}
