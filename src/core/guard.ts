// Mục 4.2 của bài: NoSQL cho phép chạy JavaScript phía máy chủ (ví dụ $where), nên đầu vào phải bị chặn.
export interface Finding { pattern: string; reason: string }

const PATTERNS: [RegExp, string][] = [
  [/\$where/i, 'Toán tử $where chạy JavaScript trên máy chủ (nguy cơ injection, mục 4.2).'],
  [/\$function|\$accumulator/i, 'Toán tử $function/$accumulator chạy mã JavaScript tùy ý.'],
  [/\bfunction\s*\(/i, 'Có định nghĩa hàm JavaScript.'],
  [/=>/, 'Có hàm mũi tên JavaScript.'],
  [/\beval\s*\(/i, 'Có lời gọi eval().'],
  [/\b(sleep|setTimeout|process|require)\s*\(/i, 'Có lời gọi hàm hệ thống/JavaScript nguy hiểm.'],
  [/;\s*(return|var|let|const|drop|delete)\b/i, 'Có câu lệnh chèn thêm sau dấu chấm phẩy.'],
  [/<\s*script/i, 'Có thẻ script.'],
]

export function scanInjection(text: string): { safe: boolean; findings: Finding[] } {
  const findings: Finding[] = []
  for (const [re, reason] of PATTERNS) if (re.test(text)) findings.push({ pattern: re.source, reason })
  return { safe: findings.length === 0, findings }
}
