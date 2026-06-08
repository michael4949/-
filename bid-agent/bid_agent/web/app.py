"""FastAPI Web 服务：上传招标文件、查看进度、管理知识库、下载标书。"""
from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from ..config import get_config
from ..logging_utils import get_logger
from ..parsing import SUPPORTED_EXTS
from ..service import get_service

log = get_logger("web")
STATIC_DIR = Path(__file__).parent / "static"


def create_app() -> FastAPI:
    app = FastAPI(title="智能标书生成系统", version="0.1.0", description="本地大模型 + Agent + RAG")
    svc = get_service()

    # ---------------- 页面 ----------------
    @app.get("/", response_class=HTMLResponse)
    def index():
        idx = STATIC_DIR / "index.html"
        return HTMLResponse(idx.read_text(encoding="utf-8"))

    @app.get("/api/health")
    def health():
        return {"ok": True}

    @app.get("/api/info")
    def info():
        return svc.info()

    # ---------------- 知识库 ----------------
    @app.get("/api/kb/docs")
    def kb_docs():
        return {"documents": svc.kb_list(), "stats": svc.kb_stats()}

    @app.post("/api/kb/upload")
    async def kb_upload(file: UploadFile = File(...), category: str = Form("其他")):
        _check_ext(file.filename)
        tmp = _save_tmp(await file.read(), file.filename)
        try:
            info = svc.kb_add_file(tmp, file.filename, category=category)
        finally:
            _cleanup(tmp)
        return info

    @app.post("/api/kb/text")
    def kb_text(payload: dict):
        title = (payload.get("title") or "").strip()
        text = (payload.get("text") or "").strip()
        if not title or not text:
            raise HTTPException(400, "title 与 text 不能为空")
        return svc.kb_add_text(title, text, category=payload.get("category", "其他"))

    @app.delete("/api/kb/docs/{doc_id}")
    def kb_delete(doc_id: str):
        return {"ok": svc.kb_delete(doc_id)}

    @app.post("/api/kb/seed")
    def kb_seed():
        kb_dir = get_config().data_dir / "knowledge_base"
        files = sorted(p for p in kb_dir.glob("*") if p.suffix.lower() in SUPPORTED_EXTS)
        count = 0
        for p in files:
            svc.kb_add_file(p, p.name, category="示例")
            count += 1
        return {"count": count, "stats": svc.kb_stats()}

    @app.get("/api/kb/search")
    def kb_search(q: str, k: int = 6):
        return {"query": q, "results": svc.kb_search(q, top_k=k)}

    # ---------------- 任务 ----------------
    @app.post("/api/tasks")
    async def create_task(
        file: UploadFile = File(...),
        company: str = Form("我公司"),
        name: str = Form(""),
    ):
        _check_ext(file.filename)
        tmp = _save_tmp(await file.read(), file.filename)
        try:
            task = svc.create_task(tmp, file.filename, company=company, name=name)
        finally:
            _cleanup(tmp)
        svc.run_task_async(task.id)
        return {"task_id": task.id, "status": task.status}

    @app.post("/api/tasks/sample")
    def create_task_sample(company: str = Form("我公司"), name: str = Form("")):
        sample = get_config().data_dir / "samples" / "示例招标文件.md"
        if not sample.exists():
            raise HTTPException(404, "示例招标文件不存在")
        task = svc.create_task(sample, sample.name, company=company, name=name or "示例任务")
        svc.run_task_async(task.id)
        return {"task_id": task.id, "status": task.status}

    @app.get("/api/tasks")
    def list_tasks():
        out = []
        for t in svc.list_tasks():
            out.append(
                {
                    "id": t.id,
                    "name": t.name,
                    "tender_filename": t.tender_filename,
                    "company": t.company,
                    "status": t.status,
                    "progress": t.progress,
                    "created_at": t.created_at,
                }
            )
        return {"tasks": out}

    @app.get("/api/tasks/{task_id}")
    def get_task(task_id: str):
        t = svc.get_task(task_id)
        if not t:
            raise HTTPException(404, "任务不存在")
        return t.to_dict()

    @app.delete("/api/tasks/{task_id}")
    def delete_task(task_id: str):
        return {"ok": svc.delete_task(task_id)}

    @app.get("/api/tasks/{task_id}/download")
    def download(task_id: str, type: str = "bid"):
        t = svc.get_task(task_id)
        if not t:
            raise HTTPException(404, "任务不存在")
        path = t.output_docx
        if type == "review" and t.output_docx:
            # 审核报告与标书同目录
            rp = Path(t.output_docx).parent
            cand = list(rp.glob("*审核报告.docx"))
            path = str(cand[0]) if cand else ""
        if not path or not Path(path).exists():
            raise HTTPException(404, "文件尚未生成")
        return FileResponse(
            path,
            filename=Path(path).name,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    # ---------------- 静态资源 ----------------
    if STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    return app


# ---------------- 辅助 ----------------
def _check_ext(filename: str) -> None:
    ext = Path(filename or "").suffix.lower()
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(400, f"不支持的文件类型：{ext}，仅支持 {', '.join(sorted(SUPPORTED_EXTS))}")


def _save_tmp(data: bytes, filename: str) -> Path:
    suffix = Path(filename or "upload").suffix or ".bin"
    fd, name = tempfile.mkstemp(suffix=suffix)
    with open(fd, "wb") as f:
        f.write(data)
    return Path(name)


def _cleanup(path: Path) -> None:
    try:
        Path(path).unlink(missing_ok=True)
    except Exception:
        pass


app = create_app()
