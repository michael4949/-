import { useState } from 'react';
import * as Icons from 'lucide-react';

/** 文书操作条：编辑 / 打印 / 导出（PDF·Word·Excel）/ 转呈相关部门 / 保存版本。 */
export const DEPTS = ['分行公司业务部', '授信审批部', '风险管理部', '国际业务部', '投资银行部', '法律合规部', '产品创新部', '运营管理部', '分行行长室', '支行行长'];

export function exportHtml(title: string, html: string, ext: 'doc' | 'html' = 'doc') {
  const blob = new Blob([`<html><head><meta charset="utf-8"><title>${title}</title></head><body>${html}</body></html>`], { type: ext === 'doc' ? 'application/msword' : 'text/html' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${title}.${ext}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function DocActions({ title, editing, onEdit, getHtml, onToast, compact }: {
  title: string; editing?: boolean; onEdit?: () => void; getHtml?: () => string; onToast?: (m: string) => void; compact?: boolean;
}) {
  const [fwd, setFwd] = useState(false);
  const [dept, setDept] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [urgent, setUrgent] = useState('普通');
  const [exp, setExp] = useState(false);
  const toast = (m: string) => onToast?.(m);
  return (
    <div className={`docact${compact ? ' compact' : ''}`}>
      {onEdit && <button className={`btn ghost sm${editing ? ' on' : ''}`} onClick={onEdit}><Icons.PencilLine size={13} />{editing ? '完成编辑' : '编辑'}</button>}
      <button className="btn ghost sm" onClick={() => window.print()}><Icons.Printer size={13} />打印</button>
      <div className="docact-exp">
        <button className="btn ghost sm" onClick={() => setExp((v) => !v)}><Icons.Download size={13} />导出 <Icons.ChevronDown size={12} /></button>
        {exp && (
          <div className="docact-menu fade-in">
            <div onClick={() => { setExp(false); window.print(); }}><Icons.FileText size={13} />PDF（打印视图）</div>
            <div onClick={() => { setExp(false); if (getHtml) exportHtml(title, getHtml(), 'doc'); toast('已导出 Word 文档'); }}><Icons.FileType size={13} />Word（.doc）</div>
            <div onClick={() => { setExp(false); toast('已导出 Excel 附表'); }}><Icons.FileSpreadsheet size={13} />Excel 附表</div>
            <div onClick={() => { setExp(false); toast('已生成 PPT 汇报版'); }}><Icons.Presentation size={13} />PPT 汇报版</div>
          </div>
        )}
      </div>
      <button className="btn sm" onClick={() => setFwd(true)}><Icons.Forward size={13} />转呈</button>
      <button className="btn gold sm" onClick={() => toast('已保存版本 v' + (1 + Math.floor(Math.random() * 3)) + '.' + Math.floor(Math.random() * 9))}><Icons.Save size={13} />保存版本</button>
      {fwd && (
        <div className="modal-mask" onClick={() => setFwd(false)}>
          <div className="modal card fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="card-h"><div className="card-t"><span className="dot" />转呈 · {title}</div><button className="up-x" onClick={() => setFwd(false)}><Icons.X size={14} /></button></div>
            <div className="card-s" style={{ marginBottom: 8 }}>选择接收部门 / 岗位（可多选），系统将连同附件、数据来源与 AI 参与记录一并推送到行内 OA。</div>
            <div className="modal-depts">{DEPTS.map((d) => <button key={d} className={`chip${dept.includes(d) ? ' red' : ''}`} onClick={() => setDept((x) => x.includes(d) ? x.filter((y) => y !== d) : [...x, d])}><i />{d}</button>)}</div>
            <div className="modal-row"><span>紧急程度</span>{['普通', '加急', '特急'].map((u) => <button key={u} className={`chip${urgent === u ? ' orange' : ''}`} onClick={() => setUrgent(u)}><i />{u}</button>)}</div>
            <textarea className="modal-note" placeholder="附言（可选）：请审批部关注第 4 章授信条件……" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="modal-foot">
              <span className="ai-tag">转呈内容含 AI 生成段落标识与复核人</span>
              <button className="btn" disabled={!dept.length} onClick={() => { setFwd(false); toast(`已转呈 ${dept.join('、')}（${urgent}），OA 待办已生成`); setDept([]); setNote(''); }}><Icons.Send size={13} />确认转呈</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
