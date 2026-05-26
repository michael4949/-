import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from lovart_client import LovartClient, LovartError

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("ppt-agent")

ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", "/tmp/ppt-agent-artifacts"))
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

JOBS: dict[str, dict] = {}


class GenerateRequest(BaseModel):
    prompt: str
    slides: Optional[int] = 3


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: Optional[str] = None
    artifacts: list[str] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("PPT agent backend starting up. Artifacts dir: %s", ARTIFACTS_DIR)
    yield
    log.info("PPT agent backend shutting down")


app = FastAPI(title="PPT Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def run_generation(job_id: str, prompt: str, slides: int) -> None:
    job = JOBS[job_id]
    job["status"] = "running"
    job["message"] = "Starting browser automation"
    out_dir = ARTIFACTS_DIR / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        async with LovartClient(
            email=os.environ["LOVART_EMAIL"],
            password=os.environ["LOVART_PASSWORD"],
            headless=os.getenv("HEADLESS", "true").lower() == "true",
            artifacts_dir=out_dir,
        ) as client:
            job["message"] = "Logging in to lovart.ai"
            await client.login()

            job["message"] = "Generating design"
            artifact_paths = await client.generate(prompt=prompt, count=slides)

            job["artifacts"] = [
                f"/artifacts/{job_id}/{Path(p).name}" for p in artifact_paths
            ]
            job["status"] = "done"
            job["message"] = f"Generated {len(artifact_paths)} artifact(s)"
            log.info("Job %s completed with %d artifacts", job_id, len(artifact_paths))
    except LovartError as exc:
        log.exception("Job %s failed", job_id)
        job["status"] = "error"
        job["message"] = str(exc)
    except KeyError as exc:
        log.exception("Job %s missing env var %s", job_id, exc)
        job["status"] = "error"
        job["message"] = f"Server missing env var: {exc}"
    except Exception as exc:
        log.exception("Job %s crashed", job_id)
        job["status"] = "error"
        job["message"] = f"Unexpected error: {exc}"


@app.post("/api/generate", response_model=JobResponse)
async def generate(req: GenerateRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")
    if not os.getenv("LOVART_EMAIL") or not os.getenv("LOVART_PASSWORD"):
        raise HTTPException(
            status_code=500,
            detail="Server missing LOVART_EMAIL / LOVART_PASSWORD env vars",
        )

    job_id = uuid.uuid4().hex
    JOBS[job_id] = {
        "status": "queued",
        "message": "Job queued",
        "artifacts": [],
    }
    asyncio.create_task(run_generation(job_id, req.prompt.strip(), req.slides or 3))
    return JobResponse(job_id=job_id, status="queued", message="Job queued")


@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(job_id=job_id, **job)


@app.get("/artifacts/{job_id}/{filename}")
async def serve_artifact(job_id: str, filename: str):
    path = ARTIFACTS_DIR / job_id / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Artifact not found")
    return FileResponse(path)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
