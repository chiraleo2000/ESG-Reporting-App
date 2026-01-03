import { Request, Response } from 'express';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { env } from '../config/env';
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
    totalEmissions *= env.TIER2_PLUS_MULTIPLIER;
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
        totalEmissions *= env.TIER2_PLUS_MULTIPLIER;
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
