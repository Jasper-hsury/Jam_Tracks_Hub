FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY api-server/requirements_api.txt ./api-server/requirements_api.txt
RUN pip install --no-cache-dir -r ./api-server/requirements_api.txt

COPY . .

WORKDIR /app/api-server

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]

