import type { Dataset, Sample } from '../core/dataset'
import type { Action, Decision } from '../core/types'
import rulesSrc from '../core/rules.ts?raw'
import { CodePanel } from './CodePanel'
import { ACTIONS, nodeLabel } from './util'

interface Props {
  ds: Dataset
  subject: string
  object: string
  setSubject: (s: string) => void
  setObject: (s: string) => void
  action: Action
  setAction: (a: Action) => void
  ctxText: string
  setCtxText: (s: string) => void
  result: Decision | null
  run: () => void
  scenarios: Sample['scenarios']
  runScenario: (i: number) => void
}

export function CheckTab({ ds, subject, object, setSubject, setObject, action, setAction, ctxText, setCtxText, result, run, scenarios, runScenario }: Props) {
  const lab = (id: string) => nodeLabel(ds, id)
  const marker = !result ? undefined : result.outcome === 'deny' ? 'rule:deny-wins' : result.outcome === 'default-deny' ? 'rule:default-deny' : 'rule:match'
  const word = result ? (result.allowed ? 'Được phép' : 'Bị từ chối') : ''
  return (
    <div className="stack">
      <section>
        <h3>Ai muốn làm gì với cái gì</h3>
        <p className="hint">Chọn bằng danh sách hoặc bấm thẳng một nút trên hình (nút trong vùng chủ thể thành chủ thể, nút trong vùng đối tượng thành đối tượng).</p>
        <label className="field">
          <span>Chủ thể</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Chọn chủ thể</option>
            {ds.subjects.map((id) => <option key={id} value={id}>{lab(id)}</option>)}
          </select>
        </label>
        <div className="field">
          <span>Hành động</span>
          <div className="seg" role="group" aria-label="Hành động">
            {ACTIONS.map((a) => <button key={a.id} className={action === a.id ? 'on' : ''} onClick={() => setAction(a.id)}>{a.vi}</button>)}
          </div>
        </div>
        <label className="field">
          <span>Đối tượng</span>
          <select value={object} onChange={(e) => setObject(e.target.value)}>
            <option value="">Chọn đối tượng</option>
            {ds.objects.map((id) => <option key={id} value={id}>{lab(id)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Ngữ cảnh yêu cầu (cho luật có điều kiện)</span>
          <input type="text" value={ctxText} onChange={(e) => setCtxText(e.target.value)} placeholder="gio=9" />
        </label>
        <button className="btn primary" disabled={!subject || !object} onClick={run}>Kiểm tra quyền</button>
      </section>
      {result && (
        <section className={'verdict ' + (result.allowed ? 'ok' : 'no')} aria-live="polite">
          <p className="big">{word}</p>
          <p className="why">
            {result.outcome === 'allow' && 'Có luật cho phép khớp và không có luật cấm.'}
            {result.outcome === 'deny' && 'Có luật cấm khớp. Cấm luôn thắng cho phép.'}
            {result.outcome === 'default-deny' && 'Không luật nào khớp nên bị từ chối mặc định.'}
          </p>
          <ol className="trace">{result.trace.map((t, i) => <li key={i}>{t}</li>)}</ol>
          <p className="hint">Hình bên trái đã tô đường đi: viền xanh dương là chuỗi thuộc tính của chủ thể, viền cam là của đối tượng, nền lục/đỏ là nút của luật khớp.</p>
        </section>
      )}
      {marker && <section><h3>Đoạn mã quyết định</h3><CodePanel source={rulesSrc} marker={marker} title="rules.ts: decide()" height={230} /></section>}
      {scenarios.length > 0 && (
        <section>
          <h3>Kịch bản gợi ý</h3>
          <ul className="scenarios">
            {scenarios.map((s, i) => (
              <li key={i}>
                <button onClick={() => runScenario(i)}>
                  <span>{s.title}</span>
                  <span className={'expect ' + s.expect}>{s.expect === 'allow' ? 'dự kiến: được' : 'dự kiến: bị từ chối'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
