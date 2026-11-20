import type { DbKind } from './types'

export interface Detection { kind: DbKind | 'unknown'; evidence: string[] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Depth (counted from the database object = level 1) at which the first scalar appears. */
function scalarDepths(v: unknown, level: number, out: number[]): void {
  if (isObj(v)) for (const x of Object.values(v)) scalarDepths(x, level + 1, out)
  else if (!Array.isArray(v)) out.push(level)
}

export function detectKind(data: unknown): Detection {
  if (!isObj(data)) return { kind: 'unknown', evidence: ['Đầu vào không phải một đối tượng JSON.'] }
  // @detect:graph
  if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
    return {
      kind: 'graph',
      evidence: [
        `Có khóa "nodes" (${data.nodes.length} nút) và "edges" (${data.edges.length} cạnh): dữ liệu là các nút nối bằng cạnh có hướng.`,
        'Bài báo mô hình hóa graph bằng đồ thị có hướng, không phải cây (Fig. 6).',
      ],
    }
  }
  const keys = Object.keys(data)
  const dbObj = keys.length === 1 && isObj(data[keys[0]]) ? (data[keys[0]] as Record<string, unknown>) : data
  const evidence: string[] = []
  if (keys.length === 1) evidence.push(`Khóa gốc duy nhất "${keys[0]}" được hiểu là tên Database (tầng 1).`)
  else evidence.push('Có nhiều khóa ở gốc, coi cả đối tượng là một Database.')
  // @detect:document
  const docColl = Object.entries(dbObj).find(([, v]) => Array.isArray(v) && v.some(isObj))
  if (docColl) {
    evidence.push(`"${docColl[0]}" chứa một mảng các đối tượng: đó là collection chứa các document.`)
    evidence.push('Document có field, field có giá trị: Database > Collection > Document > Field > Value (5 tầng).')
    return { kind: 'document', evidence }
  }
  // @detect:depth
  const depths: number[] = []
  for (const t of Object.values(dbObj)) scalarDepths(t, 2, depths)
  if (depths.length === 0) return { kind: 'unknown', evidence: [...evidence, 'Không tìm thấy giá trị nào.'] }
  const maxDepth = Math.max(...depths)
  if (maxDepth <= 3) {
    evidence.push('Giá trị nằm ngay dưới khóa của bảng (không có tầng hàng/cột): Database > Table > Key > Value.')
    return { kind: 'key-value', evidence }
  }
  evidence.push('Giá trị nằm sau 2 tầng khóa lồng nhau (hàng rồi cột): Database > Column family > Row > Column > Value.')
  return { kind: 'wide-column', evidence }
}
