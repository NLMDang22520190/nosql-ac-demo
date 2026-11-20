import { useEffect, useMemo, useState } from 'react'
import type { Dataset } from '../core/dataset'
import { serializeWithLines } from '../core/jsonlines'
import buildSrc from '../core/build.ts?raw'
import { CodePanel } from './CodePanel'
import { DEPTH } from './TreeView'
import { nodeLabel } from './util'

export function TreeTab({ ds, focusId }: { ds: Dataset; focusId?: string }) {
  if (ds.graph) {
    const g = ds.graph
    return (
      <div className="stack">
        <section>
          <h3>Đồ thị có hướng</h3>
          <p>{g.nodes.length} nút, {g.edges.length} cạnh. Graph không chia tầng được, nên bài báo (mục 3.2.3, Fig. 6) dùng đồ thị có hướng: thuộc tính của một nút là những nút đi tới được từ nó qua cạnh.</p>
          <ul className="legend">
            <li><i className="sw dash ok" /> cạnh <code>can read</code>: cạnh chính là luật cho phép</li>
            <li><i className="sw dash no" /> cạnh <code>cannot read</code>: cạnh chính là luật cấm</li>
            <li><i className="sw line" /> cạnh thường (in, works for, belongs to, managed by) tạo nên thuộc tính</li>
          </ul>
        </section>
        {focusId && <section><h3>Nút đang chọn</h3><NodeFacts ds={ds} id={focusId} /></section>}
      </div>
    )
  }
  const m = ds.tree!
  const counts: number[] = []
  for (const id of m.order) counts[m.nodes[id].level - 1] = (counts[m.nodes[id].level - 1] ?? 0) + 1
  return (
    <div className="stack">
      <section>
        <h3>Cây {m.maxLevel} tầng</h3>
        <p>Dữ liệu được chia theo mô hình cây của bài báo (mục 3.1, Fig. 5). Mỗi tầng có một vai trò cố định.</p>
        <table className="plain">
          <tbody>
            {counts.map((c, i) => (
              <tr key={i}>
                <td><i className="sw box" style={{ background: DEPTH[i] }} /> Tầng {i + 1}</td>
                <td>{m.nodes[m.order.find((id) => m.nodes[id].level === i + 1)!].levelName}</td>
                <td className="num">{c} nút</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">Chấm xanh bên phải nút: nút thuộc vùng chủ thể. Chấm cam: vùng đối tượng.</p>
      </section>
      {m.warnings.length > 0 && (
        <section>
          <h3>Cảnh báo độ sâu</h3>
          <ul className="evidence warn">{m.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </section>
      )}
      <section>
        <h3>Nút đang chọn</h3>
        {focusId ? <NodeFacts ds={ds} id={focusId} /> : <p className="hint">Bấm một nút trên cây để xem tầng, đường dẫn JSON và các nút tổ tiên (nơi quyền được kế thừa xuống).</p>}
      </section>
    </div>
  )
}

function NodeFacts({ ds, id }: { ds: Dataset; id: string }) {
  if (ds.graph) {
    const g = ds.graph
    const out = g.edges.filter((e) => e.from === id)
    const inn = g.edges.filter((e) => e.to === id)
    return (
      <div>
        <p><b>{id}</b> · {g.nodes.find((n) => n.id === id)?.type ?? 'không rõ loại'}</p>
        <p className="hint">Cạnh đi ra: {out.map((e) => `${e.label} → ${e.to}`).join('; ') || 'không có'}</p>
        <p className="hint">Cạnh đi vào: {inn.map((e) => `${e.from} → ${e.label}`).join('; ') || 'không có'}</p>
      </div>
    )
  }
  const n = ds.tree!.nodes[id]
  if (!n) return null
  const chain: string[] = []
  for (let cur: string | null = id; cur; cur = ds.tree!.nodes[cur].parentId) chain.push(ds.tree!.nodes[cur].label)
  return (
    <div>
      <p><b>{n.label}</b> · tầng {n.level} ({n.levelName})</p>
      <p className="hint">Đường dẫn JSON: <code>{n.jsonPath.length ? n.jsonPath.join('.') : '(gốc)'}</code></p>
      <p className="hint">Quyền kế thừa từ: {chain.slice(1).join(' ← ') || 'không có (nút gốc)'}</p>
      <p className="hint">Có {n.children.length} nút con{n.children.length ? ', các nút con này sẽ thừa hưởng quyền gán ở nút này.' : '.'}</p>
    </div>
  )
}

export function ExplainTab({ ds, step, setStep }: { ds: Dataset; step: number; setStep: (n: number) => void }) {
  const steps = ds.tree ? ds.tree.steps : ds.graph!.steps
  const total = steps.length
  const [play, setPlay] = useState(false)
  useEffect(() => {
    if (!play) return
    const t = setInterval(() => setStep(Math.min(total - 1, step + 1)), 650)
    if (step >= total - 1) setPlay(false)
    return () => clearInterval(t)
  }, [play, step, total, setStep])
  const cur = steps[Math.min(step, total - 1)]
  const json = useMemo(() => serializeWithLines(ds.data), [ds.data])
  const line = json.pathLine(cur.jsonPath)
  const pathStr = cur.jsonPath.join('.') || '(gốc)'
  return (
    <div className="stack">
      <section>
        <h3>Từng nút được tạo ra như thế nào</h3>
        <p className="hint">Mỗi bước đọc một đoạn JSON, tạo một nút và gắn tầng cho nó. Mã bên dưới là mã thật của <code>build.ts</code>.</p>
        <div className="row">
          <button className="btn" onClick={() => { setPlay(false); setStep(Math.max(0, step - 1)) }} disabled={step === 0}>Bước trước</button>
          <button className="btn primary" onClick={() => { setPlay(false); setStep(Math.min(total - 1, step + 1)) }} disabled={step >= total - 1}>Bước tiếp</button>
          <button className="btn" onClick={() => { if (step >= total - 1) setStep(0); setPlay(!play) }}>{play ? 'Dừng' : 'Chạy tự động'}</button>
          <span className="count">Bước {step + 1} / {total}</span>
        </div>
        <input type="range" min={0} max={total - 1} value={step} onChange={(e) => { setPlay(false); setStep(Number(e.target.value)) }} aria-label="Bước" className="range" />
        <p className="step-text">{cur.text}</p>
      </section>
      <section>
        <h3>JSON đầu vào <small>đoạn đang đọc: {pathStr}</small></h3>
        <div className="code-body json-view" style={{ maxHeight: 230 }} ref={(el) => { if (el && line >= 0) el.scrollTop = Math.max(0, line * 18 - 90) }}>
          {json.lines.map((l, i) => (
            <div key={i} className={'cl' + (i === line ? ' on' : '')}><span className="ln">{i + 1}</span><span className="tx">{l}</span></div>
          ))}
        </div>
      </section>
      <section>
        <h3>Dòng mã đang chạy</h3>
        <CodePanel source={buildSrc} marker={`step:${cur.marker}`} title="build.ts" height={250} />
      </section>
      <section>
        <h3>Bảng ánh xạ JSON sang tầng</h3>
        <div className="table-scroll">
          <table className="plain dense">
            <thead><tr><th>Đường dẫn JSON</th><th>Tầng</th><th>Nút</th></tr></thead>
            <tbody>
              {(ds.tree ? ds.tree.order.map((id) => ds.tree!.nodes[id]) : []).map((n) => (
                <tr key={n.id} className={n.id === cur.nodeId ? 'hl' : ''} onClick={() => setStep(steps.findIndex((s) => s.nodeId === n.id))}>
                  <td><code>{n.jsonPath.join('.') || '(gốc)'}</code></td>
                  <td>{n.level} · {n.levelName}</td>
                  <td>{nodeLabel(ds, n.id).split(' › ').pop()}</td>
                </tr>
              ))}
              {ds.graph && steps.map((s, i) => (
                <tr key={i} className={i === step ? 'hl' : ''} onClick={() => setStep(i)}>
                  <td><code>{s.jsonPath.join('.')}</code></td><td>{s.marker === 'graph-node' ? 'Nút' : 'Cạnh có hướng'}</td><td>{s.nodeId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
