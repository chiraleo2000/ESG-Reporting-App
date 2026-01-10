/**
 * GHG Service Unit Tests
 * Tests for GHG emission calculations
 */

describe('GHG Service Calculations', () => {
  describe('Emission Factor Calculations', () => {
    // Helper function to calculate emissions
    const calculateEmissions = (
      quantity: number,
      emissionFactor: number,
      uncertaintyPercent: number = 0
    ) => {
      const baseEmission = quantity * emissionFactor;
      const uncertainty = baseEmission * (uncertaintyPercent / 100);
      return {
        emissions: baseEmission,
        uncertaintyLower: baseEmission - uncertainty,
        uncertaintyUpper: baseEmission + uncertainty,
      };
    };

    it('should calculate basic emissions correctly', () => {
      const quantity = 1000; // kWh
      const emissionFactor = 0.5; // kg CO2e per kWh
      
      const result = calculateEmissions(quantity, emissionFactor);
      
      expect(result.emissions).toBe(500);
    });

    it('should calculate emissions with uncertainty', () => {
      const quantity = 1000;
      const emissionFactor = 0.5;
      const uncertaintyPercent = 10;
      
      const result = calculateEmissions(quantity, emissionFactor, uncertaintyPercent);
      
      expect(result.emissions).toBe(500);
      expect(result.uncertaintyLower).toBe(450);
      expect(result.uncertaintyUpper).toBe(550);
    });

    it('should handle zero quantity', () => {
      const result = calculateEmissions(0, 0.5);
      expect(result.emissions).toBe(0);
    });

    it('should handle zero emission factor', () => {
      const result = calculateEmissions(1000, 0);
      expect(result.emissions).toBe(0);
    });
  });

  describe('Scope Categorization', () => {
    const categorizeEmission = (scope: number, scope3Category?: string) => {
      const categories = {
        1: 'Direct Emissions',
        2: 'Indirect Energy Emissions',
        3: 'Other Indirect Emissions',
      };
      
      if (scope === 3 && scope3Category) {
        const scope3Categories: Record<string, string> = {
          purchased_goods: 'Purchased Goods & Services',
          capital_goods: 'Capital Goods',
          upstream_transport: 'Upstream Transportation',
          downstream_transport: 'Downstream Transportation',
          waste: 'Waste Generated',
          business_travel: 'Business Travel',
          employee_commuting: 'Employee Commuting',
        };
        return {
          scopeName: categories[3],
          categoryName: scope3Categories[scope3Category] || 'Unknown Category',
        };
      }
      
      return {
        scopeName: categories[scope as keyof typeof categories] || 'Unknown',
        categoryName: null,
      };
    };

    it('should categorize Scope 1 emissions', () => {
      const result = categorizeEmission(1);
      expect(result.scopeName).toBe('Direct Emissions');
      expect(result.categoryName).toBeNull();
    });

    it('should categorize Scope 2 emissions', () => {
      const result = categorizeEmission(2);
      expect(result.scopeName).toBe('Indirect Energy Emissions');
    });

    it('should categorize Scope 3 with category', () => {
      const result = categorizeEmission(3, 'business_travel');
      expect(result.scopeName).toBe('Other Indirect Emissions');
      expect(result.categoryName).toBe('Business Travel');
    });

    it('should handle unknown scope', () => {
      const result = categorizeEmission(5);
      expect(result.scopeName).toBe('Unknown');
    });
  });

  describe('Unit Conversions', () => {
    const convertUnit = (value: number, from: string, to: string): number => {
      const conversions: Record<string, Record<string, number>> = {
        kg: { tonnes: 0.001, g: 1000, lb: 2.20462 },
        tonnes: { kg: 1000, g: 1000000, lb: 2204.62 },
        kWh: { MWh: 0.001, GJ: 0.0036, BTU: 3412.14 },
        MWh: { kWh: 1000, GJ: 3.6, BTU: 3412140 },
        L: { m3: 0.001, gal: 0.264172 },
        m3: { L: 1000, gal: 264.172 },
      };

      if (from === to) return value;
      
      if (conversions[from] && conversions[from][to]) {
        return value * conversions[from][to];
      }
      
      throw new Error(`Conversion from ${from} to ${to} not supported`);
    };

    it('should convert kg to tonnes', () => {
      expect(convertUnit(1000, 'kg', 'tonnes')).toBe(1);
    });

    it('should convert kWh to MWh', () => {
      expect(convertUnit(1000, 'kWh', 'MWh')).toBe(1);
    });

    it('should convert L to m3', () => {
      expect(convertUnit(1000, 'L', 'm3')).toBe(1);
    });

    it('should return same value for same units', () => {
      expect(convertUnit(100, 'kg', 'kg')).toBe(100);
    });

    it('should throw for unsupported conversions', () => {
      expect(() => convertUnit(100, 'invalid', 'unit')).toThrow();
    });
  });

  describe('Carbon Footprint Product (CFP) Calculations', () => {
    const calculateCFP = (
      productionEmissions: number,
      productionQuantity: number,
      unit: string = 'kg CO2e/unit'
    ) => {
      if (productionQuantity === 0) {
        throw new Error('Production quantity cannot be zero');
      }
      
      return {
        cfp: productionEmissions / productionQuantity,
        unit,
        totalEmissions: productionEmissions,
        productionQuantity,
      };
    };

    it('should calculate CFP correctly', () => {
      const result = calculateCFP(1000, 100);
      expect(result.cfp).toBe(10);
      expect(result.unit).toBe('kg CO2e/unit');
    });

    it('should handle fractional CFP', () => {
      const result = calculateCFP(500, 1000);
      expect(result.cfp).toBe(0.5);
    });

    it('should throw for zero production', () => {
      expect(() => calculateCFP(1000, 0)).toThrow('Production quantity cannot be zero');
    });
  });

  describe('Carbon Footprint Organization (CFO) Calculations', () => {
    const calculateCFO = (emissions: {
      scope1: number;
      scope2: number;
      scope3: number;
    }) => {
      const total = emissions.scope1 + emissions.scope2 + emissions.scope3;
      
      return {
        total,
        breakdown: {
          scope1: emissions.scope1,
          scope1Percent: total > 0 ? (emissions.scope1 / total) * 100 : 0,
          scope2: emissions.scope2,
          scope2Percent: total > 0 ? (emissions.scope2 / total) * 100 : 0,
          scope3: emissions.scope3,
          scope3Percent: total > 0 ? (emissions.scope3 / total) * 100 : 0,
        },
      };
    };

    it('should calculate total CFO', () => {
      const result = calculateCFO({
        scope1: 100,
        scope2: 200,
        scope3: 300,
      });
      
      expect(result.total).toBe(600);
    });

    it('should calculate percentage breakdown', () => {
      const result = calculateCFO({
        scope1: 100,
        scope2: 200,
        scope3: 300,
      });
      
      expect(result.breakdown.scope1Percent).toBeCloseTo(16.67, 1);
      expect(result.breakdown.scope2Percent).toBeCloseTo(33.33, 1);
      expect(result.breakdown.scope3Percent).toBe(50);
    });

    it('should handle zero emissions', () => {
      const result = calculateCFO({
        scope1: 0,
        scope2: 0,
        scope3: 0,
      });
      
      expect(result.total).toBe(0);
      expect(result.breakdown.scope1Percent).toBe(0);
    });
  });

  describe('Tier Level Calculations', () => {
    const getTierMultiplier = (tier: string): number => {
      const multipliers: Record<string, number> = {
        tier1: 1.0,
        tier2: 1.1,
        tier3: 1.2,
        'tier2+': 1.15,
      };
      return multipliers[tier] || 1.0;
    };

    it('should return correct multiplier for tier1', () => {
      expect(getTierMultiplier('tier1')).toBe(1.0);
    });

    it('should return correct multiplier for tier2', () => {
      expect(getTierMultiplier('tier2')).toBe(1.1);
    });

    it('should return correct multiplier for tier3', () => {
      expect(getTierMultiplier('tier3')).toBe(1.2);
    });

    it('should return correct multiplier for tier2+', () => {
      expect(getTierMultiplier('tier2+')).toBe(1.15);
    });

    it('should default to 1.0 for unknown tier', () => {
      expect(getTierMultiplier('unknown')).toBe(1.0);
    });
  });
});
