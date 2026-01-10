import { db } from '../config/database';
import { generateId } from '../utils/helpers';
import bcrypt from 'bcryptjs';

// =============================================================================
// THAI SUGAR FACTORY - DEMO DATA SEED SCRIPT
// =============================================================================
// Run: npm run seed:sugar
// 
// This creates realistic demo data for a Thai sugar factory with:
// - Sugarcane farming operations (500 hectares)
// - Sugar processing facility
// - Export to China (50 tonnes white sugar annually in 500g bags)
// =============================================================================

const DEMO_PASSWORD = 'Demo@123';

// Factory Company Information
const factoryInfo = {
  companyName: 'Thai Sweet Sugar Co., Ltd.',
  facilityName: 'Rayong Sugar Mill',
  location: 'Rayong Province, Thailand',
  industry: 'Food Processing - Sugar Manufacturing',
  employees: 85,
  farmingArea: 500, // hectares
  annualProduction: 50, // tonnes of white sugar
  exportDestination: 'China (Shanghai)',
  product: 'White refined sugar in 500g retail bags',
  containers: 2, // 20ft containers per year
};

// Demo Users for Sugar Factory
const sugarFactoryUsers = [
  { 
    email: 'admin@thaisugar.demo.com', 
    name: 'Somchai Charoenpol', 
    role: 'admin', 
    org: factoryInfo.companyName,
    department: 'Management',
    title: 'Factory Manager',
  },
  { 
    email: 'esg@thaisugar.demo.com', 
    name: 'Pranee Sukcharoen', 
    role: 'editor', 
    org: factoryInfo.companyName,
    department: 'Environmental',
    title: 'ESG Coordinator',
  },
  { 
    email: 'production@thaisugar.demo.com', 
    name: 'Wichai Srisombat', 
    role: 'editor', 
    org: factoryInfo.companyName,
    department: 'Production',
    title: 'Production Manager',
  },
  { 
    email: 'export@thaisugar.demo.com', 
    name: 'Nattaya Wongprasert', 
    role: 'viewer', 
    org: factoryInfo.companyName,
    department: 'Export',
    title: 'Export Sales Manager',
  },
  { 
    email: 'auditor@thaisugar.demo.com', 
    name: 'Dr. Prasit Limthong', 
    role: 'auditor', 
    org: 'TGO Carbon Verification',
    department: 'External',
    title: 'Third-Party Verifier',
  },
];

// Sugar Factory Project
const sugarFactoryProject = {
  name: 'Thai Sweet Sugar Factory - Carbon Footprint 2025',
  description: `Comprehensive greenhouse gas emissions tracking for Thai Sweet Sugar Co., Ltd.
  
  Facility: ${factoryInfo.facilityName}, ${factoryInfo.location}
  Industry: ${factoryInfo.industry}
  Employees: ${factoryInfo.employees}
  
  Agricultural Operations:
  - Sugarcane farming: ${factoryInfo.farmingArea} hectares owned fields
  - Annual harvest: ~25,000 tonnes sugarcane
  - Irrigation: Groundwater with electric pumps
  
  Processing Operations:
  - Crushing, extraction, crystallization, packaging
  - Annual output: ${factoryInfo.annualProduction} tonnes white refined sugar
  - Product: 100,000 bags × 500g = ${factoryInfo.annualProduction} tonnes
  
  Export:
  - Destination: ${factoryInfo.exportDestination}
  - Mode: Sea freight via Laem Chabang Port
  - Volume: ${factoryInfo.containers} containers annually`,
  organization: factoryInfo.companyName,
  industry: factoryInfo.industry,
  country: 'Thailand',
  region: 'Eastern Thailand',
  baselineYear: 2024,
  reportingYear: 2025,
  status: 'active',
  standards: ['thai_esg', 'china_carbon', 'eu_cbam'],
  settings: {
    facilityName: factoryInfo.facilityName,
    facilityLocation: factoryInfo.location,
    productName: 'White Sugar 500g retail bags',
    annualProductionTonnes: factoryInfo.annualProduction,
    employeeCount: factoryInfo.employees,
    farmingAreaHectares: factoryInfo.farmingArea,
    exportDestination: factoryInfo.exportDestination,
    certifications: ['TIS 28', 'ISO 14001', 'ISO 9001'],
  },
};

// Comprehensive Activities for Sugar Factory
const sugarFactoryActivities = [
  // ============================================
  // SCOPE 1 - DIRECT EMISSIONS
  // ============================================
  
  // Agricultural Machinery
  {
    name: 'Diesel - Agricultural Tractors',
    description: 'Diesel fuel for 8 tractors used in sugarcane field preparation, planting, and harvesting support',
    scope: 'scope1',
    activityType: 'mobile_combustion',
    quantity: 28500,
    unit: 'liters',
    source: 'Fuel receipts & fleet records',
    facility: 'Farm Operations',
    dataQualityScore: 4,
    metadata: {
      equipment: '8 John Deere tractors',
      operatingHours: 4800,
      fuelEfficiency: '5.9 L/hour',
    },
  },
  {
    name: 'Diesel - Sugarcane Harvesters',
    description: 'Diesel fuel for 3 mechanical harvesters during harvest season (Dec-Apr)',
    scope: 'scope1',
    activityType: 'mobile_combustion',
    quantity: 18500,
    unit: 'liters',
    source: 'Fuel receipts',
    facility: 'Farm Operations',
    dataQualityScore: 4,
    metadata: {
      equipment: '3 CASE IH harvesters',
      harvestPeriod: 'December - April',
      areaHarvested: '500 hectares',
    },
  },
  
  // Transportation
  {
    name: 'Diesel - Cane Transport Trucks',
    description: 'Diesel for 12 trucks transporting sugarcane from fields to mill (avg 15km trips)',
    scope: 'scope1',
    activityType: 'mobile_combustion',
    quantity: 42000,
    unit: 'liters',
    source: 'Fleet management system',
    facility: 'Transport Fleet',
    dataQualityScore: 5,
    metadata: {
      vehicles: '12 Hino trucks (10-tonne capacity)',
      trips: 2500,
      avgDistance: '15 km one-way',
      caneTransported: '25,000 tonnes',
    },
  },
  {
    name: 'Diesel - Delivery Vehicles',
    description: 'Diesel for 4 delivery trucks for domestic sugar distribution',
    scope: 'scope1',
    activityType: 'mobile_combustion',
    quantity: 8500,
    unit: 'liters',
    source: 'Fleet records',
    facility: 'Distribution',
    dataQualityScore: 4,
    metadata: {
      vehicles: '4 Isuzu delivery trucks',
      deliveryArea: 'Eastern Thailand',
    },
  },
  
  // Factory Processing
  {
    name: 'Natural Gas - Processing & Drying',
    description: 'Natural gas for sugar crystallization vacuum pans and dryers',
    scope: 'scope1',
    activityType: 'stationary_combustion',
    quantity: 185000,
    unit: 'm3',
    source: 'PTT Gas utility bills',
    facility: 'Sugar Mill - Processing',
    dataQualityScore: 5,
    metadata: {
      supplier: 'PTT Natural Gas',
      equipment: 'Vacuum pans, rotary dryers',
      efficiency: '85%',
    },
  },
  {
    name: 'Diesel - Backup Generators',
    description: 'Diesel for 2 emergency generators (limited use)',
    scope: 'scope1',
    activityType: 'stationary_combustion',
    quantity: 2200,
    unit: 'liters',
    source: 'Generator logs',
    facility: 'Utilities',
    dataQualityScore: 4,
    metadata: {
      generators: '2 × 500 kVA Cummins',
      operatingHours: 180,
    },
  },
  
  // Bagasse Boiler (biogenic - reported separately)
  {
    name: 'Bagasse Combustion - Steam Generation',
    description: 'Sugarcane bagasse burned in boiler for steam (biogenic CO2 - reported for transparency)',
    scope: 'scope1',
    activityType: 'stationary_combustion',
    quantity: 22500,
    unit: 'tonnes',
    source: 'Production records',
    facility: 'Power House',
    dataQualityScore: 4,
    metadata: {
      type: 'biogenic',
      boilerCapacity: '25 tonnes steam/hour',
      steamUsage: 'Process heat and turbine',
      note: 'Carbon neutral per GHG Protocol (biogenic)',
    },
  },
  
  // Fugitive Emissions
  {
    name: 'Refrigerant Losses - Cold Storage',
    description: 'R-410A refrigerant top-ups for cold storage and air conditioning',
    scope: 'scope1',
    activityType: 'fugitive_emissions',
    quantity: 12,
    unit: 'kg',
    source: 'HVAC service records',
    facility: 'Cold Storage & Office',
    dataQualityScore: 3,
    metadata: {
      refrigerantType: 'R-410A',
      gwp: 2088,
      equipment: 'Cold room, office AC units',
    },
  },
  
  // Agricultural Process Emissions
  {
    name: 'N2O Emissions - Fertilizer Application',
    description: 'Nitrous oxide from nitrogen fertilizer applied to sugarcane fields',
    scope: 'scope1',
    activityType: 'process_emissions',
    quantity: 145,
    unit: 'tonnes_N',
    source: 'Fertilizer purchase records',
    facility: 'Farm Operations',
    dataQualityScore: 3,
    metadata: {
      fertilizerType: 'Urea (46-0-0) and NPK',
      applicationRate: '290 kg N/hectare',
      methodology: 'IPCC Tier 1',
      emissionFactor: '0.01 kg N2O-N/kg N applied',
    },
  },
  {
    name: 'Field Burning Emissions - Pre-Harvest',
    description: 'Emissions from controlled burning of 30% of sugarcane fields before harvest',
    scope: 'scope1',
    activityType: 'process_emissions',
    quantity: 150,
    unit: 'hectares',
    source: 'Farm operations log',
    facility: 'Farm Operations',
    dataQualityScore: 3,
    metadata: {
      percentage: '30%',
      reason: 'Snake removal and leaf clearing',
      note: 'Transitioning to green cane harvesting',
      emissionsPerHa: '2.5 tonnes CO2e',
    },
  },
  
  // ============================================
  // SCOPE 2 - INDIRECT ENERGY EMISSIONS
  // ============================================
  
  {
    name: 'Grid Electricity - Sugar Mill Operations',
    description: 'Purchased electricity for crushing, centrifuges, conveyors, packaging',
    scope: 'scope2',
    activityType: 'purchased_electricity',
    quantity: 1650000,
    unit: 'kWh',
    source: 'PEA utility bills',
    facility: 'Sugar Mill',
    dataQualityScore: 5,
    metadata: {
      supplier: 'Provincial Electricity Authority (PEA)',
      gridRegion: 'Thailand National Grid',
      emissionFactor: '0.4999 kg CO2e/kWh (TGO 2024)',
      voltage: '22 kV',
    },
  },
  {
    name: 'Grid Electricity - Irrigation Pumps',
    description: 'Electricity for groundwater pumping across 500 hectares',
    scope: 'scope2',
    activityType: 'purchased_electricity',
    quantity: 385000,
    unit: 'kWh',
    source: 'PEA utility bills',
    facility: 'Farm Operations',
    dataQualityScore: 5,
    metadata: {
      pumpCount: 15,
      wellDepth: '80-120 meters',
      waterPumped: '1,250,000 m³',
      irrigationType: 'Drip and furrow',
    },
  },
  {
    name: 'Grid Electricity - Cold Storage',
    description: 'Refrigeration for finished sugar storage before shipping',
    scope: 'scope2',
    activityType: 'purchased_electricity',
    quantity: 125000,
    unit: 'kWh',
    source: 'PEA utility bills',
    facility: 'Warehouse',
    dataQualityScore: 5,
    metadata: {
      storageCapacity: '500 tonnes',
      temperature: '20°C / 60% RH',
    },
  },
  {
    name: 'Grid Electricity - Office & Admin',
    description: 'Office buildings, canteen, security, lighting',
    scope: 'scope2',
    activityType: 'purchased_electricity',
    quantity: 75000,
    unit: 'kWh',
    source: 'PEA utility bills',
    facility: 'Administration',
    dataQualityScore: 5,
    metadata: {
      buildings: 'Main office, canteen, guardhouse',
      employees: 85,
    },
  },
  {
    name: 'Grid Electricity - Water Treatment',
    description: 'Wastewater treatment plant operations',
    scope: 'scope2',
    activityType: 'purchased_electricity',
    quantity: 42000,
    unit: 'kWh',
    source: 'PEA utility bills',
    facility: 'Wastewater Treatment',
    dataQualityScore: 5,
    metadata: {
      treatmentCapacity: '500 m³/day',
      method: 'Activated sludge',
    },
  },
  
  // ============================================
  // SCOPE 3 - VALUE CHAIN EMISSIONS
  // ============================================
  
  // Category 1: Purchased Goods & Services
  {
    name: 'Fertilizer Production - Upstream',
    description: 'Embodied emissions from manufacturing of fertilizers purchased',
    scope: 'scope3',
    scope3Category: 'purchased_goods_services',
    activityType: 'purchased_goods',
    quantity: 285000,
    unit: 'USD',
    source: 'Procurement records',
    facility: 'Farm Operations',
    dataQualityScore: 3,
    metadata: {
      fertilizerTypes: ['Urea', 'NPK 15-15-15', 'Potash'],
      totalWeight: '180 tonnes',
      suppliers: ['Thai Central Chemical', 'SCG Chemicals'],
      spendBasedFactor: '0.5 kg CO2e/USD',
    },
  },
  {
    name: 'Pesticides & Herbicides',
    description: 'Agricultural chemicals for sugarcane pest and weed control',
    scope: 'scope3',
    scope3Category: 'purchased_goods_services',
    activityType: 'purchased_goods',
    quantity: 68000,
    unit: 'USD',
    source: 'Procurement records',
    facility: 'Farm Operations',
    dataQualityScore: 3,
    metadata: {
      products: ['Paraquat', 'Atrazine', 'Fipronil'],
      applicationArea: '500 hectares',
    },
  },
  {
    name: 'Packaging Materials - 500g Sugar Bags',
    description: 'Polypropylene bags and cartons for 100,000 × 500g retail packs',
    scope: 'scope3',
    scope3Category: 'purchased_goods_services',
    activityType: 'purchased_goods',
    quantity: 18500,
    unit: 'kg',
    source: 'Packaging supplier invoices',
    facility: 'Packaging',
    dataQualityScore: 4,
    metadata: {
      bagMaterial: 'Polypropylene (PP)',
      cartonMaterial: 'Corrugated cardboard',
      totalBags: 100000,
      bagsPerCarton: 20,
      emissionFactor: '2.0 kg CO2e/kg PP',
    },
  },
  {
    name: 'Packaging Materials - Export Containers',
    description: 'Pallets and stretch wrap for container loading',
    scope: 'scope3',
    scope3Category: 'purchased_goods_services',
    activityType: 'purchased_goods',
    quantity: 2500,
    unit: 'kg',
    source: 'Supplier invoices',
    facility: 'Warehouse',
    dataQualityScore: 4,
    metadata: {
      items: 'Wooden pallets, PE stretch film',
      containers: 2,
    },
  },
  {
    name: 'Water Supply - Purchased',
    description: 'Municipal water for processing and cleaning',
    scope: 'scope3',
    scope3Category: 'purchased_goods_services',
    activityType: 'purchased_goods',
    quantity: 45000,
    unit: 'm3',
    source: 'Water utility bills',
    facility: 'Sugar Mill',
    dataQualityScore: 4,
    metadata: {
      supplier: 'Provincial Waterworks Authority',
      emissionFactor: '0.344 kg CO2e/m³',
    },
  },
  
  // Category 3: Fuel and Energy Related Activities
  {
    name: 'Electricity T&D Losses',
    description: 'Upstream emissions from transmission and distribution losses',
    scope: 'scope3',
    scope3Category: 'fuel_energy_activities',
    activityType: 'fuel_energy',
    quantity: 2277000,
    unit: 'kWh',
    source: 'Calculated from total electricity',
    facility: 'All Operations',
    dataQualityScore: 3,
    metadata: {
      totalElectricity: 2277000,
      tdLossRate: '0.03 kg CO2e/kWh WTT',
      methodology: 'DEFRA 2024',
    },
  },
  
  // Category 4: Upstream Transportation
  {
    name: 'Inbound Transport - Fertilizer Delivery',
    description: 'Truck transport of fertilizers from Bangkok to factory',
    scope: 'scope3',
    scope3Category: 'upstream_transport',
    activityType: 'upstream_transport',
    quantity: 36000,
    unit: 'tonne_km',
    source: 'Supplier delivery records',
    facility: 'Procurement',
    dataQualityScore: 3,
    metadata: {
      distance: '200 km from Bangkok',
      weight: '180 tonnes',
      mode: 'Truck',
      emissionFactor: '0.1 kg CO2e/tonne-km',
    },
  },
  {
    name: 'Inbound Transport - Packaging Materials',
    description: 'Delivery of packaging from suppliers',
    scope: 'scope3',
    scope3Category: 'upstream_transport',
    activityType: 'upstream_transport',
    quantity: 4200,
    unit: 'tonne_km',
    source: 'Supplier records',
    facility: 'Procurement',
    dataQualityScore: 3,
    metadata: {
      distance: '200 km',
      weight: '21 tonnes',
    },
  },
  
  // Category 5: Waste Generated in Operations
  {
    name: 'Organic Waste - Composting',
    description: 'Filter mud and press mud sent to composting',
    scope: 'scope3',
    scope3Category: 'waste_generated',
    activityType: 'waste',
    quantity: 2200,
    unit: 'tonnes',
    source: 'Waste management records',
    facility: 'Sugar Mill',
    dataQualityScore: 4,
    metadata: {
      wasteType: 'Filter mud (organic)',
      treatment: 'Composting for farm use',
      emissionFactor: '0.02 kg CO2e/kg composted',
    },
  },
  {
    name: 'General Waste - Landfill',
    description: 'Non-recyclable waste sent to municipal landfill',
    scope: 'scope3',
    scope3Category: 'waste_generated',
    activityType: 'waste',
    quantity: 28,
    unit: 'tonnes',
    source: 'Waste collection records',
    facility: 'All Operations',
    dataQualityScore: 4,
    metadata: {
      wasteType: 'Mixed municipal waste',
      treatment: 'Landfill',
      emissionFactor: '0.58 kg CO2e/kg',
    },
  },
  {
    name: 'Recyclable Waste - Paper & Plastic',
    description: 'Office paper and plastic sent for recycling',
    scope: 'scope3',
    scope3Category: 'waste_generated',
    activityType: 'waste',
    quantity: 8,
    unit: 'tonnes',
    source: 'Recycling records',
    facility: 'Administration',
    dataQualityScore: 4,
    metadata: {
      wasteTypes: ['Paper', 'Cardboard', 'Plastic'],
      treatment: 'Recycling',
      emissionFactor: '0.02 kg CO2e/kg recycled',
    },
  },
  
  // Category 6: Business Travel
  {
    name: 'Air Travel - China Export Meetings',
    description: 'Flights to Shanghai for buyer negotiations and trade shows',
    scope: 'scope3',
    scope3Category: 'business_travel',
    activityType: 'business_travel',
    quantity: 24800,
    unit: 'km',
    source: 'Travel booking system',
    facility: 'Export Department',
    dataQualityScore: 4,
    metadata: {
      route: 'Bangkok (BKK) - Shanghai (PVG)',
      distanceOneWay: '3100 km',
      trips: 4,
      travelers: 2,
      class: 'Economy',
      emissionFactor: '0.195 kg CO2e/km long-haul',
    },
  },
  {
    name: 'Air Travel - Domestic Business',
    description: 'Domestic flights for meetings in Bangkok and Chiang Mai',
    scope: 'scope3',
    scope3Category: 'business_travel',
    activityType: 'business_travel',
    quantity: 8400,
    unit: 'km',
    source: 'Travel records',
    facility: 'Management',
    dataQualityScore: 4,
    metadata: {
      routes: ['Rayong-Bangkok', 'Bangkok-Chiang Mai'],
      trips: 12,
      emissionFactor: '0.255 kg CO2e/km short-haul',
    },
  },
  {
    name: 'Hotel Stays - Business Travel',
    description: 'Overnight hotel stays during business trips',
    scope: 'scope3',
    scope3Category: 'business_travel',
    activityType: 'business_travel',
    quantity: 48,
    unit: 'nights',
    source: 'Travel expense reports',
    facility: 'All Departments',
    dataQualityScore: 3,
    metadata: {
      avgStarRating: 4,
      emissionFactor: '31 kg CO2e/night',
    },
  },
  
  // Category 7: Employee Commuting
  {
    name: 'Employee Commuting - Car',
    description: 'Daily commuting by personal cars (40% of employees)',
    scope: 'scope3',
    scope3Category: 'employee_commuting',
    activityType: 'employee_commuting',
    quantity: 208250,
    unit: 'km',
    source: 'Employee survey 2024',
    facility: 'All Departments',
    dataQualityScore: 3,
    metadata: {
      employees: 34,
      avgDistance: '25 km round trip',
      workingDays: 245,
      emissionFactor: '0.17 kg CO2e/km',
    },
  },
  {
    name: 'Employee Commuting - Motorcycle',
    description: 'Daily commuting by motorcycles (50% of employees)',
    scope: 'scope3',
    scope3Category: 'employee_commuting',
    activityType: 'employee_commuting',
    quantity: 260750,
    unit: 'km',
    source: 'Employee survey 2024',
    facility: 'All Departments',
    dataQualityScore: 3,
    metadata: {
      employees: 43,
      avgDistance: '25 km round trip',
      workingDays: 245,
      emissionFactor: '0.05 kg CO2e/km',
    },
  },
  {
    name: 'Employee Commuting - Company Shuttle',
    description: 'Company bus service for remote village employees',
    scope: 'scope3',
    scope3Category: 'employee_commuting',
    activityType: 'employee_commuting',
    quantity: 22050,
    unit: 'km',
    source: 'Shuttle bus records',
    facility: 'HR Department',
    dataQualityScore: 4,
    metadata: {
      employees: 8,
      busCapacity: 20,
      avgDistance: '45 km round trip',
      workingDays: 245,
      emissionFactor: '0.089 kg CO2e/passenger-km',
    },
  },
  
  // Category 9: Downstream Transportation
  {
    name: 'Export Shipping - Thailand to China',
    description: 'Sea freight Laem Chabang to Shanghai (50 tonnes in 2 containers)',
    scope: 'scope3',
    scope3Category: 'downstream_transport',
    activityType: 'downstream_transport',
    quantity: 135000,
    unit: 'tonne_km',
    source: 'Shipping bill of lading',
    facility: 'Export',
    dataQualityScore: 4,
    metadata: {
      route: 'Laem Chabang Port → Shanghai Port',
      distance: '2700 km',
      weight: '50 tonnes',
      containers: '2 × 20ft FCL',
      shippingLine: 'COSCO',
      vesselType: 'Container ship',
      emissionFactor: '0.01 kg CO2e/tonne-km sea',
    },
  },
  {
    name: 'Port Transport - Factory to Laem Chabang',
    description: 'Truck transport from factory to export port',
    scope: 'scope3',
    scope3Category: 'downstream_transport',
    activityType: 'downstream_transport',
    quantity: 5000,
    unit: 'tonne_km',
    source: 'Logistics provider invoice',
    facility: 'Export',
    dataQualityScore: 4,
    metadata: {
      distance: '100 km',
      weight: '50 tonnes',
      mode: 'Truck',
      emissionFactor: '0.1 kg CO2e/tonne-km road',
    },
  },
  {
    name: 'Domestic Distribution',
    description: 'Transport of sugar to Thai distributors (5 tonnes local sales)',
    scope: 'scope3',
    scope3Category: 'downstream_transport',
    activityType: 'downstream_transport',
    quantity: 1500,
    unit: 'tonne_km',
    source: 'Delivery records',
    facility: 'Distribution',
    dataQualityScore: 3,
    metadata: {
      avgDistance: '300 km',
      weight: '5 tonnes domestic',
      emissionFactor: '0.1 kg CO2e/tonne-km',
    },
  },
];

// Grid Emission Factors (Latest TGO Data)
const thaiGridFactors = [
  { country: 'Thailand', region: 'National Grid', year: 2025, factor: 0.4999, source: 'TGO Thailand 2024' },
  { country: 'Thailand', region: 'National Grid', year: 2024, factor: 0.5156, source: 'TGO Thailand 2023' },
  { country: 'Thailand', region: 'National Grid', year: 2023, factor: 0.5232, source: 'TGO Thailand 2022' },
  { country: 'China', region: 'National Average', year: 2025, factor: 0.5810, source: 'MEE China 2024' },
  { country: 'China', region: 'East Grid', year: 2025, factor: 0.5102, source: 'NDRC China 2024' },
];

async function seedSugarFactory() {
  console.log('\n' + '='.repeat(70));
  console.log('🏭 THAI SUGAR FACTORY - ESG DEMO DATA SEEDING');
  console.log('='.repeat(70));
  console.log(`\nFactory: ${factoryInfo.companyName}`);
  console.log(`Location: ${factoryInfo.location}`);
  console.log(`Production: ${factoryInfo.annualProduction} tonnes/year`);
  console.log(`Export: ${factoryInfo.exportDestination}\n`);

  try {
    // Clear existing sugar factory demo data
    console.log('🧹 Cleaning up previous sugar factory demo data...');
    await db.query(`DELETE FROM activities WHERE project_id IN (SELECT id FROM projects WHERE organization = $1)`, [factoryInfo.companyName]);
    await db.query(`DELETE FROM reports WHERE project_id IN (SELECT id FROM projects WHERE organization = $1)`, [factoryInfo.companyName]);
    await db.query(`DELETE FROM cfp_results WHERE project_id IN (SELECT id FROM projects WHERE organization = $1)`, [factoryInfo.companyName]);
    await db.query(`DELETE FROM cfo_results WHERE project_id IN (SELECT id FROM projects WHERE organization = $1)`, [factoryInfo.companyName]);
    await db.query(`DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE organization = $1)`, [factoryInfo.companyName]);
    await db.query(`DELETE FROM projects WHERE organization = $1`, [factoryInfo.companyName]);
    await db.query(`DELETE FROM users WHERE email LIKE '%@thaisugar.demo.com'`);

    // Create demo users
    console.log('\n👥 Creating sugar factory users...');
    const userIds: Record<string, string> = {};
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    for (const user of sugarFactoryUsers) {
      const userId = generateId();
      userIds[user.email] = userId;
      await db.query(
        `INSERT INTO users (id, email, password_hash, name, role, organization, department, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [userId, user.email, passwordHash, user.name, user.role, user.org, user.department]
      );
      console.log(`   ✅ ${user.name} (${user.role}) - ${user.email}`);
    }

    // Create project
    console.log('\n📁 Creating sugar factory project...');
    const projectId = generateId();
    const adminId = userIds['admin@thaisugar.demo.com'];

    await db.query(
      `INSERT INTO projects (
        id, name, description, organization, industry, country, region,
        baseline_year, reporting_year, status, standards, settings, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        projectId,
        sugarFactoryProject.name,
        sugarFactoryProject.description,
        sugarFactoryProject.organization,
        sugarFactoryProject.industry,
        sugarFactoryProject.country,
        sugarFactoryProject.region,
        sugarFactoryProject.baselineYear,
        sugarFactoryProject.reportingYear,
        sugarFactoryProject.status,
        sugarFactoryProject.standards,
        JSON.stringify(sugarFactoryProject.settings),
        adminId,
      ]
    );
    console.log(`   ✅ Project created: ${sugarFactoryProject.name}`);

    // Add all users as project members
    console.log('\n👥 Adding project members...');
    for (const user of sugarFactoryUsers) {
      const memberRole = user.role === 'admin' ? 'owner' : user.role;
      await db.query(
        `INSERT INTO project_members (id, project_id, user_id, role, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [generateId(), projectId, userIds[user.email], memberRole]
      );
    }
    console.log(`   ✅ Added ${sugarFactoryUsers.length} team members`);

    // Create activities
    console.log('\n📊 Creating emission activities...');
    let scope1Count = 0, scope2Count = 0, scope3Count = 0;

    for (const activity of sugarFactoryActivities) {
      await db.query(
        `INSERT INTO activities (
          id, project_id, name, description, scope, scope3_category,
          activity_type, activity_data, activity_unit, facility,
          data_quality_score, year, metadata, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          generateId(),
          projectId,
          activity.name,
          activity.description,
          activity.scope,
          activity.scope3Category || null,
          activity.activityType,
          activity.quantity,
          activity.unit,
          activity.facility,
          activity.dataQualityScore,
          2025,
          activity.metadata ? JSON.stringify(activity.metadata) : null,
          adminId,
        ]
      );

      if (activity.scope === 'scope1') scope1Count++;
      else if (activity.scope === 'scope2') scope2Count++;
      else scope3Count++;
    }

    console.log(`   ✅ Scope 1 activities: ${scope1Count}`);
    console.log(`   ✅ Scope 2 activities: ${scope2Count}`);
    console.log(`   ✅ Scope 3 activities: ${scope3Count}`);
    console.log(`   📈 Total activities: ${sugarFactoryActivities.length}`);

    // Update grid emission factors
    console.log('\n⚡ Updating Thailand grid emission factors...');
    for (const gef of thaiGridFactors) {
      await db.query(
        `INSERT INTO grid_emission_factors (id, country, region, grid_name, year, location_based_ef, source, effective_date, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (country, region, year) DO UPDATE SET location_based_ef = $6, source = $7`,
        [generateId(), gef.country, gef.region, gef.region, gef.year, gef.factor, gef.source, `${gef.year}-01-01`]
      );
    }
    console.log(`   ✅ Updated ${thaiGridFactors.length} grid emission factors`);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 SUGAR FACTORY DEMO DATA SEEDING COMPLETE!');
    console.log('='.repeat(70));
    
    console.log('\n📋 Demo Accounts (Password: Demo@123):');
    sugarFactoryUsers.forEach((u) => {
      console.log(`   • ${u.email.padEnd(30)} - ${u.title}`);
    });

    console.log('\n📊 Expected Emission Totals (approximate):');
    console.log('   • Scope 1: ~450 tonnes CO2e (diesel, gas, refrigerants, N2O)');
    console.log('   • Scope 2: ~1,140 tonnes CO2e (grid electricity @ 0.4999 kg/kWh)');
    console.log('   • Scope 3: ~180 tonnes CO2e (upstream, waste, travel, transport)');
    console.log('   • Total: ~1,770 tonnes CO2e');
    console.log(`   • CFP: ~35 kg CO2e per tonne of sugar`);

    console.log('\n🏷️ Product Information:');
    console.log(`   • Product: White refined sugar`);
    console.log(`   • Packaging: 500g retail bags`);
    console.log(`   • Annual production: 50 tonnes (100,000 bags)`);
    console.log(`   • Export destination: China (Shanghai)`);

    console.log('\n📑 Applicable Standards:');
    console.log('   • Thai-ESG (SET requirements)');
    console.log('   • China Carbon Market (for export reporting)');
    console.log('   • EU CBAM (future-proofing for EU exports)');

    console.log('\n🚀 Ready to test! Login and explore the sugar factory project.\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run seed
seedSugarFactory();
