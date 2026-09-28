-- Solo para dev y CI: la base de la app y la de tests de pgTAP.
-- Se crean desde template1 para que tengan solo las extensiones que crean las migraciones
-- (la imagen de PostGIS instala topology y tiger en POSTGRES_DB, que queda como `postgres`).
CREATE DATABASE canchitas;
CREATE DATABASE canchitas_test;
