import { Request, Response } from 'express';
import { db } from '../config/database';
import { redisClient as redis } from '../config/redis';
import { config } from '../config/env';
import { generateId, roundTo } from '../utils/helpers';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as ghgService from '../services/ghgService';
import type { AuditAction, CFPResult, CFOResult } from '../types';

// Audit log helper
async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  details: object,
  projectId: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, project_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [generateId(), userId, projectId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Calculate emissions for a single activity
 */
export async function calculateActivity(req: Request, res: Response): Promise<void> {
  const { projectId, activityId } = req.params;
  const userId = req.user!.id;
  const { emissionFactorId, customEmissionFactor, tierLevel, includePrecursors } = req.body;

  // Get activity
  const activityResult = await db.query(
    `SELECT * FROM activities WHERE id = $1 AND project_id = $2`,
    [activityId, projectId]
  );

  if (activityResult.rows.length === 0) {
    throw new NotFoundError('Activity not found');
  }

  const activity = activityResult.rows[0];

  // Get emission factor
  let emissionFactor: number;
  let emissionFactorSource: string;

  if (customEmissionFactor) {
    emissionFactor = customEmissionFactor;
    emissionFactorSource = 'custom';
  } else if (emissionFactorId) {
    const efResult = await db.query(
      `SELECT * FROM emission_factors WHERE id = $1`,
      [emissionFactorId]
    );
    if (efResult.rows.length === 0) {
      throw new NotFoundError('Emission factor not found');
    }
    emissionFactor = parseFloat(efResult.rows[0].factor_value);
    emissionFactorSource = efResult.rows[0].source;
  } else {
    // Use default emission factor lookup
    const lookupResult = await ghgService.lookupEmissionFactor(
      activity.activity_type,
      activity.unit,
      activity.scope
    );
    emissionFactor = lookupResult.factor;
    emissionFactorSource = lookupResult.source;
  }

  // Calculate base emissions
  let totalEmissions = activity.quantity * emissionFactor;

  // Apply tier multiplier if Tier 2+
  const tier = tierLevel || activity.tier_level;
  if (tier === 'tier2plus') {
    totalEmissions *= config.tier2PlusMultiplier;
  }

  // Calculate precursors if requested
  let precursorEmissions = 0;
  if (includePrecursors && activity.scope === 'scope3') {
    precursorEmissions = await ghgService.calculatePrecursors(
      activityId,
      activity.activity_type,
      activity.quantity,
      activity.unit
    );
    totalEmissions += precursorEmissions;
  }

  // Round to reasonable precision
  totalEmissions = roundTo(totalEmissions, 4);

  // Update activity with calculated emissions
  await db.query(
    `UPDATE activities SET
       calculation_status = 'calculated',
       total_emissions_kg_co2e = $1,
       emission_factor_used = $2,
       tier_level = $3,
       calculated_at = NOW(),
       updated_at = NOW()
     WHERE id = $4`,
    [totalEmissions, JSON.stringify({ factor: emissionFactor, source: emissionFactorSource }), tier, activityId]
  );

  await logAudit(userId, 'CALCULATE', 'activity', activityId, {
    emissionFactor,
    totalEmissions,
    tierLevel: tier,
    precursorEmissions,
  }, projectId);

  res.json({
    success: true,
    data: {
      activityId,
      quantity: parseFloat(activity.quantity),
      unit: activity.unit,
      emissionFactor,
      emissionFactorSource,
      tierLevel: tier,
      precursorEmissions,
      totalEmissionsKgCo2e: totalEmissions,
    },
  });
}

/**
 * Calculate all pending activities for a project
 */
export async function calculateAllActivities(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { includePrecursors = false } = req.body;

  // Get all pending activities
  const activitiesResult = await db.query(
    `SELECT * FROM activities WHERE project_id = $1 AND calculation_status = 'pending'`,
    [projectId]
  );

  const results = {
    calculated: [] as any[],
    errors: [] as any[],
  };

  for (const activity of activitiesResult.rows) {
    try {
      // Lookup emission factor
      const lookupResult = await ghgService.lookupEmissionFactor(
        activity.activity_type,
        activity.unit,
        activity.scope
      );

      let totalEmissions = activity.quantity * lookupResult.factor;

      // Apply tier multiplier
      if (activity.tier_level === 'tier2plus') {
        totalEmissions *= config.tier2PlusMultiplier;
      }

      // Calculate precursors
      let precursorEmissions = 0;
      if (includePrecursors && activity.scope === 'scope3') {
        precursorEmissions = await ghgService.calculatePrecursors(
          activity.id,
          activity.activity_type,
          activity.quantity,
          activity.unit
        );
        totalEmissions += precursorEmissions;
      }

      totalEmissions = roundTo(totalEmissions, 4);

      // Update activity
      await db.query(
        `UPDATE activities SET
           calculation_status = 'calculated',
           total_emissions_kg_co2e = $1,
           emission_factor_used = $2,
           calculated_at = NOW(),
           updated_at = NOW()
         WHERE id = $3`,
        [totalEmissions, JSON.stringify({ factor: lookupResult.factor, source: lookupResult.source }), activity.id]
      );

      results.calculated.push({
        activityId: activity.id,
        name: activity.name,
        totalEmissionsKgCo2e: totalEmissions,
      });
    } catch (error: any) {
      await db.query(
        `UPDATE activities SET calculation_status = 'error', updated_at = NOW() WHERE id = $1`,
        [activity.id]
      );
      results.errors.push({
        activityId: activity.id,
        name: activity.name,
        error: error.message,
      });
    }
  }

  await logAudit(userId, 'BULK_CALCULATE', 'activity', null, {
    calculated: results.calculated.length,
    errors: results.errors.length,
  }, projectId);

  res.json({
    success: true,
    data: {
      ...results,
      summary: {
        total: activitiesResult.rows.length,
        calculated: results.calculated.length,
        errors: results.errors.length,
      },
    },
  });
}

/**
 * Calculate CFP (Carbon Footprint of Product)
 */
export async function calculateCFP(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { productName, functionalUnit, productionVolume, allocationMethod, includeBiogenic } = req.body;

  // Get all calculated activities for the project
  const activitiesResult = await db.query(
    `SELECT * FROM activities 
     WHERE project_id = $1 AND calculation_status = 'calculated'
     ORDER BY scope, scope3_category`,
    [projectId]
  );

  if (activitiesResult.rows.length === 0) {
    throw new BadRequestError('No calculated activities found. Please calculate activities first.');
  }

  const activities = activitiesResult.rows;

  // Calculate emissions by lifecycle stage
  const lifecycleStages = {
    rawMaterials: 0,
    production: 0,
    distribution: 0,
    use: 0,
    endOfLife: 0,
  };

  // Map activities to lifecycle stages
  for (const activity of activities) {
    const emissions = parseFloat(activity.total_emissions_kg_co2e) || 0;
    
    // Scope 1 & 2 go to production
    if (activity.scope === 'scope1' || activity.scope === 'scope2') {
      lifecycleStages.production += emissions;
    } else if (activity.scope === 'scope3') {
      // Map Scope 3 categories to lifecycle stages
      switch (activity.scope3_category) {
        case 'purchased_goods':
        case 'capital_goods':
        case 'fuel_energy':
          lifecycleStages.rawMaterials += emissions;
          break;
        case 'upstream_transport':
        case 'downstream_transport':
          lifecycleStages.distribution += emissions;
          break;
        case 'waste':
        case 'end_of_life':
          lifecycleStages.endOfLife += emissions;
          break;
        case 'use_of_products':
        case 'processing':
          lifecycleStages.use += emissions;
          break;
        default:
          lifecycleStages.production += emissions;
      }
    }
  }

  // Calculate totals
  const totalEmissions = Object.values(lifecycleStages).reduce((sum, val) => sum + val, 0);
  const cfpPerUnit = productionVolume > 0 ? totalEmissions / productionVolume : totalEmissions;

  // Biogenic carbon handling
  let biogenicCarbon = 0;
  if (includeBiogenic) {
    // Query for biogenic emissions (would need separate tracking in real implementation)
    const biogenicResult = await db.query(
      `SELECT SUM(COALESCE((metadata->>'biogenic_emissions')::numeric, 0)) as biogenic
       FROM activities WHERE project_id = $1`,
      [projectId]
    );
    biogenicCarbon = parseFloat(biogenicResult.rows[0]?.biogenic) || 0;
  }

  // Save CFP result
  const cfpId = generateId();
  await db.query(
    `INSERT INTO cfp_results (
      id, project_id, product_name, functional_unit, production_volume,
      allocation_method, raw_materials_emissions, production_emissions,
      distribution_emissions, use_emissions, end_of_life_emissions,
      cfp_total, cfp_per_unit, biogenic_carbon
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      cfpId,
      projectId,
      productName,
      functionalUnit,
      productionVolume,
      allocationMethod || 'mass',
      roundTo(lifecycleStages.rawMaterials, 4),
      roundTo(lifecycleStages.production, 4),
      roundTo(lifecycleStages.distribution, 4),
      roundTo(lifecycleStages.use, 4),
      roundTo(lifecycleStages.endOfLife, 4),
      roundTo(totalEmissions, 4),
      roundTo(cfpPerUnit, 6),
      roundTo(biogenicCarbon, 4),
    ]
  );

  await logAudit(userId, 'CALCULATE_CFP', 'cfp', cfpId, {
    productName,
    totalEmissions,
    cfpPerUnit,
  }, projectId);

  res.json({
    success: true,
    data: {
      id: cfpId,
      productName,
      functionalUnit,
      productionVolume,
      allocationMethod: allocationMethod || 'mass',
      lifecycleStages: {
        rawMaterials: roundTo(lifecycleStages.rawMaterials, 4),
        production: roundTo(lifecycleStages.production, 4),
        distribution: roundTo(lifecycleStages.distribution, 4),
        use: roundTo(lifecycleStages.use, 4),
        endOfLife: roundTo(lifecycleStages.endOfLife, 4),
      },
      cfpTotal: roundTo(totalEmissions, 4),
      cfpPerUnit: roundTo(cfpPerUnit, 6),
      biogenicCarbon: roundTo(biogenicCarbon, 4),
    },
  });
}

/**
 * Calculate CFO (Carbon Footprint of Organization)
 */
export async function calculateCFO(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { organizationName, consolidationMethod, operationalBoundary, reportingYear } = req.body;

  // Get all calculated activities
  const activitiesResult = await db.query(
    `SELECT * FROM activities 
     WHERE project_id = $1 AND calculation_status = 'calculated'
     ORDER BY scope`,
    [projectId]
  );

  if (activitiesResult.rows.length === 0) {
    throw new BadRequestError('No calculated activities found. Please calculate activities first.');
  }

  // Calculate by scope
  const scopeEmissions = {
    scope1: 0,
    scope2Location: 0,
    scope2Market: 0,
    scope3Upstream: 0,
    scope3Downstream: 0,
  };

  const scope3CategoryBreakdown: Record<string, number> = {};

  for (const activity of activitiesResult.rows) {
    const emissions = parseFloat(activity.total_emissions_kg_co2e) || 0;

    switch (activity.scope) {
      case 'scope1':
        scopeEmissions.scope1 += emissions;
        break;
      case 'scope2':
        // For simplicity, treat as location-based (would need separate tracking for market-based)
        scopeEmissions.scope2Location += emissions;
        break;
      case 'scope3':
        const category = activity.scope3_category || 'other';
        scope3CategoryBreakdown[category] = (scope3CategoryBreakdown[category] || 0) + emissions;
        
        // Determine upstream vs downstream
        const upstreamCategories = [
          'purchased_goods', 'capital_goods', 'fuel_energy', 'upstream_transport',
          'waste', 'business_travel', 'employee_commuting', 'upstream_leased'
        ];
        if (upstreamCategories.includes(category)) {
          scopeEmissions.scope3Upstream += emissions;
        } else {
          scopeEmissions.scope3Downstream += emissions;
        }
        break;
    }
  }

  // Calculate totals
  const totalScope1 = scopeEmissions.scope1;
  const totalScope2 = scopeEmissions.scope2Location; // Using location-based
  const totalScope3 = scopeEmissions.scope3Upstream + scopeEmissions.scope3Downstream;
  const cfoTotal = totalScope1 + totalScope2 + totalScope3;

  // Save CFO result
  const cfoId = generateId();
  await db.query(
    `INSERT INTO cfo_results (
      id, project_id, organization_name, reporting_year, consolidation_method,
      operational_boundary, scope1_emissions, scope2_location_emissions,
      scope2_market_emissions, scope3_upstream_emissions, scope3_downstream_emissions,
      scope3_category_breakdown, cfo_total
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      cfoId,
      projectId,
      organizationName,
      reportingYear || new Date().getFullYear(),
      consolidationMethod || 'operational_control',
      operationalBoundary || 'all',
      roundTo(totalScope1, 4),
      roundTo(scopeEmissions.scope2Location, 4),
      roundTo(scopeEmissions.scope2Market, 4),
      roundTo(scopeEmissions.scope3Upstream, 4),
      roundTo(scopeEmissions.scope3Downstream, 4),
      JSON.stringify(scope3CategoryBreakdown),
      roundTo(cfoTotal, 4),
    ]
  );

  await logAudit(userId, 'CALCULATE_CFO', 'cfo', cfoId, {
    organizationName,
    cfoTotal,
    scope1: totalScope1,
    scope2: totalScope2,
    scope3: totalScope3,
  }, projectId);

  res.json({
    success: true,
    data: {
      id: cfoId,
      organizationName,
      reportingYear: reportingYear || new Date().getFullYear(),
      consolidationMethod: consolidationMethod || 'operational_control',
      operationalBoundary: operationalBoundary || 'all',
      emissions: {
        scope1: roundTo(totalScope1, 4),
        scope2: {
          locationBased: roundTo(scopeEmissions.scope2Location, 4),
          marketBased: roundTo(scopeEmissions.scope2Market, 4),
        },
        scope3: {
          upstream: roundTo(scopeEmissions.scope3Upstream, 4),
          downstream: roundTo(scopeEmissions.scope3Downstream, 4),
          categoryBreakdown: Object.fromEntries(
            Object.entries(scope3CategoryBreakdown).map(([k, v]) => [k, roundTo(v, 4)])
          ),
        },
      },
      cfoTotal: roundTo(cfoTotal, 4),
    },
  });
}

/**
 * Get CFP results for a project
 */
export async function getCFPResults(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  const result = await db.query(
    `SELECT * FROM cfp_results WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId]
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      productName: row.product_name,
      functionalUnit: row.functional_unit,
      productionVolume: parseFloat(row.production_volume),
      allocationMethod: row.allocation_method,
      lifecycleStages: {
        rawMaterials: parseFloat(row.raw_materials_emissions),
        production: parseFloat(row.production_emissions),
        distribution: parseFloat(row.distribution_emissions),
        use: parseFloat(row.use_emissions),
        endOfLife: parseFloat(row.end_of_life_emissions),
      },
      cfpTotal: parseFloat(row.cfp_total),
      cfpPerUnit: parseFloat(row.cfp_per_unit),
      biogenicCarbon: parseFloat(row.biogenic_carbon),
      createdAt: row.created_at,
    })),
  });
}

/**
 * Get CFO results for a project
 */
export async function getCFOResults(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  const result = await db.query(
    `SELECT * FROM cfo_results WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId]
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      organizationName: row.organization_name,
      reportingYear: row.reporting_year,
      consolidationMethod: row.consolidation_method,
      operationalBoundary: row.operational_boundary,
      emissions: {
        scope1: parseFloat(row.scope1_emissions),
        scope2: {
          locationBased: parseFloat(row.scope2_location_emissions),
          marketBased: parseFloat(row.scope2_market_emissions),
        },
        scope3: {
          upstream: parseFloat(row.scope3_upstream_emissions),
          downstream: parseFloat(row.scope3_downstream_emissions),
          categoryBreakdown: row.scope3_category_breakdown,
        },
      },
      cfoTotal: parseFloat(row.cfo_total),
      createdAt: row.created_at,
    })),
  });
}

/**
 * Get project emission totals
 */
export async function getProjectTotals(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  // Get all calculated activities grouped by scope
  const result = await db.query(
    `SELECT 
       scope,
       scope3_category,
       COUNT(*) as activity_count,
       SUM(total_emissions_kg_co2e) as total_emissions
     FROM activities
     WHERE project_id = $1 AND calculation_status = 'calculated'
     GROUP BY scope, scope3_category
     ORDER BY scope, scope3_category`,
    [projectId]
  );

  // Calculate totals
  const totals = {
    scope1: 0,
    scope2: 0,
    scope3: 0,
    scope3Categories: {} as Record<string, number>,
    total: 0,
    activityCount: 0,
  };

  for (const row of result.rows) {
    const emissions = parseFloat(row.total_emissions) || 0;
    const count = parseInt(row.activity_count) || 0;
    totals.activityCount += count;

    switch (row.scope) {
      case 'scope1':
        totals.scope1 += emissions;
        break;
      case 'scope2':
        totals.scope2 += emissions;
        break;
      case 'scope3':
        totals.scope3 += emissions;
        if (row.scope3_category) {
          totals.scope3Categories[row.scope3_category] = 
            (totals.scope3Categories[row.scope3_category] || 0) + emissions;
        }
        break;
    }
  }

  totals.total = totals.scope1 + totals.scope2 + totals.scope3;

  // Get pending activities count
  const pendingResult = await db.query(
    `SELECT COUNT(*) as pending FROM activities 
     WHERE project_id = $1 AND calculation_status = 'pending'`,
    [projectId]
  );

  res.json({
    success: true,
    data: {
      scope1: roundTo(totals.scope1, 4),
      scope2: roundTo(totals.scope2, 4),
      scope3: roundTo(totals.scope3, 4),
      scope3Categories: Object.fromEntries(
        Object.entries(totals.scope3Categories).map(([k, v]) => [k, roundTo(v as number, 4)])
      ),
      total: roundTo(totals.total, 4),
      totalTonnesCO2e: roundTo(totals.total / 1000, 2),
      activityCount: totals.activityCount,
      pendingActivities: parseInt(pendingResult.rows[0].pending) || 0,
    },
  });
}

/**
 * Calculate both CFP and CFO
 */
export async function calculateBoth(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { 
    productName, 
    functionalUnit, 
    productionVolume, 
    allocationMethod, 
    includeBiogenic,
    organizationName,
    consolidationMethod,
    operationalBoundary,
    reportingYear 
  } = req.body;

  // Get all calculated activities
  const activitiesResult = await db.query(
    `SELECT * FROM activities 
     WHERE project_id = $1 AND calculation_status = 'calculated'
     ORDER BY scope`,
    [projectId]
  );

  if (activitiesResult.rows.length === 0) {
    throw new BadRequestError('No calculated activities found. Please calculate activities first.');
  }

  // Calculate CFP
  const cfpId = generateId();
  const lifecycleStages = {
    rawMaterials: 0,
    production: 0,
    distribution: 0,
    use: 0,
    endOfLife: 0,
  };

  // Calculate CFO
  const cfoId = generateId();
  const scopeEmissions = {
    scope1: 0,
    scope2Location: 0,
    scope2Market: 0,
    scope3Upstream: 0,
    scope3Downstream: 0,
  };
  const scope3CategoryBreakdown: Record<string, number> = {};

  for (const activity of activitiesResult.rows) {
    const emissions = parseFloat(activity.total_emissions_kg_co2e) || 0;

    // CFP mapping
    if (activity.scope === 'scope1' || activity.scope === 'scope2') {
      lifecycleStages.production += emissions;
    } else if (activity.scope === 'scope3') {
      switch (activity.scope3_category) {
        case 'purchased_goods':
        case 'capital_goods':
        case 'fuel_energy':
          lifecycleStages.rawMaterials += emissions;
          break;
        case 'upstream_transport':
        case 'downstream_transport':
          lifecycleStages.distribution += emissions;
          break;
        case 'waste':
        case 'end_of_life':
          lifecycleStages.endOfLife += emissions;
          break;
        case 'use_of_products':
        case 'processing':
          lifecycleStages.use += emissions;
          break;
        default:
          lifecycleStages.production += emissions;
      }
    }

    // CFO mapping
    switch (activity.scope) {
      case 'scope1':
        scopeEmissions.scope1 += emissions;
        break;
      case 'scope2':
        scopeEmissions.scope2Location += emissions;
        break;
      case 'scope3':
        const category = activity.scope3_category || 'other';
        scope3CategoryBreakdown[category] = (scope3CategoryBreakdown[category] || 0) + emissions;
        const upstreamCategories = ['purchased_goods', 'capital_goods', 'fuel_energy', 'upstream_transport', 'waste', 'business_travel', 'employee_commuting', 'upstream_leased'];
        if (upstreamCategories.includes(category)) {
          scopeEmissions.scope3Upstream += emissions;
        } else {
          scopeEmissions.scope3Downstream += emissions;
        }
        break;
    }
  }

  const cfpTotal = Object.values(lifecycleStages).reduce((sum, val) => sum + val, 0);
  const cfpPerUnit = productionVolume > 0 ? cfpTotal / productionVolume : cfpTotal;
  const cfoTotal = scopeEmissions.scope1 + scopeEmissions.scope2Location + scopeEmissions.scope3Upstream + scopeEmissions.scope3Downstream;

  // Save CFP result
  await db.query(
    `INSERT INTO cfp_results (
      id, project_id, product_name, functional_unit, production_volume,
      allocation_method, raw_materials_emissions, production_emissions,
      distribution_emissions, use_emissions, end_of_life_emissions,
      cfp_total, cfp_per_unit, biogenic_carbon
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      cfpId, projectId, productName || 'Product', functionalUnit || 'unit', productionVolume || 1,
      allocationMethod || 'mass', roundTo(lifecycleStages.rawMaterials, 4),
      roundTo(lifecycleStages.production, 4), roundTo(lifecycleStages.distribution, 4),
      roundTo(lifecycleStages.use, 4), roundTo(lifecycleStages.endOfLife, 4),
      roundTo(cfpTotal, 4), roundTo(cfpPerUnit, 6), 0
    ]
  );

  // Save CFO result
  await db.query(
    `INSERT INTO cfo_results (
      id, project_id, organization_name, reporting_year, consolidation_method,
      operational_boundary, scope1_emissions, scope2_location_emissions,
      scope2_market_emissions, scope3_upstream_emissions, scope3_downstream_emissions,
      scope3_category_breakdown, cfo_total
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      cfoId, projectId, organizationName || 'Organization', reportingYear || new Date().getFullYear(),
      consolidationMethod || 'operational_control', operationalBoundary || 'all',
      roundTo(scopeEmissions.scope1, 4), roundTo(scopeEmissions.scope2Location, 4),
      roundTo(scopeEmissions.scope2Market, 4), roundTo(scopeEmissions.scope3Upstream, 4),
      roundTo(scopeEmissions.scope3Downstream, 4), JSON.stringify(scope3CategoryBreakdown),
      roundTo(cfoTotal, 4)
    ]
  );

  await logAudit(userId, 'CALCULATE_CFP', 'cfp', cfpId, { cfpTotal }, projectId);
  await logAudit(userId, 'CALCULATE_CFO', 'cfo', cfoId, { cfoTotal }, projectId);

  res.json({
    success: true,
    data: {
      cfp: {
        id: cfpId,
        cfpTotal: roundTo(cfpTotal, 4),
        cfpPerUnit: roundTo(cfpPerUnit, 6),
        lifecycleStages: Object.fromEntries(
          Object.entries(lifecycleStages).map(([k, v]) => [k, roundTo(v, 4)])
        ),
      },
      cfo: {
        id: cfoId,
        cfoTotal: roundTo(cfoTotal, 4),
        emissions: {
          scope1: roundTo(scopeEmissions.scope1, 4),
          scope2: roundTo(scopeEmissions.scope2Location, 4),
          scope3: roundTo(scopeEmissions.scope3Upstream + scopeEmissions.scope3Downstream, 4),
        },
      },
    },
  });
}

/**
 * Calculate precursor emissions for CBAM
 */
export async function calculatePrecursors(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { materials, productionRoutes, quantities } = req.body;

  if (!Array.isArray(materials) || materials.length === 0) {
    throw new BadRequestError('Materials array is required');
  }

  const results: any[] = [];
  let totalPrecursorEmissions = 0;

  for (let i = 0; i < materials.length; i++) {
    const material = materials[i];
    const route = productionRoutes?.[i] || 'default';
    const quantity = quantities?.[i] || 1;

    // Look up precursor factor
    const factorResult = await db.query(
      `SELECT * FROM precursor_factors 
       WHERE material_type ILIKE $1 AND production_route ILIKE $2
       LIMIT 1`,
      [`%${material}%`, `%${route}%`]
    );

    let factor = 0;
    let source = 'default';

    if (factorResult.rows.length > 0) {
      factor = parseFloat(factorResult.rows[0].factor_kg_co2_per_kg);
      source = factorResult.rows[0].source;
    } else {
      // Use default factor if not found
      factor = 2.0; // Default kg CO2 per kg
      source = 'default_estimate';
    }

    const emissions = quantity * factor;
    totalPrecursorEmissions += emissions;

    results.push({
      material,
      productionRoute: route,
      quantity,
      factor,
      source,
      emissions: roundTo(emissions, 4),
    });
  }

  res.json({
    success: true,
    data: {
      precursors: results,
      totalEmissions: roundTo(totalPrecursorEmissions, 4),
    },
  });
}

/**
 * Get emissions hot spots analysis
 */
export async function getHotSpots(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  // Get activities sorted by emissions
  const result = await db.query(
    `SELECT 
       id, name, scope, scope3_category, activity_type,
       total_emissions_kg_co2e,
       quantity, unit
     FROM activities
     WHERE project_id = $1 AND calculation_status = 'calculated'
     ORDER BY total_emissions_kg_co2e DESC
     LIMIT 20`,
    [projectId]
  );

  // Get total emissions for percentage calculation
  const totalResult = await db.query(
    `SELECT SUM(total_emissions_kg_co2e) as total
     FROM activities
     WHERE project_id = $1 AND calculation_status = 'calculated'`,
    [projectId]
  );

  const totalEmissions = parseFloat(totalResult.rows[0]?.total) || 0;

  // Get emissions by scope
  const scopeResult = await db.query(
    `SELECT scope, SUM(total_emissions_kg_co2e) as total
     FROM activities
     WHERE project_id = $1 AND calculation_status = 'calculated'
     GROUP BY scope
     ORDER BY total DESC`,
    [projectId]
  );

  // Get emissions by activity type
  const activityTypeResult = await db.query(
    `SELECT activity_type, SUM(total_emissions_kg_co2e) as total
     FROM activities
     WHERE project_id = $1 AND calculation_status = 'calculated'
     GROUP BY activity_type
     ORDER BY total DESC
     LIMIT 10`,
    [projectId]
  );

  const hotSpots = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    scope: row.scope,
    scope3Category: row.scope3_category,
    activityType: row.activity_type,
    emissions: parseFloat(row.total_emissions_kg_co2e),
    percentage: totalEmissions > 0 ? roundTo((parseFloat(row.total_emissions_kg_co2e) / totalEmissions) * 100, 2) : 0,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
  }));

  res.json({
    success: true,
    data: {
      hotSpots,
      byScope: scopeResult.rows.map((row) => ({
        scope: row.scope,
        emissions: parseFloat(row.total),
        percentage: totalEmissions > 0 ? roundTo((parseFloat(row.total) / totalEmissions) * 100, 2) : 0,
      })),
      byActivityType: activityTypeResult.rows.map((row) => ({
        activityType: row.activity_type,
        emissions: parseFloat(row.total),
        percentage: totalEmissions > 0 ? roundTo((parseFloat(row.total) / totalEmissions) * 100, 2) : 0,
      })),
      totalEmissions: roundTo(totalEmissions, 4),
    },
  });
}

/**
 * Get data quality assessment for a project
 */
export async function getDataQuality(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  // Get activities with their data quality scores
  const result = await db.query(
    `SELECT 
       scope,
       data_quality_score,
       data_source,
       tier_level,
       COUNT(*) as count,
       SUM(total_emissions_kg_co2e) as total_emissions
     FROM activities
     WHERE project_id = $1 AND calculation_status = 'calculated'
     GROUP BY scope, data_quality_score, data_source, tier_level`,
    [projectId]
  );

  // Calculate overall quality score
  const qualityScores: Record<string, number> = {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
    unknown: 0.3,
  };

  let totalWeightedScore = 0;
  let totalEmissions = 0;

  const breakdown = {
    byQuality: {} as Record<string, { count: number; emissions: number }>,
    byDataSource: {} as Record<string, { count: number; emissions: number }>,
    byTierLevel: {} as Record<string, { count: number; emissions: number }>,
    byScope: {} as Record<string, { count: number; emissions: number; avgQuality: number }>,
  };

  for (const row of result.rows) {
    const quality = row.data_quality_score || 'unknown';
    const emissions = parseFloat(row.total_emissions) || 0;
    const count = parseInt(row.count);

    totalWeightedScore += (qualityScores[quality] || 0.3) * emissions;
    totalEmissions += emissions;

    // By quality
    if (!breakdown.byQuality[quality]) {
      breakdown.byQuality[quality] = { count: 0, emissions: 0 };
    }
    breakdown.byQuality[quality].count += count;
    breakdown.byQuality[quality].emissions += emissions;

    // By data source
    const source = row.data_source || 'unknown';
    if (!breakdown.byDataSource[source]) {
      breakdown.byDataSource[source] = { count: 0, emissions: 0 };
    }
    breakdown.byDataSource[source].count += count;
    breakdown.byDataSource[source].emissions += emissions;

    // By tier level
    const tier = row.tier_level || 'tier1';
    if (!breakdown.byTierLevel[tier]) {
      breakdown.byTierLevel[tier] = { count: 0, emissions: 0 };
    }
    breakdown.byTierLevel[tier].count += count;
    breakdown.byTierLevel[tier].emissions += emissions;

    // By scope
    if (!breakdown.byScope[row.scope]) {
      breakdown.byScope[row.scope] = { count: 0, emissions: 0, avgQuality: 0 };
    }
    breakdown.byScope[row.scope].count += count;
    breakdown.byScope[row.scope].emissions += emissions;
  }

  const overallScore = totalEmissions > 0 ? roundTo(totalWeightedScore / totalEmissions, 2) : 0;

  // Determine quality rating
  let qualityRating: string;
  if (overallScore >= 0.9) qualityRating = 'excellent';
  else if (overallScore >= 0.7) qualityRating = 'good';
  else if (overallScore >= 0.5) qualityRating = 'moderate';
  else qualityRating = 'needs_improvement';

  res.json({
    success: true,
    data: {
      overallScore,
      qualityRating,
      breakdown,
      recommendations: getQualityRecommendations(breakdown),
    },
  });
}

// Helper function for quality recommendations
function getQualityRecommendations(breakdown: any): string[] {
  const recommendations: string[] = [];

  if (breakdown.byQuality['low']?.emissions > 0) {
    recommendations.push('Consider improving data quality for low-quality activities');
  }
  if (breakdown.byDataSource['estimate']?.emissions > 0) {
    recommendations.push('Replace estimated data with measured or invoiced data where possible');
  }
  if (breakdown.byTierLevel['tier1']?.count > (breakdown.byTierLevel['tier2']?.count || 0)) {
    recommendations.push('Consider using Tier 2+ calculations for more accurate results');
  }

  return recommendations;
}

/**
 * Compare emissions between baseline and reporting years
 */
export async function compareYears(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { baselineYear, reportingYear } = req.query;

  // Get project details
  const projectResult = await db.query(
    `SELECT baseline_year, reporting_year FROM projects WHERE id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) {
    throw new NotFoundError('Project not found');
  }

  const project = projectResult.rows[0];
  const baseline = parseInt(baselineYear as string) || project.baseline_year;
  const reporting = parseInt(reportingYear as string) || project.reporting_year;

  // Get CFO results for both years
  const cfoResults = await db.query(
    `SELECT * FROM cfo_results 
     WHERE project_id = $1 AND reporting_year IN ($2, $3)
     ORDER BY reporting_year`,
    [projectId, baseline, reporting]
  );

  const baselineCFO = cfoResults.rows.find((r) => r.reporting_year === baseline);
  const reportingCFO = cfoResults.rows.find((r) => r.reporting_year === reporting);

  if (!baselineCFO || !reportingCFO) {
    throw new BadRequestError('CFO results not found for both baseline and reporting years');
  }

  const baselineTotal = parseFloat(baselineCFO.cfo_total);
  const reportingTotal = parseFloat(reportingCFO.cfo_total);
  const absoluteChange = reportingTotal - baselineTotal;
  const percentageChange = baselineTotal > 0 ? (absoluteChange / baselineTotal) * 100 : 0;

  res.json({
    success: true,
    data: {
      baselineYear: baseline,
      reportingYear: reporting,
      baseline: {
        total: baselineTotal,
        scope1: parseFloat(baselineCFO.scope1_emissions),
        scope2: parseFloat(baselineCFO.scope2_location_emissions),
        scope3: parseFloat(baselineCFO.scope3_upstream_emissions) + parseFloat(baselineCFO.scope3_downstream_emissions),
      },
      reporting: {
        total: reportingTotal,
        scope1: parseFloat(reportingCFO.scope1_emissions),
        scope2: parseFloat(reportingCFO.scope2_location_emissions),
        scope3: parseFloat(reportingCFO.scope3_upstream_emissions) + parseFloat(reportingCFO.scope3_downstream_emissions),
      },
      comparison: {
        absoluteChange: roundTo(absoluteChange, 4),
        percentageChange: roundTo(percentageChange, 2),
        direction: absoluteChange > 0 ? 'increase' : absoluteChange < 0 ? 'decrease' : 'unchanged',
      },
    },
  });
}
