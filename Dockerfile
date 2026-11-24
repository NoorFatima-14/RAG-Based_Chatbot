FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/home/user/.cache/huggingface

# Hugging Face Spaces runs containers as user id 1000, so we use the same user.
RUN useradd -m -u 1000 user
WORKDIR /home/user/app

# CPU-only PyTorch is much smaller than the default GPU build.
COPY requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt

USER user

# Download the embedding model while building, so the first request is not slow.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY --chown=user backend ./backend
COPY --chown=user frontend ./frontend

EXPOSE 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
