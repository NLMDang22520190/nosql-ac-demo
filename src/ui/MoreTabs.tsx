import { useState } from 'react'
import type { Dataset } from '../core/dataset'
import { scanInjection } from '../core/guard'
import { decide, actionVi } from '../core/rules'
import type { Action, Rule } from '../core/types'
import { accessMatrix, whoCan } from '../core/view'
import { ACTIONS, nodeLabel, parseCtx, shortLabel } from './util'

export interface AuditEntry { t: string; subject: string; action: Action; object: string; outcome: string; rules: string[]; ctx: string }

function ActionSeg({ action, setAction }: { action: Action; setAction: (a: Action) => void }) {
  return (
    <div className="seg" role="group" aria-label="Hành động">
      {ACTIONS.map((a) => <button key={a.id} className={action === a.id ? 'on' : ''} onClick={() => setAction(a.id)}>{a.vi}</button>)}
    </div>
  )
}

/** A9: cùng một CSDL, mỗi người dùng thấy một phần khác nhau. */
export function ViewTab({ ds, rules, user, setUser, action, setAction, ctxText }: { ds: Dataset; rules: Rule[]; user: string; setUser: (s: string) => void; action: Action; setAction: (a: Action) => void; ctxText: string }) {
  const ctx = parseCtx(ctxText)
  const ok = (o: string) => decide(ds.space, rules, user, action, o, ctx).allowed
  const renderNode = (id: string, depth = 0): JSX.Element => {
    const m = ds.tree!
    const n = m.nodes[id]
    if (n.children.length === 0) {
      const allowed = ok(id)
      return <li key={id} className={allowed ? 'leaf ok' : 'leaf masked'}>{allowed ? n.label : <span title="Bị che vì không có quyền">{'•'.repeat(Math.min(12, n.label.length))} <small>bị che</small></span>}</li>
    }
    return (
      <li key={id}>
        <span className="nname">{n.label} <small>{n.levelName}</small></span>
        <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul>
      </li>
    )
  }
  const visible = ds.objects.filter(ok).length
  return (
    <div className="stack wide">
      <section>
        <h3>Xem dữ liệu bằng mắt của một người dùng</h3>
        <p className="hint">Cùng một CSDL, nhưng chỉ phần được phép hiện ra. Phần còn lại bị che.</p>
        <div className="row wrap">
          <label className="field inline"><span>Người dùng</span>
            <select value={user} onChange={(e) => setUser(e.target.value)}>
              <option value="">Chọn người dùng</option>
              {ds.subjects.map((id) => <option key={id} value={id}>{nodeLabel(ds, id)}</option>)}
            </select>
          </label>
          <ActionSeg action={action} setAction={setAction} />
        </div>
      </section>
      {user && (
        <section>
          <p className="big-line"><b>{shortLabel(ds, user)}</b> {actionVi(action)} được <b>{visible}</b> / {ds.objects.length} đối tượng.</p>
          {ds.tree ? (
            <ul className="outline">{ds.objectRoots.map((r) => renderNode(r))}</ul>
          ) : (
            <ul className="outline">
              {ds.objects.map((o) => <li key={o} className={ok(o) ? 'leaf ok' : 'leaf masked'}>{ok(o) ? o : <>{'•'.repeat(10)} <small>bị che</small></>}</li>)}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

/** B1 + B2. */
export function CompareTab({ ds, rules, action, setAction, ctxText }: { ds: Dataset; rules: Rule[]; action: Action; setAction: (a: Action) => void; ctxText: string }) {
  const ctx = parseCtx(ctxText)
  const [obj, setObj] = useState('')
  const matrix = accessMatrix(ds.space, rules, ds.subjects, ds.objects, action, ctx)
  const cell = (s: string, o: string) => matrix.cells.find((c) => c.subject === s && c.object === o)!
  const who = obj ? whoCan(ds.space, rules, ds.subjects, action, obj, ctx) : null
  return (
    <div className="stack wide">
      <section>
        <h3>Phân quyền mức database và phân quyền theo tuple</h3>
        <p className="hint">Thực trạng (mục 3.3, 4.1): NoSQL thường chỉ phân quyền cả database, ai có vai trò thì thấy mọi thứ. Bên phải là kết quả khi dùng luật tuple trên cùng dữ liệu.</p>
        <ActionSeg action={action} setAction={setAction} />
        <p className="big-line">Mức database cho phép <b>{matrix.cells.length}</b> / {matrix.cells.length} cặp. Luật tuple chỉ cho <b>{matrix.tupleAllowed}</b>. Mức database cấp thừa <b className="no-text">{matrix.overGranted}</b> cặp.</p>
        <div className="two">
          {[false, true].map((tuple) => (
            <div key={String(tuple)}>
              <h4>{tuple ? 'Theo tuple' : 'Mức database'}</h4>
              <div className="table-scroll">
                <table className="matrix">
                  <thead><tr><th />{ds.objects.map((o) => <th key={o}><span title={nodeLabel(ds, o)}>{shortLabel(ds, o)}</span></th>)}</tr></thead>
                  <tbody>
                    {ds.subjects.map((s) => (
                      <tr key={s}>
                        <th scope="row">{shortLabel(ds, s)}</th>
                        {ds.objects.map((o) => {
                          const c = cell(s, o)
                          const v = tuple ? c.tuple : c.db
                          return <td key={o} className={v ? 'ok' : 'no'}>{v ? 'được' : 'không'}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3>Ai được truy cập nút này?</h3>
        <p className="hint">Trong NoSQL gốc rất khó trả lời câu này (mục 3.2). Khi có luật dạng nút, hệ thống chỉ cần thử từng chủ thể.</p>
        <label className="field inline"><span>Đối tượng</span>
          <select value={obj} onChange={(e) => setObj(e.target.value)}>
            <option value="">Chọn đối tượng</option>
            {ds.objects.map((o) => <option key={o} value={o}>{nodeLabel(ds, o)}</option>)}
          </select>
        </label>
        {who && (
          <div className="two">
            <div><h4>Được {actionVi(action)} ({who.allowed.length})</h4><div className="chips">{who.allowed.map((s) => <span key={s} className="chip ok">{shortLabel(ds, s)}</span>)}{!who.allowed.length && <span className="hint">Không ai.</span>}</div></div>
            <div><h4>Bị từ chối ({who.denied.length})</h4><div className="chips">{who.denied.map((s) => <span key={s} className="chip no">{shortLabel(ds, s)}</span>)}{!who.denied.length && <span className="hint">Không ai.</span>}</div></div>
          </div>
        )}
      </section>
    </div>
  )
}

const EXAMPLES = [
  { label: 'Chuỗi $where', text: '{"$where": "sleep(5000)"}' },
  { label: 'Hàm JavaScript', text: 'function(){ return true }' },
  { label: 'Chèn câu lệnh', text: "x'; return true; var y='" },
  { label: 'Điều kiện hợp lệ', text: 'gio >= 8 and gio <= 17' },
]

/** B3 + B4. */
export function SafetyTab({ audit, clear }: { audit: AuditEntry[]; clear: () => void }) {
  const [text, setText] = useState(EXAMPLES[0].text)
  const r = scanInjection(text)
  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'nhat-ky-kiem-tra-quyen.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="stack wide">
      <section>
        <h3>Chặn chuỗi nguy hiểm khi nhập luật hay bộ lọc</h3>
        <p className="hint">Mục 4.2 của bài: nhiều NoSQL cho chạy JavaScript phía máy chủ (ví dụ <code>$where</code>), nên mọi chuỗi từ người dùng phải được quét trước khi dùng.</p>
        <div className="chips">{EXAMPLES.map((e) => <button key={e.label} className="chip" onClick={() => setText(e.text)}>{e.label}</button>)}</div>
        <textarea className="json short" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="Chuỗi cần quét" />
        {r.safe ? <p className="verdict-line ok">Chuỗi an toàn, được chấp nhận.</p> : (
          <div className="verdict-line no">
            <p>Đã chặn chuỗi này vì:</p>
            <ul>{r.findings.map((f, i) => <li key={i}>{f.reason}</li>)}</ul>
          </div>
        )}
      </section>
      <section>
        <div className="row between">
          <h3>Nhật ký kiểm tra quyền ({audit.length})</h3>
          <div className="row"><button className="btn small" onClick={exportJson} disabled={!audit.length}>Tải JSON</button><button className="btn small" onClick={clear} disabled={!audit.length}>Xóa nhật ký</button></div>
        </div>
        <p className="hint">Mục 4.6: hệ thống ghi lại mọi lượt kiểm tra ở tab "Kiểm tra quyền", để truy vết ai đã làm gì và vì sao được hay bị từ chối.</p>
        {audit.length === 0 ? <p className="hint">Chưa có lượt nào. Vào "Kiểm tra quyền" và chạy vài lượt.</p> : (
          <div className="table-scroll">
            <table className="plain dense">
              <thead><tr><th>Giờ</th><th>Chủ thể</th><th>Hành động</th><th>Đối tượng</th><th>Kết quả</th><th>Luật</th></tr></thead>
              <tbody>
                {[...audit].reverse().map((a, i) => (
                  <tr key={i}>
                    <td>{a.t}</td><td>{a.subject}</td><td>{actionVi(a.action)}</td><td>{a.object}</td>
                    <td className={a.outcome === 'allow' ? 'ok-text' : 'no-text'}>{a.outcome === 'allow' ? 'Được' : a.outcome === 'deny' ? 'Cấm' : 'Mặc định từ chối'}</td>
                    <td>{a.rules.join(', ') || '-'}{a.ctx ? ` (${a.ctx})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
