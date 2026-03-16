import { db } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { generateId, roundTo } from '../utils/helpers';

/**
 * GHG Protocol Compliant Emission Factors
 *
 * SCOPE 1: Direct GHG Emissions
 * - Stationary Combustion (boilers, furnaces, heaters)
 * - Mobile Combustion (company vehicles)
 * - Process Emissions (industrial processes)
 * - Fugitive Emissions (refrigerants, SF6)
 *
 * SCOPE 2: Indirect GHG Emissions (4 Categories)
 * - Purchased Electricity
 * - Purchased Steam
 * - Purchased Heating
 * - Purchased Cooling
 *
 * SCOPE 3: Other Indirect Emissions (14 Categories)
 * - Cat 1: Purchased Goods & Services
 * - Cat 2: Capital Goods
 * - Cat 3: Fuel & Energy Related Activities
 * - Cat 4: Upstream Transportation & Distribution
 * - Cat 5: Waste Generated in Operations
 * - Cat 6: Business Travel
 * - Cat 7: Employee Commuting
 * - Cat 8: Upstream Leased Assets
 * - Cat 9: Downstream Transportation & Distribution
 * - Cat 10: Processing of Sold Products
 * - Cat 11: Use of Sold Products
 * - Cat 12: End-of-Life Treatment of Sold Products
 * - Cat 13: Downstream Leased Assets
 * - Cat 14: Franchises
 * - Cat 15: Investments
 */

// Default emission factors by activity type (kg CO2e per unit)
const DEFAULT_EMISSION_FACTORS: Record<string, Record<string, number>> = {
  // ========================================
  // SCOPE 1 - DIRECT EMISSIONS
  // ========================================

  // Scope 1 - Stationary Combustion (boilers, furnaces, generators)
  stationary_combustion: {
    // Natural Gas
    'natural_gas_m3': 2.02,
    'natural_gas_kwh': 0.184,
    'natural_gas_mmbtu': 53.06,
    'm3': 2.02,
    // Diesel/Gasoil
    'diesel_l': 2.68,
    'diesel_kwh': 0.25,
    'l': 2.68,
    // LPG
    'lpg_kg': 2.98,
    'lpg_l': 1.51,
    'kg': 2.98,
    // Coal
    'coal_kg': 2.42,
    'coal_tonne': 2420,
    // Fuel Oil
    'fuel_oil_l': 2.96,
    'heavy_fuel_oil_l': 3.17,
    // Biomass (biogenic - often reported separately)
    'wood_kg': 0.015, // Net emissions after biogenic offset
    'biomass_kg': 0.01,
    // Default
    'kwh': 0.184,
    'mwh': 184,
  },

  // Scope 1 - Mobile Combustion (company-owned vehicles)
  mobile_combustion: {
    // Fuel-based factors
    'petrol_l': 2.31,
    'gasoline_l': 2.31,
    'diesel_l': 2.68,
    'cng_m3': 2.02,
    'cng_kg': 2.75,
    'lpg_l': 1.51,
    'l': 2.31,
    // Distance-based factors (km)
    'km_car_petrol': 0.17,
    'km_car_diesel': 0.16,
    'km_car_hybrid': 0.1,
    'km_car_electric': 0.05, // Depends on grid factor
    'km_motorcycle': 0.08,
    'km_van_small': 0.2,
    'km_van_large': 0.28,
    'km_truck_small': 0.45,
    'km_truck_medium': 0.65,
    'km_truck_large': 0.89,
    'km_truck_articulated': 0.92,
    'km': 0.17,
    // Distance-based factors (miles)
    'miles_car': 0.27,
    'miles_truck': 1.43,
    'miles': 0.27,
  },

  // Scope 1 - Process Emissions (industrial processes)
  process_emissions: {
    // Cement & Limestone
    'cement_tonne': 525,
    'clinker_tonne': 840,
    'lime_tonne': 750,
    'limestone_calcination_tonne': 440,
    // Iron & Steel
    'steel_basic_oxygen_tonne': 1850,
    'steel_electric_arc_tonne': 580,
    'steel_tonne': 1850,
    'pig_iron_tonne': 1350,
    'coke_tonne': 3100,
    // Aluminum
    'aluminum_primary_tonne': 11000,
    'aluminum_secondary_tonne': 600,
    'aluminum_tonne': 11000,
    // Chemicals
    'ammonia_tonne': 1600,
    'nitric_acid_tonne': 2600,
    'adipic_acid_tonne': 2800,
    'hydrogen_grey_tonne': 9000,
    'hydrogen_blue_tonne': 4500,
    'methanol_tonne': 700,
    // Glass & Ceramics
    'glass_tonne': 590,
    'ceramics_tonne': 430,
    // Default
    'tonne': 525,
    'kg': 0.525,
  },

  // Scope 1 - Fugitive Emissions (leakages, refrigerants)
  fugitive_emissions: {
    // HFC Refrigerants
    'refrigerant_r410a_kg': 2088,
    'refrigerant_r134a_kg': 1430,
    'refrigerant_r32_kg': 675,
    'refrigerant_r404a_kg': 3922,
    'refrigerant_r407c_kg': 1774,
    'refrigerant_r507a_kg': 3985,
    // HCFC Refrigerants
    'refrigerant_r22_kg': 1810,
    // High GWP gases
    'sf6_kg': 22800,
    'pfc_kg': 9200,
    'nf3_kg': 17200,
    // Methane
    'methane_kg': 25,
    'natural_gas_leak_m3': 0.68, // Fugitive leaks
    // CO2 extinguishers
    'co2_fire_extinguisher_kg': 1,
    // Default
    'kg': 2088,
  },

  // ========================================
  // SCOPE 2 - INDIRECT FROM ENERGY (4 Categories)
  // ========================================

  // Scope 2 Cat 1: Purchased Electricity
  purchased_electricity: {
    'kwh': 0.42, // Global average
    'mwh': 420,
    'gj': 116.67,
    // Regional defaults (can be overridden by grid factors)
    'kwh_thailand': 0.4561,
    'kwh_china': 0.581,
    'kwh_japan': 0.457,
    'kwh_korea': 0.459,
    'kwh_germany': 0.366,
    'kwh_uk': 0.207,
    'kwh_usa': 0.389,
    'kwh_eu': 0.276,
    'kwh_india': 0.72,
  },

  // Scope 2 Cat 2: Purchased Steam
  purchased_steam: {
    'kwh': 0.19,
    'mwh': 190,
    'gj': 52.78,
    'tonne_steam': 72, // Per tonne of steam
    'kg_steam': 0.072,
  },

  // Scope 2 Cat 3: Purchased Heating
  purchased_heating: {
    'kwh': 0.18,
    'mwh': 180,
    'gj': 50,
    'therms': 5.3,
  },

  // Scope 2 Cat 4: Purchased Cooling
  purchased_cooling: {
    'kwh': 0.15,
    'mwh': 150,
    'ton_hour': 1.17, // Refrigeration ton-hour
    'gj': 41.67,
  },

  // Combined Scope 2 for backward compatibility
  purchased_heat_steam: {
    'kwh': 0.18,
    'mwh': 180,
    'gj': 50,
  },

  // ========================================
  // SCOPE 3 - OTHER INDIRECT (14 Categories)
  // ========================================

  // Scope 3 Cat 1: Purchased Goods & Services
  purchased_goods: {
    // Spend-based factors (kg CO2e per currency)
    'usd': 0.5,
    'eur': 0.45,
    'gbp': 0.4,
    'jpy': 0.004,
    'cny': 0.07,
    'thb': 0.015,
    // Material-based factors (kg CO2e per kg)
    'kg_generic': 2,
    'kg_paper': 1.2,
    'kg_plastic': 3.5,
    'kg_metal': 2.8,
    'kg_chemicals': 2.5,
    'kg_textiles': 15,
    'kg_electronics': 20,
    'kg_food': 2.5,
    'kg_beverages': 0.8,
    'kg_furniture': 1.5,
    // Service-based
    'consulting_hour': 5,
    'it_service_hour': 3,
    'kg': 2,
  },

  // Scope 3 Cat 2: Capital Goods
  capital_goods: {
    'usd': 0.5,
    'eur': 0.45,
    // Asset-based factors
    'vehicle_unit': 6000,
    'computer_unit': 300,
    'server_unit': 1500,
    'machinery_tonne': 3000,
    'building_m2': 400,
    'equipment_kg': 3,
    'kg': 3,
  },

  // Scope 3 Cat 3: Fuel & Energy Related Activities (not in Scope 1 or 2)
  fuel_energy: {
    // Well-to-tank (WTT) factors
    'kwh_wtt': 0.03,
    'kwh_electricity_wtt': 0.04,
    'l_petrol_wtt': 0.6,
    'l_diesel_wtt': 0.65,
    'm3_natural_gas_wtt': 0.4,
    // Transmission & Distribution losses
    'kwh_td_loss': 0.02,
    'kwh': 0.03,
  },

  // Scope 3 Cat 4: Upstream Transportation & Distribution
  upstream_transport: {
    // Freight transport (per tonne-km)
    'tonne_km_road': 0.1,
    'tonne_km_rail': 0.03,
    'tonne_km_sea': 0.01,
    'tonne_km_sea_container': 0.015,
    'tonne_km_sea_bulk': 0.008,
    'tonne_km_air': 0.6,
    'tonne_km_air_short': 1,
    'tonne_km_air_long': 0.5,
    'tonne_km': 0.1,
    // Per package/shipment
    'package_domestic': 0.5,
    'package_international': 2,
  },

  // Scope 3 Cat 5: Waste Generated in Operations
  waste: {
    // Disposal methods (per kg)
    'kg_landfill': 0.58,
    'kg_landfill_organic': 1.2, // Higher due to methane
    'kg_incineration': 0.02,
    'kg_incineration_energy_recovery': 0.01,
    'kg_recycling': 0.02,
    'kg_composting': 0.1,
    'kg_anaerobic_digestion': 0.05,
    // Wastewater
    'm3_wastewater_treatment': 0.8,
    'kg_wastewater_sludge': 0.3,
    // Hazardous waste
    'kg_hazardous': 1.5,
    'kg': 0.58,
    'tonnes': 580,
  },

  // Scope 3 Cat 6: Business Travel
  business_travel: {
    // Air travel (per passenger-km)
    'km_air_short': 0.255, // <500km
    'km_air_medium': 0.195, // 500-1500km
    'km_air_long': 0.15, // >1500km
    'km_air_domestic': 0.246,
    'km_air_international': 0.195,
    'km_air': 0.195,
    'passenger_km_air': 0.195,
    // Rail travel
    'km_rail': 0.035,
    'km_rail_national': 0.035,
    'km_rail_eurostar': 0.006,
    'km_rail_high_speed': 0.025,
    'passenger_km_rail': 0.035,
    // Road travel
    'km_car': 0.17,
    'km_taxi': 0.21,
    'km_bus': 0.089,
    'km_rental_car': 0.18,
    // Accommodation
    'hotel_night': 31,
    'hotel_night_luxury': 60,
    'hotel_night_budget': 15,
    'km': 0.195,
    'miles': 0.314,
  },

  // Scope 3 Cat 7: Employee Commuting
  employee_commuting: {
    // Per passenger-km
    'km_car': 0.17,
    'km_car_petrol': 0.18,
    'km_car_diesel': 0.16,
    'km_car_hybrid': 0.1,
    'km_car_electric': 0.05,
    'km_motorcycle': 0.08,
    'km_bus': 0.089,
    'km_train': 0.035,
    'km_metro': 0.03,
    'km_tram': 0.028,
    'km_bike': 0,
    'km_walk': 0,
    'km_e_bike': 0.008,
    'km_e_scooter': 0.035,
    // Work from home
    'wfh_day': 0.5, // Per day working from home
    'km': 0.17,
  },

  // Scope 3 Cat 8: Upstream Leased Assets
  upstream_leased: {
    // Per m2 per year
    'm2_office': 150,
    'm2_warehouse': 50,
    'm2_retail': 200,
    'm2_data_center': 500,
    // Equipment
    'vehicle_day': 15,
    'equipment_day': 10,
    'm2': 150,
  },

  // Scope 3 Cat 9: Downstream Transportation & Distribution
  downstream_transport: {
    'tonne_km': 0.1,
    'tonne_km_road': 0.1,
    'tonne_km_rail': 0.03,
    'tonne_km_sea': 0.01,
    'tonne_km_air': 0.6,
    'delivery_small': 0.5,
    'delivery_large': 2,
  },

  // Scope 3 Cat 10: Processing of Sold Products
  processing: {
    'unit': 10,
    'kg': 0.5,
    'tonne': 500,
    'kwh_processing': 0.42,
  },

  // Scope 3 Cat 11: Use of Sold Products
  use_of_products: {
    // Energy consuming products
    'kwh': 0.42,
    'kwh_lifetime': 0.42,
    'fuel_l': 2.68,
    'unit': 50, // Generic per unit lifetime emissions
    // Direct emissions from products
    'refrigerant_charge_kg': 2088,
    'aerosol_can': 1.5,
    'gas_appliance_year': 500,
  },

  // Scope 3 Cat 12: End-of-Life Treatment of Sold Products
  end_of_life: {
    'kg_landfill': 0.58,
    'kg_incineration': 0.02,
    'kg_recycling': 0.02,
    'kg_reuse': 0.01,
    'unit': 5, // Per product unit
    'kg': 0.58,
  },

  // Scope 3 Cat 13: Downstream Leased Assets
  downstream_leased: {
    'm2_year': 150,
    'm2_office': 150,
    'm2_retail': 200,
    'm2_warehouse': 50,
    'vehicle_year': 5500,
    'equipment_year': 1000,
  },

  // Scope 3 Cat 14: Franchises
  franchises: {
    'franchise_unit_year': 50000,
    'm2_franchise': 200,
    'revenue_1000': 500,
    'unit': 50000,
  },

  // Scope 3 Cat 15: Investments (optional)
  investments: {
    'equity_1000_usd': 100,
    'debt_1000_usd': 50,
    'project_finance_1000_usd': 200,
    'm2_property': 150,
    'usd': 0.1,
  },

  // Legacy compatibility aliases
  air_travel: {
    'km': 0.195,
    'passenger_km': 0.195,
    'miles': 0.314,
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
      factor: Number.parseFloat(dbResult.rows[0].factor_value),
      source: dbResult.rows[0].source,
    };
    await redis.setex(cacheKey, 3600, JSON.stringify(result));
    return result;
  }

  // Fall back to default factors
  const activityFactors = DEFAULT_EMISSION_FACTORS[activityType];
  if (activityFactors) {
    const unitKey = unit.toLowerCase().replaceAll(/\s+/g, '_');
    const factor = activityFactors[unitKey];
    
    if (factor !== undefined) {
      const result = { factor, source: 'default' };
      await redis.setex(cacheKey, 3600, JSON.stringify(result));
      return result;
    }
  }

  // Log warning and return conservative estimate
  logger.warn(`No emission factor found for ${activityType}/${unit}, using estimate`);
  return { factor: 1, source: 'estimate' };
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
      factor: Number.parseFloat(result.rows[0].factor_kg_co2_per_kwh),
      source: result.rows[0].source,
    };
    await redis.setex(cacheKey, 86400, JSON.stringify(data));
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
      factor: Number.parseFloat(prevResult.rows[0].factor_kg_co2_per_kwh),
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
    const precursorFactor = Number.parseFloat(precursor.factor_kg_co2_per_kg);
    
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
    aluminum: { direct: 1.5, indirect: 8.5, precursor: 1 },
    fertilizers: { direct: 1.6, indirect: 0.1, precursor: 0 },
    electricity: { direct: 0, indirect: 0.42, precursor: 0 },
    hydrogen: { direct: 9, indirect: 0.5, precursor: 0 },
  };

  const category = goodsCategory.toLowerCase();
  const defaults = cbamDefaults[category] || { direct: 1, indirect: 0.2, precursor: 0.1 };

  // Try to get country-specific factors from database
  const result = await db.query(
    `SELECT * FROM cbam_default_values
     WHERE goods_category = $1 AND country = $2`,
    [category, countryOfOrigin]
  );

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      directEmissions: Number.parseFloat(row.direct_emissions),
      indirectEmissions: Number.parseFloat(row.indirect_emissions),
      precursorEmissions: Number.parseFloat(row.precursor_emissions),
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
    const total = Number.parseFloat(row.total) || 0;
    
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
