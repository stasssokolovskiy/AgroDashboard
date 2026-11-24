FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY hyg_v44.csv.gz .
COPY main.py .

ENTRYPOINT ["python", "main.py"]

HEALTHCHECK --interval=10s \
            --timeout=2s \
            --start-period=10s \
            --start-interval=1s \
            --retries=3 \
            CMD [ -e /tmp/ok ] || exit 1
