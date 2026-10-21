-- =============================================================================
-- SERVIDO APP: Seed de datos de desarrollo (PostgreSQL 10+)
-- Ejecutar DESPUÉS del DDL. Determinístico gracias a setseed().
-- Genera: 6 restricciones, 80 usuarios, 54 restaurantes, ~850 platos,
-- turnos, ~3000 reservas, pre-pedidos y ~1500 reseñas.
-- =============================================================================

BEGIN;
SELECT setseed(0.42);

-- -----------------------------------------------------------------------------
-- 1. RESTRICCIONES
-- -----------------------------------------------------------------------------
INSERT INTO restricciones (nombre, descripcion) VALUES
    ('Vegano',              'Sin ingredientes de origen animal'),
    ('Vegetariano',         'Sin carne ni pescado'),
    ('Sin TACC / Celíaco',  'Sin trigo, cebada ni centeno'),
    ('Sin Lactosa',         'Sin leche ni derivados lácteos'),
    ('Sin Frutos Secos',    'Sin maní, nueces, almendras ni similares'),
    ('Sin Azúcar',          'Sin azúcar agregada');

-- Mapeo de códigos cortos a restricciones (uso temporal)
CREATE TEMP TABLE cod_map AS
SELECT * FROM (VALUES
    ('VG',   'Vegano'),
    ('V',    'Vegetariano'),
    ('TACC', 'Sin TACC / Celíaco'),
    ('SL',   'Sin Lactosa'),
    ('FS',   'Sin Frutos Secos'),
    ('SA',   'Sin Azúcar')
) AS v(codigo, nombre);

-- -----------------------------------------------------------------------------
-- 2. USUARIOS (80 comensales)
-- -----------------------------------------------------------------------------
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, fecha_registro)
SELECT
    n.nombre,
    a.apellido,
    lower(translate(n.nombre, 'áéíóúüñ', 'aeiouun')) || '.'
        || lower(translate(a.apellido, 'áéíóúüñ', 'aeiouun')) || g.i || '@mail.com',
    '$2b$12$DEVSEEDNOLOGINHASHPLACEHOLDER0000000000000000000000000',
    CASE WHEN random() < 0.2 THEN NULL
         ELSE '+54 11 ' || (4000 + floor(random() * 5999))::int || '-'
              || lpad(floor(random() * 10000)::int::text, 4, '0')
    END,
    CURRENT_TIMESTAMP - (floor(random() * 400))::int * INTERVAL '1 day'
FROM generate_series(1, 80) AS g(i)
CROSS JOIN LATERAL (SELECT (ARRAY[
    'Lucía','Martín','Sofía','Juan','Valentina','Mateo','Camila','Lautaro','Julieta',
    'Santiago','Agustina','Facundo','Micaela','Tomás','Florencia','Nicolás','Carolina',
    'Ezequiel','Brenda','Franco','Rocío','Gonzalo','Paula','Matías','Belén','Diego',
    'Ana','Pablo','Mariana','Leandro'])[1 + floor(random() * 30)::int] AS nombre) n
CROSS JOIN LATERAL (SELECT (ARRAY[
    'González','Rodríguez','Fernández','López','Martínez','García','Pérez','Sosa',
    'Romero','Benítez','Acosta','Medina','Ruiz','Díaz','Álvarez','Castro','Villalba',
    'Quiroga','Ledesma','Ibarra'])[1 + floor(random() * 20)::int] AS apellido) a;

-- -----------------------------------------------------------------------------
-- 3. RESTAURANTES (54 locales de CABA)
-- -----------------------------------------------------------------------------
INSERT INTO restaurantes (nombre, cuit, email, password_hash, direccion, barrio, tipo_comida)
SELECT
    v.nombre,
    '30' || lpad((700000000 + v.n)::text, 9, '0'),
    'contacto' || lpad(v.n::text, 2, '0') || '@servido-demo.com.ar',
    '$2b$12$DEVSEEDNOLOGINHASHPLACEHOLDER0000000000000000000000000',
    v.direccion,
    v.barrio,
    v.tipo
FROM (VALUES
    -- Parrillas (12)
    (1,  'La Brasa de Palermo',         'Palermo',       'Parrilla',    'Honduras 5520'),
    (2,  'Parrilla Don Ernesto',        'Chacarita',     'Parrilla',    'Av. Corrientes 6122'),
    (3,  'El Fogón de Belgrano',        'Belgrano',      'Parrilla',    'Cuba 2271'),
    (4,  'Parrilla del Puerto',         'Puerto Madero', 'Parrilla',    'Alicia Moreau de Justo 1150'),
    (5,  'El Quincho de Recoleta',      'Recoleta',      'Parrilla',    'Av. Quintana 1840'),
    (6,  'Parrilla La Cañada',          'Caballito',     'Parrilla',    'Av. Rivadavia 4820'),
    (7,  'Asador Tres Ombúes',          'Villa Crespo',  'Parrilla',    'Thames 1880'),
    (8,  'Parrilla Los Amigos',         'Almagro',       'Parrilla',    'Av. Medrano 290'),
    (9,  'Brasas del Sur',              'Barracas',      'Parrilla',    'Av. Montes de Oca 1420'),
    (10, 'La Parrilla de San Telmo',    'San Telmo',     'Parrilla',    'Defensa 1020'),
    (11, 'Fuego Criollo',               'Colegiales',    'Parrilla',    'Av. Federico Lacroze 3150'),
    (12, 'Parrilla Los Olmos',          'Núñez',         'Parrilla',    'Av. del Libertador 9060'),
    -- Italianas (10)
    (13, 'Trattoria Il Nonno',          'Palermo',       'Italiana',    'Armenia 1655'),
    (14, 'Da Mario Ristorante',         'Belgrano',      'Italiana',    'Av. Cabildo 2080'),
    (15, 'La Piazzetta',                'Recoleta',      'Italiana',    'Junín 1532'),
    (16, 'Osteria del Centro',          'San Telmo',     'Italiana',    'Bolívar 880'),
    (17, 'Pasta Fresca Donatella',      'Villa Crespo',  'Italiana',    'Gorriti 4490'),
    (18, 'Bella Napoli',                'Caballito',     'Italiana',    'Av. Díaz Vélez 4560'),
    (19, 'Il Gusto',                    'Puerto Madero', 'Italiana',    'Juana Manso 1160'),
    (20, 'Trattoria Mamma Rosa',        'Chacarita',     'Italiana',    'Jorge Newbery 2150'),
    (21, 'Ristorante Venezia',          'Colegiales',    'Italiana',    'Zapata 1930'),
    (22, 'Casa Ricotti',                'Monserrat',     'Italiana',    'Perú 1245'),
    -- Bodegones (8)
    (23, 'Bodegón Los Chicos',          'San Telmo',     'Bodegón',     'Humberto Primo 680'),
    (24, 'Bodegón del Abasto',          'Almagro',       'Bodegón',     'Av. Corrientes 3290'),
    (25, 'Bodegón La Paloma',           'Barracas',      'Bodegón',     'Pedro de Mendoza 1950'),
    (26, 'Bodegón Doña Rosa',           'Caballito',     'Bodegón',     'Av. Juan B. Justo 6250'),
    (27, 'Bodegón Los Tilos',           'Villa Crespo',  'Bodegón',     'Serrano 390'),
    (28, 'Bodegón La Boca Querida',     'La Boca',       'Bodegón',     'Av. Almirante Brown 1450'),
    (29, 'Bodegón El Chato',            'Monserrat',     'Bodegón',     'Moreno 1620'),
    (30, 'Bodegón de la Esquina',       'Chacarita',     'Bodegón',     'Guzmán 980'),
    -- Sushi (7)
    (31, 'Kenzo Sushi Bar',             'Palermo',       'Sushi',       'Costa Rica 5810'),
    (32, 'Nikkei Corrientes',           'Villa Crespo',  'Sushi',       'Av. Corrientes 4690'),
    (33, 'Sakura Roll',                 'Belgrano',      'Sushi',       'Blanco Encalada 2145'),
    (34, 'Tokyo Express',               'Recoleta',      'Sushi',       'Av. Callao 1620'),
    (35, 'Umi Puerto',                  'Puerto Madero', 'Sushi',       'Juana Manso 1210'),
    (36, 'Ramen Yoko',                  'Caballito',     'Sushi',       'Av. Rivadavia 5010'),
    (37, 'Sushi Kaze',                  'Colegiales',    'Sushi',       'Olleros 1710'),
    -- Cafeterías (7)
    (38, 'Café Pulcra',                 'Palermo',       'Cafetería',   'Gurruchaga 1740'),
    (39, 'Cafetería Esquina Verde',     'Villa Crespo',  'Cafetería',   'Thames 1520'),
    (40, 'Coffee Dos Santos',           'Belgrano',      'Cafetería',   'Juramento 2340'),
    (41, 'La Esquina del Medio',        'San Telmo',     'Cafetería',   'Carlos Calvo 1140'),
    (42, 'Brunch Lab',                  'Colegiales',    'Cafetería',   'Av. Álvarez Thomas 1550'),
    (43, 'Café Central Caballito',      'Caballito',     'Cafetería',   'Av. Acoyte 340'),
    (44, 'Panadería Los Andes',         'Chacarita',     'Cafetería',   'Av. Corrientes 6780'),
    -- Pizzerías (5)
    (45, 'Pizzería La Porteña',         'Almagro',       'Pizzería',    'Av. Corrientes 3880'),
    (46, 'Pizza Mamma Mia',             'Caballito',     'Pizzería',    'Emilio Mitre 480'),
    (47, 'Las Fugazzetas',              'Barracas',      'Pizzería',    'Av. Montes de Oca 230'),
    (48, 'Napoli Pizza Bar',            'Chacarita',     'Pizzería',    'Av. Triunvirato 4220'),
    (49, 'Pizzería El Horno',           'Monserrat',     'Pizzería',    'Av. Belgrano 1020'),
    -- Vegetarianas (5)
    (50, 'Verde Vida',                  'Palermo',       'Vegetariana', 'Malabia 1600'),
    (51, 'Hummus & Co',                 'Villa Crespo',  'Vegetariana', 'Armenia 1480'),
    (52, 'Raíz Vegana',                 'Colegiales',    'Vegetariana', 'Av. Crámer 2355'),
    (53, 'Semilla Cocina Consciente',   'San Telmo',     'Vegetariana', 'Bernardo de Irigoyen 620'),
    (54, 'Quinoa Bar',                  'Belgrano',      'Vegetariana', 'Av. Cabildo 1960')
) AS v(n, nombre, barrio, tipo, direccion);

-- -----------------------------------------------------------------------------
-- 4. PLANTILLAS DE MENÚ (base por tipo de comida)
-- Códigos: VG=Vegano, V=Vegetariano, TACC=Sin TACC, SL=Sin Lactosa,
--          FS=Sin Frutos Secos, SA=Sin Azúcar
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE plantilla (
    tipo        TEXT,
    categoria   TEXT,
    nombre      TEXT,
    descripcion TEXT,
    precio      NUMERIC,
    codigos     TEXT
);

INSERT INTO plantilla VALUES
-- Parrilla
('Parrilla','Entrada','Provoleta a la parrilla','Provolone con orégano y ají molido',11000,'V,TACC'),
('Parrilla','Entrada','Chorizo colorado','Chorizo de cerdo a la parrilla con pan casero',9500,'TACC,SL'),
('Parrilla','Entrada','Empanadas criollas (x3)','Carne cortada a cuchillo, horneadas',12000,''),
('Parrilla','Entrada','Ensalada criolla','Tomate, cebolla, pimiento y perejil',9000,'VG,TACC,SL,FS,SA'),
('Parrilla','Principal','Bife de chorizo 300 g','Vaquita madurada, con papas fritas',30000,'TACC,SL'),
('Parrilla','Principal','Asado de tira 400 g','Cocido a la leña, con chimichurri',32000,'TACC,SL'),
('Parrilla','Principal','Vacío a la parrilla','Con cebolla de verdeo y chimichurri',28000,'TACC,SL'),
('Parrilla','Principal','Pollo al spiedo','Medio pollo con limón y ensalada',21000,'TACC,SL'),
('Parrilla','Principal','Milanesa napolitana','Jamón, muzzarella y salsa, con papas fritas',24000,''),
('Parrilla','Principal','Choripán','Chorizo de cerdo en pan francés con salsa criolla',13000,''),
('Parrilla','Principal','Hamburguesa de bife','Pan brioche, cheddar y cebolla caramelizada',19000,''),
('Parrilla','Principal','Filet de merluza','A la plancha, con puré de papa',23000,'TACC'),
('Parrilla','Postre','Flan casero con dulce de leche','Crema de huevo y dulce de leche repostero',9000,'V,TACC'),
('Parrilla','Postre','Vigilante','Queso fresco con dulce de batata',8500,'V,TACC'),
-- Italiana
('Italiana','Entrada','Burrata con tomates cherry','Burrata, albahaca y aceite de oliva',16500,'V,TACC'),
('Italiana','Entrada','Bruschetta de tomate','Pan de campo tostado con ajo y albahaca',9800,'V,VG'),
('Italiana','Entrada','Carpaccio de res','Rúcula, parmesano y alcaparras',17000,'TACC,SL'),
('Italiana','Principal','Ñoquis de papa','Salsa de tomate, albahaca y parmesano',19500,'V'),
('Italiana','Principal','Ravioles de ricota y espinaca','Con manteca de salvia',21000,'V'),
('Italiana','Principal','Risotto de hongos','Arroz arborio, hongos del bosque y parmesano',24000,'V,TACC'),
('Italiana','Principal','Lasagna boloñesa','Capas de pasta fresca, ragú y bechamel',22000,''),
('Italiana','Principal','Canelones de verdura','Acelga y ricota gratinados',20500,'V'),
('Italiana','Principal','Pollo a la parmesana','Milanesa de pollo con salsa de tomate y muzzarella',23500,''),
('Italiana','Principal','Fettuccine al pesto','Albahaca, piñones y parmesano',21500,'V'),
('Italiana','Postre','Tiramisú','Bizcochos de soletilla, mascarpone y café',12500,'V'),
('Italiana','Postre','Panna cotta de vainilla','Con coulis de frutos rojos',11000,'V,TACC'),
-- Bodegón
('Bodegón','Entrada','Croquetas de jamón','Bechamel crocante, cuatro unidades',9500,''),
('Bodegón','Entrada','Provoleta','Provolone con orégano',10500,'V,TACC'),
('Bodegón','Entrada','Ensalada rusa','Papa, arvejas, zanahoria y huevo',8500,'V'),
('Bodegón','Principal','Milanesa a la napolitana','Con papas fritas',22000,''),
('Bodegón','Principal','Milanesa de ternera','Con ensalada mixta',19500,''),
('Bodegón','Principal','Tallarines con tuco','Salsa de carne y tomate casera',17500,''),
('Bodegón','Principal','Fideos con manteca y queso','Fideos al dente con queso rallado',15000,'V'),
('Bodegón','Principal','Guiso de lentejas','Con chorizo colorado y verdura',16000,''),
('Bodegón','Principal','Pastel de papa','Puré gratinado con carne picada',17000,''),
('Bodegón','Principal','Pollo al horno con papas','Cuarto de pollo con romero',18500,'TACC,SL'),
('Bodegón','Postre','Arroz con leche','Canela y limón',8000,'V,TACC'),
('Bodegón','Postre','Budín de pan con dulce de leche','Casero, tibio',8500,'V'),
-- Sushi
('Sushi','Entrada','Edamame','Vainas de soja con sal marina',8500,'V,VG,TACC,SL,FS,SA'),
('Sushi','Entrada','Gyozas de cerdo (x5)','Rellenas de cerdo y verdura, salsa ponzu',12500,''),
('Sushi','Entrada','Sunomono','Pepino, wakame y vinagre de arroz',9000,'V,VG,TACC,SL,FS'),
('Sushi','Principal','California roll (x8)','Salmón, palta, pepino y masago',17000,'SL,FS'),
('Sushi','Principal','Philadelphia roll (x8)','Salmón, queso crema y cebollín',18500,'FS'),
('Sushi','Principal','Veggie roll (x8)','Zanahoria, palta, pepino y kanpyo',14500,'V,VG,SL,FS,SA'),
('Sushi','Principal','Teriyaki de pollo','Con arroz y vegetales salteados',19500,'SL,FS,SA'),
('Sushi','Principal','Ramen de cerdo','Caldo tonkotsu, huevo marinado y fideos',21000,''),
('Sushi','Principal','Ceviche nikkei','Pescado blanco, leche de tigre y camote',22500,'SL,FS'),
('Sushi','Principal','Tempura de camarones','Con salsa tentsuyu',19000,''),
('Sushi','Postre','Mochi de matcha','Dos unidades rellenas de helado',9500,'V,TACC,FS'),
('Sushi','Postre','Dorayaki','Panqueque relleno de pasta de azuki',8500,'V,SL,FS'),
-- Cafetería
('Cafetería','Entrada','Tostado de jamón y queso','Pan de miga, jamón cocido y queso',9000,''),
('Cafetería','Entrada','Tostado de palta','Palta, tomate y semillas de girasol',10500,'V,VG,SL,SA'),
('Cafetería','Entrada','Bowl de granola y yogur','Yogur natural, granola casera y frutas',10000,'V'),
('Cafetería','Principal','Sándwich de miga de pollo','Pan de miga, mayonesa y tomate',11500,''),
('Cafetería','Principal','Croissant de jamón y queso','Horneado al momento',9500,'V'),
('Cafetería','Principal','Omelette de jamón y queso','Con ensalada mixta',12500,'V,TACC'),
('Cafetería','Principal','Wrap de pollo','Tortilla integral con vegetales',12000,''),
('Cafetería','Principal','Ensalada César','Pollo grillado, croutons y parmesano',13500,''),
('Cafetería','Postre','Medialunas (x2)','De manteca, recién horneadas',5500,'V'),
('Cafetería','Postre','Brownie de chocolate','Con nueces y helado de vainilla',9500,'V'),
('Cafetería','Postre','Cheesecake de maracuyá','Base de galletitas y coulis',10500,'V'),
('Cafetería','Postre','Alfajor de maicena','Relleno de dulce de leche',3800,'V,TACC'),
-- Pizzería
('Pizzería','Entrada','Fugazzeta rellena','Cebolla, muzzarella y orégano',14000,'V'),
('Pizzería','Entrada','Pan de ajo con queso','Cuatro porciones',8500,'V'),
('Pizzería','Entrada','Ensalada mixta','Lechuga, tomate, zanahoria y cebolla',9000,'V,VG,TACC,SL,FS,SA'),
('Pizzería','Principal','Muzzarella','Salsa de tomate y muzzarella',16000,'V'),
('Pizzería','Principal','Napolitana','Muzzarella, tomate, ajo y albahaca',18000,'V'),
('Pizzería','Principal','Fugazza','Cebolla caramelizada y muzzarella',17500,'V'),
('Pizzería','Principal','Calabresa','Salame calabrés picante y morrones',19500,''),
('Pizzería','Principal','Rúcula y jamón crudo','Con parmesano en escamas',21000,''),
('Pizzería','Principal','Vegetariana','Berenjena, morrones, cebolla y aceitunas',18500,'V,VG'),
('Pizzería','Principal','Muzzarella sin TACC','Masa de harina de arroz',21500,'V,TACC,FS'),
('Pizzería','Postre','Pizza dulce de chocolate y banana','Chocolate amargo y banana caramelizada',13500,'V'),
('Pizzería','Postre','Flan de la casa','Con dulce de leche y crema',8500,'V'),
-- Vegetariana
('Vegetariana','Entrada','Hummus con pan pita','Garbanzos, tahini y limón',9500,'V,VG,SL,FS'),
('Vegetariana','Entrada','Falafel (x6)','Con salsa de yogur y ensalada',11000,'V,VG,SL,FS'),
('Vegetariana','Entrada','Crema de calabaza','Con semillas tostadas',9500,'V,TACC,FS'),
('Vegetariana','Principal','Hamburguesa de lentejas','Pan integral, palta y rúcula',18000,'V,VG,SL'),
('Vegetariana','Principal','Bowl de quinoa','Palta, garbanzos y vegetales asados',17500,'V,VG,SL,FS,SA'),
('Vegetariana','Principal','Seitán a la parrilla','Con puré de batata y chimichurri vegano',19000,'V,VG,SL,FS,SA'),
('Vegetariana','Principal','Tacos de hongos','Tortillas de maíz y pico de gallo',16000,'V,VG,TACC,SL,FS,SA'),
('Vegetariana','Principal','Risotto de zapallo','Arroz arborio, zapallo asado y queso',19500,'V,TACC'),
('Vegetariana','Principal','Curry de garbanzos','Con leche de coco y arroz basmati',18500,'V,VG,TACC,SL'),
('Vegetariana','Principal','Tortilla de papa y cebolla','Clásica, sin harina',14000,'V,TACC,SL'),
('Vegetariana','Postre','Brownie vegano','Con cacao y dátiles',9000,'V,VG,SL,FS'),
('Vegetariana','Postre','Helado de coco','Sin lácteos, con cacao nibs',8500,'V,VG,SL,FS');

-- Bebidas compartidas (se suman 3 a 6 por restaurante)
CREATE TEMP TABLE bebida_pool (
    nombre      TEXT,
    descripcion TEXT,
    precio      NUMERIC,
    codigos     TEXT
);

INSERT INTO bebida_pool VALUES
('Agua mineral 500 ml',          'Con o sin gas',                         3500,  'V,VG,TACC,SL,FS,SA'),
('Gaseosa línea 500 ml',         'Coca-Cola, Sprite o Fanta',             4500,  'V,VG,TACC,SL,FS'),
('Jugo natural de naranja',      'Exprimido al momento',                  6500,  'V,VG,TACC,SL,FS'),
('Limonada con menta',           'Limón, menta y jengibre',               6000,  'V,VG,TACC,SL,FS'),
('Cerveza rubia 473 ml',         'Lager de elaboración nacional',         6500,  'V,VG,SL,FS,SA'),
('Cerveza IPA artesanal 500 ml', 'Lúpulo cítrico, 6% ABV',                9500,  'V,VG,SL,FS,SA'),
('Copa de Malbec',               'Mendoza, cosecha reciente',             7500,  'V,VG,TACC,SL,FS'),
('Espresso',                     'Café de especialidad',                  4000,  'V,VG,TACC,SL,FS,SA'),
('Café con leche',               'Leche entera o descremada',             5000,  'V,TACC,FS'),
('Licuado de frutas de estación','Con leche o agua',                      7000,  'V,TACC,FS'),
('Gin tonic',                    'Gin nacional con tónica premium',      12000,  'V,VG,SL,FS'),
('Fernet con Coca',              'Clásico de la casa',                   11000,  'V,VG,SL,FS');

-- -----------------------------------------------------------------------------
-- 5. MENÚ FINAL: precio según barrio (zona más cara = más precio) + variación
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE menu AS
SELECT r.id_restaurante, p.nombre, p.descripcion, p.categoria,
       ROUND((p.precio * m.mult * (0.95 + random() * 0.1))::numeric, -2) AS precio,
       random() > 0.05 AS disponible,
       p.codigos
FROM restaurantes r
JOIN plantilla p ON p.tipo = r.tipo_comida
CROSS JOIN LATERAL (
    SELECT CASE r.barrio
        WHEN 'Puerto Madero' THEN 1.45
        WHEN 'Recoleta'      THEN 1.30
        WHEN 'Palermo'       THEN 1.25
        WHEN 'Belgrano'      THEN 1.20
        WHEN 'San Telmo'     THEN 1.05
        WHEN 'Monserrat'     THEN 1.00
        ELSE 0.95 END AS mult
) m
UNION ALL
SELECT r.id_restaurante, b.nombre, b.descripcion, 'Bebida',
       ROUND((b.precio * m.mult * (0.95 + random() * 0.1))::numeric, -2),
       random() > 0.05,
       b.codigos
FROM restaurantes r
CROSS JOIN LATERAL (
    SELECT nombre, descripcion, precio, codigos
    FROM bebida_pool
    ORDER BY random()
    LIMIT 3 + floor(random() * 4)::int
) b
CROSS JOIN LATERAL (
    SELECT CASE r.barrio
        WHEN 'Puerto Madero' THEN 1.45
        WHEN 'Recoleta'      THEN 1.30
        WHEN 'Palermo'       THEN 1.25
        WHEN 'Belgrano'      THEN 1.20
        WHEN 'San Telmo'     THEN 1.05
        WHEN 'Monserrat'     THEN 1.00
        ELSE 0.95 END AS mult
) m;

-- -----------------------------------------------------------------------------
-- 6. PLATOS (15 a 20 por restaurante)
-- -----------------------------------------------------------------------------
INSERT INTO platos (id_restaurante, nombre, descripcion, categoria, precio, disponible)
SELECT id_restaurante, nombre, descripcion, categoria, precio, disponible
FROM menu;

-- -----------------------------------------------------------------------------
-- 7. PLATO_RESTRICCIONES (a partir de los códigos del menú)
-- -----------------------------------------------------------------------------
INSERT INTO plato_restricciones (id_plato, id_restriccion)
SELECT DISTINCT p.id_plato, c.id_restriccion
FROM menu m
JOIN platos p
  ON p.id_restaurante = m.id_restaurante AND p.nombre = m.nombre
CROSS JOIN LATERAL unnest(string_to_array(NULLIF(m.codigos, ''), ',')) AS cod(codigo)
JOIN cod_map cm ON cm.codigo = cod.codigo
JOIN restricciones c ON c.nombre = cm.nombre;

-- -----------------------------------------------------------------------------
-- 8. TURNOS (noche 1er turno todos los días; 2do turno vie-dom; mediodía sáb-dom)
-- -----------------------------------------------------------------------------
INSERT INTO turnos (id_restaurante, dia_semana, nombre_turno, horario_ingreso,
                    horario_egreso, capacidad_maxima_personas, activo)
SELECT r.id_restaurante, d, 'Noche 1er Turno', TIME '20:00', TIME '22:00',
       40 + floor(random() * 80)::int, TRUE
FROM restaurantes r CROSS JOIN generate_series(1, 7) AS d;

INSERT INTO turnos (id_restaurante, dia_semana, nombre_turno, horario_ingreso,
                    horario_egreso, capacidad_maxima_personas, activo)
SELECT r.id_restaurante, d, 'Noche 2do Turno', TIME '22:30', TIME '00:30',
       20 + floor(random() * 40)::int, TRUE
FROM restaurantes r CROSS JOIN generate_series(5, 7) AS d;

INSERT INTO turnos (id_restaurante, dia_semana, nombre_turno, horario_ingreso,
                    horario_egreso, capacidad_maxima_personas, activo)
SELECT r.id_restaurante, d, 'Mediodía', TIME '12:30', TIME '14:30',
       20 + floor(random() * 40)::int, TRUE
FROM restaurantes r CROSS JOIN generate_series(6, 7) AS d;

-- -----------------------------------------------------------------------------
-- 9. RESERVAS (01/08/2026 a 15/11/2026, respetando día de semana y cupo)
-- Pasado: COMPLETADA / CANCELADA / NO_SHOW. Futuro: PENDIENTE / CONFIRMADA.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    t        RECORD;
    f        DATE;
    v_cant   INT;
    v_sum    INT;
    v_estado TEXT;
    v_user   BIGINT;
BEGIN
    FOR t IN SELECT id_turno, id_restaurante, dia_semana, capacidad_maxima_personas
             FROM turnos LOOP
        FOR f IN SELECT d::date FROM generate_series(DATE '2026-08-01',
                                                     DATE '2026-11-15',
                                                     INTERVAL '1 day') AS d LOOP
            CONTINUE WHEN EXTRACT(ISODOW FROM f) <> t.dia_semana;
            CONTINUE WHEN random() > 0.30;

            v_cant := 2 + floor(random() * 5)::int;

            SELECT COALESCE(SUM(cantidad_personas), 0) INTO v_sum
            FROM reservas
            WHERE id_turno = t.id_turno AND fecha_reserva = f AND estado <> 'CANCELADA';

            CONTINUE WHEN v_sum + v_cant > t.capacidad_maxima_personas;

            IF f < DATE '2026-10-15' THEN
                v_estado := CASE WHEN random() < 0.85 THEN 'COMPLETADA'
                                 WHEN random() < 0.6  THEN 'CANCELADA'
                                 ELSE 'NO_SHOW' END;
            ELSE
                v_estado := CASE WHEN random() < 0.6 THEN 'CONFIRMADA' ELSE 'PENDIENTE' END;
            END IF;

            SELECT id_usuario INTO v_user FROM usuarios ORDER BY random() LIMIT 1;

            INSERT INTO reservas (id_usuario, id_restaurante, id_turno, fecha_reserva,
                                  cantidad_personas, estado, fecha_creacion)
            VALUES (v_user, t.id_restaurante, t.id_turno, f, v_cant, v_estado,
                    f::timestamp - ((2 + floor(random() * 12))::int * INTERVAL '1 day'));
        END LOOP;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 10. RESERVA_PLATOS (pre-pedido opcional, ~35% de las reservas no canceladas)
-- -----------------------------------------------------------------------------
INSERT INTO reserva_platos (id_reserva, id_plato, cantidad, precio_unitario_congelado, aclaraciones)
SELECT r.id_reserva, p.id_plato, 1 + floor(random() * 2)::int, p.precio,
       CASE
           WHEN p.categoria = 'Principal' AND random() < 0.15 THEN 'Punto cocido'
           WHEN p.categoria = 'Principal' AND random() < 0.10 THEN 'Sin sal'
           WHEN p.categoria = 'Entrada'   AND random() < 0.10 THEN 'Sin cebolla'
           WHEN p.categoria = 'Bebida'    AND random() < 0.20 THEN 'Con hielo'
           ELSE NULL
       END
FROM reservas r
CROSS JOIN LATERAL (
    SELECT id_plato, precio, categoria
    FROM platos
    WHERE id_restaurante = r.id_restaurante AND disponible
    ORDER BY random()
    LIMIT 1 + floor(random() * 3)::int
) p
WHERE r.estado <> 'CANCELADA' AND random() < 0.35;

-- -----------------------------------------------------------------------------
-- 11. RESENAS (solo reservas COMPLETADAS, una por reserva, hasta el 12/10/2026)
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE frases (puntaje INT, texto TEXT);

INSERT INTO frases VALUES
(5, 'Nos encantó todo, la carne en su punto y la atención de diez. Vuelvo seguro.'),
(5, 'Un lugar re recomendable, la comida riquísima y el ambiente muy copado.'),
(5, 'Excelente relación precio calidad, pedimos de más porque todo estaba buenísimo.'),
(5, 'Fuimos a festejar el cumple y quedamos fascinados. Volvemos el próximo finde.'),
(5, 'Atención de diez, los platos llegaron rapidísimo y calientes. Groso.'),
(4, 'Muy buena comida, el servicio un poquito lento pero valió la pena.'),
(4, 'Todo rico, el postre es una locura. Sólo le faltó un poco más de música.'),
(4, 'Buen lugar para ir en pareja, la carta tiene varias opciones interesantes.'),
(4, 'La comida estuvo bien, el lugar es lindo aunque un poco ruidoso.'),
(4, 'Hermosa propuesta, se nota que cuidan los ingredientes. Sólo mejoraría el tiempo de espera.'),
(3, 'Estuvo bien pero esperamos bastante entre plato y plato.'),
(3, 'La comida cumplió, nada del otro mundo. Quizás volvamos a probar otra cosa.'),
(3, 'Precio un poco alto para lo que te dan, pero el ambiente es lindo.'),
(2, 'La carne llegó muy pasada y el mozo nunca nos trajo la cuenta a tiempo.'),
(2, 'Me esperaba más por el precio. Pedí una milanesa fría, no vuelvo.'),
(1, 'Pésima experiencia, nos dieron mesa con la reserva perdida y la comida tardó una hora.');

WITH base AS (
    SELECT r.id_reserva, r.id_usuario, r.id_restaurante, r.fecha_reserva,
           (SELECT AVG(p.precio) FROM platos p WHERE p.id_restaurante = r.id_restaurante) AS precio_prom,
           CASE WHEN random() < 0.45 THEN 5
                WHEN random() < 0.72 THEN 4
                WHEN random() < 0.88 THEN 3
                WHEN random() < 0.96 THEN 2
                ELSE 1 END AS pts
    FROM reservas r
    WHERE r.estado = 'COMPLETADA'
      AND r.fecha_reserva <= DATE '2026-10-12'
      AND random() < 0.60
)
INSERT INTO resenas (id_reserva, id_usuario, id_restaurante, puntaje,
                     gasto_por_persona, comentario, fecha_resena)
SELECT b.id_reserva, b.id_usuario, b.id_restaurante, b.pts,
       ROUND((b.precio_prom * (1.8 + random() * 1.2))::numeric, -2),
       CASE WHEN random() < 0.25 THEN NULL
            ELSE (SELECT f.texto FROM frases f
                  WHERE f.puntaje = b.pts ORDER BY random() LIMIT 1)
       END,
       b.fecha_reserva::timestamp + ((1 + floor(random() * 3))::int * INTERVAL '1 day')
FROM base b;

-- Limpieza de tablas temporales
DROP TABLE cod_map, plantilla, bebida_pool, menu, frases;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
SELECT 'restricciones'     AS tabla, COUNT(*) FROM restricciones
UNION ALL SELECT 'usuarios',          COUNT(*) FROM usuarios
UNION ALL SELECT 'restaurantes',      COUNT(*) FROM restaurantes
UNION ALL SELECT 'platos',            COUNT(*) FROM platos
UNION ALL SELECT 'plato_restricciones', COUNT(*) FROM plato_restricciones
UNION ALL SELECT 'turnos',            COUNT(*) FROM turnos
UNION ALL SELECT 'reservas',          COUNT(*) FROM reservas
UNION ALL SELECT 'reserva_platos',    COUNT(*) FROM reserva_platos
UNION ALL SELECT 'resenas',           COUNT(*) FROM resenas;

-- Restaurantes con menos de 15 platos (debe devolver 0 filas)
SELECT r.nombre, COUNT(p.id_plato) AS cant_platos
FROM restaurantes r
LEFT JOIN platos p ON p.id_restaurante = r.id_restaurante
GROUP BY r.id_restaurante, r.nombre
HAVING COUNT(p.id_plato) < 15;

-- Métricas por restaurante (usa la VIEW)
SELECT nombre, barrio, total_resenas, puntaje_promedio, gasto_promedio_por_persona, rango_precios
FROM vista_restaurantes_metricas
ORDER BY puntaje_promedio DESC NULLS LAST
LIMIT 10;