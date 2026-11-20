import { useMemo, useState } from 'react'
import { detectKind, type Detection } from './core/detect'
import { makeDataset, type Dataset, type Sample } from './core/dataset'
import { decide } from './core/rules'
import { SAMPLES } from './core/samples'
import type { Action, DbKind, Decision, Rule } from './core/types'
import { CheckTab } from './ui/CheckTab'
import { ExplainTab, TreeTab } from './ui/ExplainTab'
import { GraphView } from './ui/GraphView'
import { Legend } from './ui/Legend'
import { KIND_VI, LoadTab } from './ui/LoadTab'
import { decisionMarksGraph, decisionMarksTree, ruleMarksGraph, ruleMarksTree, type GMarks, type Marks } from './ui/marks'
import { CompareTab, SafetyTab, ViewTab, type AuditEntry } from './ui/MoreTabs'
import { emptyDraft, RulesTab, type Draft } from './ui/RulesTab'
import { TreeView } from './ui/TreeView'
import { nodeLabel, parseCtx, pretty } from './ui/util'

type TabId = 'load' | 'tree' | 'explain' | 'rules' | 'check' | 'view' | 'compare' | 'safety'
const FLOW: { id: TabId; label: string; hint: string }[] = [
  { id: 'load', label: 'Nạp dữ liệu', hint: 'Mẫu hoặc JSON của bạn, nhận diện loại NoSQL' },
  { id: 'tree', label: 'Cây hoặc đồ thị', hint: 'Dữ liệu chia thành tầng như bài báo' },
  { id: 'explain', label: 'Giải thích cách chia', hint: 'Từng bước, kèm JSON và mã nguồn' },
  { id: 'rules', label: 'Luật phân quyền', hint: 'Chọn nút trên hình để tạo luật' },
  { id: 'check', label: 'Kiểm tra quyền', hint: 'Được hay bị từ chối, và vì sao' },
]
const EXTRA: { id: TabId; label: string }[] = [
  { id: 'view', label: 'Dữ liệu theo người dùng' },
  { id: 'compare', label: 'So sánh và truy vấn ngược' },
  { id: 'safety', label: 'An toàn và nhật ký' },
]
const WIDE: TabId[] = ['view', 'compare', 'safety']

interface Applied { ds: Dataset; detection: Detection; sample?: Sample }

function fromSample(s: Sample): Applied {
  return { ds: makeDataset(s.data, s.kind, s.subjectRoots, s.objectRoots), detection: detectKind(s.data), sample: s }
}

export function App() {
  const [applied, setApplied] = useState<Applied>(() => fromSample(SAMPLES[0]))
  const [text, setText] = useState(() => pretty(SAMPLES[0].data))
  const [forceKind, setForceKind] = useState<DbKind | ''>('')
  const [err, setErr] = useState('')
  const [rules, setRules] = useState<Rule[]>(SAMPLES[0].rules)
  const [tab, setTab] = useState<TabId>('load')
  const [focusId, setFocusId] = useState<string | undefined>()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [side, setSide] = useState<'subject' | 'object'>('subject')
  const [focusRule, setFocusRule] = useState<string | undefined>()
  const [subject, setSubject] = useState('')
  const [object, setObject] = useState('')
  const [action, setAction] = useState<Action>('read')
  const [ctxText, setCtxText] = useState('gio=9')
  const [result, setResult] = useState<Decision | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [viewUser, setViewUser] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const { ds, detection, sample } = applied
  const allRules = useMemo(() => [...ds.edgeRules, ...rules], [ds, rules])

  const resetSelections = () => {
    setFocusId(undefined); setStep(0); setDraft(emptyDraft()); setFocusRule(undefined)
    setSubject(''); setObject(''); setResult(null); setViewUser('')
  }
  const applySample = (s: Sample) => {
    setApplied(fromSample(s)); setText(pretty(s.data)); setRules(s.rules); setForceKind(''); setErr(''); resetSelections()
  }
  const applyText = (force: DbKind | '' = forceKind) => {
    try {
      const data = JSON.parse(text)
      const det = detectKind(data)
      const kind = force || (det.kind === 'unknown' ? undefined : det.kind)
      if (!kind) { setErr(det.evidence.join(' ')); return }
      setApplied({ ds: makeDataset(data, kind), detection: det })
      setRules([]); setErr(''); resetSelections()
    } catch (e) {
      setErr(e instanceof SyntaxError ? `JSON không hợp lệ: ${e.message}` : (e as Error).message)
    }
  }
  const setRoots = (s: string[], o: string[]) => {
    setApplied({ ...applied, ds: makeDataset(ds.data, ds.kind, s, o) })
    setSubject(''); setObject(''); setResult(null)
  }

  const inRoots = (id: string, roots: string[]) => roots.some((r) => id === r || id.startsWith(r + '/'))
  const typeOf = (id: string) => ds.graph?.nodes.find((n) => n.id === id)?.type

  const addToDraft = (id: string) => {
    let s = side
    let leaf = false
    if (ds.tree) {
      if (inRoots(id, ds.subjectRoots)) s = 'subject'
      else if (inRoots(id, ds.objectRoots)) s = 'object'
      leaf = ds.tree.nodes[id].children.length === 0
    } else {
      const t = typeOf(id)
      if (t === 'user') { s = 'subject'; leaf = true }
      else if (t === 'file') { s = 'object'; leaf = true }
    }
    setSide(s)
    const d = { ...draft }
    if (leaf) { if (s === 'subject') d.subjectLeaf = id; else d.objectLeaf = id }
    else if (s === 'subject') { if (!d.subjectAttrs.includes(id)) d.subjectAttrs = [...d.subjectAttrs, id] }
    else if (!d.objectAttrs.includes(id)) d.objectAttrs = [...d.objectAttrs, id]
    setDraft(d)
  }
  const pick = (id: string) => {
    if (ds.subjects.includes(id)) { setSubject(id); setResult(null) }
    else if (ds.objects.includes(id)) { setObject(id); setResult(null) }
    else setFocusId(id)
  }
  const onNode = (id: string) => {
    if (tab === 'rules') addToDraft(id)
    else if (tab === 'check') pick(id)
    else setFocusId(id)
  }

  const record = (s: string, a: Action, o: string, ctxStr: string) => {
    const d = decide(ds.space, allRules, s, a, o, parseCtx(ctxStr))
    setResult(d)
    setAudit((x) => [...x, {
      t: new Date().toLocaleTimeString('vi-VN'), subject: nodeLabel(ds, s), action: a, object: nodeLabel(ds, o),
      outcome: d.outcome, rules: d.matched.map((m) => m.ruleId.startsWith('edge:') ? 'cạnh' : m.ruleId), ctx: ctxStr.trim(),
    }])
  }
  const run = () => record(subject, action, object, ctxText)
  const runScenario = (i: number) => {
    const sc = sample!.scenarios[i]
    const c = Object.entries(sc.ctx).map(([k, v]) => `${k}=${v}`).join(' ')
    setSubject(sc.subject); setObject(sc.object); setAction(sc.action); setCtxText(c)
    record(sc.subject, sc.action, sc.object, c)
  }

  const steps = ds.tree ? ds.tree.steps : ds.graph!.steps
  const curStep = steps[Math.min(step, steps.length - 1)]

  const treeMarks: Marks = useMemo(() => {
    if (!ds.tree) return {}
    if (tab === 'rules') return ruleMarksTree(ds.tree, rules, focusRule)
    if (tab === 'check' && result) return decisionMarksTree(result, subject, object)
    if (tab === 'explain') {
      const done = new Set(steps.slice(0, step + 1).map((s) => s.nodeId))
      const m: Marks = {}
      for (const id of ds.tree.order) if (!done.has(id)) m[id] = { dim: true }
      return m
    }
    return {}
  }, [ds, tab, rules, focusRule, result, subject, object, step, steps])

  const graphMarks: GMarks | undefined = useMemo(() => {
    if (!ds.graph) return undefined
    if (tab === 'rules') return ruleMarksGraph(ds.graph, allRules, focusRule)
    if (tab === 'check' && result) return decisionMarksGraph(result, subject, object)
    return undefined
  }, [ds, tab, allRules, focusRule, result, subject, object])

  const visible = useMemo(() => {
    if (!ds.graph || tab !== 'explain') return undefined
    const done = steps.slice(0, step + 1)
    return {
      nodes: new Set(done.filter((s) => s.marker === 'graph-node').map((s) => s.nodeId)),
      edges: new Set(done.filter((s) => s.marker === 'graph-edge').map((s) => s.nodeId)),
    }
  }, [ds, tab, steps, step])

  const selectedNodes = tab === 'rules'
    ? [...draft.subjectAttrs, ...draft.objectAttrs, ...(draft.subjectLeaf ? [draft.subjectLeaf] : []), ...(draft.objectLeaf ? [draft.objectLeaf] : [])]
    : tab === 'check' ? [subject, object].filter(Boolean) : []
  const focus = tab === 'explain' ? curStep.nodeId : focusId
  const wide = WIDE.includes(tab)
  const countLabel = ds.tree ? `${ds.tree.order.length} nút, ${ds.tree.maxLevel} tầng` : `${ds.graph!.nodes.length} nút, ${ds.graph!.edges.length} cạnh`

  return (
    <div className={'app' + (wide ? ' wide' : '') + (collapsed && !wide ? ' collapsed' : '')}>
      <nav className="rail" aria-label="Các bước">
        <div className="brand">
          <h1>Phân quyền trên NoSQL</h1>
          <p>Demo bài báo NIST IR 8504, nhóm 5</p>
        </div>
        <ol className="flow">
          {FLOW.map((f, i) => (
            <li key={f.id}>
              <button className={tab === f.id ? 'on' : ''} onClick={() => setTab(f.id)} aria-current={tab === f.id ? 'step' : undefined}>
                <span className="dot">{i + 1}</span>
                <span className="lbl"><b>{f.label}</b><small>{f.hint}</small></span>
              </button>
            </li>
          ))}
        </ol>
        <p className="rail-group">Minh họa thêm</p>
        <ul className="extra">
          {EXTRA.map((f) => (
            <li key={f.id}><button className={tab === f.id ? 'on' : ''} onClick={() => setTab(f.id)}>{f.label}</button></li>
          ))}
          <li><span className="soon">Sinh luật bằng AI (làm sau)</span></li>
        </ul>
      </nav>
      {!wide && (
        <main className="canvas">
          <header className="canvas-head">
            <div>
              <h2>{sample ? sample.title : 'Dữ liệu của bạn'}</h2>
              <p>{KIND_VI[ds.kind]}, {countLabel}</p>
            </div>
            <p className="canvas-hint">
              {tab === 'rules' ? 'Bấm nút trên hình để thêm vào luật' : tab === 'check' ? 'Bấm nút để chọn chủ thể hoặc đối tượng' : tab === 'explain' ? 'Nút mờ là nút chưa được tạo' : 'Bấm một nút để xem chi tiết'}
            </p>
          </header>
          {ds.tree ? (
            <TreeView model={ds.tree} marks={treeMarks} selected={selectedNodes} onSelect={onNode} subjectRoots={ds.subjectRoots} objectRoots={ds.objectRoots} focus={focus} />
          ) : (
            <GraphView graph={ds.graph!} marks={graphMarks} selected={selectedNodes} focus={focus} onSelect={onNode} visible={visible} />
          )}
          <Legend kind={ds.tree ? 'tree' : 'graph'} overlay={tab === 'rules' || tab === 'check'} />
        </main>
      )}
      <div className="inspector-wrap">
        {!wide && (
          <button className="panel-handle" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Mở bảng điều khiển' : 'Thu gọn bảng điều khiển'} title={collapsed ? 'Mở bảng điều khiển' : 'Thu gọn bảng điều khiển để xem hình rộng hơn'}>
            {collapsed ? '‹' : '›'}
          </button>
        )}
      <aside className="inspector" aria-label="Bảng điều khiển">
        <div className="inspector-body">
        {tab === 'load' && <LoadTab samples={SAMPLES} sampleId={sample?.id} text={text} setText={setText} onSample={applySample} onApply={() => applyText()} detection={detection} forceKind={forceKind} setForceKind={(k) => { setForceKind(k); applyText(k) }} err={err} ds={ds} setRoots={setRoots} />}
        {tab === 'tree' && <TreeTab ds={ds} focusId={focusId} />}
        {tab === 'explain' && <ExplainTab ds={ds} step={step} setStep={setStep} />}
        {tab === 'rules' && <RulesTab ds={ds} rules={rules} setRules={setRules} draft={draft} setDraft={setDraft} side={side} setSide={setSide} focusRule={focusRule} setFocusRule={setFocusRule} resetRules={() => setRules(sample?.rules ?? [])} />}
        {tab === 'check' && <CheckTab ds={ds} subject={subject} object={object} setSubject={(s) => { setSubject(s); setResult(null) }} setObject={(o) => { setObject(o); setResult(null) }} action={action} setAction={(a) => { setAction(a); setResult(null) }} ctxText={ctxText} setCtxText={setCtxText} result={result} run={run} scenarios={sample?.scenarios ?? []} runScenario={runScenario} />}
        {tab === 'view' && <ViewTab ds={ds} rules={allRules} user={viewUser} setUser={setViewUser} action={action} setAction={setAction} ctxText={ctxText} />}
        {tab === 'compare' && <CompareTab ds={ds} rules={allRules} action={action} setAction={setAction} ctxText={ctxText} />}
        {tab === 'safety' && <SafetyTab audit={audit} clear={() => setAudit([])} />}
        </div>
      </aside>
      </div>
    </div>
  )
}
