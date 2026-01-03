-- ESG Reporting Application Database Schema
-- PostgreSQL 16+ with pgvector for LLM embeddings

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for LLM embeddings

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'owner', 'director', 'editor', 'viewer', 'auditor');
CREATE TYPE project_status AS ENUM ('active', 'archived', 'draft');
CREATE TYPE emission_scope AS ENUM ('scope1', 'scope2', 'scope3');
CREATE TYPE scope3_category AS ENUM (
  'purchased_goods_services',
  'capital_goods', 
  'fuel_energy_activities',
  'upstream_transport',
  'waste_generated',
  'business_travel',
  'employee_commuting',
  'upstream_leased_assets',
  'downstream_transport',
  'processing_sold_products',
  'use_of_sold_products',
  'end_of_life_sold_products',
  'downstream_leased_assets',
  'franchises',
  'investments'
);
CREATE TYPE calculation_tier AS ENUM ('tier1', 'tier2', 'tier3');
CREATE TYPE report_standard AS ENUM (
  'eu_cbam', 
  'uk_cbam', 
  'china_carbon_market', 
  'k_esg', 
  'maff_esg', 
  'thai_esg'
);
CREATE TYPE report_status AS ENUM ('draft', 'pending_review', 'approved', 'submitted', 'archived');
CREATE TYPE signature_type AS ENUM ('approval', 'submission', 'audit');
CREATE TYPE file_type AS ENUM ('excel', 'pdf', 'csv', 'image', 'document');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  organization VARCHAR(255),
  department VARCHAR(255),
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  password_changed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization ON users(organization);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================
-- PROJECTS TABLE
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  organization VARCHAR(255),
  industry VARCHAR(100),
  country VARCHAR(100),
  region VARCHAR(100),
  baseline_year INTEGER NOT NULL,
  reporting_year INTEGER NOT NULL,
  status project_status DEFAULT 'draft',
  standards report_standard[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_years CHECK (reporting_year >= baseline_year)
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_organization ON projects(organization);
CREATE INDEX idx_projects_years ON projects(baseline_year, reporting_year);

-- ============================================
-- PROJECT MEMBERS TABLE
-- ============================================

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- ============================================
-- ACTIVITIES TABLE (Emission Sources)
-- ============================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scope emission_scope NOT NULL,
  scope3_category scope3_category,
  activity_type VARCHAR(100) NOT NULL,
  
  -- Activity data
  activity_data DECIMAL(20, 6) NOT NULL,
  activity_unit VARCHAR(50) NOT NULL,
  
  -- Emission factor
  emission_factor DECIMAL(20, 10),
  emission_factor_unit VARCHAR(50),
  emission_factor_source VARCHAR(255),
  
  -- Calculation settings
  calculation_tier calculation_tier DEFAULT 'tier1',
  tier_multiplier DECIMAL(5, 2) DEFAULT 1.0,
  
  -- Location/time context
  facility VARCHAR(255),
  location VARCHAR(255),
  reporting_period_start DATE,
  reporting_period_end DATE,
  year INTEGER NOT NULL,
  
  -- Upstream/downstream tracking (for Scope 3)
  direction VARCHAR(20), -- 'upstream' or 'downstream'
  supplier_name VARCHAR(255),
  supplier_tier INTEGER, -- 1, 2, 3, etc. for supply chain depth
  
  -- Data quality
  data_quality_score INTEGER CHECK (data_quality_score >= 1 AND data_quality_score <= 5),
  uncertainty_percentage DECIMAL(5, 2),
  verification_status VARCHAR(50) DEFAULT 'unverified',
  
  -- Metadata
  tags VARCHAR(100)[],
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_project ON activities(project_id);
CREATE INDEX idx_activities_scope ON activities(scope);
CREATE INDEX idx_activities_scope3_cat ON activities(scope3_category);
CREATE INDEX idx_activities_year ON activities(year);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_tier ON activities(calculation_tier);

-- ============================================
-- EMISSION FACTORS TABLE (Custom/Cached)
-- ============================================

CREATE TABLE emission_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  
  -- Factor value
  factor_value DECIMAL(20, 10) NOT NULL,
  factor_unit VARCHAR(50) NOT NULL,
  activity_unit VARCHAR(50) NOT NULL,
  
  -- Source information
  source VARCHAR(255) NOT NULL,
  source_url VARCHAR(500),
  source_year INTEGER,
  
  -- Scope and region
  scope emission_scope,
  region VARCHAR(100),
  country VARCHAR(100),
  
  -- Validity
  valid_from DATE,
  valid_to DATE,
  
  -- Quality
  data_quality VARCHAR(50),
  uncertainty_min DECIMAL(5, 2),
  uncertainty_max DECIMAL(5, 2),
  
  -- Metadata
  gwp_values JSONB, -- CO2, CH4, N2O, etc.
  metadata JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emission_factors_category ON emission_factors(category);
CREATE INDEX idx_emission_factors_scope ON emission_factors(scope);
CREATE INDEX idx_emission_factors_region ON emission_factors(region, country);
CREATE INDEX idx_emission_factors_source ON emission_factors(source);
CREATE INDEX idx_emission_factors_active ON emission_factors(is_active);

-- ============================================
-- GRID EMISSION FACTORS TABLE
-- ============================================

CREATE TABLE grid_emission_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  grid_name VARCHAR(255),
  
  -- Emission factors
  location_based_ef DECIMAL(20, 10) NOT NULL, -- kgCO2e/kWh
  market_based_ef DECIMAL(20, 10),
  
  -- Time period
  year INTEGER NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  
  -- Source
  source VARCHAR(255) NOT NULL,
  source_url VARCHAR(500),
  
  -- Metadata
  methodology VARCHAR(255),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_grid_ef UNIQUE (country, region, year)
);

CREATE INDEX idx_grid_ef_country ON grid_emission_factors(country);
CREATE INDEX idx_grid_ef_region ON grid_emission_factors(region);
CREATE INDEX idx_grid_ef_year ON grid_emission_factors(year);
CREATE INDEX idx_grid_ef_active ON grid_emission_factors(is_active);

-- ============================================
-- PRECURSOR FACTORS TABLE (CBAM Materials)
-- ============================================

CREATE TABLE precursor_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material VARCHAR(100) NOT NULL,
  production_route VARCHAR(100) NOT NULL,
  
  -- Factor values
  direct_emissions_factor DECIMAL(20, 10) NOT NULL, -- tCO2e/t product
  indirect_emissions_factor DECIMAL(20, 10),
  total_emissions_factor DECIMAL(20, 10),
  
  -- Electricity consumption
  electricity_consumption DECIMAL(20, 10), -- MWh/t
  
  -- Source and validity
  source VARCHAR(255) NOT NULL,
  source_url VARCHAR(500),
  valid_from DATE NOT NULL,
  valid_to DATE,
  
  -- Regional specifics
  region VARCHAR(100),
  country VARCHAR(100),
  
  -- Metadata
  cn_codes VARCHAR(20)[], -- Combined Nomenclature codes
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_precursor UNIQUE (material, production_route, region, valid_from)
);

CREATE INDEX idx_precursor_material ON precursor_factors(material);
CREATE INDEX idx_precursor_route ON precursor_factors(production_route);
CREATE INDEX idx_precursor_region ON precursor_factors(region, country);
CREATE INDEX idx_precursor_active ON precursor_factors(is_active);

-- ============================================
-- CFP RESULTS TABLE (Carbon Footprint of Product)
-- ============================================

CREATE TABLE cfp_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  
  -- Product information
  product_name VARCHAR(255) NOT NULL,
  product_unit VARCHAR(50) NOT NULL,
  functional_unit VARCHAR(255),
  
  -- CFP values
  total_cfp DECIMAL(20, 6) NOT NULL, -- kgCO2e per unit
  scope1_contribution DECIMAL(20, 6) DEFAULT 0,
  scope2_contribution DECIMAL(20, 6) DEFAULT 0,
  scope3_contribution DECIMAL(20, 6) DEFAULT 0,
  
  -- Breakdown by lifecycle stage
  raw_materials DECIMAL(20, 6) DEFAULT 0,
  manufacturing DECIMAL(20, 6) DEFAULT 0,
  transport DECIMAL(20, 6) DEFAULT 0,
  use_phase DECIMAL(20, 6) DEFAULT 0,
  end_of_life DECIMAL(20, 6) DEFAULT 0,
  
  -- Context
  year INTEGER NOT NULL,
  calculation_method VARCHAR(100),
  boundary_description TEXT,
  
  -- Data quality
  data_quality_rating VARCHAR(50),
  uncertainty_percentage DECIMAL(5, 2),
  
  -- Metadata
  assumptions JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  calculated_by UUID NOT NULL REFERENCES users(id),
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cfp_project ON cfp_results(project_id);
CREATE INDEX idx_cfp_product ON cfp_results(product_name);
CREATE INDEX idx_cfp_year ON cfp_results(year);

-- ============================================
-- CFO RESULTS TABLE (Carbon Footprint of Organization)
-- ============================================

CREATE TABLE cfo_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Organization context
  organization_name VARCHAR(255) NOT NULL,
  reporting_boundary VARCHAR(255),
  consolidation_approach VARCHAR(100), -- 'operational', 'financial', 'equity_share'
  
  -- Total emissions
  total_emissions DECIMAL(20, 6) NOT NULL, -- tCO2e
  
  -- Scope breakdown
  scope1_total DECIMAL(20, 6) DEFAULT 0,
  scope1_stationary DECIMAL(20, 6) DEFAULT 0,
  scope1_mobile DECIMAL(20, 6) DEFAULT 0,
  scope1_process DECIMAL(20, 6) DEFAULT 0,
  scope1_fugitive DECIMAL(20, 6) DEFAULT 0,
  
  scope2_total DECIMAL(20, 6) DEFAULT 0,
  scope2_location_based DECIMAL(20, 6) DEFAULT 0,
  scope2_market_based DECIMAL(20, 6) DEFAULT 0,
  
  scope3_total DECIMAL(20, 6) DEFAULT 0,
  scope3_upstream DECIMAL(20, 6) DEFAULT 0,
  scope3_downstream DECIMAL(20, 6) DEFAULT 0,
  scope3_by_category JSONB DEFAULT '{}', -- Category-level breakdown
  
  -- Intensity metrics
  revenue DECIMAL(20, 2),
  revenue_currency VARCHAR(10),
  emissions_intensity_revenue DECIMAL(20, 6), -- tCO2e per revenue unit
  
  employees INTEGER,
  emissions_intensity_employee DECIMAL(20, 6), -- tCO2e per employee
  
  production_volume DECIMAL(20, 6),
  production_unit VARCHAR(50),
  emissions_intensity_production DECIMAL(20, 6), -- tCO2e per production unit
  
  -- Time period
  year INTEGER NOT NULL,
  period_start DATE,
  period_end DATE,
  
  -- Comparison
  baseline_year INTEGER,
  baseline_emissions DECIMAL(20, 6),
  change_from_baseline_absolute DECIMAL(20, 6),
  change_from_baseline_percentage DECIMAL(10, 2),
  
  -- Data quality
  data_completeness_percentage DECIMAL(5, 2),
  verification_status VARCHAR(50) DEFAULT 'unverified',
  verifier_name VARCHAR(255),
  verification_date DATE,
  
  -- Metadata
  methodology VARCHAR(255),
  exclusions TEXT,
  assumptions JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  calculated_by UUID NOT NULL REFERENCES users(id),
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cfo_project ON cfo_results(project_id);
CREATE INDEX idx_cfo_year ON cfo_results(year);
CREATE INDEX idx_cfo_organization ON cfo_results(organization_name);

-- ============================================
-- REPORTS TABLE
-- ============================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Report identification
  name VARCHAR(255) NOT NULL,
  standard report_standard NOT NULL,
  version INTEGER DEFAULT 1,
  
  -- Report period
  reporting_year INTEGER NOT NULL,
  period_start DATE,
  period_end DATE,
  
  -- Status and workflow
  status report_status DEFAULT 'draft',
  submission_deadline DATE,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  
  -- Report data (cached)
  report_data JSONB NOT NULL DEFAULT '{}',
  summary_data JSONB DEFAULT '{}',
  
  -- Validation
  validation_status VARCHAR(50) DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',
  last_validated_at TIMESTAMP,
  
  -- Files
  pdf_file_id UUID,
  excel_file_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_project ON reports(project_id);
CREATE INDEX idx_reports_standard ON reports(standard);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_year ON reports(reporting_year);

-- ============================================
-- SIGNATURES TABLE (Digital Signatures)
-- ============================================

CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  
  -- Signer information
  signer_id UUID NOT NULL REFERENCES users(id),
  signer_name VARCHAR(255) NOT NULL,
  signer_email VARCHAR(255) NOT NULL,
  signer_role VARCHAR(100) NOT NULL,
  signer_title VARCHAR(255),
  
  -- Signature data
  signature_hash VARCHAR(255) NOT NULL,
  content_hash VARCHAR(255) NOT NULL,
  signature_data JSONB NOT NULL,
  signature_type signature_type NOT NULL,
  
  -- Certificate data
  certificate_data JSONB DEFAULT '{}',
  
  -- Validity
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revocation_reason TEXT,
  
  -- Verification
  is_valid BOOLEAN DEFAULT TRUE,
  last_verified_at TIMESTAMP,
  verification_count INTEGER DEFAULT 0,
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signatures_report ON signatures(report_id);
CREATE INDEX idx_signatures_signer ON signatures(signer_id);
CREATE INDEX idx_signatures_type ON signatures(signature_type);
CREATE INDEX idx_signatures_valid ON signatures(is_valid);
CREATE INDEX idx_signatures_hash ON signatures(signature_hash);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  
  -- Change details
  details JSONB NOT NULL DEFAULT '{}',
  old_values JSONB,
  new_values JSONB,
  
  -- Request context
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(255),
  
  -- Timestamp (partitioned by month for efficient cleanup)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Partition audit_logs by month for efficient 7-year retention management
-- Note: This is a simplified version; production should use table partitioning

CREATE INDEX idx_audit_logs_project ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- FILES TABLE (Uploaded Files)
-- ============================================

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- File information
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_type file_type NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  
  -- Checksums
  md5_hash VARCHAR(32),
  sha256_hash VARCHAR(64),
  
  -- Processing
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  processing_result JSONB,
  
  -- Metadata
  description TEXT,
  tags VARCHAR(100)[],
  metadata JSONB DEFAULT '{}',
  
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_files_project ON files(project_id);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);

-- ============================================
-- REFRESH TOKENS TABLE (For JWT Auth)
-- ============================================

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info VARCHAR(500),
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================
-- SCHEDULED JOBS TABLE (Job Tracking)
-- ============================================

CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(100) NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  
  -- Schedule
  cron_expression VARCHAR(100),
  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  is_enabled BOOLEAN DEFAULT TRUE,
  
  -- Execution details
  last_result JSONB,
  last_error TEXT,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Metadata
  config JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_jobs_name ON scheduled_jobs(job_name);
CREATE INDEX idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at);
CREATE INDEX idx_scheduled_jobs_enabled ON scheduled_jobs(is_enabled);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_members_updated_at BEFORE UPDATE ON project_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emission_factors_updated_at BEFORE UPDATE ON emission_factors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grid_emission_factors_updated_at BEFORE UPDATE ON grid_emission_factors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_precursor_factors_updated_at BEFORE UPDATE ON precursor_factors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cfp_results_updated_at BEFORE UPDATE ON cfp_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cfo_results_updated_at BEFORE UPDATE ON cfo_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_signatures_updated_at BEFORE UPDATE ON signatures 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON scheduled_jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA - Default Emission Factors
-- ============================================

-- Insert default grid emission factors for major regions
INSERT INTO grid_emission_factors (country, region, year, location_based_ef, market_based_ef, source, effective_date, is_active)
VALUES
  ('Thailand', 'National Grid', 2024, 0.4999, 0.4999, 'EGAT/TGO', '2024-01-15', true),
  ('China', 'National Grid', 2024, 0.5810, 0.5810, 'MEE China', '2024-01-15', true),
  ('Japan', 'National Grid', 2024, 0.4570, 0.4570, 'MOE Japan', '2024-01-15', true),
  ('South Korea', 'National Grid', 2024, 0.4590, 0.4590, 'KEITI', '2024-01-15', true),
  ('Germany', 'National Grid', 2024, 0.3660, 0.3660, 'UBA Germany', '2024-01-15', true),
  ('United Kingdom', 'National Grid', 2024, 0.2070, 0.2070, 'BEIS UK', '2024-01-15', true),
  ('United States', 'National Grid', 2024, 0.3890, 0.3890, 'EPA eGRID', '2024-01-15', true),
  ('European Union', 'EU Average', 2024, 0.2760, 0.2760, 'EEA', '2024-01-15', true);

-- Insert default precursor factors for CBAM materials
INSERT INTO precursor_factors (material, production_route, direct_emissions_factor, indirect_emissions_factor, electricity_consumption, source, valid_from, is_default, is_active)
VALUES
  ('Steel', 'BF-BOF', 1.850, 0.250, 0.400, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Steel', 'EAF-Scrap', 0.400, 0.350, 0.500, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Steel', 'DRI-EAF', 1.100, 0.300, 0.450, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Aluminium', 'Primary-Prebake', 1.500, 14.500, 15.000, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Aluminium', 'Primary-Soderberg', 1.700, 15.000, 15.500, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Aluminium', 'Secondary', 0.300, 0.500, 0.600, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Cement', 'Portland', 0.850, 0.050, 0.100, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Cement', 'Blended', 0.650, 0.040, 0.090, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Fertilizers', 'Ammonia-SMR', 1.800, 0.100, 0.050, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Fertilizers', 'Urea', 0.750, 0.050, 0.030, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Hydrogen', 'SMR', 9.000, 0.500, 0.100, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Hydrogen', 'Electrolysis', 0.000, 50.000, 50.000, 'EU CBAM Default Values', '2024-01-01', true, true),
  ('Electricity', 'Grid-Average', 0.400, 0.000, 1.000, 'EU CBAM Default Values', '2024-01-01', true, true);

-- Insert scheduled jobs configuration
INSERT INTO scheduled_jobs (job_name, job_type, cron_expression, status, is_enabled, config)
VALUES
  ('audit_log_cleanup', 'cleanup', '0 2 * * *', 'pending', true, '{"retention_days": 2555}'),
  ('grid_ef_update_check', 'update', '0 0 15 1 *', 'pending', true, '{"sources": ["EGAT", "MEE", "EPA", "BEIS", "UBA"]}'),
  ('report_reminder', 'notification', '0 9 1 * *', 'pending', true, '{"days_before_deadline": [30, 7, 1]}'),
  ('data_backup', 'backup', '0 3 * * *', 'pending', true, '{"retention_days": 30}');

-- ============================================
-- VIEWS
-- ============================================

-- Project summary view
CREATE OR REPLACE VIEW project_summary AS
SELECT 
  p.id,
  p.name,
  p.organization,
  p.status,
  p.baseline_year,
  p.reporting_year,
  COUNT(DISTINCT a.id) as activity_count,
  COUNT(DISTINCT r.id) as report_count,
  COALESCE(SUM(CASE WHEN a.scope = 'scope1' THEN a.activity_data * COALESCE(a.emission_factor, 0) END), 0) as scope1_emissions,
  COALESCE(SUM(CASE WHEN a.scope = 'scope2' THEN a.activity_data * COALESCE(a.emission_factor, 0) END), 0) as scope2_emissions,
  COALESCE(SUM(CASE WHEN a.scope = 'scope3' THEN a.activity_data * COALESCE(a.emission_factor, 0) END), 0) as scope3_emissions,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN activities a ON p.id = a.project_id
LEFT JOIN reports r ON p.id = r.project_id
GROUP BY p.id;

-- User activity view
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  COUNT(DISTINCT pm.project_id) as project_count,
  COUNT(DISTINCT al.id) as action_count,
  MAX(al.created_at) as last_activity
FROM users u
LEFT JOIN project_members pm ON u.id = pm.user_id
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id;

-- ============================================
-- VECTOR EMBEDDINGS TABLES (LLM Integration)
-- ============================================

-- Embedding models configuration
CREATE TABLE embedding_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'azure', 'cohere', 'huggingface', 'local'
  model_name VARCHAR(255) NOT NULL,
  dimensions INTEGER NOT NULL,
  max_tokens INTEGER DEFAULT 8192,
  api_endpoint VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document embeddings for RAG
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Source document info
  source_type VARCHAR(50) NOT NULL, -- 'report', 'activity', 'regulation', 'guideline', 'custom'
  source_id UUID, -- Reference to source record
  source_url VARCHAR(1000),
  
  -- Content
  title VARCHAR(500),
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL, -- SHA256 for deduplication
  chunk_index INTEGER DEFAULT 0,
  chunk_total INTEGER DEFAULT 1,
  
  -- Embedding
  embedding vector(1536), -- OpenAI ada-002 default, adjust as needed
  embedding_model_id UUID REFERENCES embedding_models(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags VARCHAR(100)[],
  language VARCHAR(10) DEFAULT 'en',
  
  -- Processing status
  processed_at TIMESTAMP,
  token_count INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector similarity search (using HNSW for better performance)
CREATE INDEX idx_document_embeddings_vector ON document_embeddings 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_document_embeddings_project ON document_embeddings(project_id);
CREATE INDEX idx_document_embeddings_source ON document_embeddings(source_type, source_id);
CREATE INDEX idx_document_embeddings_hash ON document_embeddings(content_hash);

-- Activity embeddings for semantic search
CREATE TABLE activity_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  -- Embedding data
  embedding vector(1536),
  embedding_model_id UUID REFERENCES embedding_models(id),
  
  -- Searchable text content
  searchable_content TEXT NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_activity_embedding UNIQUE (activity_id)
);

CREATE INDEX idx_activity_embeddings_vector ON activity_embeddings 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_activity_embeddings_activity ON activity_embeddings(activity_id);

-- Emission factor embeddings for intelligent matching
CREATE TABLE emission_factor_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emission_factor_id UUID NOT NULL REFERENCES emission_factors(id) ON DELETE CASCADE,
  
  -- Embedding data
  embedding vector(1536),
  embedding_model_id UUID REFERENCES embedding_models(id),
  
  -- Searchable text
  searchable_content TEXT NOT NULL,
  
  processed_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_ef_embedding UNIQUE (emission_factor_id)
);

CREATE INDEX idx_ef_embeddings_vector ON emission_factor_embeddings 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Chat/Query history for learning
CREATE TABLE llm_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Conversation data
  session_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  
  -- Token usage
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Model info
  model_name VARCHAR(100),
  model_provider VARCHAR(50),
  
  -- Response metadata
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  
  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_llm_conversations_user ON llm_conversations(user_id);
CREATE INDEX idx_llm_conversations_session ON llm_conversations(session_id);
CREATE INDEX idx_llm_conversations_project ON llm_conversations(project_id);
CREATE INDEX idx_llm_conversations_created ON llm_conversations(created_at);

-- Semantic search cache for performance
CREATE TABLE semantic_search_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  
  -- Cache results
  results JSONB NOT NULL,
  result_count INTEGER,
  
  -- TTL
  expires_at TIMESTAMP NOT NULL,
  hit_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_semantic_cache_hash ON semantic_search_cache(query_hash);
CREATE INDEX idx_semantic_cache_expires ON semantic_search_cache(expires_at);
CREATE INDEX idx_semantic_cache_vector ON semantic_search_cache 
  USING hnsw (query_embedding vector_cosine_ops);

-- ============================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================

-- Function to search documents by semantic similarity
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_project_id UUID DEFAULT NULL,
  filter_source_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  content TEXT,
  source_type VARCHAR,
  source_id UUID,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.title,
    de.content,
    de.source_type,
    de.source_id,
    1 - (de.embedding <=> query_embedding) as similarity,
    de.metadata
  FROM document_embeddings de
  WHERE 
    (filter_project_id IS NULL OR de.project_id = filter_project_id)
    AND (filter_source_type IS NULL OR de.source_type = filter_source_type)
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar activities
CREATE OR REPLACE FUNCTION find_similar_activities(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  activity_id UUID,
  activity_name VARCHAR,
  scope emission_scope,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.scope,
    1 - (ae.embedding <=> query_embedding) as similarity
  FROM activity_embeddings ae
  JOIN activities a ON ae.activity_id = a.id
  ORDER BY ae.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to suggest emission factors based on activity description
CREATE OR REPLACE FUNCTION suggest_emission_factors(
  query_embedding vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  emission_factor_id UUID,
  factor_name VARCHAR,
  category VARCHAR,
  factor_value DECIMAL,
  factor_unit VARCHAR,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ef.id,
    ef.name,
    ef.category,
    ef.factor_value,
    ef.factor_unit,
    1 - (efe.embedding <=> query_embedding) as similarity
  FROM emission_factor_embeddings efe
  JOIN emission_factors ef ON efe.emission_factor_id = ef.id
  WHERE ef.is_active = TRUE
  ORDER BY efe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INSERT DEFAULT EMBEDDING MODEL
-- ============================================

INSERT INTO embedding_models (name, provider, model_name, dimensions, max_tokens, settings) VALUES
  ('openai-ada-002', 'openai', 'text-embedding-ada-002', 1536, 8191, '{"api_version": "2024-02-01"}'),
  ('openai-3-small', 'openai', 'text-embedding-3-small', 1536, 8191, '{"api_version": "2024-02-01"}'),
  ('openai-3-large', 'openai', 'text-embedding-3-large', 3072, 8191, '{"api_version": "2024-02-01"}'),
  ('azure-ada-002', 'azure', 'text-embedding-ada-002', 1536, 8191, '{}')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- GRANTS (Adjust based on your DB user)
-- ============================================

-- Example: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO esg_app_user;
-- Example: GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO esg_app_user;
