import { useRef, useState } from 'react';
import * as Icons from 'lucide-react';

/** 多模态来源文件上传与识别：Word / Excel / PDF / PPT / 图片 / 音频，本地模拟识别进度与置信度。 */
export interface UDoc { id: string; name: string; ext: string; size: number; status: 'uploading' | 'recognizing' | 'done'; progress: number; confidence: number; fields: number; lowConf: number; pages: number; kind: string }
export const EXT_ICON: Record<string, { icon: string; cls: string; kind: string }> = {
  pdf: { icon: 'FileText', cls: 'red', kind: 'PDF 文档' }, doc: { icon: 'FileType', cls: 'blue', kind: 'Word 文档' }, docx: { icon: 'FileType', cls: 'blue', kind: 'Word 文档' },
  xls: { icon: 'FileSpreadsheet', cls: 'green', kind: 'Excel 表格' }, xlsx: { icon: 'FileSpreadsheet', cls: 'green', kind: 'Excel 表格' }, csv: { icon: 'FileSpreadsheet', cls: 'green', kind: 'CSV 数据' },
  ppt: { icon: 'Presentation', cls: 'orange', kind: 'PPT 文稿' }, pptx: { icon: 'Presentation', cls: 'orange', kind: 'PPT 文稿' },
  jpg: { icon: 'FileImage', cls: 'purple', kind: '图片影像' }, jpeg: { icon: 'FileImage', cls: 'purple', kind: '图片影像' }, png: { icon: 'FileImage', cls: 'purple', kind: '图片影像' }, bmp: { icon: 'FileImage', cls: 'purple', kind: '图片影像' }, tif: { icon: 'FileImage', cls: 'purple', kind: '扫描影像' },
  mp3: { icon: 'FileAudio', cls: 'gold', kind: '录音' }, m4a: { icon: 'FileAudio', cls: 'gold', kind: '录音' }, wav: { icon: 'FileAudio', cls: 'gold', kind: '录音' }, txt: { icon: 'FileText', cls: 'gold', kind: '文本' },
};
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
export function makeDoc(name: string, size?: number): UDoc {
  const ext = (name.split('.').pop() || 'pdf').toLowerCase(); const h = hash(name);
  const meta = EXT_ICON[ext] ?? EXT_ICON.pdf;
  return { id: `${h}-${name}`, name, ext, size: size ?? 120_000 + (h % 4_000_000), status: 'uploading', progress: 0, confidence: 91 + (h % 8), fields: 24 + (h % 380), lowConf: h % 5, pages: 1 + (h % 42), kind: meta.kind };
}
const fmtSize = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export default function UploadDocs({ label = '来源文件', hint, types, presets, required, onChange }: {
  label?: string; hint?: string; types?: string[]; presets?: string[]; required?: boolean; onChange?: (docs: UDoc[]) => void;
}) {
  const [docs, setDocs] = useState<UDoc[]>([]);
  const [drag, setDrag] = useState(false);
  const [show, setShow] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<Record<string, number>>({});

  const emit = (next: UDoc[]) => { setDocs(next); onChange?.(next); };
  const add = (names: { name: string; size?: number }[]) => {
    const fresh = names.map((n) => makeDoc(n.name, n.size)).filter((d) => !docs.some((x) => x.id === d.id));
    if (!fresh.length) return;
    let cur = [...docs, ...fresh]; emit(cur);
    for (const d of fresh) {
      let p = 0;
      timers.current[d.id] = window.setInterval(() => {
        p += 9 + Math.random() * 14;
        cur = cur.map((x) => x.id !== d.id ? x : p < 45 ? { ...x, status: 'uploading', progress: Math.min(100, Math.round(p)) } : p < 100 ? { ...x, status: 'recognizing', progress: Math.min(100, Math.round(p)) } : { ...x, status: 'done', progress: 100 });
        emit(cur);
        if (p >= 100) { clearInterval(timers.current[d.id]); }
      }, 160);
    }
  };
  const remove = (id: string) => { clearInterval(timers.current[id]); emit(docs.filter((d) => d.id !== id)); };
  const done = docs.filter((d) => d.status === 'done').length;

  return (
    <div className="card up">
      <div className="card-h">
        <div className="card-t"><span className="dot" />{label}{required && <span className="chip red" style={{ marginLeft: 6 }}><i />必需</span>}</div>
        <span className="card-s">{done}/{docs.length} 已识别</span>
      </div>
      {types && types.length > 0 && <div className="up-types">{types.map((t) => <span key={t} className="chip"><i />{t}</span>)}</div>}
      <div className={`up-drop${drag ? ' drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(Array.from(e.dataTransfer.files).map((f) => ({ name: f.name, size: f.size }))); }}
        onClick={() => input.current?.click()}>
        <input ref={input} type="file" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.bmp,.tif,.mp3,.m4a,.wav,.txt" onChange={(e) => { add(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size }))); e.currentTarget.value = ''; }} />
        <div className="up-ico"><Icons.CloudUpload size={22} /></div>
        <div><b>拖拽文件到此处，或点击选择</b><div className="card-s">{hint ?? '支持 Word、Excel、PDF、PPT、图片（扫描件 / 拍照）、录音；多文件同时识别，表格、印章、手写批注均可提取'}</div></div>
        <div className="up-fmts">{['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG/PNG', 'MP3'].map((f) => <span key={f}>{f}</span>)}</div>
      </div>
      {presets && presets.length > 0 && (
        <div className="up-presets">
          <span className="card-s">从行内影像系统 / 客户资料库选取：</span>
          {presets.map((p) => <button key={p} className="btn ghost sm" onClick={() => add([{ name: p }])}><Icons.FolderOpen size={12} />{p}</button>)}
        </div>
      )}
      {docs.length > 0 && (
        <div className="up-list">
          {docs.map((d) => {
            const meta = EXT_ICON[d.ext] ?? EXT_ICON.pdf;
            const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[meta.icon] ?? Icons.File;
            return (
              <div key={d.id} className={`up-item ${d.status}`}>
                <span className={`up-fico ${meta.cls}`}><C size={16} /></span>
                <div className="up-meta">
                  <div className="t">{d.name} <span className="card-s">{meta.kind} · {fmtSize(d.size)}{d.pages > 1 ? ` · ${d.pages} 页` : ''}</span></div>
                  {d.status !== 'done'
                    ? <div className="up-prog"><div className="bar"><i style={{ width: `${d.progress}%` }} /></div><span>{d.status === 'uploading' ? '上传中' : 'AI 识别中'} {d.progress}%</span></div>
                    : <div className="up-res"><span className="chip green"><i />已识别 · 置信度 {d.confidence}%</span><span className="chip"><i />提取 {d.fields} 个字段</span>{d.lowConf > 0 && <span className="chip orange"><i />{d.lowConf} 个字段待确认</span>}<button className="lnk" onClick={() => setShow(show === d.id ? null : d.id)}>{show === d.id ? '收起' : '查看识别结果'}</button></div>}
                  {show === d.id && d.status === 'done' && (
                    <div className="up-detail fade-in">
                      <div className="row"><span>识别引擎</span><b>版面分析 + 表格重建 + 印章/手写检测</b></div>
                      <div className="row"><span>结构化结果</span><b>{Math.max(1, Math.round(d.fields / 40))} 张表 · {d.fields} 个字段 · {d.pages} 页</b></div>
                      <div className="row"><span>低置信字段</span><b className={d.lowConf ? 'red-text' : 'green-text'}>{d.lowConf ? `${d.lowConf} 处（已高亮，需人工确认）` : '无'}</b></div>
                      <div className="row"><span>数据落库</span><b>脱敏后进入本次任务上下文，不留存原件</b></div>
                    </div>
                  )}
                </div>
                <button className="up-x" onClick={() => remove(d.id)} title="移除"><Icons.X size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
