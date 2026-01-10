import { Request, Response } from 'express';
import { db } from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import type { ReportStandard } from '../types';

// Standard configurations
const STANDARD_CONFIGS: Record<ReportStandard, StandardConfig> = {
  eu_cbam: {
    id: 'eu_cbam',
    name: 'EU CBAM',
    fullName: 'European Union Carbon Border Adjustment Mechanism',
    region: 'European Union',
    authority: 'European Commission',
    effectiveDate: '2023-10-01',
    mandatoryDate: '2026-01-01',
    description: 'EU regulation requiring importers to purchase carbon certificates for the embedded emissions of imported goods.',
    website: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    requiresSignature: false,
    supportedScopes: ['scope1', 'scope2', 'scope3'],
    requiredFields: [
      'company_name', 'facility_location', 'goods_category', 'production_process',
      'direct_emissions', 'indirect_emissions', 'precursor_emissions', 'carbon_price_paid'
    ],
    optionalFields: [
      'electricity_source', 'heat_source', 'verification_statement'
    ],
    uniqueFields: [
      'cn_code', 'cbam_goods_category', 'country_of_origin', 'installation_operator'
    ],
  },
  uk_cbam: {
    id: 'uk_cbam',
    name: 'UK CBAM',
    fullName: 'United Kingdom Carbon Border Adjustment Mechanism',
    region: 'United Kingdom',
    authority: 'HM Revenue & Customs',
    effectiveDate: '2027-01-01',
    mandatoryDate: '2027-01-01',
    description: 'UK carbon border mechanism for imports of emission-intensive goods.',
    website: 'https://www.gov.uk/government/publications/carbon-border-adjustment-mechanism',
    requiresSignature: false,
    supportedScopes: ['scope1', 'scope2'],
    requiredFields: [
      'company_name', 'facility_location', 'goods_category', 'production_emissions',
      'embedded_emissions', 'uk_carbon_price_equivalent'
    ],
    optionalFields: [
      'overseas_carbon_price', 'verification_details'
    ],
    uniqueFields: [
      'uk_commodity_code', 'uk_cbam_sector'
    ],
  },
  china_carbon_market: {
    id: 'china_carbon_market',
    name: 'China Carbon Market',
    fullName: 'China National Carbon Trading Market',
    region: 'China',
    authority: 'Ministry of Ecology and Environment',
    effectiveDate: '2021-07-16',
    mandatoryDate: '2021-07-16',
    description: 'China\'s national emissions trading system covering power generation sector.',
    website: 'https://www.mee.gov.cn/',
    requiresSignature: false,
    supportedScopes: ['scope1', 'scope2'],
    requiredFields: [
      'enterprise_name', 'unified_social_credit_code', 'facility_type',
      'fuel_consumption', 'electricity_consumption', 'heat_consumption',
      'production_output', 'emission_factor', 'total_emissions'
    ],
    optionalFields: [
      'ccer_offset', 'benchmark_emissions', 'verification_body'
    ],
    uniqueFields: [
      'china_industry_code', 'emission_allowance', 'compliance_status'
    ],
  },
  k_esg: {
    id: 'k_esg',
    name: 'K-ESG',
    fullName: 'Korea ESG Guidelines',
    region: 'South Korea',
    authority: 'Ministry of Trade, Industry and Energy',
    effectiveDate: '2021-12-01',
    mandatoryDate: '2025-01-01',
    description: 'Korean ESG disclosure guidelines for listed companies.',
    website: 'https://www.motie.go.kr/',
    requiresSignature: true,
    supportedScopes: ['scope1', 'scope2', 'scope3'],
    requiredFields: [
      'company_name', 'business_registration_number', 'reporting_year',
      'scope1_emissions', 'scope2_emissions', 'emission_intensity',
      'reduction_target', 'reduction_activities', 'governance_structure'
    ],
    optionalFields: [
      'scope3_emissions', 'renewable_energy_usage', 'water_usage', 'waste_generation'
    ],
    uniqueFields: [
      'k_esg_score', 'k_esg_grade', 'korean_verification_body', 'ceo_declaration'
    ],
    signatureRequirements: {
      authorizedRoles: ['owner', 'director', 'auditor'],
      declarationRequired: true,
      verificationRequired: true,
    },
  },
  maff_esg: {
    id: 'maff_esg',
    name: 'MAFF ESG',
    fullName: 'Japan Ministry of Agriculture ESG Guidelines',
    region: 'Japan',
    authority: 'Ministry of Agriculture, Forestry and Fisheries',
    effectiveDate: '2022-04-01',
    mandatoryDate: '2024-04-01',
    description: 'Japanese ESG guidelines for agricultural and food industry.',
    website: 'https://www.maff.go.jp/',
    requiresSignature: true,
    supportedScopes: ['scope1', 'scope2', 'scope3'],
    requiredFields: [
      'company_name', 'corporate_number', 'fiscal_year',
      'scope1_emissions', 'scope2_emissions', 'agricultural_emissions',
      'food_loss_reduction', 'sustainable_sourcing', 'biodiversity_impact'
    ],
    optionalFields: [
      'scope3_emissions', 'organic_certification', 'gap_certification', 'animal_welfare'
    ],
    uniqueFields: [
      'jgap_status', 'midori_strategy_alignment', 'j_credit_usage', 'responsible_officer_declaration'
    ],
    signatureRequirements: {
      authorizedRoles: ['owner', 'director', 'auditor'],
      declarationRequired: true,
      verificationRequired: true,
    },
  },
  thai_esg: {
    id: 'thai_esg',
    name: 'Thai-ESG',
    fullName: 'Thailand ESG Disclosure Framework',
    region: 'Thailand',
    authority: 'Securities and Exchange Commission Thailand',
    effectiveDate: '2022-01-01',
    mandatoryDate: '2024-01-01',
    description: 'Thai SEC ESG disclosure requirements for listed companies.',
    website: 'https://www.sec.or.th/',
    requiresSignature: false,
    supportedScopes: ['scope1', 'scope2', 'scope3'],
    requiredFields: [
      'company_name', 'tax_id', 'reporting_period',
      'ghg_emissions_scope1', 'ghg_emissions_scope2', 'energy_consumption',
      'water_withdrawal', 'waste_management', 'employee_data'
    ],
    optionalFields: [
      'scope3_emissions', 'supply_chain_emissions', 'community_investment'
    ],
    uniqueFields: [
      'set_industry_group', 'tcfd_alignment', 'tgo_verification', 't_ver_credits'
    ],
  },
};

interface StandardConfig {
  id: string;
  name: string;
  fullName: string;
  region: string;
  authority: string;
  effectiveDate: string;
  mandatoryDate: string;
  description: string;
  website: string;
  requiresSignature: boolean;
  supportedScopes: string[];
  requiredFields: string[];
  optionalFields: string[];
  uniqueFields: string[];
  signatureRequirements?: {
    authorizedRoles: string[];
    declarationRequired: boolean;
    verificationRequired: boolean;
  };
}

/**
 * Get all supported standards
 */
export async function getSupportedStandards(req: Request, res: Response): Promise<void> {
  const standards = Object.values(STANDARD_CONFIGS).map((config) => ({
    id: config.id,
    name: config.name,
    fullName: config.fullName,
    region: config.region,
    authority: config.authority,
    effectiveDate: config.effectiveDate,
    mandatoryDate: config.mandatoryDate,
    description: config.description,
    website: config.website,
    requiresSignature: config.requiresSignature,
  }));

  res.json({
    success: true,
    data: standards,
  });
}

/**
 * Get standard details
 */
export async function getStandardDetails(req: Request, res: Response): Promise<void> {
  const { standardId } = req.params;

  const config = STANDARD_CONFIGS[standardId as ReportStandard];
  if (!config) {
    throw new NotFoundError(`Standard ${standardId} not found`);
  }

  res.json({
    success: true,
    data: config,
  });
}

/**
 * Get standard requirements (fields and sections)
 */
export async function getStandardRequirements(req: Request, res: Response): Promise<void> {
  const { standardId } = req.params;

  const config = STANDARD_CONFIGS[standardId as ReportStandard];
  if (!config) {
    throw new NotFoundError(`Standard ${standardId} not found`);
  }

  res.json({
    success: true,
    data: {
      standardId: config.id,
      name: config.name,
      supportedScopes: config.supportedScopes,
      requiredFields: config.requiredFields,
      optionalFields: config.optionalFields,
      uniqueFields: config.uniqueFields,
      requiresSignature: config.requiresSignature,
      signatureRequirements: config.signatureRequirements,
      sections: getStandardSections(standardId as ReportStandard),
    },
  });
}

/**
 * Get overlapping fields between two standards
 */
export async function getStandardOverlap(req: Request, res: Response): Promise<void> {
  const { standard1, standard2 } = req.params;

  const config1 = STANDARD_CONFIGS[standard1 as ReportStandard];
  const config2 = STANDARD_CONFIGS[standard2 as ReportStandard];

  if (!config1) {
    throw new NotFoundError(`Standard ${standard1} not found`);
  }
  if (!config2) {
    throw new NotFoundError(`Standard ${standard2} not found`);
  }

  // Find common required fields
  const commonRequired = config1.requiredFields.filter((f) =>
    config2.requiredFields.includes(f)
  );

  // Find common optional fields
  const commonOptional = config1.optionalFields.filter((f) =>
    config2.optionalFields.includes(f)
  );

  // Find unique fields for each
  const uniqueToFirst = {
    required: config1.requiredFields.filter((f) => !config2.requiredFields.includes(f)),
    optional: config1.optionalFields.filter((f) => !config2.optionalFields.includes(f)),
    special: config1.uniqueFields,
  };

  const uniqueToSecond = {
    required: config2.requiredFields.filter((f) => !config1.requiredFields.includes(f)),
    optional: config2.optionalFields.filter((f) => !config1.optionalFields.includes(f)),
    special: config2.uniqueFields,
  };

  // Calculate overlap percentage
  const totalFields1 = config1.requiredFields.length + config1.optionalFields.length;
  const totalFields2 = config2.requiredFields.length + config2.optionalFields.length;
  const commonFields = commonRequired.length + commonOptional.length;
  const overlapPercentage = Math.round(
    (commonFields * 2 / (totalFields1 + totalFields2)) * 100
  );

  res.json({
    success: true,
    data: {
      standards: [
        { id: config1.id, name: config1.name },
        { id: config2.id, name: config2.name },
      ],
      overlap: {
        percentage: overlapPercentage,
        commonRequiredFields: commonRequired,
        commonOptionalFields: commonOptional,
      },
      uniqueTo: {
        [config1.id]: uniqueToFirst,
        [config2.id]: uniqueToSecond,
      },
      compatibility: {
        canShareData: commonRequired.length > 5,
        recommendedWorkflow: getRecommendedWorkflow(standard1, standard2),
      },
    },
  });
}

/**
 * Get standard configuration (admin only)
 */
export async function getStandardConfig(req: Request, res: Response): Promise<void> {
  const { standardId } = req.params;

  // Get custom configuration from database
  const result = await db.query(
    `SELECT * FROM standard_configs WHERE standard_id = $1`,
    [standardId]
  );

  const baseConfig = STANDARD_CONFIGS[standardId as ReportStandard];
  if (!baseConfig) {
    throw new NotFoundError(`Standard ${standardId} not found`);
  }

  const customConfig = result.rows[0] || {};

  res.json({
    success: true,
    data: {
      ...baseConfig,
      customSettings: customConfig.settings || {},
      overrides: customConfig.overrides || {},
      lastUpdated: customConfig.updated_at,
    },
  });
}

/**
 * Update standard configuration (admin only)
 */
export async function updateStandardConfig(req: Request, res: Response): Promise<void> {
  const { standardId } = req.params;
  const { settings, overrides } = req.body;

  // Verify standard exists
  if (!STANDARD_CONFIGS[standardId as ReportStandard]) {
    throw new NotFoundError(`Standard ${standardId} not found`);
  }

  // Upsert configuration
  await db.query(
    `INSERT INTO standard_configs (standard_id, settings, overrides, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (standard_id) DO UPDATE SET
       settings = COALESCE($2, standard_configs.settings),
       overrides = COALESCE($3, standard_configs.overrides),
       updated_at = NOW()`,
    [standardId, JSON.stringify(settings), JSON.stringify(overrides)]
  );

  res.json({
    success: true,
    message: 'Standard configuration updated',
    data: {
      standardId,
      settings,
      overrides,
    },
  });
}

// Helper function to get standard-specific sections
function getStandardSections(standardId: ReportStandard): Section[] {
  const commonSections: Section[] = [
    {
      id: 'organization',
      name: 'Organization Information',
      description: 'Basic information about the reporting organization',
      required: true,
    },
    {
      id: 'boundaries',
      name: 'Organizational Boundaries',
      description: 'Definition of operational and financial boundaries',
      required: true,
    },
    {
      id: 'emissions',
      name: 'GHG Emissions',
      description: 'Greenhouse gas emissions by scope',
      required: true,
    },
    {
      id: 'methodology',
      name: 'Calculation Methodology',
      description: 'Methods used for emissions calculations',
      required: true,
    },
  ];

  const standardSpecificSections: Record<ReportStandard, Section[]> = {
    eu_cbam: [
      { id: 'goods', name: 'CBAM Goods', description: 'Covered goods and CN codes', required: true },
      { id: 'installations', name: 'Installations', description: 'Production installations', required: true },
      { id: 'precursors', name: 'Precursor Materials', description: 'Embedded emissions in precursors', required: true },
      { id: 'carbon_price', name: 'Carbon Price', description: 'Carbon price paid in country of origin', required: false },
    ],
    uk_cbam: [
      { id: 'goods', name: 'CBAM Goods', description: 'Covered goods and UK codes', required: true },
      { id: 'embedded', name: 'Embedded Emissions', description: 'Emissions embedded in goods', required: true },
      { id: 'verification', name: 'Verification', description: 'Third-party verification details', required: false },
    ],
    china_carbon_market: [
      { id: 'enterprise', name: 'Enterprise Information', description: 'Detailed enterprise data', required: true },
      { id: 'fuel', name: 'Fuel Consumption', description: 'Fuel types and consumption', required: true },
      { id: 'electricity', name: 'Electricity Data', description: 'Electricity consumption and sources', required: true },
      { id: 'allowances', name: 'Allowances', description: 'Emission allowances and compliance', required: true },
    ],
    k_esg: [
      { id: 'governance', name: 'Governance', description: 'ESG governance structure', required: true },
      { id: 'targets', name: 'Reduction Targets', description: 'GHG reduction targets and progress', required: true },
      { id: 'activities', name: 'Reduction Activities', description: 'Emission reduction initiatives', required: true },
      { id: 'declaration', name: 'CEO Declaration', description: 'Executive declaration and signature', required: true },
    ],
    maff_esg: [
      { id: 'agriculture', name: 'Agricultural Emissions', description: 'Farm and agricultural emissions', required: true },
      { id: 'food_loss', name: 'Food Loss', description: 'Food loss and waste reduction', required: true },
      { id: 'sourcing', name: 'Sustainable Sourcing', description: 'Sustainable procurement practices', required: true },
      { id: 'biodiversity', name: 'Biodiversity', description: 'Biodiversity impact assessment', required: true },
      { id: 'declaration', name: 'Officer Declaration', description: 'Responsible officer declaration', required: true },
    ],
    thai_esg: [
      { id: 'set_disclosure', name: 'SET Disclosure', description: 'Stock Exchange of Thailand requirements', required: true },
      { id: 'energy', name: 'Energy Management', description: 'Energy consumption and efficiency', required: true },
      { id: 'water', name: 'Water Management', description: 'Water usage and discharge', required: true },
      { id: 'social', name: 'Social Indicators', description: 'Employee and community data', required: true },
    ],
  };

  return [...commonSections, ...(standardSpecificSections[standardId] || [])];
}

interface Section {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

// Helper function to get recommended workflow
function getRecommendedWorkflow(standard1: string, standard2: string): string {
  const workflows: Record<string, string> = {
    'eu_cbam-uk_cbam': 'Both are CBAM mechanisms with high overlap. Enter data once and generate both reports.',
    'k_esg-maff_esg': 'Both require digital signatures. Recommend completing K-ESG first, then adapting for MAFF.',
    'eu_cbam-china_carbon': 'Different focus areas. EU CBAM for imports, China for domestic. May need separate data collection.',
  };

  const key = [standard1, standard2].sort().join('-');
  return workflows[key] || 'Enter common data first, then add standard-specific fields for each report.';
}
