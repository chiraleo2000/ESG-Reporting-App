import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Generate a new UUID
 */
export const generateId = (): string => uuidv4();

/**
 * Format date to ISO string
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
};

/**
 * Format datetime to ISO string
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm:ss'Z'") : '';
};

/**
 * Parse date string to Date object
 */
export const parseDate = (dateString: string): Date | null => {
  const d = parseISO(dateString);
  return isValid(d) ? d : null;
};

/**
 * Round number to specified decimal places
 */
export const roundTo = (num: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return roundTo((value / total) * 100, 2);
};

/**
 * Calculate percentage change between baseline and current
 */
export const calculatePercentageChange = (baseline: number, current: number): number => {
  if (baseline === 0) return current > 0 ? 100 : 0;
  return roundTo(((current - baseline) / baseline) * 100, 2);
};

/**
 * Convert units - basic conversion helpers
 */
export const convertUnits = {
  // Mass conversions
  kgToTonnes: (kg: number): number => kg / 1000,
  tonnesToKg: (tonnes: number): number => tonnes * 1000,
  
  // Energy conversions
  kwhToMwh: (kwh: number): number => kwh / 1000,
  mwhToKwh: (mwh: number): number => mwh * 1000,
  gjToMwh: (gj: number): number => gj / 3.6,
  mwhToGj: (mwh: number): number => mwh * 3.6,
  
  // Volume conversions
  litersToM3: (liters: number): number => liters / 1000,
  m3ToLiters: (m3: number): number => m3 * 1000,
  gallonsToLiters: (gallons: number): number => gallons * 3.785,
  litersToGallons: (liters: number): number => liters / 3.785,
};

/**
 * Validate emission factor value
 */
export const isValidEmissionFactor = (ef: number): boolean => {
  return typeof ef === 'number' && ef >= 0 && ef < 1000000 && !isNaN(ef);
};

/**
 * Sanitize string for database
 */
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Generate file hash for integrity check
 */
export const generateHash = async (buffer: Buffer): Promise<string> => {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Sleep helper for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Chunk array into smaller arrays
 */
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Group array by key
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Sum array of numbers
 */
export const sum = (numbers: number[]): number => {
  return numbers.reduce((acc, n) => acc + n, 0);
};

/**
 * Calculate average
 */
export const average = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
};

/**
 * Find top N items by value
 */
export const topN = <T>(
  items: T[],
  n: number,
  getValue: (item: T) => number
): T[] => {
  return [...items].sort((a, b) => getValue(b) - getValue(a)).slice(0, n);
};

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
export const isValidCountryCode = (code: string): boolean => {
  return /^[A-Z]{2}$/.test(code);
};

/**
 * Validate year
 */
export const isValidYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1990 && year <= currentYear + 10;
};

/**
 * Safe JSON parse
 */
export const safeJsonParse = <T>(json: string, defaultValue: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Omit keys from object
 */
export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

/**
 * Pick keys from object
 */
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};
