FROM postgres:18

COPY --chmod=755 ./init-scripts /docker-entrypoint-initdb.d

HEALTHCHECK --interval=10s \
            --timeout=2s \
            --start-period=10s \
            --start-interval=1s \
            --retries=3 \
            CMD pg_isready -h localhost -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" || exit 1