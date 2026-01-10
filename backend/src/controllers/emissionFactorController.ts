import { Request, Response } from 'express';
import { db } from '../config/database';
import { redisClient as redis } from '../config/redis';
import { generateId, roundTo } from '../utils/helpers';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as serpAPIService from '../services/serpAPIService';
import type { AuditAction } from '../types';

// Audit log helper
async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  details: object,
  projectId?: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, project_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [generateId(), userId, projectId || null, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Search emission factors using SERPAPI
 */
export async function searchEmissionFactors(req: Request, res: Response): Promise<void> {
  const { activityType, unit, region, source } = req.query;

  if (!activityType) {
    throw new BadRequestError('Activity type is required');
  }

  // Check cache first
  const cacheKey = `ef:search:${activityType}:${unit || 'any'}:${region || 'global'}:${source || 'any'}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    res.json({
      success: true,
      data: JSON.parse(cached),
      cached: true,
    });
    return;
  }

  // Search using SERPAPI
  const results = await serpAPIService.searchEmissionFactors(
    activityType as string,
    unit as string,
    region as string,
    source as string
  );

  // Cache results for 24 hours
  await redis.set(cacheKey, JSON.stringify(results), 86400);

  res.json({
    success: true,
    data: results,
    cached: false,
  });
}

/**
 * Get all grid emission factors
 */
export async function getGridEmissionFactors(req: Request, res: Response): Promise<void> {
  const { region, year, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (region) {
    whereClause += ` AND region ILIKE $${paramIndex}`;
    params.push(`%${region}%`);
    paramIndex++;
  }

  if (year) {
    whereClause += ` AND year = $${paramIndex}`;
    params.push(parseInt(year as string));
    paramIndex++;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) FROM grid_emission_factors ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT * FROM grid_emission_factors ${whereClause}
     ORDER BY region, year DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      region: row.region,
      country: row.country,
      gridName: row.grid_name,
      year: row.year,
      factorKgCo2PerKwh: parseFloat(row.factor_kg_co2_per_kwh),
      source: row.source,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      createdAt: row.created_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Get grid emission factor by region and year
 */
export async function getGridEmissionFactor(req: Request, res: Response): Promise<void> {
  const { region, year } = req.params;

  const result = await db.query(
    `SELECT * FROM grid_emission_factors 
     WHERE region ILIKE $1 AND year = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [`%${region}%`, parseInt(year)]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Grid emission factor not found for ${region} in ${year}`);
  }

  const row = result.rows[0];

  res.json({
    success: true,
    data: {
      id: row.id,
      region: row.region,
      country: row.country,
      gridName: row.grid_name,
      year: row.year,
      factorKgCo2PerKwh: parseFloat(row.factor_kg_co2_per_kwh),
      source: row.source,
      validFrom: row.valid_from,
      validTo: row.valid_to,
    },
  });
}

/**
 * Create or update grid emission factor (admin only)
 */
export async function upsertGridEmissionFactor(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { region, country, gridName, year, factorKgCo2PerKwh, source, validFrom, validTo } = req.body;

  // Check if exists
  const existing = await db.query(
    `SELECT id FROM grid_emission_factors WHERE region = $1 AND year = $2`,
    [region, year]
  );

  let id: string;

  if (existing.rows.length > 0) {
    id = existing.rows[0].id;
    await db.query(
      `UPDATE grid_emission_factors SET
         country = COALESCE($1, country),
         grid_name = COALESCE($2, grid_name),
         factor_kg_co2_per_kwh = $3,
         source = COALESCE($4, source),
         valid_from = COALESCE($5, valid_from),
         valid_to = COALESCE($6, valid_to),
         updated_at = NOW()
       WHERE id = $7`,
      [country, gridName, factorKgCo2PerKwh, source, validFrom, validTo, id]
    );
  } else {
    id = generateId();
    await db.query(
      `INSERT INTO grid_emission_factors (
        id, region, country, grid_name, year, factor_kg_co2_per_kwh, source, valid_from, valid_to
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, region, country, gridName, year, factorKgCo2PerKwh, source, validFrom, validTo]
    );
  }

  await logAudit(userId, existing.rows.length > 0 ? 'UPDATE' : 'CREATE', 'grid_emission_factor', id, {
    region,
    year,
    factorKgCo2PerKwh,
  });

  // Clear grid EF cache
  await redis.del(`grid_ef:${region}:${year}`);

  res.status(existing.rows.length > 0 ? 200 : 201).json({
    success: true,
    data: {
      id,
      region,
      year,
      factorKgCo2PerKwh,
    },
    message: existing.rows.length > 0 ? 'Grid emission factor updated' : 'Grid emission factor created',
  });
}

/**
 * Delete grid emission factor (admin only)
 */
export async function deleteGridEmissionFactor(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await db.query(
    `DELETE FROM grid_emission_factors WHERE id = $1 RETURNING region, year`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Grid emission factor not found');
  }

  await logAudit(userId, 'DELETE', 'grid_emission_factor', id, {
    region: result.rows[0].region,
    year: result.rows[0].year,
  });

  res.json({
    success: true,
    message: 'Grid emission factor deleted successfully',
  });
}

/**
 * Get all precursor factors
 */
export async function getPrecursorFactors(req: Request, res: Response): Promise<void> {
  const { material, productionRoute, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (material) {
    whereClause += ` AND material_type ILIKE $${paramIndex}`;
    params.push(`%${material}%`);
    paramIndex++;
  }

  if (productionRoute) {
    whereClause += ` AND production_route ILIKE $${paramIndex}`;
    params.push(`%${productionRoute}%`);
    paramIndex++;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) FROM precursor_factors ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  params.push(Number(limit), offset);
  const result = await db.query(
    `SELECT * FROM precursor_factors ${whereClause}
     ORDER BY material_type, production_route
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      materialType: row.material_type,
      productionRoute: row.production_route,
      factorKgCo2PerKg: parseFloat(row.factor_kg_co2_per_kg),
      source: row.source,
      notes: row.notes,
      isDefault: row.is_default,
      createdAt: row.created_at,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Get precursor factor by material and route
 */
export async function getPrecursorFactor(req: Request, res: Response): Promise<void> {
  const { material, route } = req.params;

  const result = await db.query(
    `SELECT * FROM precursor_factors 
     WHERE material_type ILIKE $1 AND production_route ILIKE $2
     LIMIT 1`,
    [`%${material}%`, `%${route}%`]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Precursor factor not found for ${material} via ${route}`);
  }

  const row = result.rows[0];

  res.json({
    success: true,
    data: {
      id: row.id,
      materialType: row.material_type,
      productionRoute: row.production_route,
      factorKgCo2PerKg: parseFloat(row.factor_kg_co2_per_kg),
      source: row.source,
      notes: row.notes,
      isDefault: row.is_default,
    },
  });
}

/**
 * Create or update precursor factor (admin only)
 */
export async function upsertPrecursorFactor(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { materialType, productionRoute, factorKgCo2PerKg, source, notes, isDefault } = req.body;

  // Check if exists
  const existing = await db.query(
    `SELECT id FROM precursor_factors WHERE material_type = $1 AND production_route = $2`,
    [materialType, productionRoute]
  );

  let id: string;

  if (existing.rows.length > 0) {
    id = existing.rows[0].id;
    await db.query(
      `UPDATE precursor_factors SET
         factor_kg_co2_per_kg = $1,
         source = COALESCE($2, source),
         notes = COALESCE($3, notes),
         is_default = COALESCE($4, is_default),
         updated_at = NOW()
       WHERE id = $5`,
      [factorKgCo2PerKg, source, notes, isDefault, id]
    );
  } else {
    id = generateId();
    await db.query(
      `INSERT INTO precursor_factors (
        id, material_type, production_route, factor_kg_co2_per_kg, source, notes, is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, materialType, productionRoute, factorKgCo2PerKg, source, notes, isDefault || false]
    );
  }

  await logAudit(userId, existing.rows.length > 0 ? 'UPDATE' : 'CREATE', 'precursor_factor', id, {
    materialType,
    productionRoute,
    factorKgCo2PerKg,
  });

  res.status(existing.rows.length > 0 ? 200 : 201).json({
    success: true,
    data: {
      id,
      materialType,
      productionRoute,
      factorKgCo2PerKg,
    },
    message: existing.rows.length > 0 ? 'Precursor factor updated' : 'Precursor factor created',
  });
}

/**
 * Delete precursor factor (admin only)
 */
export async function deletePrecursorFactor(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await db.query(
    `DELETE FROM precursor_factors WHERE id = $1 RETURNING material_type, production_route`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Precursor factor not found');
  }

  await logAudit(userId, 'DELETE', 'precursor_factor', id, {
    materialType: result.rows[0].material_type,
    productionRoute: result.rows[0].production_route,
  });

  res.json({
    success: true,
    message: 'Precursor factor deleted successfully',
  });
}

/**
 * Get standard emission factors (curated list)
 */
export async function getStandardEmissionFactors(req: Request, res: Response): Promise<void> {
  const { category, scope } = req.query;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (category) {
    whereClause += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (scope) {
    whereClause += ` AND scope = $${paramIndex}`;
    params.push(scope);
    paramIndex++;
  }

  const result = await db.query(
    `SELECT * FROM emission_factors ${whereClause}
     ORDER BY category, activity_type`,
    params
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      category: row.category,
      activityType: row.activity_type,
      scope: row.scope,
      unit: row.unit,
      factorValue: parseFloat(row.factor_value),
      factorUnit: row.factor_unit,
      source: row.source,
      region: row.region,
      year: row.year,
      notes: row.notes,
    })),
  });
}

/**
 * Bulk import emission factors (admin only)
 */
export async function bulkImportEmissionFactors(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { factors, type } = req.body;

  if (!Array.isArray(factors) || factors.length === 0) {
    throw new BadRequestError('Factors array is required');
  }

  const results = {
    imported: 0,
    updated: 0,
    errors: [] as any[],
  };

  await db.transaction(async (client) => {
    for (let i = 0; i < factors.length; i++) {
      const factor = factors[i];
      try {
        if (type === 'grid') {
          // Grid emission factor
          const existing = await client.query(
            `SELECT id FROM grid_emission_factors WHERE region = $1 AND year = $2`,
            [factor.region, factor.year]
          );

          if (existing.rows.length > 0) {
            await client.query(
              `UPDATE grid_emission_factors SET
                 factor_kg_co2_per_kwh = $1, source = $2, updated_at = NOW()
               WHERE id = $3`,
              [factor.factorKgCo2PerKwh, factor.source, existing.rows[0].id]
            );
            results.updated++;
          } else {
            await client.query(
              `INSERT INTO grid_emission_factors (id, region, country, year, factor_kg_co2_per_kwh, source)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [generateId(), factor.region, factor.country, factor.year, factor.factorKgCo2PerKwh, factor.source]
            );
            results.imported++;
          }
        } else if (type === 'precursor') {
          // Precursor factor
          const existing = await client.query(
            `SELECT id FROM precursor_factors WHERE material_type = $1 AND production_route = $2`,
            [factor.materialType, factor.productionRoute]
          );

          if (existing.rows.length > 0) {
            await client.query(
              `UPDATE precursor_factors SET
                 factor_kg_co2_per_kg = $1, source = $2, updated_at = NOW()
               WHERE id = $3`,
              [factor.factorKgCo2PerKg, factor.source, existing.rows[0].id]
            );
            results.updated++;
          } else {
            await client.query(
              `INSERT INTO precursor_factors (id, material_type, production_route, factor_kg_co2_per_kg, source)
               VALUES ($1, $2, $3, $4, $5)`,
              [generateId(), factor.materialType, factor.productionRoute, factor.factorKgCo2PerKg, factor.source]
            );
            results.imported++;
          }
        } else {
          // Standard emission factor
          const id = generateId();
          await client.query(
            `INSERT INTO emission_factors (
              id, category, activity_type, scope, unit, factor_value, factor_unit, source, region, year
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT DO NOTHING`,
            [
              id,
              factor.category,
              factor.activityType,
              factor.scope,
              factor.unit,
              factor.factorValue,
              factor.factorUnit,
              factor.source,
              factor.region,
              factor.year,
            ]
          );
          results.imported++;
        }
      } catch (error: any) {
        results.errors.push({ index: i, error: error.message });
      }
    }
  });

  await logAudit(userId, 'BULK_IMPORT', 'emission_factor', null, {
    type,
    imported: results.imported,
    updated: results.updated,
    errors: results.errors.length,
  });

  res.status(201).json({
    success: true,
    data: results,
  });
}

/**
 * Lookup emission factor via SERPAPI
 */
export async function serpAPILookup(req: Request, res: Response): Promise<void> {
  const { query, activityType, region, unit } = req.body;

  if (!query && !activityType) {
    throw new BadRequestError('Query or activity type is required');
  }

  const searchQuery = query || activityType;
  
  // Check cache first
  const cacheKey = `serpapi:${searchQuery}:${region || 'global'}:${unit || 'any'}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    res.json({
      success: true,
      data: JSON.parse(cached),
      cached: true,
    });
    return;
  }

  // Search using SERPAPI
  const results = await serpAPIService.searchEmissionFactors(
    searchQuery,
    unit as string,
    region as string,
    undefined
  );

  // Cache results for 24 hours
  await redis.set(cacheKey, JSON.stringify(results), 86400);

  res.json({
    success: true,
    data: results,
    cached: false,
  });
}

/**
 * Get grid emission factor for a country and year
 */
export async function getGridEF(req: Request, res: Response): Promise<void> {
  const { country, year } = req.params;

  const result = await db.query(
    `SELECT * FROM grid_emission_factors 
     WHERE (country ILIKE $1 OR region ILIKE $1) AND year = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [`%${country}%`, parseInt(year)]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`Grid emission factor not found for ${country} in ${year}`);
  }

  const row = result.rows[0];

  res.json({
    success: true,
    data: {
      id: row.id,
      country: row.country,
      region: row.region,
      gridName: row.grid_name,
      year: row.year,
      factorKgCo2PerKwh: parseFloat(row.factor_kg_co2_per_kwh),
      source: row.source,
      validFrom: row.valid_from,
      validTo: row.valid_to,
    },
  });
}

/**
 * Get grid emission factor history for a country
 */
export async function getGridEFHistory(req: Request, res: Response): Promise<void> {
  const { country } = req.params;

  const result = await db.query(
    `SELECT * FROM grid_emission_factors 
     WHERE country ILIKE $1 OR region ILIKE $1
     ORDER BY year DESC`,
    [`%${country}%`]
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      country: row.country,
      region: row.region,
      gridName: row.grid_name,
      year: row.year,
      factorKgCo2PerKwh: parseFloat(row.factor_kg_co2_per_kwh),
      source: row.source,
      validFrom: row.valid_from,
      validTo: row.valid_to,
    })),
  });
}

/**
 * Override grid emission factor for a project
 */
export async function overrideGridEF(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { projectId, country, year, factorKgCo2PerKwh, source, justification } = req.body;

  const overrideId = generateId();

  // Check if override already exists
  const existing = await db.query(
    `SELECT id FROM grid_ef_overrides 
     WHERE project_id = $1 AND country = $2 AND year = $3`,
    [projectId, country, year]
  );

  if (existing.rows.length > 0) {
    // Update existing override
    await db.query(
      `UPDATE grid_ef_overrides SET
         factor_kg_co2_per_kwh = $1,
         source = $2,
         justification = $3,
         updated_at = NOW()
       WHERE project_id = $4 AND country = $5 AND year = $6`,
      [factorKgCo2PerKwh, source, justification, projectId, country, year]
    );

    res.json({
      success: true,
      message: 'Grid EF override updated',
      data: { id: existing.rows[0].id },
    });
  } else {
    // Create new override
    await db.query(
      `INSERT INTO grid_ef_overrides (id, project_id, country, year, factor_kg_co2_per_kwh, source, justification, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [overrideId, projectId, country, year, factorKgCo2PerKwh, source, justification, userId]
    );

    await logAudit(userId, 'CREATE', 'grid_ef_override', overrideId, {
      projectId, country, year, factorKgCo2PerKwh
    }, projectId);

    res.status(201).json({
      success: true,
      message: 'Grid EF override created',
      data: { id: overrideId },
    });
  }
}

/**
 * Delete grid emission factor override
 */
export async function deleteGridEFOverride(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { projectId, country } = req.params;

  const result = await db.query(
    `DELETE FROM grid_ef_overrides 
     WHERE project_id = $1 AND country = $2
     RETURNING id`,
    [projectId, country]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Grid EF override not found');
  }

  await logAudit(userId, 'DELETE', 'grid_ef_override', result.rows[0].id, {
    projectId, country
  }, projectId);

  res.json({
    success: true,
    message: 'Grid EF override deleted',
  });
}

/**
 * Get default precursor factors
 */
export async function getPrecursorDefaults(req: Request, res: Response): Promise<void> {
  const result = await db.query(
    `SELECT * FROM precursor_factors 
     WHERE is_default = true
     ORDER BY material_type, production_route`
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      materialType: row.material_type,
      productionRoute: row.production_route,
      factorKgCo2PerKg: parseFloat(row.factor_kg_co2_per_kg),
      source: row.source,
      notes: row.notes,
    })),
  });
}

/**
 * Get precursor factors for a project (including overrides)
 */
export async function getProjectPrecursorFactors(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  // Get default factors
  const defaultsResult = await db.query(
    `SELECT * FROM precursor_factors WHERE is_default = true`
  );

  // Get project overrides
  const overridesResult = await db.query(
    `SELECT * FROM precursor_factor_overrides WHERE project_id = $1`,
    [projectId]
  );

  // Merge defaults with overrides
  const factors = defaultsResult.rows.map((defaultFactor) => {
    const override = overridesResult.rows.find(
      (o) => o.material_type === defaultFactor.material_type && 
             o.production_route === defaultFactor.production_route
    );

    if (override) {
      return {
        id: defaultFactor.id,
        materialType: defaultFactor.material_type,
        productionRoute: defaultFactor.production_route,
        factorKgCo2PerKg: parseFloat(override.factor_kg_co2_per_kg),
        source: override.source,
        isOverridden: true,
        overrideId: override.id,
        justification: override.justification,
      };
    }

    return {
      id: defaultFactor.id,
      materialType: defaultFactor.material_type,
      productionRoute: defaultFactor.production_route,
      factorKgCo2PerKg: parseFloat(defaultFactor.factor_kg_co2_per_kg),
      source: defaultFactor.source,
      isOverridden: false,
    };
  });

  res.json({
    success: true,
    data: factors,
  });
}

/**
 * Override precursor factor for a project
 */
export async function overridePrecursorFactor(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { projectId, materialType, productionRoute, factorKgCo2PerKg, source, justification } = req.body;

  const overrideId = generateId();

  // Check if override already exists
  const existing = await db.query(
    `SELECT id FROM precursor_factor_overrides 
     WHERE project_id = $1 AND material_type = $2 AND production_route = $3`,
    [projectId, materialType, productionRoute]
  );

  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE precursor_factor_overrides SET
         factor_kg_co2_per_kg = $1,
         source = $2,
         justification = $3,
         updated_at = NOW()
       WHERE project_id = $4 AND material_type = $5 AND production_route = $6`,
      [factorKgCo2PerKg, source, justification, projectId, materialType, productionRoute]
    );

    res.json({
      success: true,
      message: 'Precursor factor override updated',
      data: { id: existing.rows[0].id },
    });
  } else {
    await db.query(
      `INSERT INTO precursor_factor_overrides (id, project_id, material_type, production_route, factor_kg_co2_per_kg, source, justification, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [overrideId, projectId, materialType, productionRoute, factorKgCo2PerKg, source, justification, userId]
    );

    await logAudit(userId, 'CREATE', 'precursor_factor_override', overrideId, {
      projectId, materialType, productionRoute, factorKgCo2PerKg
    }, projectId);

    res.status(201).json({
      success: true,
      message: 'Precursor factor override created',
      data: { id: overrideId },
    });
  }
}

/**
 * Delete precursor factor override
 */
export async function deletePrecursorOverride(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { projectId, materialType, productionRoute } = req.params;

  const result = await db.query(
    `DELETE FROM precursor_factor_overrides 
     WHERE project_id = $1 AND material_type = $2 AND production_route = $3
     RETURNING id`,
    [projectId, materialType, productionRoute]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Precursor factor override not found');
  }

  await logAudit(userId, 'DELETE', 'precursor_factor_override', result.rows[0].id, {
    projectId, materialType, productionRoute
  }, projectId);

  res.json({
    success: true,
    message: 'Precursor factor override deleted',
  });
}

/**
 * Get standard emission factors by standard
 */
export async function getStandardEFs(req: Request, res: Response): Promise<void> {
  const { standard } = req.params;

  const result = await db.query(
    `SELECT * FROM emission_factors 
     WHERE source ILIKE $1 OR category ILIKE $1
     ORDER BY category, activity_type`,
    [`%${standard}%`]
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      category: row.category,
      activityType: row.activity_type,
      scope: row.scope,
      unit: row.unit,
      factorValue: parseFloat(row.factor_value),
      factorUnit: row.factor_unit,
      source: row.source,
      region: row.region,
      year: row.year,
      notes: row.notes,
    })),
  });
}
