const API_BASE = window.location.origin;
const $ = (id) => document.getElementById(id);

const generateBtn = $("generate-btn");
const promptInput = $("prompt");
const slidesInput = $("slides");
const statusBox = $("status");
const statusMsg = $("status-message");
const spinner = $("spinner");
const resultsBox = $("results");
const resultGrid = $("result-grid");

let pollHandle = null;

async function startGeneration() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    alert("请输入主题");
    return;
  }
  const slides = parseInt(slidesInput.value, 10) || 3;

  generateBtn.disabled = true;
  statusBox.classList.remove("hidden");
  resultsBox.classList.add("hidden");
  resultGrid.innerHTML = "";
  spinner.style.display = "block";
  statusMsg.classList.remove("error");
  statusMsg.textContent = "提交任务…";

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, slides }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const { job_id } = await res.json();
    statusMsg.textContent = "任务已提交，正在驱动 lovart.ai…";
    pollJob(job_id);
  } catch (err) {
    statusMsg.classList.add("error");
    statusMsg.textContent = `出错：${err.message}`;
    spinner.style.display = "none";
    generateBtn.disabled = false;
  }
}

function pollJob(jobId) {
  if (pollHandle) clearInterval(pollHandle);
  pollHandle = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job = await res.json();
      statusMsg.textContent = job.message || job.status;
      if (job.status === "done") {
        clearInterval(pollHandle);
        spinner.style.display = "none";
        showResults(job.artifacts);
        generateBtn.disabled = false;
      } else if (job.status === "error") {
        clearInterval(pollHandle);
        spinner.style.display = "none";
        statusMsg.classList.add("error");
        generateBtn.disabled = false;
      }
    } catch (err) {
      statusMsg.classList.add("error");
      statusMsg.textContent = `轮询失败：${err.message}`;
    }
  }, 3000);
}

function showResults(artifacts) {
  resultsBox.classList.remove("hidden");
  resultGrid.innerHTML = "";
  if (!artifacts || artifacts.length === 0) {
    resultGrid.innerHTML = "<p>没有生成任何结果</p>";
    return;
  }
  artifacts.forEach((url, idx) => {
    const card = document.createElement("div");
    card.className = "result-card";
    const img = document.createElement("img");
    img.src = url;
    img.alt = `result-${idx + 1}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = "";
    link.textContent = `下载 ${idx + 1}`;
    card.appendChild(img);
    card.appendChild(link);
    resultGrid.appendChild(card);
  });
}

generateBtn.addEventListener("click", startGeneration);
