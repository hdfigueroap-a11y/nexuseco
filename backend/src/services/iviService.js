// backend/src/services/iviService.js
// RF05 — Cálculo automático del IVI
// RF06 — Nivel de Cumplimiento
// RF07 — Generación automática de alertas

const { query } = require('../config/db');
const alertService = require('./alertService');

/**
 * Fórmula IVI (Índice de Valor de Impacto):
 *   Componentes ponderados:
 *     - Tasa de supervivencia de árboles : 50 %
 *     - Temperatura dentro de rango      : 25 %   (óptimo 15–30 °C)
 *     - Humedad dentro de rango          : 25 %   (óptimo 40–80 %)
 *
 * Resultado: 0–100
 */
function calculateIVI({ trees_planted, trees_survived, temperature, humidity }) {
  let score = 0;

  // Componente 1: supervivencia (50 pts)
  if (trees_planted > 0) {
    const survivalRate = Math.min(trees_survived / trees_planted, 1);
    score += survivalRate * 50;
  }

  // Componente 2: temperatura (25 pts)
  if (temperature !== null && temperature !== undefined) {
    if (temperature >= 15 && temperature <= 30) {
      score += 25;
    } else if (temperature >= 10 && temperature <= 35) {
      score += 12.5; // rango aceptable
    }
    // fuera de rango → 0 pts
  } else {
    score += 12.5; // sin dato → puntaje neutro
  }

  // Componente 3: humedad (25 pts)
  if (humidity !== null && humidity !== undefined) {
    if (humidity >= 40 && humidity <= 80) {
      score += 25;
    } else if (humidity >= 25 && humidity <= 90) {
      score += 12.5;
    }
  } else {
    score += 12.5;
  }

  return Math.round(score * 100) / 100;
}

/**
 * Calcula el cumplimiento respecto a la meta de árboles del proyecto.
 * Acumula todos los árboles sembrados registrados.
 */
async function calculateCompliance(projectId) {
  const { rows: [project] } = await query(
    'SELECT tree_goal FROM projects WHERE id = $1',
    [projectId]
  );
  if (!project || !project.tree_goal || project.tree_goal === 0) return null;

  const { rows: [totals] } = await query(
    'SELECT COALESCE(SUM(trees_planted), 0) AS total_planted FROM indicators WHERE project_id = $1',
    [projectId]
  );

  const pct = Math.min((totals.total_planted / project.tree_goal) * 100, 100);
  return Math.round(pct * 100) / 100;
}

/**
 * Proceso principal: se llama después de guardar un indicador.
 * 1. Calcula IVI del nuevo registro
 * 2. Calcula cumplimiento acumulado
 * 3. Persiste en project_metrics
 * 4. Genera alertas si corresponde
 */
async function processIndicator(indicator) {
  const ivi = calculateIVI({
    trees_planted:  indicator.trees_planted,
    trees_survived: indicator.trees_survived,
    temperature:    indicator.temperature,
    humidity:       indicator.humidity,
  });

  const compliance = await calculateCompliance(indicator.project_id);

  // Guardar IVI en el registro del indicador
  await query(
    'UPDATE indicators SET ivi = $1, compliance_pct = $2 WHERE id = $3',
    [ivi, compliance, indicator.id]
  );

  // Actualizar caché de métricas del proyecto
  await query(
    `INSERT INTO project_metrics (project_id, current_ivi, compliance_pct, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (project_id)
     DO UPDATE SET current_ivi = $2, compliance_pct = $3, updated_at = NOW()`,
    [indicator.project_id, ivi, compliance]
  );

  // ── Generar alertas automáticas ────────────────────────
  // RF05: IVI < 60%
  if (ivi < 60) {
    await alertService.createAlert({
      projectId: indicator.project_id,
      type: 'ivi_critico',
      message: `IVI crítico: ${ivi}% (umbral mínimo 60%)`,
    });
  }

  // RF06: Cumplimiento < 70%
  if (compliance !== null && compliance < 70) {
    await alertService.createAlert({
      projectId: indicator.project_id,
      type: 'cumplimiento_bajo',
      message: `Nivel de cumplimiento bajo: ${compliance}% (umbral mínimo 70%)`,
    });
  }

  // RF07: Baja supervivencia (< 50%)
  if (indicator.trees_planted > 0) {
    const survivalPct = (indicator.trees_survived / indicator.trees_planted) * 100;
    if (survivalPct < 50) {
      await alertService.createAlert({
        projectId: indicator.project_id,
        type: 'baja_supervivencia',
        message: `Supervivencia baja: ${survivalPct.toFixed(1)}% de árboles sobrevivientes`,
      });
    }
  }

  // RF07: Temperatura crítica (> 38 °C o < 5 °C)
  if (indicator.temperature !== null && indicator.temperature !== undefined) {
    if (indicator.temperature > 38 || indicator.temperature < 5) {
      await alertService.createAlert({
        projectId: indicator.project_id,
        type: 'temperatura_critica',
        message: `Temperatura crítica registrada: ${indicator.temperature}°C`,
      });
    }
  }

  return { ivi, compliance };
}

module.exports = { calculateIVI, calculateCompliance, processIndicator };
