/**
 * Helpers Utility Tests — comprehensive coverage for all exports
 * Covers: generateId, formatDate, formatDateTime, parseDate, roundTo,
 * calculatePercentage, calculatePercentageChange, convertUnits, isValidEmissionFactor,
 * sanitizeString, generateHash, sleep, chunkArray, groupBy, sum, average,
 * topN, isValidCountryCode, isValidYear, safeJsonParse, deepClone, omit, pick
 */

import {
  generateId,
  formatDate,
  formatDateTime,
  parseDate,
  roundTo,
  calculatePercentage,
  calculatePercentageChange,
  convertUnits,
  isValidEmissionFactor,
  sanitizeString,
  generateHash,
  sleep,
  chunkArray,
  groupBy,
  sum,
  average,
  topN,
  isValidCountryCode,
  isValidYear,
  safeJsonParse,
  deepClone,
  omit,
  pick,
} from '../../src/utils/helpers';

describe('Helpers Utility Functions', () => {

  // ==========================================================================
  // generateId
  // ==========================================================================
  describe('generateId', () => {
    it('should return a valid UUID v4 string', () => {
      const id = generateId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should return unique values on consecutive calls', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  // ==========================================================================
  // formatDate / formatDateTime / parseDate
  // ==========================================================================
  describe('formatDate', () => {
    it('should format a Date object to yyyy-MM-dd', () => {
      const d = new Date('2024-06-15T10:30:00Z');
      expect(formatDate(d)).toBe('2024-06-15');
    });

    it('should format an ISO string to yyyy-MM-dd', () => {
      expect(formatDate('2024-01-01T00:00:00Z')).toBe('2024-01-01');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDate('not-a-date')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('should format a Date to ISO datetime', () => {
      const d = new Date('2024-06-15T10:30:00Z');
      const result = formatDateTime(d);
      expect(result).toContain('2024-06-15');
      expect(result).toContain('T');
      expect(result).toContain('Z');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateTime('invalid')).toBe('');
    });
  });

  describe('parseDate', () => {
    it('should parse valid ISO date string', () => {
      const d = parseDate('2024-06-15');
      expect(d).toBeInstanceOf(Date);
    });

    it('should return null for invalid date string', () => {
      expect(parseDate('not-a-date')).toBeNull();
    });
  });

  // ==========================================================================
  // roundTo
  // ==========================================================================
  describe('roundTo', () => {
    it('should round to 2 decimal places by default', () => {
      expect(roundTo(3.14159)).toBe(3.14);
    });

    it('should round to specified decimal places', () => {
      expect(roundTo(3.14159, 4)).toBe(3.1416);
    });

    it('should round to 0 decimal places', () => {
      expect(roundTo(3.7, 0)).toBe(4);
    });

    it('should handle negative numbers', () => {
      expect(roundTo(-2.555, 2)).toBe(-2.56);
    });
  });

  // ==========================================================================
  // calculatePercentage / calculatePercentageChange
  // ==========================================================================
  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
    });

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });

    it('should round to 2 decimals', () => {
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 1);
    });
  });

  describe('calculatePercentageChange', () => {
    it('should calculate increase correctly', () => {
      expect(calculatePercentageChange(100, 150)).toBe(50);
    });

    it('should calculate decrease correctly', () => {
      expect(calculatePercentageChange(100, 50)).toBe(-50);
    });

    it('should return 100 when baseline is 0 and current is positive', () => {
      expect(calculatePercentageChange(0, 50)).toBe(100);
    });

    it('should return 0 when both baseline and current are 0', () => {
      expect(calculatePercentageChange(0, 0)).toBe(0);
    });
  });

  // ==========================================================================
  // convertUnits
  // ==========================================================================
  describe('convertUnits', () => {
    it('kgToTonnes', () => expect(convertUnits.kgToTonnes(1000)).toBe(1));
    it('tonnesToKg', () => expect(convertUnits.tonnesToKg(1)).toBe(1000));
    it('kwhToMwh', () => expect(convertUnits.kwhToMwh(1000)).toBe(1));
    it('mwhToKwh', () => expect(convertUnits.mwhToKwh(1)).toBe(1000));
    it('gjToMwh', () => expect(convertUnits.gjToMwh(3.6)).toBeCloseTo(1, 5));
    it('mwhToGj', () => expect(convertUnits.mwhToGj(1)).toBe(3.6));
    it('litersToM3', () => expect(convertUnits.litersToM3(1000)).toBe(1));
    it('m3ToLiters', () => expect(convertUnits.m3ToLiters(1)).toBe(1000));
    it('gallonsToLiters', () => expect(convertUnits.gallonsToLiters(1)).toBeCloseTo(3.785, 3));
    it('litersToGallons', () => expect(convertUnits.litersToGallons(3.785)).toBeCloseTo(1, 2));
  });

  // ==========================================================================
  // isValidEmissionFactor
  // ==========================================================================
  describe('isValidEmissionFactor', () => {
    it('should return true for valid positive factor', () => {
      expect(isValidEmissionFactor(2.68)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isValidEmissionFactor(0)).toBe(true);
    });

    it('should return false for negative number', () => {
      expect(isValidEmissionFactor(-1)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isValidEmissionFactor(NaN)).toBe(false);
    });

    it('should return false for value >= 1000000', () => {
      expect(isValidEmissionFactor(1000000)).toBe(false);
    });

    it('should return true for large but valid factor', () => {
      expect(isValidEmissionFactor(999999)).toBe(true);
    });
  });

  // ==========================================================================
  // sanitizeString
  // ==========================================================================
  describe('sanitizeString', () => {
    it('should strip leading/trailing whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove < and > characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should leave normal strings unchanged', () => {
      expect(sanitizeString('normal text')).toBe('normal text');
    });
  });

  // ==========================================================================
  // generateHash
  // ==========================================================================
  describe('generateHash', () => {
    it('should return a sha256 hex string', async () => {
      const hash = await generateHash(Buffer.from('test'));
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return same hash for same input', async () => {
      const h1 = await generateHash(Buffer.from('hello'));
      const h2 = await generateHash(Buffer.from('hello'));
      expect(h1).toBe(h2);
    });

    it('should return different hash for different input', async () => {
      const h1 = await generateHash(Buffer.from('a'));
      const h2 = await generateHash(Buffer.from('b'));
      expect(h1).not.toBe(h2);
    });
  });

  // ==========================================================================
  // sleep
  // ==========================================================================
  describe('sleep', () => {
    it('should resolve after the specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40); // allow small timing variance
    });
  });

  // ==========================================================================
  // chunkArray
  // ==========================================================================
  describe('chunkArray', () => {
    it('should split array into chunks of given size', () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle empty array', () => {
      expect(chunkArray([], 3)).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      expect(chunkArray([1, 2], 10)).toEqual([[1, 2]]);
    });
  });

  // ==========================================================================
  // groupBy
  // ==========================================================================
  describe('groupBy', () => {
    it('should group items by key', () => {
      const items = [
        { scope: 'scope1', value: 10 },
        { scope: 'scope1', value: 20 },
        { scope: 'scope2', value: 30 },
      ];
      const result = groupBy(items, 'scope');
      expect(Object.keys(result)).toEqual(['scope1', 'scope2']);
      expect(result['scope1']).toHaveLength(2);
      expect(result['scope2']).toHaveLength(1);
    });
  });

  // ==========================================================================
  // sum / average
  // ==========================================================================
  describe('sum', () => {
    it('should sum numbers', () => expect(sum([1, 2, 3])).toBe(6));
    it('should return 0 for empty array', () => expect(sum([])).toBe(0));
  });

  describe('average', () => {
    it('should calculate average', () => expect(average([2, 4, 6])).toBe(4));
    it('should return 0 for empty array', () => expect(average([])).toBe(0));
  });

  // ==========================================================================
  // topN
  // ==========================================================================
  describe('topN', () => {
    it('should return top N items by value', () => {
      const items = [
        { name: 'a', val: 10 },
        { name: 'b', val: 50 },
        { name: 'c', val: 30 },
      ];
      const result = topN(items, 2, (i) => i.val);
      expect(result).toEqual([
        { name: 'b', val: 50 },
        { name: 'c', val: 30 },
      ]);
    });

    it('should handle n larger than array', () => {
      const items = [{ name: 'a', val: 1 }];
      const result = topN(items, 5, (i) => i.val);
      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // isValidCountryCode / isValidYear
  // ==========================================================================
  describe('isValidCountryCode', () => {
    it('should return true for valid 2-letter uppercase code', () => {
      expect(isValidCountryCode('US')).toBe(true);
      expect(isValidCountryCode('TH')).toBe(true);
    });

    it('should return false for lowercase', () => {
      expect(isValidCountryCode('us')).toBe(false);
    });

    it('should return false for 3-letter code', () => {
      expect(isValidCountryCode('USA')).toBe(false);
    });
  });

  describe('isValidYear', () => {
    it('should return true for valid year', () => {
      expect(isValidYear(2024)).toBe(true);
    });

    it('should return false for year before 1990', () => {
      expect(isValidYear(1989)).toBe(false);
    });

    it('should return true for near-future year', () => {
      const nextYear = new Date().getFullYear() + 5;
      expect(isValidYear(nextYear)).toBe(true);
    });

    it('should return false for far-future year', () => {
      const farFuture = new Date().getFullYear() + 11;
      expect(isValidYear(farFuture)).toBe(false);
    });
  });

  // ==========================================================================
  // safeJsonParse / deepClone / omit / pick
  // ==========================================================================
  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
    });

    it('should return default for invalid JSON', () => {
      expect(safeJsonParse('not json', { fallback: true })).toEqual({ fallback: true });
    });
  });

  describe('deepClone', () => {
    it('should deep clone an object', () => {
      const obj = { a: { b: 1 } };
      const clone = deepClone(obj);
      clone.a.b = 999;
      expect(obj.a.b).toBe(1);
    });
  });

  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    });

    it('should return full object when no keys to omit', () => {
      expect(omit({ x: 1 }, [])).toEqual({ x: 1 });
    });
  });

  describe('pick', () => {
    it('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('should ignore missing keys', () => {
      const obj = { a: 1 } as any;
      expect(pick(obj, ['a', 'z'])).toEqual({ a: 1 });
    });
  });
});
