# PPT Agent · Lovart.ai 自动生成

一个 Web 应用：输入主题，自动驱动 lovart.ai 生成设计稿/图像，下载到本地。

## 架构

- **后端**：Python + FastAPI + Playwright（异步任务 + 状态轮询）
- **前端**：原生 HTML/JS（不需要构建）
- **部署**：Docker，推荐 Render / Fly.io（Vercel 不适合，serverless 超时）

## ⚠️ 必读

1. **lovart.ai 没有公开 API**，本项目通过 Playwright 自动化浏览器。
2. `backend/lovart_client.py` 中的 `SEL_*` 选择器是**占位符**，需要根据 lovart.ai 实际页面 inspect 后填入真实选择器。
3. lovart.ai 可能采用 SSO（Google/Apple）、Cloudflare、CAPTCHA 等防护，首次自动登录可能受阻。建议本地先用 `HEADLESS=false` 跑一次，手动完成验证后 cookie 会被自动持久化到 `LOVART_STORAGE_STATE` 指定文件，后续即可免登录。
4. **凭证安全**：账号密码只通过环境变量 / `.env` / Render Dashboard 注入，永远不要 commit 到 git。
5. 请自行确认 lovart.ai 的服务条款是否允许此类自动化操作。

## 本地运行

```bash
cd ppt-agent/backend

# 1. 装 Python 依赖和 Playwright
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
playwright install-deps chromium    # Linux 需要

# 2. 配置凭证
cp .env.example .env
# 编辑 .env，填入 LOVART_EMAIL / LOVART_PASSWORD

# 3. 首次启动（HEADLESS=false 看着浏览器走流程）
HEADLESS=false uvicorn main:app --reload --port 8000

# 4. 打开 http://localhost:8000
```

## 部署到 Render

1. 把仓库 push 到 GitHub，连接到 Render
2. 选项 A：把 `ppt-agent/render.yaml` 移到仓库根目录，Render 自动识别为 Blueprint
3. 选项 B：在 Render 手动创建 Web Service，配置：
   - Runtime: Docker
   - Dockerfile Path: `ppt-agent/backend/Dockerfile`
   - Docker Context: `ppt-agent`
   - 添加 1GB Disk 挂载到 `/data`
4. 在 **Environment** 标签页里手动填入：
   - `LOVART_EMAIL`
   - `LOVART_PASSWORD`
   - `HEADLESS=true`

⚠️ 首次部署后，由于云端无人值守，无法手动过 CAPTCHA / SSO。建议先**在本地用 HEADLESS=false 走一遍登录**，把生成的 `lovart-state.json` 上传到 Render 的 Disk（或通过别的方式同步），后续云端就能直接用已登录的 session。

## 调优选择器

打开 `backend/lovart_client.py`，找到 `SEL_*` 一组类属性，对照 lovart.ai 实际页面修改：

| 属性 | 用途 |
|---|---|
| `SEL_LOGIN_BUTTON` | 入口的"登录"按钮 |
| `SEL_EMAIL_INPUT` / `SEL_PASSWORD_INPUT` | 登录输入框 |
| `SEL_SUBMIT_LOGIN` | 提交登录的按钮 |
| `SEL_PROMPT_INPUT` | 输入提示词的地方 |
| `SEL_SUBMIT_PROMPT` | 触发生成的按钮 |
| `SEL_RESULT_IMAGE` | 结果图的 `<img>` |

每次运行会把过程截图保存到 `ARTIFACTS_DIR/<job_id>/step-*.png`，方便排查。

## 目录结构

```
ppt-agent/
├── backend/
│   ├── main.py              # FastAPI 入口 + 任务调度
│   ├── lovart_client.py     # Playwright 自动化
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── render.yaml              # Render 部署配置
├── .gitignore
└── README.md
```

## API 接口

| Method | 路径 | 说明 |
|---|---|---|
| POST | `/api/generate` | `{prompt, slides}` 提交生成任务，返回 `job_id` |
| GET | `/api/jobs/{job_id}` | 查询任务状态和结果 |
| GET | `/artifacts/{job_id}/{filename}` | 下载产物 |
| GET | `/api/health` | 健康检查 |

## 已知限制

- **MVP 用内存存储任务**，进程重启会丢失。生产环境请换 Redis / DB。
- **没有并发控制**，多个请求会同时启动 Chromium，资源消耗大。可加队列（如 Celery / RQ）。
- **首次登录需要人工**（CAPTCHA / 2FA）。
- **选择器需要根据实际页面调**，DOM 改了就要更新。
