-- -----------------------------------------------------------------------------
-- VIEW: métricas calculadas por restaurante (sin password_hash)
-- Umbrales de rango de precios: ajustar según la inflación vigente en ARS.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_restaurantes_metricas AS
SELECT
    r.id_restaurante,
    r.nombre,
    r.cuit,
    r.email,
    r.direccion,
    r.barrio,
    r.tipo_comida,
    COALESCE(m.total_resenas, 0)                  AS total_resenas,
    m.puntaje_promedio,
    m.gasto_promedio_por_persona,
    CASE
        WHEN COALESCE(m.total_resenas, 0) = 0        THEN 'Sin calificaciones'
        WHEN m.gasto_promedio_por_persona < 10000    THEN '$0 - $10.000'
        WHEN m.gasto_promedio_por_persona < 25000    THEN '$10.000 - $25.000'
        WHEN m.gasto_promedio_por_persona < 50000    THEN '$25.000 - $50.000'
        ELSE                                              'Mayor a $50.000'
    END                                           AS rango_precios
FROM restaurantes r
LEFT JOIN (
    SELECT
        id_restaurante,
        COUNT(*)                          AS total_resenas,
        ROUND(AVG(puntaje), 2)            AS puntaje_promedio,
        ROUND(AVG(gasto_por_persona), 2)  AS gasto_promedio_por_persona
    FROM resenas
    GROUP BY id_restaurante
) m ON m.id_restaurante = r.id_restaurante;
