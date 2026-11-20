// Điều kiện môi trường rất nhỏ (mục 4.7 của bài chỉ nêu ý tưởng, cú pháp là của nhóm):
//   biến toán_tử số [and biến toán_tử số ...]   ví dụ: gio >= 8 and gio < 17
// Không dùng eval.
export type Ctx = Record<string, number>
const TERM = /^([A-Za-z_]\w*)\s*(==|!=|<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/

export interface Term { name: string; op: string; value: number }
export function parseCondition(expr: string): { ok: true; terms: Term[] } | { ok: false; error: string } {
  const text = expr.trim()
  if (!text) return { ok: false, error: 'Điều kiện rỗng.' }
  const terms: Term[] = []
  for (const part of text.split(/\s+and\s+/i)) {
    const m = TERM.exec(part.trim())
    if (!m) return { ok: false, error: `Không hiểu "${part.trim()}". Chỉ hỗ trợ: biến so sánh số, nối bằng "and".` }
    terms.push({ name: m[1], op: m[2], value: Number(m[3]) })
  }
  return { ok: true, terms }
}

function cmp(a: number, op: string, b: number): boolean {
  switch (op) {
    case '==': return a === b
    case '!=': return a !== b
    case '<=': return a <= b
    case '>=': return a >= b
    case '<': return a < b
    default: return a > b
  }
}

export function evalCondition(expr: string, ctx: Ctx): { value: boolean; error?: string } {
  const p = parseCondition(expr)
  if (!p.ok) return { value: false, error: p.error }
  for (const t of p.terms) {
    const v = ctx[t.name]
    if (v === undefined) return { value: false, error: `Thiếu biến "${t.name}" trong ngữ cảnh yêu cầu.` }
    if (!cmp(v, t.op, t.value)) return { value: false }
  }
  return { value: true }
}
