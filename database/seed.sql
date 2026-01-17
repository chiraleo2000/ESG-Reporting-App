-- ESG Reporting Application - Seed Data
-- Comprehensive demo data for testing and development

-- Password for all demo users is: Demo@123
-- bcrypt hash of 'Demo@123' with 10 rounds
-- Note: In production, generate new hashes

-- ============================================
-- DEMO USERS
-- ============================================

INSERT INTO users (id, email, password_hash, name, role, organization, department, is_active, email_verified)
VALUES
  -- Admin User
  ('00000000-0000-0000-0000-000000000001', 'admin@esgdemo.com',
   '$2a$10$YlD9/upX2lvvb62GiEL3Cu4w26KrWQIrwiER.iCG0q7cagygoRACy',
   'Admin User', 'admin', 'ESG Demo Corp', 'Administration', true, true),

  -- Demo Director
  ('00000000-0000-0000-0000-000000000002', 'director@esgdemo.com',
   '$2a$10$YlD9/upX2lvvb62GiEL3Cu4w26KrWQIrwiER.iCG0q7cagygoRACy',
   'Jane Director', 'director', 'ESG Demo Corp', 'Sustainability', true, true),

  -- Demo Editor
  ('00000000-0000-0000-0000-000000000003', 'editor@esgdemo.com',
   '$2a$10$YlD9/upX2lvvb62GiEL3Cu4w26KrWQIrwiER.iCG0q7cagygoRACy',
   'John Editor', 'editor', 'ESG Demo Corp', 'Operations', true, true),

  -- Demo Viewer
  ('00000000-0000-0000-0000-000000000004', 'viewer@esgdemo.com',
   '$2a$10$YlD9/upX2lvvb62GiEL3Cu4w26KrWQIrwiER.iCG0q7cagygoRACy',
   'Sarah Viewer', 'viewer', 'ESG Demo Corp', 'Finance', true, true),

  -- Demo Auditor
  ('00000000-0000-0000-0000-000000000005', 'auditor@esgdemo.com',
   '$2a$10$YlD9/upX2lvvb62GiEL3Cu4w26KrWQIrwiER.iCG0q7cagygoRACy',
   'Mike Auditor', 'auditor', 'External Audit Firm', 'ESG Audit', true, true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- DEMO PROJECTS
-- ============================================

INSERT INTO projects (id, name, description, organization, industry, country, region, baseline_year, reporting_year, status, standards, created_by)
VALUES
  -- Manufacturing Company Project
  ('10000000-0000-0000-0000-000000000001',
   'Manufacturing Operations 2024',
   'GHG inventory for our manufacturing facilities covering Scope 1, 2, and 3 emissions. Includes factory operations, logistics, and supply chain.',
   'ESG Demo Corp', 'Manufacturing', 'Thailand', 'Asia Pacific',
   2023, 2024, 'active',
   ARRAY['eu_cbam', 'thai_esg']::report_standard[],
   '00000000-0000-0000-0000-000000000001'),

  -- Corporate Office Project
  ('10000000-0000-0000-0000-000000000002',
   'Corporate Office Carbon Footprint',
   'Carbon footprint assessment for corporate headquarters including electricity, HVAC, employee commuting, and business travel.',
   'ESG Demo Corp', 'Services', 'Thailand', 'Asia Pacific',
   2023, 2024, 'active',
   ARRAY['thai_esg', 'k_esg']::report_standard[],
   '00000000-0000-0000-0000-000000000001'),

  -- Product Carbon Footprint Project
  ('10000000-0000-0000-0000-000000000003',
   'Product Line A - Carbon Footprint',
   'Carbon footprint of products analysis for Product Line A, covering cradle-to-gate emissions.',
   'ESG Demo Corp', 'Manufacturing', 'Thailand', 'Asia Pacific',
   2023, 2024, 'active',
   ARRAY['eu_cbam']::report_standard[],
   '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PROJECT MEMBERS
-- ============================================

INSERT INTO project_members (project_id, user_id, role, is_active, accepted_at)
VALUES
  -- Project 1 members
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner', true, NOW()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'director', true, NOW()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'editor', true, NOW()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'viewer', true, NOW()),

  -- Project 2 members
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'owner', true, NOW()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'editor', true, NOW()),

  -- Project 3 members
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'owner', true, NOW()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'editor', true, NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- DEMO ACTIVITIES - Manufacturing Project
-- ============================================

-- SCOPE 1: Direct Emissions
INSERT INTO activities (id, project_id, name, description, scope, activity_type, activity_data, activity_unit, emission_factor, emission_factor_unit, emission_factor_source, calculation_tier, year, data_quality_score, created_by)
VALUES
  -- Stationary Combustion
  ('20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'Natural Gas Boilers', 'Factory boiler natural gas consumption',
   'scope1', 'stationary_combustion',
   250000, 'm3', 2.02, 'kgCO2e/m3', 'IPCC 2006', 'tier1', 2024, 4,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   'Diesel Generator', 'Backup generator diesel consumption',
   'scope1', 'stationary_combustion',
   15000, 'l', 2.68, 'kgCO2e/l', 'IPCC 2006', 'tier1', 2024, 4,
   '00000000-0000-0000-0000-000000000003'),

  -- Mobile Combustion
  ('20000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   'Company Vehicle Fleet', 'Company-owned trucks and vans',
   'scope1', 'mobile_combustion',
   85000, 'l', 2.68, 'kgCO2e/l', 'DEFRA 2024', 'tier1', 2024, 4,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000001',
   'Forklift Operations', 'LPG forklifts in warehouse',
   'scope1', 'mobile_combustion',
   12000, 'l', 1.51, 'kgCO2e/l', 'DEFRA 2024', 'tier1', 2024, 3,
   '00000000-0000-0000-0000-000000000003'),

  -- Process Emissions
  ('20000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000001',
   'Steel Production Process', 'Direct process emissions from steel production',
   'scope1', 'process_emissions',
   500, 'tonne', 1850, 'kgCO2e/tonne', 'Industry Average', 'tier2', 2024, 3,
   '00000000-0000-0000-0000-000000000003'),

  -- Fugitive Emissions
  ('20000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000001',
   'Refrigerant Leakage', 'HVAC system R410A refrigerant leakage',
   'scope1', 'fugitive_emissions',
   25, 'kg', 2088, 'kgCO2e/kg', 'IPCC AR6', 'tier1', 2024, 2,
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- SCOPE 2: Indirect from Energy
INSERT INTO activities (id, project_id, name, description, scope, activity_type, activity_data, activity_unit, emission_factor, emission_factor_unit, emission_factor_source, calculation_tier, year, data_quality_score, created_by)
VALUES
  -- Purchased Electricity
  ('20000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000001',
   'Factory Electricity', 'Grid electricity consumption for factory',
   'scope2', 'purchased_electricity',
   3500000, 'kWh', 0.4561, 'kgCO2e/kWh', 'Thailand Grid 2024', 'tier2', 2024, 5,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000001',
   'Warehouse Electricity', 'Grid electricity for warehouse operations',
   'scope2', 'purchased_electricity',
   850000, 'kWh', 0.4561, 'kgCO2e/kWh', 'Thailand Grid 2024', 'tier2', 2024, 5,
   '00000000-0000-0000-0000-000000000003'),

  -- Purchased Steam
  ('20000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000001',
   'District Steam', 'Purchased steam from industrial park',
   'scope2', 'purchased_heat_steam',
   150000, 'kWh', 0.19, 'kgCO2e/kWh', 'Local Provider', 'tier1', 2024, 4,
   '00000000-0000-0000-0000-000000000003'),

  -- Purchased Cooling
  ('20000000-0000-0000-0000-000000000010',
   '10000000-0000-0000-0000-000000000001',
   'District Cooling', 'Centralized cooling for clean rooms',
   'scope2', 'purchased_cooling',
   200000, 'ton_hour', 1.17, 'kgCO2e/ton_hour', 'Local Provider', 'tier1', 2024, 3,
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- SCOPE 3: Other Indirect Emissions
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type, activity_data, activity_unit, emission_factor, emission_factor_unit, emission_factor_source, calculation_tier, year, direction, data_quality_score, created_by)
VALUES
  -- Cat 1: Purchased Goods & Services
  ('20000000-0000-0000-0000-000000000011',
   '10000000-0000-0000-0000-000000000001',
   'Raw Materials', 'Steel and aluminum raw materials',
   'scope3', 'purchased_goods_services', 'purchased_goods',
   1500000, 'USD', 0.5, 'kgCO2e/USD', 'EEIO Model', 'tier1', 2024, 'upstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000012',
   '10000000-0000-0000-0000-000000000001',
   'Packaging Materials', 'Cardboard and plastic packaging',
   'scope3', 'purchased_goods_services', 'purchased_goods',
   50000, 'kg', 2.5, 'kgCO2e/kg', 'ecoinvent', 'tier2', 2024, 'upstream', 3,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 2: Capital Goods
  ('20000000-0000-0000-0000-000000000013',
   '10000000-0000-0000-0000-000000000001',
   'New Machinery', 'Production line machinery purchase',
   'scope3', 'capital_goods', 'capital_goods',
   2500000, 'USD', 0.5, 'kgCO2e/USD', 'EEIO Model', 'tier1', 2024, 'upstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 3: Fuel & Energy Activities
  ('20000000-0000-0000-0000-000000000014',
   '10000000-0000-0000-0000-000000000001',
   'Electricity WTT', 'Well-to-tank emissions for electricity',
   'scope3', 'fuel_energy_activities', 'fuel_energy',
   4350000, 'kWh', 0.04, 'kgCO2e/kWh', 'DEFRA 2024', 'tier1', 2024, 'upstream', 4,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 4: Upstream Transportation
  ('20000000-0000-0000-0000-000000000015',
   '10000000-0000-0000-0000-000000000001',
   'Inbound Logistics - Road', 'Raw materials transport by truck',
   'scope3', 'upstream_transport', 'upstream_transport',
   500000, 'tonne_km', 0.1, 'kgCO2e/tonne_km', 'GLEC Framework', 'tier2', 2024, 'upstream', 3,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000016',
   '10000000-0000-0000-0000-000000000001',
   'Inbound Logistics - Sea', 'Imported materials by container ship',
   'scope3', 'upstream_transport', 'upstream_transport',
   2000000, 'tonne_km', 0.015, 'kgCO2e/tonne_km', 'GLEC Framework', 'tier2', 2024, 'upstream', 3,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 5: Waste Generated
  ('20000000-0000-0000-0000-000000000017',
   '10000000-0000-0000-0000-000000000001',
   'Manufacturing Waste', 'Production waste to landfill',
   'scope3', 'waste_generated', 'waste',
   150000, 'kg', 0.58, 'kgCO2e/kg', 'DEFRA 2024', 'tier1', 2024, 'upstream', 3,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000018',
   '10000000-0000-0000-0000-000000000001',
   'Recycled Waste', 'Metal and paper recycling',
   'scope3', 'waste_generated', 'waste',
   75000, 'kg', 0.02, 'kgCO2e/kg', 'DEFRA 2024', 'tier1', 2024, 'upstream', 4,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 6: Business Travel
  ('20000000-0000-0000-0000-000000000019',
   '10000000-0000-0000-0000-000000000001',
   'Air Travel - International', 'Long-haul business flights',
   'scope3', 'business_travel', 'business_travel',
   250000, 'km', 0.195, 'kgCO2e/km', 'DEFRA 2024', 'tier2', 2024, 'upstream', 3,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000020',
   '10000000-0000-0000-0000-000000000001',
   'Air Travel - Domestic', 'Short-haul business flights',
   'scope3', 'business_travel', 'business_travel',
   80000, 'km', 0.255, 'kgCO2e/km', 'DEFRA 2024', 'tier2', 2024, 'upstream', 3,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000021',
   '10000000-0000-0000-0000-000000000001',
   'Hotel Stays', 'Business accommodation',
   'scope3', 'business_travel', 'business_travel',
   450, 'nights', 31, 'kgCO2e/night', 'DEFRA 2024', 'tier1', 2024, 'upstream', 3,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 7: Employee Commuting
  ('20000000-0000-0000-0000-000000000022',
   '10000000-0000-0000-0000-000000000001',
   'Car Commuting', 'Employee commute by personal car',
   'scope3', 'employee_commuting', 'employee_commuting',
   850000, 'km', 0.17, 'kgCO2e/km', 'DEFRA 2024', 'tier1', 2024, 'upstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  ('20000000-0000-0000-0000-000000000023',
   '10000000-0000-0000-0000-000000000001',
   'Public Transit Commuting', 'Employee commute by bus/train',
   'scope3', 'employee_commuting', 'employee_commuting',
   200000, 'km', 0.05, 'kgCO2e/km', 'DEFRA 2024', 'tier1', 2024, 'upstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 8: Upstream Leased Assets
  ('20000000-0000-0000-0000-000000000024',
   '10000000-0000-0000-0000-000000000001',
   'Leased Warehouse', 'Leased external warehouse',
   'scope3', 'upstream_leased_assets', 'upstream_leased',
   5000, 'm2', 50, 'kgCO2e/m2/year', 'Estimate', 'tier1', 2024, 'upstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 9: Downstream Transportation
  ('20000000-0000-0000-0000-000000000025',
   '10000000-0000-0000-0000-000000000001',
   'Product Distribution', 'Distribution to customers by truck',
   'scope3', 'downstream_transport', 'downstream_transport',
   750000, 'tonne_km', 0.1, 'kgCO2e/tonne_km', 'GLEC Framework', 'tier2', 2024, 'downstream', 3,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 10: Processing of Sold Products
  ('20000000-0000-0000-0000-000000000026',
   '10000000-0000-0000-0000-000000000001',
   'Customer Processing', 'Further processing by customers',
   'scope3', 'processing_sold_products', 'processing',
   10000, 'tonne', 50, 'kgCO2e/tonne', 'Industry Average', 'tier1', 2024, 'downstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 11: Use of Sold Products
  ('20000000-0000-0000-0000-000000000027',
   '10000000-0000-0000-0000-000000000001',
   'Product Energy Use', 'Electricity use during product lifetime',
   'scope3', 'use_of_sold_products', 'use_of_products',
   5000000, 'kWh', 0.42, 'kgCO2e/kWh', 'Global Average', 'tier1', 2024, 'downstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 12: End-of-Life Treatment
  ('20000000-0000-0000-0000-000000000028',
   '10000000-0000-0000-0000-000000000001',
   'Product End-of-Life', 'Disposal of sold products',
   'scope3', 'end_of_life_sold_products', 'end_of_life',
   8000, 'tonne', 580, 'kgCO2e/tonne', 'DEFRA 2024', 'tier1', 2024, 'downstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 13: Downstream Leased Assets
  ('20000000-0000-0000-0000-000000000029',
   '10000000-0000-0000-0000-000000000001',
   'Leased Equipment', 'Equipment leased to customers',
   'scope3', 'downstream_leased_assets', 'downstream_leased',
   100, 'units', 1000, 'kgCO2e/unit/year', 'Estimate', 'tier1', 2024, 'downstream', 2,
   '00000000-0000-0000-0000-000000000003'),

  -- Cat 14: Franchises
  ('20000000-0000-0000-0000-000000000030',
   '10000000-0000-0000-0000-000000000001',
   'Franchise Operations', 'Emissions from franchise stores',
   'scope3', 'franchises', 'franchises',
   5, 'units', 50000, 'kgCO2e/unit/year', 'Estimate', 'tier1', 2024, 'downstream', 1,
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DEMO ACTIVITIES - Corporate Office Project
-- ============================================

INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type, activity_data, activity_unit, emission_factor, emission_factor_unit, emission_factor_source, calculation_tier, year, direction, data_quality_score, created_by)
VALUES
  -- Scope 2: Electricity
  ('30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002',
   'Office Electricity', 'HQ building electricity',
   'scope2', NULL, 'purchased_electricity',
   450000, 'kWh', 0.4561, 'kgCO2e/kWh', 'Thailand Grid 2024', 'tier2', 2024, NULL, 5,
   '00000000-0000-0000-0000-000000000003'),

  -- Scope 3: Business Travel
  ('30000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   'Executive Travel', 'Executive international flights',
   'scope3', 'business_travel', 'business_travel',
   150000, 'km', 0.195, 'kgCO2e/km', 'DEFRA 2024', 'tier2', 2024, 'upstream', 4,
   '00000000-0000-0000-0000-000000000003'),

  -- Scope 3: Employee Commuting
  ('30000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000002',
   'Staff Commuting', 'Daily employee commute',
   'scope3', 'employee_commuting', 'employee_commuting',
   300000, 'km', 0.15, 'kgCO2e/km', 'DEFRA 2024', 'tier1', 2024, 'upstream', 3,
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- EMISSION FACTORS - Comprehensive Database
-- ============================================

INSERT INTO emission_factors (id, name, category, subcategory, factor_value, factor_unit, source, region, year, uncertainty_min, uncertainty_max, gwp_reference, is_verified, is_active)
VALUES
  -- Scope 1: Stationary Combustion
  ('ef000000-0000-0000-0000-000000000001', 'Natural Gas', 'Stationary Combustion', 'Gaseous Fuels', 2.02, 'kgCO2e/m3', 'IPCC 2006', 'Global', 2024, 1.95, 2.10, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000002', 'Diesel', 'Stationary Combustion', 'Liquid Fuels', 2.68, 'kgCO2e/l', 'IPCC 2006', 'Global', 2024, 2.60, 2.75, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000003', 'LPG', 'Stationary Combustion', 'Liquid Fuels', 2.98, 'kgCO2e/kg', 'IPCC 2006', 'Global', 2024, 2.90, 3.05, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000004', 'Coal', 'Stationary Combustion', 'Solid Fuels', 2.42, 'kgCO2e/kg', 'IPCC 2006', 'Global', 2024, 2.30, 2.55, 'AR6', true, true),

  -- Scope 1: Mobile Combustion
  ('ef000000-0000-0000-0000-000000000010', 'Petrol Car', 'Mobile Combustion', 'Road Transport', 2.31, 'kgCO2e/l', 'DEFRA 2024', 'UK', 2024, 2.25, 2.38, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000011', 'Diesel Car', 'Mobile Combustion', 'Road Transport', 2.68, 'kgCO2e/l', 'DEFRA 2024', 'UK', 2024, 2.60, 2.75, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000012', 'Average Car', 'Mobile Combustion', 'Road Transport', 0.17, 'kgCO2e/km', 'DEFRA 2024', 'UK', 2024, 0.15, 0.19, 'AR6', true, true),

  -- Scope 2: Electricity by Region
  ('ef000000-0000-0000-0000-000000000020', 'Thailand Grid', 'Electricity', 'Grid Average', 0.4561, 'kgCO2e/kWh', 'TGO Thailand', 'Thailand', 2024, 0.44, 0.47, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000021', 'China Grid North', 'Electricity', 'Grid Average', 0.5810, 'kgCO2e/kWh', 'China MEE', 'China', 2024, 0.56, 0.60, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000022', 'Japan Grid', 'Electricity', 'Grid Average', 0.4570, 'kgCO2e/kWh', 'Japan MOE', 'Japan', 2024, 0.44, 0.47, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000023', 'South Korea Grid', 'Electricity', 'Grid Average', 0.4590, 'kgCO2e/kWh', 'Korea MOE', 'South Korea', 2024, 0.44, 0.48, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000024', 'EU Average', 'Electricity', 'Grid Average', 0.2760, 'kgCO2e/kWh', 'EEA', 'European Union', 2024, 0.26, 0.29, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000025', 'USA Average', 'Electricity', 'Grid Average', 0.3890, 'kgCO2e/kWh', 'US EPA', 'United States', 2024, 0.37, 0.41, 'AR6', true, true),

  -- Scope 3: Business Travel
  ('ef000000-0000-0000-0000-000000000030', 'Air Short Haul', 'Business Travel', 'Aviation', 0.255, 'kgCO2e/km', 'DEFRA 2024', 'Global', 2024, 0.24, 0.27, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000031', 'Air Long Haul', 'Business Travel', 'Aviation', 0.195, 'kgCO2e/km', 'DEFRA 2024', 'Global', 2024, 0.18, 0.21, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000032', 'Rail', 'Business Travel', 'Rail', 0.035, 'kgCO2e/km', 'DEFRA 2024', 'UK', 2024, 0.03, 0.04, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000033', 'Hotel Night', 'Business Travel', 'Accommodation', 31.0, 'kgCO2e/night', 'DEFRA 2024', 'Global', 2024, 28, 35, 'AR6', true, true),

  -- Scope 3: Freight Transport
  ('ef000000-0000-0000-0000-000000000040', 'Road Freight', 'Freight', 'Road', 0.1, 'kgCO2e/tonne-km', 'GLEC Framework', 'Global', 2024, 0.08, 0.12, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000041', 'Rail Freight', 'Freight', 'Rail', 0.03, 'kgCO2e/tonne-km', 'GLEC Framework', 'Global', 2024, 0.02, 0.04, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000042', 'Sea Freight Container', 'Freight', 'Maritime', 0.015, 'kgCO2e/tonne-km', 'GLEC Framework', 'Global', 2024, 0.01, 0.02, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000043', 'Air Freight', 'Freight', 'Aviation', 0.6, 'kgCO2e/tonne-km', 'GLEC Framework', 'Global', 2024, 0.5, 0.7, 'AR6', true, true),

  -- Scope 3: Waste
  ('ef000000-0000-0000-0000-000000000050', 'Landfill', 'Waste', 'Disposal', 0.58, 'kgCO2e/kg', 'DEFRA 2024', 'UK', 2024, 0.5, 0.7, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000051', 'Incineration', 'Waste', 'Disposal', 0.02, 'kgCO2e/kg', 'DEFRA 2024', 'UK', 2024, 0.01, 0.03, 'AR6', true, true),
  ('ef000000-0000-0000-0000-000000000052', 'Recycling', 'Waste', 'Recovery', 0.02, 'kgCO2e/kg', 'DEFRA 2024', 'UK', 2024, 0.01, 0.03, 'AR6', true, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- GRID EMISSION FACTORS
-- ============================================

INSERT INTO grid_emission_factors (id, country, region, year, factor_location, factor_market, unit, source, uncertainty, is_verified)
VALUES
  ('gef00000-0000-0000-0000-000000000001', 'Thailand', 'National', 2024, 0.4561, 0.4500, 'kgCO2e/kWh', 'TGO Thailand', 0.05, true),
  ('gef00000-0000-0000-0000-000000000002', 'Thailand', 'National', 2023, 0.4658, 0.4600, 'kgCO2e/kWh', 'TGO Thailand', 0.05, true),
  ('gef00000-0000-0000-0000-000000000003', 'China', 'North', 2024, 0.5810, 0.5700, 'kgCO2e/kWh', 'China MEE', 0.08, true),
  ('gef00000-0000-0000-0000-000000000004', 'China', 'East', 2024, 0.5102, 0.5000, 'kgCO2e/kWh', 'China MEE', 0.08, true),
  ('gef00000-0000-0000-0000-000000000005', 'Japan', 'National', 2024, 0.4570, 0.4500, 'kgCO2e/kWh', 'Japan MOE', 0.06, true),
  ('gef00000-0000-0000-0000-000000000006', 'South Korea', 'National', 2024, 0.4590, 0.4500, 'kgCO2e/kWh', 'Korea MOE', 0.06, true),
  ('gef00000-0000-0000-0000-000000000007', 'Germany', 'National', 2024, 0.3660, 0.3500, 'kgCO2e/kWh', 'UBA Germany', 0.05, true),
  ('gef00000-0000-0000-0000-000000000008', 'United Kingdom', 'National', 2024, 0.2070, 0.2000, 'kgCO2e/kWh', 'DEFRA 2024', 0.04, true),
  ('gef00000-0000-0000-0000-000000000009', 'United States', 'National', 2024, 0.3890, 0.3800, 'kgCO2e/kWh', 'US EPA', 0.07, true),
  ('gef00000-0000-0000-0000-000000000010', 'European Union', 'Average', 2024, 0.2760, 0.2700, 'kgCO2e/kWh', 'EEA', 0.05, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PRECURSOR FACTORS (CBAM Materials)
-- ============================================

INSERT INTO precursor_factors (id, material_type, production_route, factor_kg_co2_per_kg, uncertainty, source, region, year, cbam_applicable)
VALUES
  ('pf000000-0000-0000-0000-000000000001', 'Steel', 'Basic Oxygen Furnace', 1.85, 0.15, 'EU CBAM Default', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000002', 'Steel', 'Electric Arc Furnace', 0.58, 0.10, 'EU CBAM Default', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000003', 'Aluminum', 'Primary Production', 11.0, 1.5, 'EU CBAM Default', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000004', 'Aluminum', 'Secondary Production', 0.6, 0.1, 'EU CBAM Default', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000005', 'Cement', 'Standard Production', 0.525, 0.05, 'EU CBAM Default', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000006', 'Ammonia', 'Steam Methane Reforming', 1.6, 0.2, 'EU CBAM Default', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000007', 'Urea', 'Standard Production', 0.75, 0.1, 'EU CBAM Default', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000008', 'Hydrogen', 'Grey (SMR)', 9.0, 1.0, 'IEA', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000009', 'Hydrogen', 'Blue (SMR + CCS)', 4.5, 0.8, 'IEA', 'Global', 2024, true),
  ('pf000000-0000-0000-0000-000000000010', 'Electricity', 'Grid Average', 0.42, 0.1, 'Global Average', 'Global', 2024, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- UPDATE ACTIVITY CALCULATION STATUS
-- Mark activities as calculated with proper emissions
-- ============================================

UPDATE activities SET
  calculation_status = 'calculated',
  total_emissions_kg_co2e = activity_data * emission_factor,
  calculated_at = NOW()
WHERE emission_factor IS NOT NULL;

-- ============================================
-- SUMMARY STATISTICS
-- ============================================

-- Show summary
DO $$
DECLARE
  user_count INTEGER;
  project_count INTEGER;
  activity_count INTEGER;
  ef_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO project_count FROM projects;
  SELECT COUNT(*) INTO activity_count FROM activities;
  SELECT COUNT(*) INTO ef_count FROM emission_factors;

  RAISE NOTICE 'Seed Data Summary:';
  RAISE NOTICE '  Users: %', user_count;
  RAISE NOTICE '  Projects: %', project_count;
  RAISE NOTICE '  Activities: %', activity_count;
  RAISE NOTICE '  Emission Factors: %', ef_count;
END $$;
