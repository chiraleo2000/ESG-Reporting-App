import { db } from '../config/database';
import { logger } from '../utils/logger';
import { roundTo, generateId } from '../utils/helpers';
import * as ghgService from './ghgService';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import type { ReportStandard } from '../types';

const REPORTS_DIR = process.env.REPORTS_DIR || './reports';

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate report data for a standard
 */
export async function generateReportData(
  projectId: string,
  standard: ReportStandard,
  options?: ReportOptions
): Promise<ReportData> {
  // Get project details
  const projectResult = await db.query(
    `SELECT * FROM projects WHERE id = $1`,
    [projectId]
  );
  const project = projectResult.rows[0];

  // Get emissions data
  const emissions = await ghgService.aggregateProjectEmissions(projectId);

  // Get activities
  const activitiesResult = await db.query(
    `SELECT * FROM activities WHERE project_id = $1 AND calculation_status = 'calculated'
     ORDER BY scope, scope3_category, name`,
    [projectId]
  );

  // Get CFP/CFO results
  const cfpResult = await db.query(
    `SELECT * FROM cfp_results WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  );
  const cfoResult = await db.query(
    `SELECT * FROM cfo_results WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  );

  // Build base report data
  const baseData: ReportData = {
    project: {
      id: project.id,
      name: project.name,
      company: project.company,
      facilityName: project.facility_name,
      facilityLocation: project.facility_location,
      industry: project.industry,
      baselineYear: project.baseline_year,
      reportingYear: project.reporting_year,
    },
    reportingPeriod: {
      startDate: `${project.reporting_year}-01-01`,
      endDate: `${project.reporting_year}-12-31`,
    },
    emissions: {
      scope1: emissions.scope1,
      scope2: emissions.scope2,
      scope3: emissions.scope3,
      scope3Categories: emissions.scope3Categories,
      total: emissions.total,
    },
    activities: activitiesResult.rows.map((a) => ({
      name: a.name,
      scope: a.scope,
      category: a.scope3_category,
      quantity: parseFloat(a.quantity),
      unit: a.unit,
      emissions: parseFloat(a.total_emissions_kg_co2e),
      tierLevel: a.tier_level,
    })),
    cfp: cfpResult.rows[0] ? {
      productName: cfpResult.rows[0].product_name,
      functionalUnit: cfpResult.rows[0].functional_unit,
      cfpTotal: parseFloat(cfpResult.rows[0].cfp_total),
      cfpPerUnit: parseFloat(cfpResult.rows[0].cfp_per_unit),
    } : null,
    cfo: cfoResult.rows[0] ? {
      organizationName: cfoResult.rows[0].organization_name,
      cfoTotal: parseFloat(cfoResult.rows[0].cfo_total),
    } : null,
    generatedAt: new Date().toISOString(),
    standard,
  };

  // Add standard-specific data
  const standardData = await getStandardSpecificData(projectId, standard, baseData, options);

  return {
    ...baseData,
    standardSpecific: standardData,
  };
}

/**
 * Validate report data against standard requirements
 */
export async function validateReportData(
  data: ReportData,
  standard: ReportStandard
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
    missingRequired: [],
    completeness: 100,
  };

  // Get standard requirements
  const requirements = await getStandardRequirements(standard);

  // Check required fields
  for (const field of requirements.requiredFields) {
    if (!hasField(data, field)) {
      result.missingRequired.push(field);
      result.errors.push({
        field,
        message: `Required field "${field}" is missing`,
        severity: 'error',
      });
      result.valid = false;
    }
  }

  // Standard-specific validations
  switch (standard) {
    case 'eu_cbam':
      validateEUCBAM(data, result);
      break;
    case 'uk_cbam':
      validateUKCBAM(data, result);
      break;
    case 'china_carbon':
      validateChinaCarbon(data, result);
      break;
    case 'k_esg':
      validateKESG(data, result);
      break;
    case 'maff_esg':
      validateMAFFESG(data, result);
      break;
    case 'thai_esg':
      validateThaiESG(data, result);
      break;
  }

  // Calculate completeness
  const totalFields = requirements.requiredFields.length + requirements.optionalFields.length;
  const filledFields = totalFields - result.missingRequired.length;
  result.completeness = Math.round((filledFields / totalFields) * 100);

  return result;
}

/**
 * Generate report files (PDF and/or XLSX)
 */
export async function generateReportFiles(
  data: ReportData,
  format: string,
  standard: ReportStandard
): Promise<{ filePath: string; files: string[] }> {
  const timestamp = Date.now();
  const baseName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${standard}_${timestamp}`;
  const projectDir = path.join(REPORTS_DIR, data.project.id);

  // Create directory
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const files: string[] = [];
  let primaryPath = '';

  if (format === 'pdf' || format === 'both') {
    const pdfPath = path.join(projectDir, `${baseName}.pdf`);
    await generatePDFReport(data, standard, pdfPath);
    files.push(pdfPath);
    primaryPath = pdfPath;
  }

  if (format === 'xlsx' || format === 'both') {
    const xlsxPath = path.join(projectDir, `${baseName}.xlsx`);
    await generateExcelReport(data, standard, xlsxPath);
    files.push(xlsxPath);
    if (!primaryPath) primaryPath = xlsxPath;
  }

  return { filePath: primaryPath, files };
}

/**
 * Get standard requirements
 */
export async function getStandardRequirements(standard: ReportStandard): Promise<StandardRequirements> {
  // Common required fields
  const commonRequired = [
    'project.name',
    'project.company',
    'reportingPeriod.startDate',
    'reportingPeriod.endDate',
    'emissions.scope1',
    'emissions.scope2',
  ];

  // Standard-specific requirements
  const requirements: Record<ReportStandard, StandardRequirements> = {
    eu_cbam: {
      requiredFields: [
        ...commonRequired,
        'standardSpecific.cnCode',
        'standardSpecific.goodsCategory',
        'standardSpecific.countryOfOrigin',
        'standardSpecific.installationOperator',
        'standardSpecific.directEmissions',
        'standardSpecific.indirectEmissions',
      ],
      optionalFields: ['standardSpecific.precursorEmissions', 'standardSpecific.carbonPricePaid'],
      sections: ['organization', 'goods', 'emissions', 'precursors', 'carbon_price'],
    },
    uk_cbam: {
      requiredFields: [
        ...commonRequired,
        'standardSpecific.ukCommodityCode',
        'standardSpecific.goodsCategory',
        'standardSpecific.embeddedEmissions',
      ],
      optionalFields: ['standardSpecific.overseasCarbonPrice', 'standardSpecific.verification'],
      sections: ['organization', 'goods', 'emissions', 'verification'],
    },
    china_carbon: {
      requiredFields: [
        ...commonRequired,
        'standardSpecific.enterpriseName',
        'standardSpecific.unifiedSocialCreditCode',
        'standardSpecific.fuelConsumption',
        'standardSpecific.electricityConsumption',
        'standardSpecific.totalEmissions',
      ],
      optionalFields: ['standardSpecific.ccerOffset', 'standardSpecific.verificationBody'],
      sections: ['enterprise', 'fuel', 'electricity', 'allowances'],
    },
    k_esg: {
      requiredFields: [
        ...commonRequired,
        'emissions.scope3',
        'standardSpecific.governanceStructure',
        'standardSpecific.reductionTarget',
        'standardSpecific.reductionActivities',
      ],
      optionalFields: ['standardSpecific.kEsgScore', 'standardSpecific.renewableEnergy'],
      sections: ['organization', 'governance', 'emissions', 'targets', 'declaration'],
      signatureRequired: true,
    },
    maff_esg: {
      requiredFields: [
        ...commonRequired,
        'emissions.scope3',
        'standardSpecific.agriculturalEmissions',
        'standardSpecific.foodLossReduction',
        'standardSpecific.sustainableSourcing',
      ],
      optionalFields: ['standardSpecific.organicCertification', 'standardSpecific.jCreditUsage'],
      sections: ['organization', 'agriculture', 'food_loss', 'sourcing', 'declaration'],
      signatureRequired: true,
    },
    thai_esg: {
      requiredFields: [
        ...commonRequired,
        'standardSpecific.setIndustryGroup',
        'standardSpecific.energyConsumption',
        'standardSpecific.waterWithdrawal',
        'standardSpecific.wasteManagement',
      ],
      optionalFields: ['standardSpecific.tcfdAlignment', 'standardSpecific.tVerCredits'],
      sections: ['organization', 'energy', 'water', 'waste', 'social'],
    },
  };

  return requirements[standard];
}

/**
 * Get overlapping fields between standards
 */
export async function getOverlappingFields(
  standards: string[]
): Promise<{ common: string[]; conflicts: Record<string, string[]> }> {
  if (standards.length < 2) {
    return { common: [], conflicts: {} };
  }

  const allRequirements = await Promise.all(
    standards.map((s) => getStandardRequirements(s as ReportStandard))
  );

  // Find common fields
  const firstFields = new Set(allRequirements[0].requiredFields);
  const common = allRequirements.slice(1).reduce((acc, req) => {
    return acc.filter((f) => req.requiredFields.includes(f));
  }, [...firstFields]);

  // Find conflicts (same field name, different requirements)
  const conflicts: Record<string, string[]> = {};

  // This would need more detailed field metadata to properly identify conflicts

  return { common, conflicts };
}

// Helper functions

async function getStandardSpecificData(
  projectId: string,
  standard: ReportStandard,
  baseData: ReportData,
  options?: ReportOptions
): Promise<Record<string, any>> {
  switch (standard) {
    case 'eu_cbam':
      return getEUCBAMData(projectId, baseData, options);
    case 'uk_cbam':
      return getUKCBAMData(projectId, baseData, options);
    case 'china_carbon':
      return getChinaCarbonData(projectId, baseData, options);
    case 'k_esg':
      return getKESGData(projectId, baseData, options);
    case 'maff_esg':
      return getMAFFESGData(projectId, baseData, options);
    case 'thai_esg':
      return getThaiESGData(projectId, baseData, options);
    default:
      return {};
  }
}

async function getEUCBAMData(projectId: string, baseData: ReportData, options?: ReportOptions): Promise<Record<string, any>> {
  // Get precursor data
  const precursors = await db.query(
    `SELECT * FROM precursor_calculations pc
     JOIN activities a ON pc.activity_id = a.id
     WHERE a.project_id = $1`,
    [projectId]
  );

  return {
    goodsCategory: options?.goodsCategory || 'iron_steel',
    cnCode: options?.cnCode || '',
    countryOfOrigin: options?.countryOfOrigin || '',
    installationOperator: baseData.project.company,
    directEmissions: baseData.emissions.scope1,
    indirectEmissions: baseData.emissions.scope2,
    precursorEmissions: precursors.rows.reduce((sum, p) => sum + parseFloat(p.emissions_kg_co2e), 0),
    carbonPricePaid: options?.carbonPricePaid || 0,
    precursorDetails: precursors.rows.map((p) => ({
      material: p.precursor_type,
      quantity: parseFloat(p.quantity_kg),
      emissionFactor: parseFloat(p.emission_factor),
      emissions: parseFloat(p.emissions_kg_co2e),
    })),
  };
}

async function getUKCBAMData(projectId: string, baseData: ReportData, options?: ReportOptions): Promise<Record<string, any>> {
  return {
    ukCommodityCode: options?.ukCommodityCode || '',
    goodsCategory: options?.goodsCategory || '',
    embeddedEmissions: baseData.emissions.scope1 + baseData.emissions.scope2,
    ukCarbonPriceEquivalent: options?.ukCarbonPriceEquivalent || 0,
    overseasCarbonPrice: options?.overseasCarbonPrice || 0,
  };
}

async function getChinaCarbonData(projectId: string, baseData: ReportData, options?: ReportOptions): Promise<Record<string, any>> {
  return {
    enterpriseName: baseData.project.company,
    unifiedSocialCreditCode: options?.unifiedSocialCreditCode || '',
    facilityType: options?.facilityType || 'power_generation',
    fuelConsumption: baseData.activities.filter((a) => a.scope === 'scope1').reduce((sum, a) => sum + a.quantity, 0),
    electricityConsumption: baseData.activities.filter((a) => a.scope === 'scope2').reduce((sum, a) => sum + a.quantity, 0),
    totalEmissions: baseData.emissions.total,
    emissionAllowance: options?.emissionAllowance || 0,
    complianceStatus: options?.complianceStatus || 'pending',
  };
}

async function getKESGData(projectId: string, baseData: ReportData, options?: ReportOptions): Promise<Record<string, any>> {
  return {
    businessRegistrationNumber: options?.businessRegistrationNumber || '',
    governanceStructure: options?.governanceStructure || '',
    reductionTarget: options?.reductionTarget || '',
    reductionActivities: options?.reductionActivities || [],
    emissionIntensity: baseData.emissions.total / (options?.revenue || 1),
    kEsgScore: options?.kEsgScore || null,
    kEsgGrade: options?.kEsgGrade || null,
    renewableEnergyUsage: options?.renewableEnergyUsage || 0,
  };
}

async function getMAFFESGData(projectId: string, baseData: ReportData, options?: ReportOptions): Promise<Record<string, any>> {
  return {
    corporateNumber: options?.corporateNumber || '',
    agriculturalEmissions: options?.agriculturalEmissions || 0,
    foodLossReduction: options?.foodLossReduction || '',
    sustainableSourcing: options?.sustainableSourcing || '',
    biodiversityImpact: options?.biodiversityImpact || '',
    jgapStatus: options?.jgapStatus || null,
    midoriStrategyAlignment: options?.midoriStrategyAlignment || '',
  };
}

async function getThaiESGData(projectId: string, baseData: ReportData, options?: ReportOptions): Promise<Record<string, any>> {
  return {
    taxId: options?.taxId || '',
    setIndustryGroup: options?.setIndustryGroup || '',
    energyConsumption: baseData.activities.filter((a) => a.scope === 'scope2').reduce((sum, a) => sum + a.quantity, 0),
    waterWithdrawal: options?.waterWithdrawal || 0,
    wasteManagement: options?.wasteManagement || '',
    employeeData: options?.employeeData || {},
    tcfdAlignment: options?.tcfdAlignment || false,
    tVerCredits: options?.tVerCredits || 0,
  };
}

// Validation functions
function validateEUCBAM(data: ReportData, result: ValidationResult): void {
  const specific = data.standardSpecific;
  if (!specific?.cnCode) {
    result.warnings.push({ field: 'cnCode', message: 'CN Code is recommended', severity: 'warning' });
  }
  if (data.emissions.scope1 <= 0 && data.emissions.scope2 <= 0) {
    result.errors.push({ field: 'emissions', message: 'At least one emission type is required', severity: 'error' });
    result.valid = false;
  }
}

function validateUKCBAM(data: ReportData, result: ValidationResult): void {
  const specific = data.standardSpecific;
  if (!specific?.ukCommodityCode) {
    result.warnings.push({ field: 'ukCommodityCode', message: 'UK Commodity Code is recommended', severity: 'warning' });
  }
}

function validateChinaCarbon(data: ReportData, result: ValidationResult): void {
  const specific = data.standardSpecific;
  if (!specific?.unifiedSocialCreditCode) {
    result.errors.push({ field: 'unifiedSocialCreditCode', message: 'Unified Social Credit Code is required', severity: 'error' });
    result.valid = false;
  }
}

function validateKESG(data: ReportData, result: ValidationResult): void {
  if (!data.emissions.scope3 || data.emissions.scope3 <= 0) {
    result.warnings.push({ field: 'scope3', message: 'Scope 3 emissions are recommended for K-ESG', severity: 'warning' });
  }
  const specific = data.standardSpecific;
  if (!specific?.reductionTarget) {
    result.errors.push({ field: 'reductionTarget', message: 'Reduction target is required for K-ESG', severity: 'error' });
    result.valid = false;
  }
}

function validateMAFFESG(data: ReportData, result: ValidationResult): void {
  const specific = data.standardSpecific;
  if (!specific?.foodLossReduction) {
    result.warnings.push({ field: 'foodLossReduction', message: 'Food loss reduction data is recommended', severity: 'warning' });
  }
}

function validateThaiESG(data: ReportData, result: ValidationResult): void {
  const specific = data.standardSpecific;
  if (!specific?.setIndustryGroup) {
    result.warnings.push({ field: 'setIndustryGroup', message: 'SET Industry Group is recommended', severity: 'warning' });
  }
}

function hasField(data: any, fieldPath: string): boolean {
  const parts = fieldPath.split('.');
  let current = data;
  for (const part of parts) {
    if (current === null || current === undefined || !(part in current)) {
      return false;
    }
    current = current[part];
  }
  return current !== null && current !== undefined;
}

async function generatePDFReport(data: ReportData, standard: ReportStandard, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Title
    doc.fontSize(24).text(`ESG Report - ${getStandardName(standard)}`, { align: 'center' });
    doc.moveDown();

    // Report info
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.text(`Company: ${data.project.company}`);
    doc.text(`Reporting Period: ${data.reportingPeriod.startDate} to ${data.reportingPeriod.endDate}`);
    doc.moveDown();

    // Emissions Summary
    doc.fontSize(16).text('Emissions Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12)
      .text(`Scope 1: ${roundTo(data.emissions.scope1 / 1000, 2)} tonnes CO2e`)
      .text(`Scope 2: ${roundTo(data.emissions.scope2 / 1000, 2)} tonnes CO2e`)
      .text(`Scope 3: ${roundTo(data.emissions.scope3 / 1000, 2)} tonnes CO2e`)
      .text(`Total: ${roundTo(data.emissions.total / 1000, 2)} tonnes CO2e`);
    doc.moveDown();

    // Scope 3 Categories
    if (Object.keys(data.emissions.scope3Categories).length > 0) {
      doc.fontSize(14).text('Scope 3 by Category:');
      for (const [cat, value] of Object.entries(data.emissions.scope3Categories)) {
        doc.fontSize(10).text(`  ${cat}: ${roundTo((value as number) / 1000, 2)} tonnes CO2e`);
      }
      doc.moveDown();
    }

    // CFP/CFO if available
    if (data.cfp) {
      doc.fontSize(14).text('Carbon Footprint of Product (CFP):');
      doc.fontSize(10)
        .text(`  Product: ${data.cfp.productName}`)
        .text(`  CFP Total: ${roundTo(data.cfp.cfpTotal / 1000, 2)} tonnes CO2e`)
        .text(`  CFP per Unit: ${roundTo(data.cfp.cfpPerUnit, 4)} kg CO2e/${data.cfp.functionalUnit}`);
      doc.moveDown();
    }

    if (data.cfo) {
      doc.fontSize(14).text('Carbon Footprint of Organization (CFO):');
      doc.fontSize(10)
        .text(`  Organization: ${data.cfo.organizationName}`)
        .text(`  CFO Total: ${roundTo(data.cfo.cfoTotal / 1000, 2)} tonnes CO2e`);
      doc.moveDown();
    }

    // Standard-specific sections
    doc.addPage();
    doc.fontSize(16).text(`${getStandardName(standard)} Specific Information`, { underline: true });
    doc.moveDown();

    // Add standard-specific content
    if (data.standardSpecific) {
      for (const [key, value] of Object.entries(data.standardSpecific)) {
        if (value !== null && value !== undefined && value !== '') {
          doc.fontSize(10).text(`${formatFieldName(key)}: ${formatValue(value)}`);
        }
      }
    }

    // Footer
    doc.fontSize(8)
      .text(`Report ID: ${generateId()}`, 50, doc.page.height - 50, { align: 'left' })
      .text('Generated by ESG Reporting Tool', 0, doc.page.height - 50, { align: 'center' });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function generateExcelReport(data: ReportData, standard: ReportStandard, filePath: string): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['ESG Report Summary'],
    [''],
    ['Company', data.project.company],
    ['Facility', data.project.facilityName || ''],
    ['Reporting Year', data.project.reportingYear],
    ['Baseline Year', data.project.baselineYear],
    ['Standard', getStandardName(standard)],
    ['Generated', new Date().toISOString()],
    [''],
    ['Emissions Summary (tonnes CO2e)'],
    ['Scope 1', roundTo(data.emissions.scope1 / 1000, 2)],
    ['Scope 2', roundTo(data.emissions.scope2 / 1000, 2)],
    ['Scope 3', roundTo(data.emissions.scope3 / 1000, 2)],
    ['Total', roundTo(data.emissions.total / 1000, 2)],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Activities sheet
  const activitiesData = [
    ['Activity', 'Scope', 'Category', 'Quantity', 'Unit', 'Emissions (kg CO2e)', 'Tier'],
    ...data.activities.map((a) => [
      a.name,
      a.scope,
      a.category || '',
      a.quantity,
      a.unit,
      roundTo(a.emissions, 2),
      a.tierLevel,
    ]),
  ];

  const activitiesSheet = XLSX.utils.aoa_to_sheet(activitiesData);
  XLSX.utils.book_append_sheet(workbook, activitiesSheet, 'Activities');

  // Scope 3 Categories sheet
  if (Object.keys(data.emissions.scope3Categories).length > 0) {
    const scope3Data = [
      ['Category', 'Emissions (tonnes CO2e)'],
      ...Object.entries(data.emissions.scope3Categories).map(([cat, val]) => [
        cat,
        roundTo((val as number) / 1000, 2),
      ]),
    ];

    const scope3Sheet = XLSX.utils.aoa_to_sheet(scope3Data);
    XLSX.utils.book_append_sheet(workbook, scope3Sheet, 'Scope 3 Categories');
  }

  // Standard-specific sheet
  if (data.standardSpecific) {
    const specificData = [
      [`${getStandardName(standard)} Data`],
      [''],
      ...Object.entries(data.standardSpecific)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [formatFieldName(k), formatValue(v)]),
    ];

    const specificSheet = XLSX.utils.aoa_to_sheet(specificData);
    XLSX.utils.book_append_sheet(workbook, specificSheet, standard.toUpperCase());
  }

  // Write file
  XLSX.writeFile(workbook, filePath);
}

function getStandardName(standard: ReportStandard): string {
  const names: Record<ReportStandard, string> = {
    eu_cbam: 'EU CBAM',
    uk_cbam: 'UK CBAM',
    china_carbon: 'China Carbon Market',
    k_esg: 'Korea K-ESG',
    maff_esg: 'Japan MAFF ESG',
    thai_esg: 'Thailand Thai-ESG',
  };
  return names[standard] || standard;
}

function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, ' ');
}

function formatValue(value: any): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// Type definitions
interface ReportData {
  project: {
    id: string;
    name: string;
    company: string;
    facilityName?: string;
    facilityLocation?: string;
    industry?: string;
    baselineYear: number;
    reportingYear: number;
  };
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  emissions: {
    scope1: number;
    scope2: number;
    scope3: number;
    scope3Categories: Record<string, number>;
    total: number;
  };
  activities: Array<{
    name: string;
    scope: string;
    category?: string;
    quantity: number;
    unit: string;
    emissions: number;
    tierLevel: string;
  }>;
  cfp?: {
    productName: string;
    functionalUnit: string;
    cfpTotal: number;
    cfpPerUnit: number;
  } | null;
  cfo?: {
    organizationName: string;
    cfoTotal: number;
  } | null;
  generatedAt: string;
  standard: ReportStandard;
  standardSpecific?: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  warnings: Array<{ field: string; message: string; severity: string }>;
  errors: Array<{ field: string; message: string; severity: string }>;
  missingRequired: string[];
  completeness: number;
}

interface StandardRequirements {
  requiredFields: string[];
  optionalFields: string[];
  sections: string[];
  signatureRequired?: boolean;
}

interface ReportOptions {
  goodsCategory?: string;
  cnCode?: string;
  countryOfOrigin?: string;
  carbonPricePaid?: number;
  ukCommodityCode?: string;
  ukCarbonPriceEquivalent?: number;
  overseasCarbonPrice?: number;
  unifiedSocialCreditCode?: string;
  facilityType?: string;
  emissionAllowance?: number;
  complianceStatus?: string;
  businessRegistrationNumber?: string;
  governanceStructure?: string;
  reductionTarget?: string;
  reductionActivities?: string[];
  revenue?: number;
  kEsgScore?: number;
  kEsgGrade?: string;
  renewableEnergyUsage?: number;
  corporateNumber?: string;
  agriculturalEmissions?: number;
  foodLossReduction?: string;
  sustainableSourcing?: string;
  biodiversityImpact?: string;
  jgapStatus?: string;
  midoriStrategyAlignment?: string;
  taxId?: string;
  setIndustryGroup?: string;
  waterWithdrawal?: number;
  wasteManagement?: string;
  employeeData?: Record<string, any>;
  tcfdAlignment?: boolean;
  tVerCredits?: number;
}
