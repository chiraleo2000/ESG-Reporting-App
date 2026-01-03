// ============================================================================
// ESG Reporting App - Type Definitions
// ============================================================================

// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  organization: string;
  role: UserRole;
  signature_authorized: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export type UserRole = 'owner' | 'director' | 'auditor' | 'editor' | 'viewer';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  signatureAuthorized: boolean;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  company_name: string;
  company_size: CompanySize;
  sector: string;
  baseline_year: number;
  reporting_year: number;
  countries: string[]; // Countries for regional grid EF
  standards_selected: ReportStandard[];
  cfp_mode: boolean;
  cfo_mode: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export type CompanySize = 'small' | 'medium' | 'large' | 'enterprise';

// ============================================================================
// REPORT STANDARDS
// ============================================================================

export type ReportStandard = 
  | 'EU_CBAM'
  | 'UK_CBAM'
  | 'CHINA_CARBON'
  | 'JAPAN_MAFF'
  | 'KOREA_KESG'
  | 'THAILAND_ESG';

export interface StandardConfig {
  id: ReportStandard;
  name: string;
  description: string;
  country: string;
  requires_signature: boolean;
  requires_audit_trail: boolean;
  scope_requirements: {
    scope1: boolean;
    scope2: boolean;
    scope3: boolean;
    precursors: boolean;
  };
  report_sections: string[];
  output_formats: ('pdf' | 'xlsx')[];
}

// ============================================================================
// ACTIVITY & EMISSIONS TYPES
// ============================================================================

export interface Activity {
  id: string;
  project_id: string;
  file_id?: string;
  date: Date;
  scope: EmissionScope;
  category: string;
  tier?: Scope3Tier;
  direction?: Scope3Direction;
  activity_type: string;
  activity_description?: string;
  quantity: number;
  unit: string;
  region: string;
  country: string;
  material_type?: string;
  production_route?: string;
  emission_factor?: number;
  emission_factor_source?: string;
  emission_factor_unit?: string;
  total_emissions?: number;
  data_quality_score?: number;
  baseline_year: number;
  reporting_year: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export type EmissionScope = 'scope1' | 'scope2' | 'scope3';

export type Scope3Tier = 'tier1' | 'tier2' | 'tier2_plus';

export type Scope3Direction = 'upstream' | 'downstream';

// 15 Scope 3 Categories (GHG Protocol)
export type Scope3Category =
  | 'purchased_goods_services'      // Cat 1
  | 'capital_goods'                 // Cat 2
  | 'fuel_energy_activities'        // Cat 3
  | 'upstream_transport'            // Cat 4
  | 'waste_generated'               // Cat 5
  | 'business_travel'               // Cat 6
  | 'employee_commuting'            // Cat 7
  | 'upstream_leased_assets'        // Cat 8
  | 'downstream_transport'          // Cat 9
  | 'processing_of_products'        // Cat 10
  | 'use_of_sold_products'          // Cat 11
  | 'end_of_life_treatment'         // Cat 12
  | 'downstream_leased_assets'      // Cat 13
  | 'franchises'                    // Cat 14
  | 'investments';                  // Cat 15

export const SCOPE3_CATEGORY_DIRECTIONS: Record<Scope3Category, Scope3Direction> = {
  purchased_goods_services: 'upstream',
  capital_goods: 'upstream',
  fuel_energy_activities: 'upstream',
  upstream_transport: 'upstream',
  waste_generated: 'upstream',
  business_travel: 'upstream',
  employee_commuting: 'upstream',
  upstream_leased_assets: 'upstream',
  downstream_transport: 'downstream',
  processing_of_products: 'downstream',
  use_of_sold_products: 'downstream',
  end_of_life_treatment: 'downstream',
  downstream_leased_assets: 'downstream',
  franchises: 'downstream',
  investments: 'downstream',
};

// ============================================================================
// EMISSION FACTORS
// ============================================================================

export interface EmissionFactor {
  id: string;
  material_type: string;
  category: string;
  scope: EmissionScope;
  standard?: ReportStandard;
  region?: string;
  country?: string;
  year: number;
  factor: number;
  unit: string;
  source: string;
  confidence: number;
  tier_multiplier?: number;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GridEmissionFactor {
  id: string;
  country: string;
  region?: string;
  year: number;
  factor: number; // tCO2/MWh
  source: string;
  renewable_percentage?: number;
  fossil_percentage?: number;
  nuclear_percentage?: number;
  is_user_override: boolean;
  project_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PrecursorFactor {
  id: string;
  material_type: CBAMMaterial;
  production_route: string;
  precursor_level: 'direct' | 'secondary';
  year: number;
  factor: number;
  unit: string;
  source: string;
  is_default: boolean;
  project_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type CBAMMaterial = 
  | 'cement'
  | 'iron_steel'
  | 'aluminium'
  | 'fertilizers'
  | 'hydrogen'
  | 'electricity';

// ============================================================================
// CALCULATION RESULTS
// ============================================================================

export interface CalculationRun {
  id: string;
  project_id: string;
  triggered_by: string;
  calculation_type: 'cfp' | 'cfo' | 'both';
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  created_at: Date;
}

export interface CFPResult {
  id: string;
  calculation_run_id: string;
  project_id: string;
  product_id?: string;
  product_name?: string;
  production_quantity: number;
  production_unit: string;
  cfp_value: number; // tCO2e per unit
  scope1_contribution: number;
  scope2_contribution: number;
  scope3_contribution: number;
  scope3_tier1_contribution: number;
  scope3_tier2_plus_contribution: number;
  precursor_contribution: number;
  by_region: Record<string, number>;
  by_category: Record<string, number>;
  data_quality_score: number;
  baseline_year: number;
  reporting_year: number;
  baseline_comparison?: number; // % reduction from baseline
  methodology_notes?: string;
  created_at: Date;
}

export interface CFOResult {
  id: string;
  calculation_run_id: string;
  project_id: string;
  organization_id?: string;
  total_emissions: number; // tCO2e
  scope1_total: number;
  scope2_total: number;
  scope3_total: number;
  scope3_tier1_total: number;
  scope3_tier2_plus_total: number;
  scope3_by_category: Record<Scope3Category, number>;
  scope3_upstream_total: number;
  scope3_downstream_total: number;
  precursor_total: number;
  by_region: Record<string, number>;
  by_country: Record<string, number>;
  intensity_metrics?: Record<string, number>;
  data_quality_score: number;
  baseline_year: number;
  reporting_year: number;
  baseline_comparison?: number; // % reduction from baseline
  methodology_notes?: string;
  created_at: Date;
}

export interface HotSpot {
  activity_id: string;
  activity_type: string;
  scope: EmissionScope;
  category: string;
  emissions: number;
  percentage_of_total: number;
  region?: string;
  tier?: Scope3Tier;
}

// ============================================================================
// REPORTS
// ============================================================================

export interface Report {
  id: string;
  project_id: string;
  batch_id?: string;
  standard: ReportStandard;
  format: 'pdf' | 'xlsx';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  file_path?: string;
  file_size?: number;
  file_hash?: string;
  cfp_result_id?: string;
  cfo_result_id?: string;
  includes_audit_trail: boolean;
  signature_required: boolean;
  signed: boolean;
  signed_by?: string;
  signed_at?: Date;
  generated_by: string;
  generated_at?: Date;
  expires_at?: Date;
  metadata: ReportMetadata;
  created_at: Date;
  updated_at: Date;
}

export interface ReportMetadata {
  company_name: string;
  reporting_period: string;
  baseline_year: number;
  reporting_year: number;
  standards_used: ReportStandard[];
  precursor_factors_used: { material: string; route: string; factor: number }[];
  grid_ef_sources: { country: string; year: number; factor: number; source: string }[];
  total_activities: number;
  data_quality_score: number;
  generation_timestamp: string;
}

export interface ReportBatch {
  id: string;
  project_id: string;
  standards: ReportStandard[];
  formats: ('pdf' | 'xlsx')[];
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  total_reports: number;
  completed_reports: number;
  failed_reports: number;
  estimated_duration_seconds: number;
  started_at?: Date;
  completed_at?: Date;
  created_by: string;
  created_at: Date;
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export interface AuditLog {
  id: string;
  project_id?: string;
  user_id: string;
  action_type: AuditActionType;
  resource_type: string;
  resource_id?: string;
  change_details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  deleted_at?: Date; // For 7-year retention soft delete
}

export type AuditActionType =
  | 'file_upload'
  | 'file_delete'
  | 'activity_create'
  | 'activity_update'
  | 'activity_delete'
  | 'calculation_run'
  | 'ef_override'
  | 'precursor_config'
  | 'grid_ef_override'
  | 'report_generate'
  | 'report_sign'
  | 'report_download'
  | 'project_create'
  | 'project_update'
  | 'project_delete'
  | 'user_login'
  | 'user_logout'
  | 'settings_change';

// ============================================================================
// DIGITAL SIGNATURES
// ============================================================================

export interface Signature {
  id: string;
  report_id: string;
  project_id: string;
  signer_user_id: string;
  signer_name: string;
  signer_title: string;
  signer_organization: string;
  signer_role: UserRole;
  signature_hash: string;
  signature_data?: string;
  signed_at: Date;
  verified: boolean;
  verification_timestamp?: Date;
  created_at: Date;
}

// ============================================================================
// FILE UPLOAD
// ============================================================================

export interface UploadedFile {
  id: string;
  project_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_type: 'xlsx' | 'csv';
  file_size: number;
  row_count: number;
  valid_rows: number;
  error_rows: number;
  parsing_errors: ParsingError[];
  uploaded_by: string;
  uploaded_at: Date;
  processed_at?: Date;
  deleted_at?: Date;
}

export interface ParsingError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CalculateCFPRequest {
  projectId: string;
  productId?: string;
  productionQuantity?: number;
  productionUnit?: string;
}

export interface CalculateCFORequest {
  projectId: string;
  organizationId?: string;
}

export interface CalculatePrecursorsRequest {
  projectId: string;
  goods: {
    material: CBAMMaterial;
    productionRoute: string;
    quantity: number;
  }[];
}

export interface BatchReportRequest {
  projectId: string;
  standards: ReportStandard[];
  formats: ('pdf' | 'xlsx')[];
  includeAuditTrail: boolean;
  signatureRequired: boolean;
}

export interface SerpAPILookupRequest {
  material: string;
  category: string;
  tier?: Scope3Tier;
  region?: string;
  country?: string;
}

export interface SerpAPILookupResponse {
  emissionFactor: number;
  tierMultiplier?: number;
  regionAdjustedEF?: number;
  unit: string;
  source: string;
  confidence: number;
  precursorApplicable: boolean;
  cached: boolean;
}

// ============================================================================
// PAGINATION & FILTERING
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ActivityFilter {
  scope?: EmissionScope;
  category?: string;
  tier?: Scope3Tier;
  direction?: Scope3Direction;
  region?: string;
  country?: string;
  materialType?: string;
  productionRoute?: string;
  dateFrom?: Date;
  dateTo?: Date;
  baselineYear?: number;
  reportingYear?: number;
}

export interface AuditLogFilter {
  actionType?: AuditActionType;
  userId?: string;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
