-- PANADERÍA SaaS - INICIALIZACIÓN
-- Extensiones necesarias para UUID, encriptación y funcionalidades avanzadas

-- Generación de UUIDs (v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Encriptación (para passwords)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Funciones de texto avanzadas (para búsquedas)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CONFIGURACIÓN DE ZONA HORARIA
-- Ajustar según la ubicación de la panadería
SET timezone = 'America/Argentina/Buenos_Aires';

-- COMENTARIOS
COMMENT ON EXTENSION "uuid-ossp" IS 'Generación de UUIDs para Primary Keys';
COMMENT ON EXTENSION "pgcrypto" IS 'Encriptación de contraseñas con bcrypt';
COMMENT ON EXTENSION "unaccent" IS 'Búsqueda de texto sin acentos';
