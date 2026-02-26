/**
 * File Parser
 * 
 * Parses CSV, Excel (XLSX/XLS), and JSON files into normalized
 * activity data records. Supports column mapping, data type inference,
 * and validation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../utils/logger';
import type { IDataConnector } from './types';

// Supported file types
export type SupportedFileType = 'csv' | 'xlsx' | 'xls' | 'json';

export interface FileParserConfig {
  filePath?: string;
  fileBuffer?: Buffer;
  fileType?: SupportedFileType;
  csvDelimiter?: string;
  csvHeaderRow?: boolean;
  excelSheet?: string | number;
  jsonDataPath?: string;
  encoding?: BufferEncoding;
}

export class FileParser implements IDataConnector {
  async connect(config: Record<string, any>): Promise<boolean> {
    // File parser doesn't need a persistent connection
    const filePath = config.filePath;
    if (filePath && !fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      return false;
    }
    return true;
  }

  async fetchData(config: Record<string, any>): Promise<any[]> {
    const parserConfig = config as FileParserConfig;
    
    if (!parserConfig.filePath && !parserConfig.fileBuffer) {
      throw new Error('Either filePath or fileBuffer must be provided');
    }

    const fileType = parserConfig.fileType || this.detectFileType(parserConfig.filePath || '');
    
    switch (fileType) {
      case 'csv':
        return this.parseCsv(parserConfig);
      case 'xlsx':
      case 'xls':
        return this.parseExcel(parserConfig);
      case 'json':
        return this.parseJson(parserConfig);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  async parseData(rawData: any[], mapping?: Record<string, string>): Promise<any[]> {
    if (!mapping || Object.keys(mapping).length === 0) {
      return rawData;
    }

    return rawData.map((item, index) => {
      try {
        const mapped: Record<string, any> = {};
        for (const [targetField, sourceField] of Object.entries(mapping)) {
          let value = item[sourceField];
          if (value === undefined) {
            // Try case-insensitive match
            const key = Object.keys(item).find(
              k => k.toLowerCase() === sourceField.toLowerCase()
            );
            if (key) {
              value = item[key];
            }
          }
          if (value !== undefined) {
            mapped[targetField] = value;
          }
        }
        return mapped;
      } catch (error: any) {
        logger.warn(`Mapping error at row ${index}:`, error.message);
        return null;
      }
    }).filter(Boolean);
  }

  // Validation helpers to reduce cognitive complexity

  private static readonly VALID_SCOPES = new Set([
    'scope_1', 'scope_2', 'scope_3', 'Scope 1', 'Scope 2', 'Scope 3', '1', '2', '3',
  ]);

  private checkRequiredFields(item: any): string | null {
    if (!item.name && !item.activity_name && !item.description) {
      return 'Missing activity name/description';
    }
    return null;
  }

  private checkScope(item: any): string | null {
    const scope = item.scope || item.emission_scope;
    if (scope && !FileParser.VALID_SCOPES.has(String(scope))) {
      return `Invalid scope: ${scope}`;
    }
    return null;
  }

  private checkNumericField(value: any, fieldName: string): string | null {
    if (value !== undefined && value !== null && value !== '') {
      const num = Number(value);
      if (Number.isNaN(num) || num < 0) {
        return `Invalid ${fieldName}: ${value}`;
      }
    }
    return null;
  }

  private validateRecord(item: any): string[] {
    const errors: string[] = [];
    const requiredError = this.checkRequiredFields(item);
    if (requiredError) errors.push(requiredError);

    const scopeError = this.checkScope(item);
    if (scopeError) errors.push(scopeError);

    const quantityError = this.checkNumericField(item.quantity, 'quantity');
    if (quantityError) errors.push(quantityError);

    const factorError = this.checkNumericField(item.emission_factor, 'emission factor');
    if (factorError) errors.push(factorError);

    return errors;
  }

  private normalizeRecord(item: any): any {
    if (item.scope) {
      item.scope = this.normalizeScope(item.scope);
    }
    if (item.quantity) item.quantity = Number(item.quantity);
    if (item.emission_factor) item.emission_factor = Number(item.emission_factor);
    return item;
  }

  async validate(data: any[]): Promise<{ valid: any[]; errors: any[] }> {
    const valid: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const itemErrors = this.validateRecord(data[i]);

      if (itemErrors.length > 0) {
        errors.push({
          row: i + 1,
          field: 'multiple',
          message: itemErrors.join('; '),
          data: data[i],
        });
      } else {
        valid.push(this.normalizeRecord(data[i]));
      }
    }

    return { valid, errors };
  }

  async disconnect(): Promise<void> {
    // No-op for file parser
  }

  // Private helpers

  private detectFileType(filePath: string): SupportedFileType {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.csv': return 'csv';
      case '.xlsx': return 'xlsx';
      case '.xls': return 'xls';
      case '.json': return 'json';
      default: return 'csv'; // Default to CSV
    }
  }

  private async parseCsv(config: FileParserConfig): Promise<any[]> {
    const encoding = config.encoding || 'utf-8';
    let content: string;
    if (config.fileBuffer) {
      content = config.fileBuffer.toString(encoding);
    } else if (config.filePath) {
      content = fs.readFileSync(config.filePath, encoding);
    } else {
      throw new Error('File path or buffer is required');
    }

    const delimiter = config.csvDelimiter || this.detectDelimiter(content);
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) return [];

    const hasHeader = config.csvHeaderRow !== false; // Default true
    const headers = hasHeader
      ? this.parseCsvLine(lines[0], delimiter).map(h => h.trim())
      : lines[0].split(delimiter).map((_, i) => `column_${i}`);

    const dataStartIndex = hasHeader ? 1 : 0;
    const records: any[] = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i], delimiter);
      if (values.every(v => !v.trim())) continue;

      const record: Record<string, any> = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx]?.trim() || '';
      });
      records.push(record);
    }

    logger.info(`Parsed ${records.length} rows from CSV`);
    return records;
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private detectDelimiter(content: string): string {
    const firstLine = content.split(/\r?\n/)[0] || '';
    const counts = {
      ',': (firstLine.match(/,/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '|': (firstLine.match(/\|/g) || []).length,
    };
    
    const max = Object.entries(counts).reduce((best, [char, count]) => {
      return count > best[1] ? [char, count] as [string, number] : best;
    }, [',', 0] as [string, number]);
    
    return max[0];
  }

  private async parseExcel(config: FileParserConfig): Promise<any[]> {
    try {
      // Dynamic import of xlsx to avoid issues when not installed
      const XLSX = require('xlsx');
      
      let workbook;
      if (config.fileBuffer) {
        workbook = XLSX.read(config.fileBuffer, { type: 'buffer' });
      } else if (config.filePath) {
        workbook = XLSX.readFile(config.filePath);
      } else {
        throw new Error('File path or buffer is required');
      }

      const sheetName = typeof config.excelSheet === 'string'
        ? config.excelSheet
        : workbook.SheetNames[config.excelSheet || 0];

      if (!sheetName || !workbook.Sheets[sheetName]) {
        throw new Error(`Sheet "${config.excelSheet || 0}" not found`);
      }

      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: '',
        raw: false,
      });

      logger.info(`Parsed ${data.length} rows from Excel sheet: ${sheetName}`);
      return data as any[];
    } catch (error: any) {
      throw new Error(`Excel parse error: ${error.message}`);
    }
  }

  private async parseJson(config: FileParserConfig): Promise<any[]> {
    const encoding = config.encoding || 'utf-8';
    let content: string;
    if (config.fileBuffer) {
      content = config.fileBuffer.toString(encoding);
    } else if (config.filePath) {
      content = fs.readFileSync(config.filePath, encoding);
    } else {
      throw new Error('File path or buffer is required');
    }

    const parsed = JSON.parse(content);

    // If a data path is specified, extract from that path
    if (config.jsonDataPath) {
      const data = config.jsonDataPath.split('.').reduce((obj, key) => obj?.[key], parsed);
      return Array.isArray(data) ? data : [data];
    }

    return Array.isArray(parsed) ? parsed : [parsed];
  }

  private normalizeScope(scope: string): string {
    const scopeStr = String(scope).toLowerCase().trim();
    if (scopeStr === '1' || scopeStr === 'scope 1' || scopeStr === 'scope1') return 'scope_1';
    if (scopeStr === '2' || scopeStr === 'scope 2' || scopeStr === 'scope2') return 'scope_2';
    if (scopeStr === '3' || scopeStr === 'scope 3' || scopeStr === 'scope3') return 'scope_3';
    return scopeStr;
  }
}
