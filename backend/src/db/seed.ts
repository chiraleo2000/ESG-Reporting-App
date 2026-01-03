import { db } from '../config/database';
import { generateId } from '../utils/helpers';
import bcrypt from 'bcryptjs';

// =============================================================================
// ESG REPORTING APP - DEMO DATA SEED SCRIPT
// =============================================================================
// Run: npm run seed
// This creates demo users, projects, activities, and emission factors
// =============================================================================

const DEMO_PASSWORD = 'Demo@123';

// Demo Users
const demoUsers = [
  { email: 'admin@esgdemo.com', name: 'Admin User', role: 'admin', org: 'ESG Demo Corp' },
  { email: 'manager@esgdemo.com', name: 'Project Manager', role: 'editor', org: 'ESG Demo Corp' },
  { email: 'viewer@esgdemo.com', name: 'Viewer User', role: 'viewer', org: 'ESG Demo Corp' },
  { email: 'auditor@esgdemo.com', name: 'External Auditor', role: 'auditor', org: 'Audit Partners Ltd' },
  { email: 'demo@esgdemo.com', name: 'Demo User', role: 'editor', org: 'New Company' }, // Clean user with no data
];

// Demo Projects
const demoProjects = [
  {
    name: 'Manufacturing Plant 2025',
    description: 'Carbon accounting for main manufacturing facility',
    company: 'ESG Demo Corp',
    facility: 'Main Production Plant',
    location: 'Bangkok, Thailand',
    industry: 'Manufacturing',
    standards: ['eu_cbam', 'thai_esg'],
    baselineYear: 2023,
    reportingYear: 2025,
  },
  {
    name: 'Office Operations Carbon Footprint',
    description: 'Corporate office emissions tracking',
    company: 'ESG Demo Corp',
    facility: 'Corporate HQ',
    location: 'Singapore',
    industry: 'Commercial Office',
    standards: ['k_esg', 'maff_esg'],
    baselineYear: 2024,
    reportingYear: 2025,
  },
  {
    name: 'Supply Chain Scope 3 Assessment',
    description: 'Upstream and downstream value chain emissions',
    company: 'ESG Demo Corp',
    facility: 'All Facilities',
    location: 'Asia Pacific',
    industry: 'Supply Chain',
    standards: ['eu_cbam', 'china_carbon_market'],
    baselineYear: 2023,
    reportingYear: 2025,
  },
];

// Demo Activities for Manufacturing Plant
const manufacturingActivities = [
  // Scope 1 - Direct Emissions
  { name: 'Natural Gas Combustion - Furnace', scope: 'scope1', type: 'stationary_combustion', qty: 125000, unit: 'm3', source: 'Utility Bills' },
  { name: 'Diesel Generators - Backup Power', scope: 'scope1', type: 'stationary_combustion', qty: 8500, unit: 'liters', source: 'Fuel Records' },
  { name: 'Fleet Vehicles - Delivery Trucks', scope: 'scope1', type: 'mobile_combustion', qty: 45000, unit: 'liters', source: 'Fleet Management' },
  { name: 'Forklift Operations', scope: 'scope1', type: 'mobile_combustion', qty: 3200, unit: 'liters', source: 'Operations Log' },
  { name: 'Refrigerant Leakage - AC Systems', scope: 'scope1', type: 'fugitive_emissions', qty: 12, unit: 'kg', source: 'Maintenance Records' },
  
  // Scope 2 - Indirect Energy
  { name: 'Purchased Electricity - Grid', scope: 'scope2', type: 'purchased_electricity', qty: 2850000, unit: 'kWh', source: 'Electricity Bills' },
  { name: 'Purchased Steam - Process Heat', scope: 'scope2', type: 'purchased_heat_steam', qty: 450, unit: 'MWh', source: 'Steam Supplier' },
  
  // Scope 3 - Value Chain
  { name: 'Raw Material Transport - Inbound', scope: 'scope3', cat: 'upstream_transport', type: 'upstream_transport', qty: 180000, unit: 'tonne_km', source: 'Logistics Data' },
  { name: 'Steel Procurement', scope: 'scope3', cat: 'purchased_goods_services', type: 'purchased_goods', qty: 2500, unit: 'tonnes', source: 'Procurement' },
  { name: 'Packaging Materials', scope: 'scope3', cat: 'purchased_goods_services', type: 'purchased_goods', qty: 850, unit: 'tonnes', source: 'Procurement' },
  { name: 'Business Travel - Air', scope: 'scope3', cat: 'business_travel', type: 'business_travel', qty: 125000, unit: 'km', source: 'Travel Records' },
  { name: 'Employee Commuting', scope: 'scope3', cat: 'employee_commuting', type: 'employee_commuting', qty: 450000, unit: 'km', source: 'Survey Data' },
  { name: 'Waste to Landfill', scope: 'scope3', cat: 'waste_generated', type: 'waste', qty: 320, unit: 'tonnes', source: 'Waste Manifests' },
  { name: 'Product Distribution', scope: 'scope3', cat: 'downstream_transport', type: 'downstream_transport', qty: 250000, unit: 'tonne_km', source: 'Logistics' },
];

// Demo Activities for Office
const officeActivities = [
  { name: 'Office Electricity', scope: 'scope2', type: 'purchased_electricity', qty: 180000, unit: 'kWh', source: 'Utility Bills' },
  { name: 'Air Conditioning Refrigerant', scope: 'scope1', type: 'fugitive_emissions', qty: 5, unit: 'kg', source: 'HVAC Maintenance' },
  { name: 'Company Car Fleet', scope: 'scope1', type: 'mobile_combustion', qty: 12000, unit: 'liters', source: 'Fleet Records' },
  { name: 'Staff Air Travel', scope: 'scope3', cat: 'business_travel', type: 'business_travel', qty: 85000, unit: 'km', source: 'Travel System' },
  { name: 'Employee Commuting', scope: 'scope3', cat: 'employee_commuting', type: 'employee_commuting', qty: 125000, unit: 'km', source: 'Survey' },
  { name: 'Office Supplies', scope: 'scope3', cat: 'purchased_goods_services', type: 'purchased_goods', qty: 15000, unit: 'USD', source: 'Procurement' },
  { name: 'Office Waste', scope: 'scope3', cat: 'waste_generated', type: 'waste', qty: 8, unit: 'tonnes', source: 'Waste Records' },
];

// Grid Emission Factors by Region
const gridFactors = [
  { country: 'Thailand', region: 'National Grid', year: 2025, factor: 0.4561, source: 'EGAT 2024' },
  { country: 'Thailand', region: 'National Grid', year: 2024, factor: 0.4672, source: 'EGAT 2023' },
  { country: 'Singapore', region: 'National Grid', year: 2025, factor: 0.4085, source: 'EMA Singapore' },
  { country: 'China', region: 'North Grid', year: 2025, factor: 0.5810, source: 'NDRC China' },
  { country: 'China', region: 'East Grid', year: 2025, factor: 0.5102, source: 'NDRC China' },
  { country: 'Japan', region: 'Tokyo Electric', year: 2025, factor: 0.4410, source: 'TEPCO' },
  { country: 'South Korea', region: 'KEPCO Grid', year: 2025, factor: 0.4590, source: 'KEPCO' },
  { country: 'EU Average', region: 'European Union', year: 2025, factor: 0.2560, source: 'EEA' },
  { country: 'UK', region: 'National Grid', year: 2025, factor: 0.2121, source: 'DEFRA' },
];

// Precursor Factors for CBAM Materials
const precursorFactors = [
  { material: 'Iron', route: 'Blast Furnace', direct: 1.85, indirect: 0.42 },
  { material: 'Iron', route: 'Direct Reduced', direct: 0.52, indirect: 0.89 },
  { material: 'Steel', route: 'Basic Oxygen', direct: 1.95, indirect: 0.48 },
  { material: 'Steel', route: 'Electric Arc', direct: 0.35, indirect: 0.72 },
  { material: 'Aluminum', route: 'Primary Smelting', direct: 1.65, indirect: 13.50 },
  { material: 'Aluminum', route: 'Secondary Recycled', direct: 0.15, indirect: 0.85 },
  { material: 'Cement', route: 'Standard', direct: 0.65, indirect: 0.08 },
  { material: 'Fertilizer', route: 'Haber-Bosch', direct: 1.45, indirect: 0.62 },
];

async function seed() {
  console.log('🌱 Starting ESG Demo Data Seed...\n');

  try {
    // Clear existing demo data (in correct order due to foreign keys)
    console.log('🧹 Clearing existing demo data...');
    await db.query(`DELETE FROM activities WHERE project_id IN (SELECT id FROM projects WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%@esgdemo.com' OR email LIKE '%@audit%'))`);
    await db.query(`DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%@esgdemo.com' OR email LIKE '%@audit%'))`);
    await db.query(`DELETE FROM projects WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%@esgdemo.com' OR email LIKE '%@audit%')`);
    await db.query(`DELETE FROM users WHERE email LIKE '%@esgdemo.com' OR email LIKE '%@audit%'`);

    // Create demo users
    console.log('👥 Creating demo users...');
    const userIds: Record<string, string> = {};
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    for (const user of demoUsers) {
      const userId = generateId();
      userIds[user.email] = userId;
      await db.query(
        `INSERT INTO users (id, email, password_hash, name, role, organization, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = $4`,
        [userId, user.email, passwordHash, user.name, user.role, user.org]
      );
    }
    console.log(`   ✅ Created ${demoUsers.length} demo users`);

    // Create demo projects
    console.log('📁 Creating demo projects...');
    const projectIds: string[] = [];
    const adminId = userIds['admin@esgdemo.com'];

    for (const project of demoProjects) {
      const projectId = generateId();
      projectIds.push(projectId);
      await db.query(
        `INSERT INTO projects (id, name, description, organization, industry, country, baseline_year, reporting_year, standards, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [projectId, project.name, project.description, project.company, project.industry, project.location, project.baselineYear, project.reportingYear, project.standards, adminId]
      );
      
      // Add admin as owner
      await db.query(
        `INSERT INTO project_members (id, project_id, user_id, role) VALUES ($1, $2, $3, 'owner')`,
        [generateId(), projectId, adminId]
      );
    }
    console.log(`   ✅ Created ${demoProjects.length} demo projects`);

    // Create activities for Manufacturing Plant
    console.log('📊 Creating demo activities...');
    let activityCount = 0;

    for (const activity of manufacturingActivities) {
      await db.query(
        `INSERT INTO activities (id, project_id, name, scope, scope3_category, activity_type, activity_data, activity_unit, facility, year, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [generateId(), projectIds[0], activity.name, activity.scope, activity.cat || null, activity.type, activity.qty, activity.unit, 'Main Plant', 2025, adminId]
      );
      activityCount++;
    }

    for (const activity of officeActivities) {
      await db.query(
        `INSERT INTO activities (id, project_id, name, scope, scope3_category, activity_type, activity_data, activity_unit, facility, year, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [generateId(), projectIds[1], activity.name, activity.scope, activity.cat || null, activity.type, activity.qty, activity.unit, 'Corporate HQ', 2025, adminId]
      );
      activityCount++;
    }
    console.log(`   ✅ Created ${activityCount} demo activities`);

    // Create grid emission factors
    console.log('⚡ Creating grid emission factors...');
    for (const gef of gridFactors) {
      await db.query(
        `INSERT INTO grid_emission_factors (id, country, region, grid_name, year, location_based_ef, source, effective_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (country, region, year) DO UPDATE SET location_based_ef = $6`,
        [generateId(), gef.country, gef.region, gef.region, gef.year, gef.factor, gef.source, `${gef.year}-01-01`]
      );
    }
    console.log(`   ✅ Created ${gridFactors.length} grid emission factors`);

    // Create precursor factors
    console.log('🏭 Creating precursor factors...');
    for (const pf of precursorFactors) {
      await db.query(
        `INSERT INTO precursor_factors (id, material, production_route, direct_emissions_factor, indirect_emissions_factor, source, valid_from)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [generateId(), pf.material, pf.route, pf.direct, pf.indirect, 'EU CBAM Regulation', '2024-01-01']
      );
    }
    console.log(`   ✅ Created ${precursorFactors.length} precursor factors`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DEMO DATA SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Demo Accounts (Password: Demo@123):');
    console.log('   • admin@esgdemo.com    - Full admin access');
    console.log('   • manager@esgdemo.com  - Project editor');
    console.log('   • viewer@esgdemo.com   - Read-only access');
    console.log('   • auditor@esgdemo.com  - External auditor');
    console.log('   • demo@esgdemo.com     - Clean user (no data)');
    console.log('\n📁 Demo Projects:');
    demoProjects.forEach((p, i) => console.log(`   ${i + 1}. ${p.name}`));
    console.log('\n🚀 Ready to explore! Start the app and login.\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
