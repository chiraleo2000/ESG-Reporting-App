-- ============================================
-- SUGAR FACTORY DEMO DATA (Thailand)
-- Small white sugar factory: 50 tons/year, 500g bags
-- Export to China via container shipping
-- Sugar cane sourced from local farms
-- ============================================

-- ============================================
-- SUGAR FACTORY USER
-- Password: Sugar@2024 (bcrypt with 10 rounds)
-- ============================================

INSERT INTO users (id, email, password_hash, name, role, organization, department, is_active, email_verified)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'manager@thaisugar.co.th',
   '$2a$10$YlD9/upX2lvvb62GiEL3Cu4w26KrWQIrwiER.iCG0q7cagygoRACy',
   'Somchai Kasetsin', 'owner', 'Thai Sweet Sugar Co., Ltd.', 'Operations', true, true),

  ('20000000-0000-0000-0000-000000000002', 'env@thaisugar.co.th',
   '$2a$10$YlD9/upX2lvvb62GiEL3Cu4w26KrWQIrwiER.iCG0q7cagygoRACy',
   'Pranee Sriprasert', 'editor', 'Thai Sweet Sugar Co., Ltd.', 'Environment & Safety', true, true),

  ('20000000-0000-0000-0000-000000000003', 'auditor@thaiaudit.co.th',
   '$2a$10$YlD9/upX2lvvb62GiEL3Cu4w26KrWQIrwiER.iCG0q7cagygoRACy',
   'Wichai Thammasak', 'auditor', 'Thai ESG Audit Associates', 'ESG Audit', true, true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- SUGAR FACTORY PROJECT
-- ============================================

INSERT INTO projects (id, name, description, organization, industry, country, region, baseline_year, reporting_year, status, standards, created_by)
VALUES
  ('30000000-0000-0000-0000-000000000001',
   'Thai Sweet Sugar Factory - GHG Inventory 2024',
   'Comprehensive greenhouse gas inventory for Thai Sweet Sugar Co., Ltd. Small-scale white sugar manufacturing facility in Nakhon Ratchasima Province, Thailand. Annual production: 50 metric tons of white sugar in 500g consumer bags. Sugar cane sourced from local contract farms (within 50km radius). Finished product exported to China via container shipping from Laem Chabang Port.',
   'Thai Sweet Sugar Co., Ltd.', 'Food & Beverage', 'Thailand', 'Asia Pacific',
   2023, 2024, 'active',
   ARRAY['eu_cbam', 'china_carbon_market', 'thai_esg']::report_standard[],
   '20000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Add project members
INSERT INTO project_members (project_id, user_id, role, invited_by, accepted_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'owner', '20000000-0000-0000-0000-000000000001', NOW()),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'editor', '20000000-0000-0000-0000-000000000001', NOW()),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'auditor', '20000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT ON CONSTRAINT unique_project_member DO NOTHING;

-- ============================================
-- SCOPE 1: DIRECT EMISSIONS
-- ============================================

-- 1. Boiler - Bagasse combustion (primary fuel from crushed cane fiber)
--    ~650 tons cane needed for 50 tons sugar. Bagasse ≈ 30% of cane weight = 195 tons bagasse.
--    Bagasse EF ≈ 0.03 kgCO2e/kg (biogenic carbon considered neutral under some protocols,
--    but combustion produces CH4 & N2O). Using conservative factor.
INSERT INTO activities (id, project_id, name, description, scope, activity_type, 
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'Boiler - Bagasse Combustion', 
   'Sugar mill boiler running on bagasse (sugar cane fiber). Primary energy source for juice extraction, evaporation, and crystallization processes.',
   'scope1', 'stationary_combustion',
   195000, 'kg', 195000, 'kg', 'Mill production records',
   0.030, 'kgCO2e/kg', 'IPCC 2006 GL - Biomass (CH4+N2O only)',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   4, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   5850.00, NOW(),
   'Bagasse is biogenic so CO2 is carbon-neutral. Only non-CO2 GHG (CH4, N2O) counted.')
ON CONFLICT (id) DO NOTHING;

-- 2. Boiler - Supplementary fuel oil (for startup and low-bagasse periods)
--    ~2,000 liters fuel oil per year for boiler startup and supplementary heating
INSERT INTO activities (id, project_id, name, description, scope, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000001',
   'Boiler - Fuel Oil (Supplementary)',
   'Heavy fuel oil used for boiler startup and supplementary heating during low-bagasse inventory periods.',
   'scope1', 'stationary_combustion',
   2000, 'liters', 2000, 'liters', 'Fuel purchase records',
   3.114, 'kgCO2e/liter', 'IPCC 2006 - Residual fuel oil',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   4, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   6228.00, NOW(),
   '~2,000 liters/year for startup and supplementary use.')
ON CONFLICT (id) DO NOTHING;

-- 3. Diesel - Factory vehicles and mobile equipment
--    Forklifts, loaders, trucks within factory: ~3,000 liters diesel/year
INSERT INTO activities (id, project_id, name, description, scope, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000001',
   'Diesel - Factory Mobile Equipment',
   'Diesel consumption by forklifts, wheel loaders, and internal factory trucks for cane handling and sugar bag transport.',
   'scope1', 'mobile_combustion',
   3000, 'liters', 3000, 'liters', 'Fuel purchase records',
   2.68, 'kgCO2e/liter', 'IPCC 2006 - Diesel oil',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   4, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   8040.00, NOW(),
   'Internal factory forklifts (2), wheel loader (1), yard trucks (2).')
ON CONFLICT (id) DO NOTHING;

-- 4. Fugitive emissions - Refrigeration (cold storage for sugar before packaging)
--    Small R-410A system, ~0.5 kg refrigerant leak/year
INSERT INTO activities (id, project_id, name, description, scope, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000001',
   'Fugitive - Refrigerant Leakage (R-410A)',
   'Estimated refrigerant losses from cold storage and air conditioning systems in the packaging and storage area.',
   'scope1', 'fugitive_emissions',
   0.5, 'kg', 0.5, 'kg', 'Maintenance records / estimates',
   2088, 'kgCO2e/kg', 'IPCC AR5 - R-410A GWP',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   3, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   1044.00, NOW(),
   'R-410A GWP = 2088. Small system, estimated 0.5 kg annual leak rate.')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SCOPE 2: INDIRECT EMISSIONS (ELECTRICITY)
-- ============================================

-- 5. Grid electricity - Factory operations
--    Small sugar mill: ~120,000 kWh/year (grid supplementary to bagasse co-gen)
INSERT INTO activities (id, project_id, name, description, scope, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000001',
   'Grid Electricity - Factory & Office',
   'Purchased grid electricity for factory operations (centrifuges, packaging, lighting, controls) and office. Most process heat from bagasse boiler.',
   'scope2', 'purchased_electricity',
   120000, 'kWh', 120000, 'kWh', 'PEA electricity bills',
   0.4999, 'kgCO2e/kWh', 'TGO Thailand Grid EF 2023 (0.4999 tCO2/MWh)',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   5, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   59988.00, NOW(),
   'Thailand grid EF from TGO (Thailand Greenhouse Gas Management Organization). PEA = Provincial Electricity Authority.')
ON CONFLICT (id) DO NOTHING;

-- 6. Grid electricity - Office building
--    Small office: ~15,000 kWh/year
INSERT INTO activities (id, project_id, name, description, scope, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000006',
   '30000000-0000-0000-0000-000000000001',
   'Grid Electricity - Admin Office',
   'Electricity for administration building: air conditioning, computers, lighting, and misc. office equipment.',
   'scope2', 'purchased_electricity',
   15000, 'kWh', 15000, 'kWh', 'PEA electricity bills',
   0.4999, 'kgCO2e/kWh', 'TGO Thailand Grid EF 2023',
   2024, 'Admin Office', 'Nakhon Ratchasima, Thailand',
   5, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   7498.50, NOW(),
   'Separate meter for admin office building.')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SCOPE 3: VALUE CHAIN EMISSIONS
-- ============================================

-- 7. Scope 3 Cat 1 - Purchased Goods: Sugar cane from local farms
--    ~650 tons sugar cane needed. EF for sugar cane farming ≈ 0.12 kgCO2e/kg
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, direction, supplier_name, supplier_tier, notes)
VALUES
  ('40000000-0000-0000-0000-000000000007',
   '30000000-0000-0000-0000-000000000001',
   'Sugar Cane Purchase - Local Farms',
   'Raw sugar cane purchased from contract farms within 50km radius. Includes embedded emissions from farming (fertilizer, machinery, field burning where applicable).',
   'scope3', 'purchased_goods_services', 'purchased_goods',
   650000, 'kg', 650000, 'kg', 'Farm purchase contracts',
   0.120, 'kgCO2e/kg', 'Ecoinvent 3.9 - Sugar cane, Thailand',
   2024, 'Local Contract Farms', 'Nakhon Ratchasima Province',
   3, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   78000.00, NOW(),
   'upstream', 'Various Local Farmers (5 contracts)', 1,
   '650 tons cane needed for ~50 tons white sugar (yield ~7.7%). Contract farms within 50km.')
ON CONFLICT (id) DO NOTHING;

-- 8. Scope 3 Cat 1 - Purchased Goods: Packaging materials (500g bags, cartons)
--    100,000 bags (50 tons / 0.5kg), plus cartons. ~2,500 kg plastic film + 3,000 kg carton board
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, direction, supplier_name, supplier_tier, notes)
VALUES
  ('40000000-0000-0000-0000-000000000008',
   '30000000-0000-0000-0000-000000000001',
   'Packaging Materials - Bags & Cartons',
   'LDPE/PP bags (500g capacity, 100,000 units ≈ 2,500 kg), corrugated cartons for export (24 bags/carton ≈ 4,167 cartons ≈ 3,000 kg).',
   'scope3', 'purchased_goods_services', 'purchased_goods',
   5500, 'kg', 5500, 'kg', 'Packaging supplier invoices',
   3.5, 'kgCO2e/kg', 'DEFRA 2023 - Mixed plastics + cardboard',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   3, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   19250.00, NOW(),
   'upstream', 'Thai Packaging Solutions Co.', 1,
   '2,500 kg LDPE/PP film bags + 3,000 kg corrugated carton board. Weighted average EF.')
ON CONFLICT (id) DO NOTHING;

-- 9. Scope 3 Cat 1 - Purchased Goods: Chemicals (lime, sulfur dioxide, flocculant)
--    Clarification process chemicals: ~5,000 kg lime, ~200 kg SO2, ~100 kg flocculant
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, direction, notes)
VALUES
  ('40000000-0000-0000-0000-000000000009',
   '30000000-0000-0000-0000-000000000001',
   'Process Chemicals - Lime, SO2, Flocculant',
   'Chemicals for juice clarification: quicklime (CaO) for liming, sulfur dioxide for sulfitation, and flocculant polymer.',
   'scope3', 'purchased_goods_services', 'purchased_goods',
   5300, 'kg', 5300, 'kg', 'Chemical purchase records',
   1.10, 'kgCO2e/kg', 'Ecoinvent 3.9 - Weighted average (lime, SO2, polymers)',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   3, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   5830.00, NOW(),
   'upstream',
   '5,000 kg quicklime (EF 1.09), 200 kg SO2 (EF 0.49), 100 kg flocculant (EF 2.5). Weighted avg ~1.10.')
ON CONFLICT (id) DO NOTHING;

-- 10. Scope 3 Cat 4 - Upstream transport: Cane delivery from farms to factory
--     650 tons by 10-ton trucks, avg 30km round trip = ~65 trips × 60km = 3,900 truck-km
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, direction, notes)
VALUES
  ('40000000-0000-0000-0000-000000000010',
   '30000000-0000-0000-0000-000000000001',
   'Cane Transport - Farm to Factory',
   'Sugar cane delivery by 10-ton trucks from local contract farms (avg 30km one-way, 60km round trip). ~65 round trips/year.',
   'scope3', 'upstream_transport', 'upstream_transport',
   3900, 'vehicle-km', 3900, 'vehicle-km', 'Transport logs / estimates',
   0.90, 'kgCO2e/vehicle-km', 'DEFRA 2023 - HGV rigid (>3.5-7.5t)',
   2024, 'Local Roads', 'Nakhon Ratchasima Province',
   3, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   3510.00, NOW(),
   'upstream',
   '650t cane / 10t per truck = 65 trips. 30km avg distance × 2 = 60km round trip. 65 × 60 = 3,900 vehicle-km.')
ON CONFLICT (id) DO NOTHING;

-- 11. Scope 3 Cat 5 - Waste: Molasses and filter cake 
--     Molasses (~20 tons) sold to ethanol distillery. Filter mud/press cake (~30 tons) returned to farms as fertilizer.
--     Wastewater treatment emissions.
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000011',
   '30000000-0000-0000-0000-000000000001',
   'Waste - Wastewater Treatment & Solid Waste',
   'Wastewater from sugar processing (~5,000 m³/year treated on-site) and general solid waste. Molasses sold, filter cake composted.',
   'scope3', 'waste_generated', 'waste_disposal',
   5000, 'm3', 5000, 'm3', 'Wastewater treatment logs',
   0.50, 'kgCO2e/m3', 'IPCC 2006 - Industrial wastewater (food processing)',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   3, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   2500.00, NOW(),
   'On-site aerobic wastewater treatment. Molasses (20t) sold to distillery (allocated out). Filter cake (30t) composted on farms.')
ON CONFLICT (id) DO NOTHING;

-- 12. Scope 3 Cat 6 - Business travel (manager + staff trips)
--     ~6 domestic flights (Bangkok roundtrip) + 1 international trip (trade show)
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000012',
   '30000000-0000-0000-0000-000000000001',
   'Business Travel - Flights',
   'Domestic flights (Nakhon Ratchasima ↔ Bangkok, 6 round trips) and 1 international trip (Bangkok ↔ Guangzhou for trade show).',
   'scope3', 'business_travel', 'business_travel',
   12800, 'passenger-km', 12800, 'passenger-km', 'Travel booking records',
   0.158, 'kgCO2e/pkm', 'DEFRA 2023 - Short-haul economy avg',
   2024, 'Various', 'Thailand / China',
   3, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   2022.40, NOW(),
   '6 domestic roundtrips (BKK 800km RT each = 4,800 pkm) + 1 intl roundtrip (BKK-CAN ~4,000km RT × 2 pax = 8,000 pkm). Total 12,800 pkm.')
ON CONFLICT (id) DO NOTHING;

-- 13. Scope 3 Cat 7 - Employee commuting
--     25 employees, avg 15km one-way, 250 working days, mix of motorcycle/car/bus
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000013',
   '30000000-0000-0000-0000-000000000001',
   'Employee Commuting',
   '25 employees commuting to factory. Mix: 15 motorcycle, 5 car, 5 bus/songthaew. Average 15km one-way, 250 days/year.',
   'scope3', 'employee_commuting', 'employee_commuting',
   187500, 'passenger-km', 187500, 'passenger-km', 'Employee survey',
   0.065, 'kgCO2e/pkm', 'DEFRA 2023 - Weighted avg (motorcycle/car/bus Thailand mix)',
   2024, 'Thai Sweet Sugar Mill', 'Nakhon Ratchasima, Thailand',
   2, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   12187.50, NOW(),
   '25 staff × 30km/day × 250 days = 187,500 pkm. Weighted EF: motorcycle 0.05 (60%), car 0.12 (20%), bus 0.04 (20%) ≈ 0.065.')
ON CONFLICT (id) DO NOTHING;

-- 14. Scope 3 Cat 9 - Downstream transport: Factory → Laem Chabang Port → Shanghai/Guangzhou
--     Truck: Factory to Laem Chabang ~280km, 50 tons = 14,000 tkm
--     Sea: Laem Chabang to Shanghai/Guangzhou ~3,200km avg, 50 tons = 160,000 tkm  
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, direction, notes)
VALUES
  ('40000000-0000-0000-0000-000000000014',
   '30000000-0000-0000-0000-000000000001',
   'Export Transport - Truck to Port',
   'Trucking 50 tons finished white sugar from factory to Laem Chabang Port (~280km). Using refrigerated container trucks.',
   'scope3', 'downstream_transport', 'downstream_transport',
   14000, 'tonne-km', 14000, 'tonne-km', 'Shipping records',
   0.107, 'kgCO2e/tonne-km', 'DEFRA 2023 - HGV all rigid',
   2024, 'Highway', 'Thailand (Korat → Laem Chabang)',
   4, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   1498.00, NOW(),
   'downstream',
   '50 tons × 280 km = 14,000 tonne-km. Container trucks on Highway 304/Motorway 7.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, direction, notes)
VALUES
  ('40000000-0000-0000-0000-000000000015',
   '30000000-0000-0000-0000-000000000001',
   'Export Shipping - Sea Freight to China',
   'Container sea freight from Laem Chabang Port to Chinese ports (Shanghai & Guangzhou). 2 TEU containers per year.',
   'scope3', 'downstream_transport', 'downstream_transport',
   160000, 'tonne-km', 160000, 'tonne-km', 'Bill of lading / shipping line records',
   0.016, 'kgCO2e/tonne-km', 'IMO 2023 - Container ship (>8000 TEU)',
   2024, 'Sea Route', 'Laem Chabang → Shanghai/Guangzhou',
   4, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   2560.00, NOW(),
   'downstream',
   '50 tons × 3,200 km avg = 160,000 tonne-km. Split between Shanghai (60%) and Guangzhou (40%).')
ON CONFLICT (id) DO NOTHING;

-- 15. Scope 3 Cat 11 - Use of sold products (negligible for sugar - food consumption)
INSERT INTO activities (id, project_id, name, description, scope, scope3_category, activity_type,
  activity_data, activity_unit, quantity, unit, source,
  emission_factor, emission_factor_unit, emission_factor_source,
  year, facility, location, data_quality_score, created_by,
  reporting_period_start, reporting_period_end, calculation_status,
  total_emissions_kg_co2e, calculated_at, notes)
VALUES
  ('40000000-0000-0000-0000-000000000016',
   '30000000-0000-0000-0000-000000000001',
   'End-of-Life - Packaging Disposal in China',
   'Disposal of 500g bags and carton packaging by end consumers and retailers in China.',
   'scope3', 'end_of_life_sold_products', 'end_of_life',
   5500, 'kg', 5500, 'kg', 'Estimated from packaging quantities',
   0.60, 'kgCO2e/kg', 'DEFRA 2023 - Mixed waste (landfill + incineration avg China)',
   2024, 'End consumers', 'China',
   2, '20000000-0000-0000-0000-000000000002',
   '2024-01-01', '2024-12-31', 'completed',
   3300.00, NOW(),
   'Assumes 70% landfill, 30% incineration in Chinese municipal waste system. 5,500 kg total packaging.')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- EMISSION FACTORS (Custom for Thai sugar industry)
-- ============================================

INSERT INTO emission_factors (id, name, category, subcategory, factor_value, factor_unit, activity_unit, source, source_year, year, country, region, is_active)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'Bagasse Combustion (Non-CO2)', 'Stationary Combustion', 'Biomass', 0.030, 'kgCO2e/kg', 'kg', 'IPCC 2006 GL Vol 2 Ch 2', 2006, 2024, 'Thailand', 'Asia Pacific', true),
  ('50000000-0000-0000-0000-000000000002', 'Heavy Fuel Oil (Thailand)', 'Stationary Combustion', 'Liquid Fuels', 3.114, 'kgCO2e/liter', 'liters', 'IPCC 2006 + Thailand TGO', 2023, 2024, 'Thailand', 'Asia Pacific', true),
  ('50000000-0000-0000-0000-000000000003', 'Diesel Oil (Thailand)', 'Mobile Combustion', 'Transport Fuels', 2.68, 'kgCO2e/liter', 'liters', 'IPCC 2006 + Thailand TGO', 2023, 2024, 'Thailand', 'Asia Pacific', true),
  ('50000000-0000-0000-0000-000000000004', 'Thailand Grid Electricity (TGO 2023)', 'Electricity', 'Grid', 0.4999, 'kgCO2e/kWh', 'kWh', 'TGO Thailand Grid EF 2023', 2023, 2024, 'Thailand', 'Asia Pacific', true),
  ('50000000-0000-0000-0000-000000000005', 'Sugar Cane Farming (Thailand)', 'Agriculture', 'Crops', 0.120, 'kgCO2e/kg', 'kg', 'Ecoinvent 3.9', 2023, 2024, 'Thailand', 'Asia Pacific', true),
  ('50000000-0000-0000-0000-000000000006', 'Container Ship (>8000 TEU)', 'Transport', 'Sea Freight', 0.016, 'kgCO2e/tonne-km', 'tonne-km', 'IMO Fourth GHG Study 2023', 2023, 2024, 'Global', 'Global', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- GRID EMISSION FACTORS for Thailand
-- ============================================

INSERT INTO grid_emission_factors (id, country, region, year, factor_kg_co2_per_kwh, source, is_default)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'Thailand', 'National', 2024, 0.4999, 'TGO Thailand Grid Emission Factor 2023', true),
  ('60000000-0000-0000-0000-000000000002', 'Thailand', 'National', 2023, 0.5086, 'TGO Thailand Grid Emission Factor 2022', false),
  ('60000000-0000-0000-0000-000000000003', 'China', 'National', 2024, 0.5810, 'China MEE Grid EF 2023', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CFP RESULTS (Carbon Footprint of Product)
-- 50 tons white sugar in 500g bags = 100,000 bags
-- ============================================

INSERT INTO cfp_results (id, project_id, product_name, functional_unit, functional_unit_quantity,
  production_volume, allocation_method,
  raw_materials_emissions, production_emissions, distribution_emissions,
  end_of_life_emissions, cfp_total, cfp_per_unit,
  year, report_standard, methodology, verification_status,
  calculated_by, created_at)
VALUES
  ('70000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'Thai Sweet White Sugar 500g', '500g bag', 100000,
   50000, 'mass',
   -- Raw materials: cane (78,000) + chemicals (5,830) + packaging (19,250) = 103,080
   103080.00,
   -- Production: bagasse (5,850) + fuel oil (6,228) + diesel (8,040) + refrigerant (1,044) + electricity (59,988 + 7,498.50) = 88,648.50
   88648.50,
   -- Distribution: truck to port (1,498) + sea freight (2,560) + cane transport (3,510) = 7,568
   7568.00,
   -- End of life: packaging (3,300)
   3300.00,
   -- Total = 103,080 + 88,648.50 + 7,568 + 3,300 = 202,596.50 kgCO2e
   202596.50,
   -- Per unit (per bag): 202,596.50 / 100,000 = 2.026 kgCO2e/bag
   2.026,
   2024, 'thai_esg', 'ISO 14067:2018 / TGO CFP Guidelines', 'pending',
   '20000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CFO RESULTS (Carbon Footprint of Organization)
-- ============================================

INSERT INTO cfo_results (id, project_id, organization_name, reporting_boundary, organizational_boundary,
  reporting_year, consolidation_method, operational_boundary,
  scope1_emissions, scope2_location_emissions,
  scope3_upstream_emissions, scope3_downstream_emissions,
  scope3_category_breakdown,
  cfo_total,
  report_standard, methodology, verification_status,
  calculated_by, created_at)
VALUES
  ('80000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'Thai Sweet Sugar Co., Ltd.', 'Operational Control', 'Single facility - Nakhon Ratchasima Sugar Mill',
   2024, 'operational_control', 'scope1+scope2+scope3',
   -- Scope 1: bagasse (5,850) + fuel oil (6,228) + diesel (8,040) + refrigerant (1,044) = 21,162
   21162.00,
   -- Scope 2 (location): factory (59,988) + office (7,498.50) = 67,486.50
   67486.50,
   -- Scope 3 upstream: cane (78,000) + packaging (19,250) + chemicals (5,830) + cane transport (3,510) + wastewater (2,500) + travel (2,022.40) + commuting (12,187.50) = 123,299.90
   123299.90,
   -- Scope 3 downstream: truck port (1,498) + sea freight (2,560) + EOL packaging (3,300) = 7,358
   7358.00,
   -- Category breakdown
   '{
     "cat1_purchased_goods": 103080.00,
     "cat4_upstream_transport": 3510.00,
     "cat5_waste": 2500.00,
     "cat6_business_travel": 2022.40,
     "cat7_employee_commuting": 12187.50,
     "cat9_downstream_transport": 4058.00,
     "cat12_end_of_life": 3300.00
   }'::jsonb,
   -- CFO Total: 21,162 + 67,486.50 + 123,299.90 + 7,358 = 219,306.40
   219306.40,
   'thai_esg', 'ISO 14064-1:2018 / TGO CFO Guidelines', 'pending',
   '20000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CBAM-SPECIFIC DATA
-- White sugar exported to China needs CBAM reporting data
-- ============================================

-- EU CBAM: Sugar is not currently in EU CBAM scope (covers iron/steel, cement, aluminium, 
-- fertilizers, hydrogen, electricity). But for China Carbon Market compliance:
INSERT INTO cfp_results (id, project_id, product_name, functional_unit, functional_unit_quantity,
  production_volume, allocation_method,
  raw_materials_emissions, production_emissions, distribution_emissions,
  end_of_life_emissions, cfp_total, cfp_per_unit,
  year, report_standard, methodology, verification_status,
  calculated_by, created_at)
VALUES
  ('70000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000001',
   'Thai Sweet White Sugar - China Carbon Market', '1 tonne', 50,
   50000, 'mass',
   103080.00, 88648.50, 7568.00, 3300.00,
   202596.50,
   -- Per tonne: 202,596.50 / 50 = 4,051.93 kgCO2e/tonne
   4051.93,
   2024, 'china_carbon_market', 'China Carbon Market MRV Guidelines', 'pending',
   '20000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ESG GOALS for Sugar Factory
-- ============================================

INSERT INTO esg_goals (id, project_id, name, description, category, target_type, scope,
  baseline_value, baseline_year, target_value, target_year, target_unit,
  current_value, progress_percentage,
  estimated_cost, cost_currency, estimated_savings,
  status, priority, sbti_aligned, paris_aligned,
  aligned_standards, notes, created_by)
VALUES
  -- Goal 1: Reduce Scope 2 by switching to solar
  ('90000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'Install Rooftop Solar PV System',
   'Install 100 kWp rooftop solar PV system to reduce grid electricity dependency by 50%. Expected to generate ~150,000 kWh/year in Nakhon Ratchasima.',
   'renewable_energy', 'absolute', 'scope2',
   67486.50, 2024, 33743.25, 2026, 'kgCO2e',
   67486.50, 0,
   2500000, 'THB', 500000,
   'active', 'high', false, true,
   ARRAY['thai_esg']::report_standard[],
   'Quotes received from 3 solar installers. ROI estimated at 5 years. Reduces grid dependency to ~50%.',
   '20000000-0000-0000-0000-000000000001'),

  -- Goal 2: Replace fuel oil with biomass briquettes
  ('90000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000001',
   'Eliminate Supplementary Fuel Oil',
   'Replace fuel oil boiler startup with rice husk briquettes from local suppliers, eliminating fossil fuel use for boiler operations entirely.',
   'emission_reduction', 'absolute', 'scope1',
   6228, 2024, 0, 2025, 'kgCO2e',
   6228, 0,
   150000, 'THB', 80000,
   'active', 'medium', false, false,
   ARRAY['thai_esg']::report_standard[],
   'Rice husk briquettes available locally at competitive price. Boiler modification cost ~150,000 THB.',
   '20000000-0000-0000-0000-000000000001'),

  -- Goal 3: Reduce overall carbon intensity per tonne of sugar
  ('90000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000001',
   'Reduce Carbon Intensity to 3,000 kgCO2e/tonne',
   'Reduce product carbon intensity from current 4,052 kgCO2e/tonne to 3,000 kgCO2e/tonne through combined efficiency measures.',
   'emission_reduction', 'intensity', 'all',
   4051.93, 2024, 3000, 2027, 'kgCO2e/tonne',
   4051.93, 0,
   5000000, 'THB', 1200000,
   'active', 'critical', true, true,
   ARRAY['thai_esg', 'china_carbon_market']::report_standard[],
   'Combined target from solar, fuel switching, and supply chain engagement. SBTi-aligned 4.2% annual reduction.',
   '20000000-0000-0000-0000-000000000001'),

  -- Goal 4: Engage suppliers on sustainable farming
  ('90000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000001',
   'Sustainable Sugar Cane Sourcing',
   'Work with contract farmers to eliminate field burning, adopt no-burn harvesting, and reduce fertilizer emissions by 20%.',
   'scope_specific', 'percentage', 'scope3',
   78000, 2024, 62400, 2026, 'kgCO2e',
   78000, 0,
   300000, 'THB', 0,
   'active', 'high', false, false,
   ARRAY['thai_esg']::report_standard[],
   'Thai government promoting no-burn policy. Can offer premium pricing to incentivize farmers. Target: 20% reduction in upstream cane emissions.',
   '20000000-0000-0000-0000-000000000001'),

  -- Goal 5: Achieve Thai ESG certification
  ('90000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000001',
   'Achieve Thai ESG & TGO Carbon Label',
   'Obtain TGO (Thailand Greenhouse Gas Management Organization) Carbon Footprint label for white sugar product and Thai ESG rating.',
   'custom', 'absolute', 'all',
   0, 2024, 1, 2025, 'certification',
   0, 0,
   200000, 'THB', 0,
   'active', 'high', false, false,
   ARRAY['thai_esg']::report_standard[],
   'Requires verified CFP report + CFO report submission to TGO. Expected timeline: Q2 2025 submission, Q3 2025 certification.',
   '20000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- AUDIT LOG ENTRIES
-- ============================================

INSERT INTO audit_logs (id, project_id, user_id, action, entity_type, entity_id, details, ip_address)
VALUES
  (uuid_generate_v4(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'create', 'project', '30000000-0000-0000-0000-000000000001',
   '{"name": "Thai Sweet Sugar Factory - GHG Inventory 2024"}'::jsonb, '203.150.100.1'),
  (uuid_generate_v4(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'create', 'activity', '40000000-0000-0000-0000-000000000001',
   '{"name": "Boiler - Bagasse Combustion", "scope": "scope1"}'::jsonb, '203.150.100.2'),
  (uuid_generate_v4(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'bulk_create', 'activity', NULL,
   '{"count": 16, "scopes": ["scope1", "scope2", "scope3"]}'::jsonb, '203.150.100.2'),
  (uuid_generate_v4(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'calculate', 'cfp', '70000000-0000-0000-0000-000000000001',
   '{"product": "Thai Sweet White Sugar 500g", "total": 202596.50, "per_unit": 2.026}'::jsonb, '203.150.100.1'),
  (uuid_generate_v4(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'calculate', 'cfo', '80000000-0000-0000-0000-000000000001',
   '{"organization": "Thai Sweet Sugar Co., Ltd.", "total": 219306.40}'::jsonb, '203.150.100.1')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================
-- Thai Sweet Sugar Co., Ltd. - GHG Inventory Summary 2024
-- -------------------------------------------------------
-- Scope 1 (Direct):        21,162.00 kgCO2e  (  9.6%)
--   - Bagasse combustion:    5,850.00
--   - Fuel oil (boiler):     6,228.00
--   - Diesel (equipment):    8,040.00
--   - Refrigerant (R-410A):  1,044.00
--
-- Scope 2 (Electricity):   67,486.50 kgCO2e  ( 30.8%)
--   - Factory grid:         59,988.00
--   - Office grid:           7,498.50
--
-- Scope 3 (Value Chain):  130,657.90 kgCO2e  ( 59.6%)
--   - Cat 1 Purchased:    103,080.00
--   - Cat 4 Upstream trx:   3,510.00
--   - Cat 5 Waste:           2,500.00
--   - Cat 6 Business travel: 2,022.40
--   - Cat 7 Commuting:      12,187.50
--   - Cat 9 Downstream trx:  4,058.00
--   - Cat 12 End of life:    3,300.00
--
-- TOTAL CFO:              219,306.40 kgCO2e  (219.3 tCO2e)
-- CFP per bag (500g):          2.026 kgCO2e/bag
-- CFP per tonne:           4,051.93 kgCO2e/tonne
-- -------------------------------------------------------
