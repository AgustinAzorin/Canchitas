# Postgres de dev y CI: PostGIS (ADR 0005, ADR 0013), pgTAP y pg_prove (ADR 0014) y dbmate.
# dbmate corre dentro del contenedor para que schema.sql lo genere siempre el mismo pg_dump.
FROM ghcr.io/amacneil/dbmate:2.36.0 AS dbmate

FROM postgis/postgis:16-3.5

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-16-pgtap libtap-parser-sourcehandler-pgtap-perl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY initdb/ /docker-entrypoint-initdb.d/
