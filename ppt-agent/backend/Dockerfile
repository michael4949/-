FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY frontend ./frontend

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    ARTIFACTS_DIR=/data/artifacts \
    LOVART_STORAGE_STATE=/data/lovart-state.json

RUN mkdir -p /data/artifacts

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
