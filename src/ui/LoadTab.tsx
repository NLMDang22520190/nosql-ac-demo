import type { Detection } from '../core/detect'
import type { Dataset, Sample } from '../core/dataset'
import type { DbKind } from '../core/types'
import detectSrc from '../core/detect.ts?raw'
import { CodePanel } from './CodePanel'
import { shortLabel } from './util'

export const KIND_VI: Record<string, string> = {
  'key-value': 'Key-value', 'wide-column': 'Wide-column', document: 'Document', graph: 'Graph', unknown: 'Chưa rõ',
}

interface Props {
  samples: Sample[]
  sampleId?: string
  text: string
  setText: (t: string) => void
  onSample: (s: Sample) => void
  onApply: () => void
  detection: Detection
  forceKind: DbKind | ''
  setForceKind: (k: DbKind | '') => void
  err: string
  ds: Dataset
  setRoots: (s: string[], o: string[]) => void
}

export function LoadTab({ samples, sampleId, onSample, detection, forceKind, setForceKind, err, ds, setRoots }: Props) {
  const level2 = ds.tree ? ds.tree.nodes[ds.tree.rootId].children : []
  const roleOf = (id: string) => (ds.subjectRoots.includes(id) ? 's' : ds.objectRoots.includes(id) ? 'o' : 'n')
  const change = (id: string, role: string) => {
    const s = ds.subjectRoots.filter((x) => x !== id)
    const o = ds.objectRoots.filter((x) => x !== id)
    if (role === 's') s.push(id)
    if (role === 'o') o.push(id)
    setRoots(s, o)
  }
  const marker = detection.kind === 'graph' ? 'detect:graph' : detection.kind === 'document' ? 'detect:document' : 'detect:depth'
  return (
    <div className="stack">
      <section>
        <h3>Chọn một mẫu</h3>
        <p className="hint">Bốn mẫu cùng kể một câu chuyện (công ty A, phòng Kế toán, bộ phận Tài chính) trên bốn kiểu NoSQL.</p>
        <div className="sample-grid">
          {samples.map((s) => (
            <button key={s.id} className={'sample' + (sampleId === s.id ? ' active' : '')} onClick={() => onSample(s)}>
              <b>{s.title}</b>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>Hệ thống nhận ra: <span className="kind">{KIND_VI[forceKind || detection.kind]}</span></h3>
        <ul className="evidence">
          {detection.evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
        <label className="field inline">
          <span>Chọn lại loại bằng tay</span>
          <select value={forceKind} onChange={(e) => setForceKind(e.target.value as DbKind | '')}>
            <option value="">Theo nhận diện</option>
            <option value="key-value">Key-value</option>
            <option value="wide-column">Wide-column</option>
            <option value="document">Document</option>
            <option value="graph">Graph</option>
          </select>
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <CodePanel source={detectSrc} marker={marker} title="detect.ts: đoạn mã đưa ra kết luận" height={190} />
      </section>
      <section>
        <h3>Chủ thể và đối tượng nằm ở đâu trong CSDL</h3>
        <p className="hint">Bài báo giả định người dùng và tệp đều lưu trong chính CSDL NoSQL. Chọn vùng nào chứa người dùng, vùng nào chứa tệp.</p>
        {ds.tree ? (
          <table className="plain">
            <tbody>
              {level2.map((id) => (
                <tr key={id}>
                  <td>{shortLabel(ds, id)} <small>({ds.tree!.nodes[id].levelName})</small></td>
                  <td>
                    <select value={roleOf(id)} onChange={(e) => change(id, e.target.value)} aria-label={`Vai trò của ${shortLabel(ds, id)}`}>
                      <option value="s">Chứa chủ thể (người dùng)</option>
                      <option value="o">Chứa đối tượng (tệp)</option>
                      <option value="n">Không dùng</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="hint">Với graph, nút có <code>type</code> là <code>user</code> là chủ thể, <code>file</code> là đối tượng. Hiện có {ds.subjects.length} chủ thể và {ds.objects.length} đối tượng.</p>
        )}
      </section>
    </div>
  )
}
