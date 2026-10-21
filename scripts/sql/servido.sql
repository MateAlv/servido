-- =============================================================================
-- SERVIDO APP: Esquema de base de datos para reservas de restaurantes (CABA)
-- Motor: PostgreSQL 10+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USUARIOS (comensales)
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id_usuario     BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(nombre)) > 0),
    apellido       VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(apellido)) > 0),
    email          VARCHAR(255) NOT NULL UNIQUE
                       CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    password_hash  VARCHAR(255) NOT NULL,
    telefono       VARCHAR(30)  NULL
                       CHECK (telefono IS NULL OR telefono ~ '^[0-9+() -]{6,30}$'),
    fecha_registro TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. RESTAURANTES (locales y credenciales)
-- Precio promedio y puntaje se calculan en la VIEW, no se almacenan.
-- -----------------------------------------------------------------------------
CREATE TABLE restaurantes (
    id_restaurante BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL CHECK (LENGTH(TRIM(nombre)) > 0),
    cuit           CHAR(11)     NOT NULL UNIQUE CHECK (cuit ~ '^[0-9]{11}$'),
    email          VARCHAR(255) NOT NULL UNIQUE
                       CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    password_hash  VARCHAR(255) NOT NULL,
    direccion      VARCHAR(200) NOT NULL,
    barrio         VARCHAR(60)  NOT NULL,
    tipo_comida    VARCHAR(60)  NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. TURNOS (oferta horaria y cupo por día de semana)
-- dia_semana: 1 = Lunes ... 7 = Domingo (ISO 8601)
-- -----------------------------------------------------------------------------
CREATE TABLE turnos (
    id_turno                 BIGINT   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_restaurante           BIGINT   NOT NULL
                                 REFERENCES restaurantes (id_restaurante)
                                 ON DELETE CASCADE ON UPDATE CASCADE,
    dia_semana               SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    nombre_turno             VARCHAR(60),
    horario_ingreso          TIME     NOT NULL,
    horario_egreso           TIME     NOT NULL,
    capacidad_maxima_personas INTEGER NOT NULL CHECK (capacidad_maxima_personas > 0),
    activo                   BOOLEAN  NOT NULL DEFAULT TRUE,

    -- Necesario para que reservas pueda referenciar el par (turno, restaurante)
    CONSTRAINT uq_turno_restaurante UNIQUE (id_turno, id_restaurante),
    -- Un restaurante no puede tener dos turnos en el mismo día y hora de ingreso
    CONSTRAINT uq_turno_dia_horario UNIQUE (id_restaurante, dia_semana, horario_ingreso),
    -- Distinto de igual, para permitir turnos que cruzan la medianoche
    CONSTRAINT ck_turno_horarios CHECK (horario_egreso <> horario_ingreso)
);

-- -----------------------------------------------------------------------------
-- 4. PLATOS (menú por restaurante)
-- -----------------------------------------------------------------------------
CREATE TABLE platos (
    id_plato       BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_restaurante BIGINT        NOT NULL
                       REFERENCES restaurantes (id_restaurante)
                       ON DELETE CASCADE ON UPDATE CASCADE,
    nombre         VARCHAR(120)  NOT NULL CHECK (LENGTH(TRIM(nombre)) > 0),
    descripcion    TEXT          NULL,
    categoria      VARCHAR(30)   NOT NULL
                       CHECK (categoria IN ('Entrada', 'Principal', 'Postre', 'Bebida')),
    precio         NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    disponible     BOOLEAN       NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_plato_restaurante_nombre UNIQUE (id_restaurante, nombre)
);

-- -----------------------------------------------------------------------------
-- 5. RESTRICCIONES (catálogo alimentario)
-- -----------------------------------------------------------------------------
CREATE TABLE restricciones (
    id_restriccion BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         VARCHAR(60)  NOT NULL UNIQUE CHECK (LENGTH(TRIM(nombre)) > 0),
    descripcion    TEXT         NULL
);

-- -----------------------------------------------------------------------------
-- 6. PLATO_RESTRICCIONES (N:M entre platos y restricciones)
-- -----------------------------------------------------------------------------
CREATE TABLE plato_restricciones (
    id_plato       BIGINT NOT NULL
                       REFERENCES platos (id_plato)
                       ON DELETE CASCADE ON UPDATE CASCADE,
    id_restriccion BIGINT NOT NULL
                       REFERENCES restricciones (id_restriccion)
                       ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (id_plato, id_restriccion)
);

-- -----------------------------------------------------------------------------
-- 7. RESERVAS (núcleo transaccional)
-- id_restaurante se valida contra turnos mediante FK compuesta.
-- -----------------------------------------------------------------------------
CREATE TABLE reservas (
    id_reserva        BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario        BIGINT      NOT NULL
                          REFERENCES usuarios (id_usuario)
                          ON DELETE RESTRICT ON UPDATE CASCADE,
    id_restaurante    BIGINT      NOT NULL
                          REFERENCES restaurantes (id_restaurante)
                          ON DELETE RESTRICT ON UPDATE CASCADE,
    id_turno          BIGINT      NOT NULL,
    fecha_reserva     DATE        NOT NULL,
    cantidad_personas INTEGER     NOT NULL CHECK (cantidad_personas > 0),
    estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                          CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'CANCELADA',
                                            'COMPLETADA', 'NO_SHOW')),
    fecha_creacion    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Garantiza que el turno pertenezca al restaurante indicado
    CONSTRAINT fk_reserva_turno
        FOREIGN KEY (id_turno, id_restaurante)
        REFERENCES turnos (id_turno, id_restaurante)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    -- Permite que resenas referencie (reserva, usuario, restaurante) de forma coherente
    CONSTRAINT uq_reserva_coherencia UNIQUE (id_reserva, id_usuario, id_restaurante)
);

CREATE INDEX idx_reservas_turno_fecha       ON reservas (id_turno, fecha_reserva);
CREATE INDEX idx_reservas_restaurante_fecha ON reservas (id_restaurante, fecha_reserva);

-- -----------------------------------------------------------------------------
-- 8. RESERVA_PLATOS (pre-pedido opcional)
-- -----------------------------------------------------------------------------
CREATE TABLE reserva_platos (
    id_reserva              BIGINT        NOT NULL
                                REFERENCES reservas (id_reserva)
                                ON DELETE CASCADE ON UPDATE CASCADE,
    id_plato                BIGINT        NOT NULL
                                REFERENCES platos (id_plato)
                                ON DELETE RESTRICT ON UPDATE CASCADE,
    cantidad                INTEGER       NOT NULL CHECK (cantidad > 0),
    precio_unitario_congelado NUMERIC(10,2) NOT NULL CHECK (precio_unitario_congelado >= 0),
    aclaraciones            VARCHAR(255)  NULL,
    PRIMARY KEY (id_reserva, id_plato)
);

-- -----------------------------------------------------------------------------
-- 9. RESENAS (una por reserva, solo de comensales que asistieron)
-- -----------------------------------------------------------------------------
CREATE TABLE resenas (
    id_resena         BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reserva        BIGINT        NOT NULL UNIQUE,
    id_usuario        BIGINT        NOT NULL,
    id_restaurante    BIGINT        NOT NULL,
    puntaje           SMALLINT      NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
    gasto_por_persona NUMERIC(10,2) NOT NULL CHECK (gasto_por_persona > 0),
    comentario        TEXT          NULL,
    fecha_resena      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Asegura que usuario y restaurante coincidan con la reserva original
    CONSTRAINT fk_resena_reserva
        FOREIGN KEY (id_reserva, id_usuario, id_restaurante)
        REFERENCES reservas (id_reserva, id_usuario, id_restaurante)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_resenas_restaurante ON resenas (id_restaurante);

-- -----------------------------------------------------------------------------
-- TRIGGER: el día de la fecha de reserva debe coincidir con dia_semana del turno
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_dia_turno()
RETURNS TRIGGER AS $$
DECLARE
    v_dia_turno SMALLINT;
BEGIN
    SELECT dia_semana INTO v_dia_turno
    FROM turnos
    WHERE id_turno = NEW.id_turno;

    IF v_dia_turno IS DISTINCT FROM EXTRACT(ISODOW FROM NEW.fecha_reserva)::SMALLINT THEN
        RAISE EXCEPTION 'La fecha % no corresponde al día de semana del turno %',
            NEW.fecha_reserva, NEW.id_turno;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_dia_turno
    BEFORE INSERT OR UPDATE OF fecha_reserva, id_turno ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_dia_turno();
