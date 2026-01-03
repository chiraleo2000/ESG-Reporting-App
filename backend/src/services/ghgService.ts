import { db } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { generateId, roundTo } from '../utils/helpers';

// Default emission factors by activity type (kg CO2e per unit)
const DEFAULT_EMISSION_FACTORS: Record<string, Record<string, number>> = {
  // Scope 1 - Stationary Combustion
  stationary_combustion: {
    'natural_gas_m3': 2.02,
    'natural_gas_kwh': 0.184,
    'diesel_l': 2.68,
    'lpg_kg': 2.98,
    'coal_kg': 2.42,
    'fuel_oil_l': 2.96,
  },
  // Scope 1 - Mobile Combustion
  mobile_combustion: {
    'petrol_l': 2.31,
    'diesel_l': 2.68,
    'cng_m3': 2.02,
    'lpg_l': 1.51,
    'km_car_petrol': 0.17,
    'km_car_diesel': 0.16,
    'km_truck': 0.89,
    'km_van': 0.25,
  },
  // Scope 1 - Process Emissions
  process_emissions: {
    'cement_tonne': 525,
    'lime_tonne': 750,
    'steel_tonne': 1850,
    'aluminum_tonne': 11000,
    'ammonia_tonne': 1600,
  },
  // Scope 1 - Fugitive Emissions
  fugitive_emissions: {
    'refrigerant_r410a_kg': 2088,
    'refrigerant_r134a_kg': 1430,
    'refrigerant_r22_kg': 1810,
    'sf6_kg': 22800,
    'methane_kg': 25,
  },
  // Scope 2 - Purchased Electricity (global average)
  purchased_electricity: {
    'kwh': 0.42,
    'mwh': 420,
  },
  // Scope 2 - Purchased Heat/Steam
  purchased_heat_steam: {
    'kwh': 0.18,
    'mwh': 180,
    'gj': 50,
  },
  // Scope 3 Categories
  purchased_goods: {
    'usd': 0.5,
    'kg_generic': 2.0,
  },
  capital_goods: {
    'usd': 0.5,
  },
  fuel_energy: {
    'kwh_wtt': 0.03,
  },
  upstream_transport: {
    'tonne_km_road': 0.1,
    'tonne_km_rail': 0.03,
    'tonne_km_sea': 0.01,
    'tonne_km_air': 0.6,
  },
  waste: {
    'kg_landfill': 0.58,
    'kg_incineration': 0.02,
    'kg_recycling': 0.02,
  },
  business_travel: {
    'km_air_short': 0.255,
    'km_air_long': 0.195,
    'km_rail': 0.035,
    'km_car': 0.17,
    'hotel_night': 31.0,
  },
  employee_commuting: {
    'km_car': 0.17,
    'km_bus': 0.089,
    'km_train': 0.035,
    'km_bike': 0,
    'km_walk': 0,
  },
  downstream_transport: {
    'tonne_km': 0.1,
  },
  processing: {
    'unit': 10,
  },
  use_of_products: {
    'kwh': 0.42,
    'unit': 50,
  },
  end_of_life: {
    'kg_landfill': 0.58,
    'kg_recycling': 0.02,
  },
  air_travel: {
    'km': 0.195,
    'passenger_km': 0.195,
  },
};

/**
 * Look up emission factor for activity
 */
export async function lookupEmissionFactor(
  activityType: string,
  unit: string,
  scope: string
): Promise<{ factor: number; source: string }> {
  // Try cache first
  const cacheKey = `ef:${activityType}:${unit}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }

  // Try database custom factors
  const dbResult = await db.query(
    `SELECT factor_value, source FROM emission_factors 
     WHERE activity_type = $1 AND unit = $2
     ORDER BY year DESC LIMIT 1`,
    [activityType, unit]
  );

  if (dbResult.rows.length > 0) {
    const result = {
      factor: parseFloat(dbResult.rows[0].factor_value),
      source: dbResult.rows[0].source,
    };
    await redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  // Fall back to default factors
  const activityFactors = DEFAULT_EMISSION_FACTORS[activityType];
  if (activityFactors) {
    const unitKey = unit.toLowerCase().replace(/\s+/g, '_');
    const factor = activityFactors[unitKey];
    
    if (factor !== undefined) {
      const result = { factor, source: 'default' };
      await redis.set(cacheKey, JSON.stringify(result), 3600);
      return result;
    }
  }

  // Log warning and return conservative estimate
  logger.warn(`No emission factor found for ${activityType}/${unit}, using estimate`);
  return { factor: 1.0, source: 'estimate' };
}

/**
 * Get grid emission factor for a region and year
 */
export async function getGridEmissionFactor(
  region: string,
  year: number
): Promise<{ factor: number; source: string }> {
  // Check cache
  const cacheKey = `grid_ef:${region}:${year}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }

  // Query database
  const result = await db.query(
    `SELECT factor_kg_co2_per_kwh, source FROM grid_emission_factors
     WHERE region ILIKE $1 AND year = $2
     ORDER BY created_at DESC LIMIT 1`,
    [`%${region}%`, year]
  );

  if (result.rows.length > 0) {
    const data = {
      factor: parseFloat(result.rows[0].factor_kg_co2_per_kwh),
      source: result.rows[0].source,
    };
    await redis.set(cacheKey, JSON.stringify(data), 86400);
    return data;
  }

  // Try previous year
  const prevResult = await db.query(
    `SELECT factor_kg_co2_per_kwh, source, year FROM grid_emission_factors
     WHERE region ILIKE $1 AND year < $2
     ORDER BY year DESC LIMIT 1`,
    [`%${region}%`, year]
  );

  if (prevResult.rows.length > 0) {
    logger.info(`Using ${prevResult.rows[0].year} grid EF for ${region} (${year} not found)`);
    return {
      factor: parseFloat(prevResult.rows[0].factor_kg_co2_per_kwh),
      source: `${prevResult.rows[0].source} (${prevResult.rows[0].year})`,
    };
  }

  // Global average fallback
  logger.warn(`No grid emission factor found for ${region}, using global average`);
  return { factor: 0.42, source: 'global_average' };
}

/**
 * Calculate precursor emissions
 */
export async function calculatePrecursors(
  activityId: string,
  activityType: string,
  quantity: number,
  unit: string
): Promise<number> {
  // Get precursor factors for this activity type
  const result = await db.query(
    `SELECT * FROM precursor_factors 
     WHERE material_type ILIKE $1 OR activity_type ILIKE $1`,
    [`%${activityType}%`]
  );

  if (result.rows.length === 0) {
    return 0;
  }

  let totalPrecursorEmissions = 0;

  for (const precursor of result.rows) {
    const precursorFactor = parseFloat(precursor.factor_kg_co2_per_kg);
    
    // Convert quantity to kg if needed
    let quantityKg = quantity;
    if (unit === 'tonnes' || unit === 'tonne') {
      quantityKg = quantity * 1000;
    } else if (unit === 'g') {
      quantityKg = quantity / 1000;
    }

    const precursorEmissions = quantityKg * precursorFactor;
    totalPrecursorEmissions += precursorEmissions;

    // Save precursor calculation
    await db.query(
      `INSERT INTO precursor_calculations (
        id, activity_id, precursor_type, quantity_kg, emission_factor,
        emissions_kg_co2e, production_route
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        generateId(),
        activityId,
        precursor.material_type,
        quantityKg,
        precursorFactor,
        roundTo(precursorEmissions, 4),
        precursor.production_route,
      ]
    );
  }

  return roundTo(totalPrecursorEmissions, 4);
}

/**
 * Calculate Scope 2 market-based emissions
 */
export async function calculateScope2MarketBased(
  electricityKwh: number,
  contractualInstruments: ContractualInstrument[]
): Promise<{ emissions: number; source: string }> {
  let totalEmissions = 0;
  let remainingKwh = electricityKwh;

  // Apply contractual instruments in order
  for (const instrument of contractualInstruments) {
    if (remainingKwh <= 0) break;

    const coveredKwh = Math.min(instrument.quantityKwh, remainingKwh);
    const emissions = coveredKwh * instrument.emissionFactor;
    totalEmissions += emissions;
    remainingKwh -= coveredKwh;
  }

  // Any remaining uses residual mix
  if (remainingKwh > 0) {
    totalEmissions += remainingKwh * 0.42; // Global average as residual
  }

  return {
    emissions: roundTo(totalEmissions, 4),
    source: 'market_based',
  };
}

interface ContractualInstrument {
  type: 'ppa' | 'rec' | 'goo';
  quantityKwh: number;
  emissionFactor: number;
  supplier?: string;
}

/**
 * Get emission factors for CBAM goods
 */
export async function getCBAMEmissionFactors(
  goodsCategory: string,
  countryOfOrigin: string
): Promise<{
  directEmissions: number;
  indirectEmissions: number;
  precursorEmissions: number;
  source: string;
}> {
  // CBAM default values by category
  const cbamDefaults: Record<string, { direct: number; indirect: number; precursor: number }> = {
    cement: { direct: 0.525, indirect: 0.05, precursor: 0 },
    iron_steel: { direct: 1.85, indirect: 0.2, precursor: 0.3 },
    aluminum: { direct: 1.5, indirect: 8.5, precursor: 1.0 },
    fertilizers: { direct: 1.6, indirect: 0.1, precursor: 0 },
    electricity: { direct: 0, indirect: 0.42, precursor: 0 },
    hydrogen: { direct: 9.0, indirect: 0.5, precursor: 0 },
  };

  const category = goodsCategory.toLowerCase();
  const defaults = cbamDefaults[category] || { direct: 1.0, indirect: 0.2, precursor: 0.1 };

  // Try to get country-specific factors from database
  const result = await db.query(
    `SELECT * FROM cbam_default_values
     WHERE goods_category = $1 AND country = $2`,
    [category, countryOfOrigin]
  );

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      directEmissions: parseFloat(row.direct_emissions),
      indirectEmissions: parseFloat(row.indirect_emissions),
      precursorEmissions: parseFloat(row.precursor_emissions),
      source: `cbam_${countryOfOrigin}`,
    };
  }

  return {
    directEmissions: defaults.direct,
    indirectEmissions: defaults.indirect,
    precursorEmissions: defaults.precursor,
    source: 'cbam_default',
  };
}

/**
 * Aggregate emissions by scope for project
 */
export async function aggregateProjectEmissions(projectId: string): Promise<{
  scope1: number;
  scope2: number;
  scope3: number;
  scope3Categories: Record<string, number>;
  total: number;
}> {
  const result = await db.query(
    `SELECT 
       scope,
       scope3_category,
       SUM(total_emissions_kg_co2e) as total
     FROM activities
     WHERE project_id = $1 AND calculation_status = 'calculated'
     GROUP BY scope, scope3_category`,
    [projectId]
  );

  const emissions = {
    scope1: 0,
    scope2: 0,
    scope3: 0,
    scope3Categories: {} as Record<string, number>,
    total: 0,
  };

  for (const row of result.rows) {
    const total = parseFloat(row.total) || 0;
    
    switch (row.scope) {
      case 'scope1':
        emissions.scope1 += total;
        break;
      case 'scope2':
        emissions.scope2 += total;
        break;
      case 'scope3':
        emissions.scope3 += total;
        if (row.scope3_category) {
          emissions.scope3Categories[row.scope3_category] = 
            (emissions.scope3Categories[row.scope3_category] || 0) + total;
        }
        break;
    }
    
    emissions.total += total;
  }

  // Round all values
  emissions.scope1 = roundTo(emissions.scope1, 4);
  emissions.scope2 = roundTo(emissions.scope2, 4);
  emissions.scope3 = roundTo(emissions.scope3, 4);
  emissions.total = roundTo(emissions.total, 4);

  for (const cat of Object.keys(emissions.scope3Categories)) {
    emissions.scope3Categories[cat] = roundTo(emissions.scope3Categories[cat], 4);
  }

  return emissions;
}
