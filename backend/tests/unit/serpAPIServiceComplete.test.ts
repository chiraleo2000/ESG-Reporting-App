/**
 * SERPAPI Service Complete Tests
 * Covers: searchEmissionFactors, searchGridEmissionFactors, searchPrecursorFactors
 * Including internal helpers: parseSearchResults, parseGridResults, parsePrecursorResults, getFallbackEmissionFactors
 */

jest.mock('../../src/config/env', () => ({
  config: {
    serpapi: { key: 'test-serpapi-key' },
  },
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { redis } from '../../src/config/redis';
import {
  searchEmissionFactors,
  searchGridEmissionFactors,
  searchPrecursorFactors,
} from '../../src/services/serpAPIService';

describe('SERPAPI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    (redis.get as jest.Mock).mockResolvedValue(null);
  });

  // ======================== searchEmissionFactors ========================
  describe('searchEmissionFactors', () => {
    it('should return cached results when available', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ activityType: 'diesel', factor: 2.68, unit: 'L', source: 'DEFRA', confidence: 'high' }])
      );

      const results = await searchEmissionFactors('diesel', 'L');

      expect(results).toHaveLength(1);
      expect(results[0].factor).toBe(2.68);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should search API and parse results with factor extraction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'DEFRA EF',
              link: 'https://www.gov.uk/defra/emission-factors',
              snippet: 'Diesel combustion produces 2.68 kg CO2e per liter of fuel consumed.',
            },
            {
              title: 'Academic Source',
              link: 'https://university.edu/emissions',
              snippet: 'We found that 2.7 kg CO2 per liter is typical for diesel.',
            },
            {
              title: 'Blog Post',
              link: 'https://blog.example.com/co2',
              snippet: 'No emission factor data here.',
            },
          ],
        }),
      });

      const results = await searchEmissionFactors('diesel', 'liter', 'UK', 'DEFRA');

      expect(results.length).toBeGreaterThan(0);
      // gov.uk should be high confidence
      expect(results[0].confidence).toBe('high');
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should handle grams conversion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'Factor',
              link: 'https://www.epa.gov/factors',
              snippet: 'Emission factor is 500 g CO2e per kWh.',
            },
          ],
        }),
      });

      const results = await searchEmissionFactors('electricity', 'kWh');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].factor).toBe(0.5); // 500g = 0.5kg
    });

    it('should handle tonnes conversion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'Steel Factor',
              link: 'https://example.org/steel',
              snippet: 'Production factor is 1.85 t CO2e per tonne.',
            },
          ],
        }),
      });

      const results = await searchEmissionFactors('steel production', 'tonne');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].factor).toBe(1850); // 1.85t = 1850kg
    });

    it('should return fallback for known activity types on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await searchEmissionFactors('diesel');

      expect(results).toHaveLength(1);
      expect(results[0].activityType).toBe('mobile_combustion');
      expect(results[0].factor).toBe(2.68);
    });

    it('should return fallback for electricity', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      const results = await searchEmissionFactors('electricity');

      expect(results).toHaveLength(1);
      expect(results[0].factor).toBe(0.42);
    });

    it('should return fallback for natural_gas', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const results = await searchEmissionFactors('natural gas');

      expect(results).toHaveLength(1);
      expect(results[0].factor).toBe(2.02);
    });

    it('should return empty for unknown activity on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const results = await searchEmissionFactors('unknown_activity_xyz');

      expect(results).toHaveLength(0);
    });

    it('should handle non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

      const results = await searchEmissionFactors('diesel');

      // Falls back to fallback
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle SERPAPI error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'Invalid API key' }),
      });

      const results = await searchEmissionFactors('diesel');

      expect(results.length).toBeGreaterThan(0); // fallback
    });

    it('should handle empty organic_results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organic_results: [] }),
      });

      const results = await searchEmissionFactors('unknown');

      expect(results).toHaveLength(0);
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should classify .org and .edu as medium confidence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'Research',
              link: 'https://carbontrust.org/factors',
              snippet: 'The factor is 2.5 kg CO2 per liter.',
            },
          ],
        }),
      });

      const results = await searchEmissionFactors('diesel', 'L');

      expect(results[0].confidence).toBe('medium');
    });
  });

  // ======================== searchGridEmissionFactors ========================
  describe('searchGridEmissionFactors', () => {
    it('should return cached grid factors', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ activityType: 'grid_electricity', factor: 0.45, unit: 'kWh' }])
      );

      const results = await searchGridEmissionFactors('Thailand', 2024);

      expect(results).toHaveLength(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should search and parse grid factor results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'IEA Grid Factors',
              link: 'https://www.iea.org/data/grid-factors',
              snippet: 'Thailand grid emission factor for 2024 is 0.45 kg CO2e per kWh.',
            },
          ],
        }),
      });

      const results = await searchGridEmissionFactors('Thailand', 2024);

      expect(results).toHaveLength(1);
      expect(results[0].factor).toBe(0.45);
      expect(results[0].confidence).toBe('high');
    });

    it('should handle gram per kWh conversion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'EF',
              link: 'https://electricitymap.org/data',
              snippet: 'The emission factor is 450 g CO2 per kWh in Korea.',
            },
          ],
        }),
      });

      const results = await searchGridEmissionFactors('Korea');

      expect(results[0].factor).toBe(0.45); // 450g → 0.45kg
    });

    it('should handle MWh unit in snippet', async () => {
      // The regex matches kWh/Wh pattern, then checks if MWh is also mentioned
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'Grid',
              link: 'https://www.epa.gov/grid',
              snippet: 'US grid is 400 kg CO2 per kWh. Equivalent to 400000 per MWh.',
            },
          ],
        }),
      });

      const results = await searchGridEmissionFactors('US');

      // 400 matched via regex for kWh, then /1000 because snippet contains 'per MWh'
      expect(results[0].factor).toBe(0.4);
    });

    it('should return empty on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await searchGridEmissionFactors('Japan');

      expect(results).toHaveLength(0);
    });

    it('should use current year when year not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organic_results: [] }),
      });

      await searchGridEmissionFactors('Thailand');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(String(new Date().getFullYear())),
      );
    });
  });

  // ======================== searchPrecursorFactors ========================
  describe('searchPrecursorFactors', () => {
    it('should return cached precursor factors', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ activityType: 'precursor_steel', factor: 1.85 }])
      );

      const results = await searchPrecursorFactors('steel', 'BF-BOF');

      expect(results).toHaveLength(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should search and parse precursor results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'World Steel',
              link: 'https://www.worldsteel.org/emissions',
              snippet: 'Steel production BF-BOF route has 1.85 kg CO2e per kg of crude steel.',
            },
          ],
        }),
      });

      const results = await searchPrecursorFactors('steel', 'BF-BOF');

      expect(results).toHaveLength(1);
      expect(results[0].factor).toBe(1.85);
      expect(results[0].confidence).toBe('high'); // worldsteel.org
    });

    it('should handle tonnes/tonne normalization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            {
              title: 'Cement',
              link: 'https://cembureau.eu/data',
              snippet: 'Cement production emits 0.6 t CO2e per tonne.',
            },
          ],
        }),
      });

      const results = await searchPrecursorFactors('cement');

      expect(results).toHaveLength(1);
      // 0.6 t CO2 / tonne → (0.6*1000)/1000 = 0.6 kg CO2/kg
      expect(results[0].factor).toBe(0.6);
    });

    it('should return empty on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const results = await searchPrecursorFactors('aluminium');

      expect(results).toHaveLength(0);
    });

    it('should handle non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const results = await searchPrecursorFactors('steel');

      expect(results).toHaveLength(0);
    });

    it('should handle no matching patterns in snippets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          organic_results: [
            { title: 'Blog', link: 'https://blog.com/x', snippet: 'No emission data here' },
          ],
        }),
      });

      const results = await searchPrecursorFactors('glass');

      expect(results).toHaveLength(0);
    });
  });
});
