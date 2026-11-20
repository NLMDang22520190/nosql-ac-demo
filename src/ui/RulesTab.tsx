import { parseCondition } from '../core/condition'
import type { Dataset } from '../core/dataset'
import { scanInjection } from '../core/guard'
import { actionVi, describeRule } from '../core/rules'
import type { Action, Rule } from '../core/types'
import { ACTIONS, nodeLabel } from './util'

export interface Draft {
  subjectAttrs: string[]
  subjectLeaf?: string
  objectAttrs: string[]
  objectLeaf?: string
  actions: Action[]
  permission: 'allow' | 'deny'
  condition: string
  note: string
}
export const emptyDraft = (): Draft => ({ subjectAttrs: [], objectAttrs: [], actions: ['read'], permission: 'allow', condition: '', note: '' })

interface Props {
  ds: Dataset
  rules: Rule[]
  setRules: (r: Rule[]) => void
  draft: Draft
  setDraft: (d: Draft) => void
  side: 'subject' | 'object'
  setSide: (s: 'subject' | 'object') => void
  focusRule?: string
  setFocusRule: (id?: string) => void
  resetRules: () => void
}

export function RulesTab({ ds, rules, setRules, draft, setDraft, side, setSide, focusRule, setFocusRule, resetRules }: Props) {
  const lab = (id: string) => nodeLabel(ds, id)
  const cond = draft.condition.trim()
  const condErr = cond ? (() => {
    const g = scanInjection(cond)
    if (!g.safe) return g.findings[0].reason
    const p = parseCondition(cond)
    return p.ok ? '' : p.error
  })() : ''
  const preview: Rule = { id: 'mới', ...draft, condition: cond || undefined }
  const empty = !draft.subjectAttrs.length && !draft.subjectLeaf && !draft.objectAttrs.length && !draft.objectLeaf
  const create = () => {
    const n = rules.length ? Math.max(...rules.map((r) => Number(/(\d+)$/.exec(r.id)?.[1] ?? 0))) + 1 : 1
    const prefix = ds.graph ? 'G' : 'R'
    setRules([...rules, { ...draft, id: `${prefix}${n}`, condition: cond || undefined, note: draft.note.trim() || undefined }])
    setDraft(emptyDraft())
  }
  const chips = (ids: string[], leaf: string | undefined, kind: 'subject' | 'object') => (
    <div className="chips">
      {ids.map((id) => (
        <button key={id} className={'chip ' + kind} onClick={() => setDraft({ ...draft, [kind + 'Attrs']: ids.filter((x) => x !== id) })} title="Bấm để bỏ">{lab(id)} ×</button>
      ))}
      {leaf && <button className={'chip leaf ' + kind} onClick={() => setDraft({ ...draft, [kind + 'Leaf']: undefined })} title="Nút lá, bấm để bỏ">{lab(leaf)} (nút lá) ×</button>}
      {!ids.length && !leaf && <span className="hint">Chưa chọn nút nào = áp dụng cho mọi {kind === 'subject' ? 'chủ thể' : 'đối tượng'}.</span>}
    </div>
  )
  return (
    <div className="stack">
      <section>
        <h3>Chọn nút trên hình để dựng luật</h3>
        <p className="hint">Chọn nút nào cũng được, chỉ cần một nút mỗi bên. Quyền gán ở nút cha tự kế thừa xuống mọi nút con (mục 3.2.2).</p>
        <div className="seg" role="group" aria-label="Phía đang chọn">
          <button className={side === 'subject' ? 'on subject' : ''} onClick={() => setSide('subject')}>Đang chọn chủ thể</button>
          <button className={side === 'object' ? 'on object' : ''} onClick={() => setSide('object')}>Đang chọn đối tượng</button>
        </div>
        <div className="slot">
          <h4>Thuộc tính chủ thể</h4>
          {chips(draft.subjectAttrs, draft.subjectLeaf, 'subject')}
        </div>
        <div className="slot">
          <h4>Thuộc tính đối tượng</h4>
          {chips(draft.objectAttrs, draft.objectLeaf, 'object')}
        </div>
      </section>
      <section>
        <div className="row wrap">
          <fieldset className="field">
            <legend>Hành động</legend>
            {ACTIONS.map((a) => (
              <label key={a.id} className="check">
                <input type="checkbox" checked={draft.actions.includes(a.id)} onChange={(e) => setDraft({ ...draft, actions: e.target.checked ? [...draft.actions, a.id] : draft.actions.filter((x) => x !== a.id) })} />
                {a.vi}
              </label>
            ))}
          </fieldset>
          <fieldset className="field">
            <legend>Quyền</legend>
            <label className="check"><input type="radio" name="perm" checked={draft.permission === 'allow'} onChange={() => setDraft({ ...draft, permission: 'allow' })} /> Cho phép</label>
            <label className="check"><input type="radio" name="perm" checked={draft.permission === 'deny'} onChange={() => setDraft({ ...draft, permission: 'deny' })} /> Cấm</label>
          </fieldset>
        </div>
        <label className="field">
          <span>Điều kiện (không bắt buộc)</span>
          <input type="text" value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })} placeholder="ví dụ: gio >= 8 and gio <= 17" />
          {condErr && <small className="err">{condErr}</small>}
          <small className="hint">Chỉ hỗ trợ so sánh số nối bằng and. Điều kiện môi trường chỉ được bài nhắc tới ở mục 4.7, cú pháp này là của nhóm.</small>
        </label>
        <p className="sentence">{empty ? 'Chọn ít nhất một nút để thấy câu luật.' : describeRule(ds.tree ?? ((id) => id), preview)}</p>
        <button className="btn primary" disabled={empty || !draft.actions.length || !!condErr} onClick={create}>Tạo luật</button>
      </section>
      <section>
        <div className="row between">
          <h3>Luật hiện có ({rules.length})</h3>
          <button className="btn small" onClick={resetRules}>Khôi phục luật mẫu</button>
        </div>
        {ds.graph && <p className="hint">Các cạnh <code>can read</code> / <code>cannot read</code> trong đồ thị cũng là luật, hệ thống tự thêm vào khi kiểm tra.</p>}
        <ul className="rule-list">
          {[...ds.edgeRules, ...rules].map((r) => {
            const isEdge = r.id.startsWith('edge:')
            return (
              <li key={r.id} className={(focusRule === r.id ? 'focus ' : '') + r.permission}>
                <button className="rule-main" onClick={() => setFocusRule(focusRule === r.id ? undefined : r.id)}>
                  <span className="rid">{isEdge ? 'cạnh' : r.id}</span>
                  <span className="rtext">{describeRule(ds.tree ?? ((id) => id), r)}</span>
                  {(r.note || r.condition) && <small>{r.note}{r.condition ? ` Điều kiện: ${r.condition}.` : ''}</small>}
                  <small className="mono">{r.actions.map(actionVi).join(', ')}</small>
                </button>
                {!isEdge && <button className="x" aria-label={`Xóa luật ${r.id}`} onClick={() => setRules(rules.filter((x) => x.id !== r.id))}>Xóa</button>}
              </li>
            )
          })}
        </ul>
        <p className="hint">Bấm một luật để chỉ tô riêng luật đó trên hình. Viền xanh dương: nút chủ thể. Viền cam: nút đối tượng. Nền lục: cho phép. Nền đỏ: cấm. Nút con kế thừa được tô nhạt hơn.</p>
      </section>
    </div>
  )
}
