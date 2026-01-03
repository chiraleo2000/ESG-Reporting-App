import { env } from '../config/env';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const SERPAPI_BASE_URL = 'https://serpapi.com/search';

interface SerpAPIResponse {
  organic_results?: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
  error?: string;
}

interface EmissionFactorResult {
  activityType: string;
  factor: number;
  unit: string;
  source: string;
  url: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

/**
 * Search for emission factors using SERPAPI
 */
export async function searchEmissionFactors(
  activityType: string,
  unit?: string,
  region?: string,
  preferredSource?: string
): Promise<EmissionFactorResult[]> {
  // Build search query
  const searchTerms = [
    activityType,
    'emission factor',
    'kg CO2e',
    unit,
    region,
    preferredSource,
  ].filter(Boolean).join(' ');

  // Check cache
  const cacheKey = `serpapi:ef:${Buffer.from(searchTerms).toString('base64')}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    logger.debug(`SERPAPI cache hit for: ${activityType}`);
    return JSON.parse(cached);
  }

  // Make API request
  try {
    const params = new URLSearchParams({
      api_key: env.SERPAPI_KEY,
      q: searchTerms,
      engine: 'google',
      num: '10',
    });

    const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`SERPAPI request failed: ${response.status}`);
    }

    const data: SerpAPIResponse = await response.json();

    if (data.error) {
      throw new Error(`SERPAPI error: ${data.error}`);
    }

    // Parse results to extract emission factors
    const results = parseSearchResults(data.organic_results || [], activityType, unit);

    // Cache for 24 hours
    await redis.set(cacheKey, JSON.stringify(results), 86400);

    return results;
  } catch (error) {
    logger.error('SERPAPI search failed:', error);
    
    // Return fallback data
    return getFallbackEmissionFactors(activityType, unit);
  }
}

/**
 * Search for grid emission factors by region
 */
export async function searchGridEmissionFactors(
  region: string,
  year?: number
): Promise<EmissionFactorResult[]> {
  const searchYear = year || new Date().getFullYear();
  const searchTerms = `${region} grid emission factor ${searchYear} kg CO2 kWh electricity`;

  const cacheKey = `serpapi:grid:${region}:${searchYear}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const params = new URLSearchParams({
      api_key: env.SERPAPI_KEY,
      q: searchTerms,
      engine: 'google',
      num: '10',
    });

    const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`SERPAPI request failed: ${response.status}`);
    }

    const data: SerpAPIResponse = await response.json();
    const results = parseGridResults(data.organic_results || [], region, searchYear);

    await redis.set(cacheKey, JSON.stringify(results), 86400);

    return results;
  } catch (error) {
    logger.error('SERPAPI grid search failed:', error);
    return [];
  }
}

/**
 * Search for precursor emission factors
 */
export async function searchPrecursorFactors(
  material: string,
  productionRoute?: string
): Promise<EmissionFactorResult[]> {
  const searchTerms = [
    material,
    'embedded carbon',
    'emission factor',
    productionRoute,
    'kg CO2 per kg',
  ].filter(Boolean).join(' ');

  const cacheKey = `serpapi:precursor:${material}:${productionRoute || 'default'}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const params = new URLSearchParams({
      api_key: env.SERPAPI_KEY,
      q: searchTerms,
      engine: 'google',
      num: '10',
    });

    const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`SERPAPI request failed: ${response.status}`);
    }

    const data: SerpAPIResponse = await response.json();
    const results = parsePrecursorResults(data.organic_results || [], material);

    await redis.set(cacheKey, JSON.stringify(results), 86400);

    return results;
  } catch (error) {
    logger.error('SERPAPI precursor search failed:', error);
    return [];
  }
}

// Helper function to parse search results for emission factors
function parseSearchResults(
  results: SerpAPIResponse['organic_results'],
  activityType: string,
  unit?: string
): EmissionFactorResult[] {
  if (!results) return [];

  const parsed: EmissionFactorResult[] = [];

  for (const result of results) {
    // Try to extract emission factor from snippet
    const factorMatch = result.snippet.match(/(\d+\.?\d*)\s*(kg|g|t)\s*CO2e?\s*(?:per|\/)\s*(\w+)/i);
    
    if (factorMatch) {
      let factor = parseFloat(factorMatch[1]);
      const factorUnit = factorMatch[2].toLowerCase();
      const perUnit = factorMatch[3].toLowerCase();

      // Normalize to kg CO2e
      if (factorUnit === 'g') factor /= 1000;
      if (factorUnit === 't') factor *= 1000;

      // Determine confidence based on source
      let confidence: 'high' | 'medium' | 'low' = 'low';
      const trustedSources = ['gov', 'epa', 'ipcc', 'defra', 'ghgprotocol', 'iea'];
      if (trustedSources.some(s => result.link.toLowerCase().includes(s))) {
        confidence = 'high';
      } else if (result.link.includes('.org') || result.link.includes('.edu')) {
        confidence = 'medium';
      }

      parsed.push({
        activityType,
        factor,
        unit: unit || perUnit,
        source: new URL(result.link).hostname,
        url: result.link,
        confidence,
        notes: result.snippet.substring(0, 200),
      });
    }
  }

  // Sort by confidence
  return parsed.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

// Helper function to parse grid emission factor results
function parseGridResults(
  results: SerpAPIResponse['organic_results'],
  region: string,
  year: number
): EmissionFactorResult[] {
  if (!results) return [];

  const parsed: EmissionFactorResult[] = [];

  for (const result of results) {
    // Look for kgCO2/kWh patterns
    const factorMatch = result.snippet.match(/(\d+\.?\d*)\s*(kg|g)\s*CO2e?\s*(?:per|\/)\s*k?Wh/i);
    
    if (factorMatch) {
      let factor = parseFloat(factorMatch[1]);
      const factorUnit = factorMatch[2].toLowerCase();

      // Normalize to kg CO2e per kWh
      if (factorUnit === 'g') factor /= 1000;

      // Check for MWh
      if (result.snippet.toLowerCase().includes('/mwh') || result.snippet.toLowerCase().includes('per mwh')) {
        factor /= 1000;
      }

      let confidence: 'high' | 'medium' | 'low' = 'low';
      const trustedSources = ['iea', 'gov', 'epa', 'carbonfootprint', 'electricitymap'];
      if (trustedSources.some(s => result.link.toLowerCase().includes(s))) {
        confidence = 'high';
      }

      parsed.push({
        activityType: 'grid_electricity',
        factor,
        unit: 'kWh',
        source: new URL(result.link).hostname,
        url: result.link,
        confidence,
        notes: `${region} grid emission factor ${year}`,
      });
    }
  }

  return parsed.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

// Helper function to parse precursor results
function parsePrecursorResults(
  results: SerpAPIResponse['organic_results'],
  material: string
): EmissionFactorResult[] {
  if (!results) return [];

  const parsed: EmissionFactorResult[] = [];

  for (const result of results) {
    // Look for kg CO2/kg patterns
    const factorMatch = result.snippet.match(/(\d+\.?\d*)\s*(kg|t)\s*CO2e?\s*(?:per|\/)\s*(kg|t|tonne)/i);
    
    if (factorMatch) {
      let factor = parseFloat(factorMatch[1]);
      const numUnit = factorMatch[2].toLowerCase();
      const denUnit = factorMatch[3].toLowerCase();

      // Normalize to kg CO2e per kg
      if (numUnit === 't') factor *= 1000;
      if (denUnit === 't' || denUnit === 'tonne') factor /= 1000;

      let confidence: 'high' | 'medium' | 'low' = 'low';
      const trustedSources = ['worldsteel', 'aluminum', 'cembureau', 'gov', 'lca'];
      if (trustedSources.some(s => result.link.toLowerCase().includes(s))) {
        confidence = 'high';
      }

      parsed.push({
        activityType: `precursor_${material}`,
        factor,
        unit: 'kg',
        source: new URL(result.link).hostname,
        url: result.link,
        confidence,
        notes: `Embedded carbon for ${material}`,
      });
    }
  }

  return parsed.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

// Fallback emission factors when API fails
function getFallbackEmissionFactors(activityType: string, unit?: string): EmissionFactorResult[] {
  const fallbacks: Record<string, EmissionFactorResult> = {
    electricity: {
      activityType: 'purchased_electricity',
      factor: 0.42,
      unit: 'kWh',
      source: 'global_average',
      url: '',
      confidence: 'medium',
      notes: 'Global average grid emission factor',
    },
    natural_gas: {
      activityType: 'stationary_combustion',
      factor: 2.02,
      unit: 'm3',
      source: 'ipcc_default',
      url: '',
      confidence: 'medium',
      notes: 'IPCC default for natural gas',
    },
    diesel: {
      activityType: 'mobile_combustion',
      factor: 2.68,
      unit: 'L',
      source: 'ipcc_default',
      url: '',
      confidence: 'medium',
      notes: 'IPCC default for diesel',
    },
  };

  const key = activityType.toLowerCase().replace(/\s+/g, '_');
  const fallback = fallbacks[key];

  if (fallback) {
    return [fallback];
  }

  return [];
}
