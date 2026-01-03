import { Router, Request, Response } from 'express';

const router = Router();

// =============================================================================
// API HELP ENDPOINT - Documentation & Demo Instructions
// =============================================================================

interface EndpointDoc {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  demo?: string;
  body?: object;
  query?: object;
}

const apiDocumentation = {
  name: 'ESG Reporting API',
  version: '1.0.0',
  baseUrl: '/api/v1',
  description: 'GHG Protocol compliant carbon accounting and ESG reporting platform',
  
  supportedStandards: [
    { code: 'eu_cbam', name: 'EU Carbon Border Adjustment Mechanism', region: 'European Union' },
    { code: 'uk_cbam', name: 'UK Carbon Border Adjustment Mechanism', region: 'United Kingdom' },
    { code: 'china_carbon_market', name: 'China National Carbon Market', region: 'China' },
    { code: 'k_esg', name: 'K-ESG Guidelines', region: 'South Korea' },
    { code: 'maff_esg', name: 'MAFF Green Food System', region: 'Japan' },
    { code: 'thai_esg', name: 'Thai-ESG Standard', region: 'Thailand' },
  ],

  demoAccounts: [
    { email: 'admin@esgdemo.com', password: 'Demo@123', role: 'Admin - Full access' },
    { email: 'manager@esgdemo.com', password: 'Demo@123', role: 'Editor - Manage projects' },
    { email: 'viewer@esgdemo.com', password: 'Demo@123', role: 'Viewer - Read only' },
    { email: 'auditor@esgdemo.com', password: 'Demo@123', role: 'Auditor - Review access' },
  ],

  quickStart: {
    step1: 'POST /api/v1/auth/login with demo credentials',
    step2: 'GET /api/v1/projects to list demo projects',
    step3: 'GET /api/v1/projects/:id/activities to view emissions data',
    step4: 'POST /api/v1/calculate/project/:id to calculate emissions',
    step5: 'POST /api/v1/reports/generate to create compliance report',
  },

  endpoints: {
    auth: [
      { method: 'POST', path: '/auth/register', description: 'Create new account', auth: false, body: { email: 'user@company.com', password: 'securePass123', name: 'John Doe', company: 'Acme Corp' } },
      { method: 'POST', path: '/auth/login', description: 'Login and get JWT token', auth: false, demo: 'Use admin@esgdemo.com / Demo@123', body: { email: 'admin@esgdemo.com', password: 'Demo@123' } },
      { method: 'POST', path: '/auth/logout', description: 'Invalidate current session', auth: true },
      { method: 'GET', path: '/auth/me', description: 'Get current user profile', auth: true },
    ],
    projects: [
      { method: 'GET', path: '/projects', description: 'List all accessible projects', auth: true, query: { page: 1, limit: 10, status: 'active' } },
      { method: 'POST', path: '/projects', description: 'Create new project', auth: true, body: { name: 'My Project', company: 'My Company', reportingStandards: ['eu_cbam'], baselineYear: 2023, reportingYear: 2025 } },
      { method: 'GET', path: '/projects/:id', description: 'Get project details', auth: true },
      { method: 'PUT', path: '/projects/:id', description: 'Update project', auth: true },
      { method: 'DELETE', path: '/projects/:id', description: 'Archive project', auth: true },
      { method: 'GET', path: '/projects/:id/summary', description: 'Get project dashboard summary', auth: true },
      { method: 'POST', path: '/projects/:id/clone', description: 'Clone project for new period', auth: true },
    ],
    activities: [
      { method: 'GET', path: '/projects/:projectId/activities', description: 'List project activities', auth: true, query: { scope: 'scope1', page: 1, limit: 50 } },
      { method: 'POST', path: '/projects/:projectId/activities', description: 'Create activity', auth: true, body: { name: 'Electricity Usage', scope: 'scope2', activityType: 'purchased_electricity', quantity: 10000, unit: 'kWh' } },
      { method: 'POST', path: '/projects/:projectId/activities/bulk', description: 'Bulk create activities', auth: true },
      { method: 'GET', path: '/projects/:projectId/activities/:id', description: 'Get activity details', auth: true },
      { method: 'PUT', path: '/projects/:projectId/activities/:id', description: 'Update activity', auth: true },
      { method: 'DELETE', path: '/projects/:projectId/activities/:id', description: 'Delete activity', auth: true },
      { method: 'GET', path: '/projects/:projectId/activities/summary', description: 'Get activity summary by scope', auth: true },
    ],
    calculations: [
      { method: 'POST', path: '/calculate/activity/:id', description: 'Calculate single activity emissions', auth: true },
      { method: 'POST', path: '/calculate/project/:id', description: 'Calculate all pending activities', auth: true, demo: 'Calculates emissions for all activities in project' },
      { method: 'POST', path: '/calculate/cfp/:projectId', description: 'Calculate Carbon Footprint of Product', auth: true },
      { method: 'POST', path: '/calculate/cfo/:projectId', description: 'Calculate Carbon Footprint of Organization', auth: true },
      { method: 'GET', path: '/calculate/factors', description: 'Get available emission factors', auth: true },
    ],
    reports: [
      { method: 'GET', path: '/reports', description: 'List generated reports', auth: true },
      { method: 'POST', path: '/reports/generate', description: 'Generate compliance report', auth: true, body: { projectId: 'uuid', standard: 'eu_cbam', format: 'pdf' } },
      { method: 'POST', path: '/reports/batch', description: 'Generate multiple reports', auth: true },
      { method: 'GET', path: '/reports/:id', description: 'Get report details', auth: true },
      { method: 'GET', path: '/reports/:id/download', description: 'Download report file', auth: true },
    ],
    emissionFactors: [
      { method: 'GET', path: '/emission-factors', description: 'List emission factors', auth: true, query: { category: 'electricity', region: 'thailand' } },
      { method: 'GET', path: '/emission-factors/grid', description: 'Get grid emission factors', auth: true },
      { method: 'GET', path: '/emission-factors/search', description: 'Search emission factors', auth: true, query: { activityType: 'electricity', region: 'thailand' } },
      { method: 'POST', path: '/emission-factors', description: 'Create custom emission factor', auth: true },
    ],
    signatures: [
      { method: 'POST', path: '/signatures', description: 'Sign a report', auth: true, body: { reportId: 'uuid', type: 'approval', signature: 'base64' } },
      { method: 'GET', path: '/signatures/report/:reportId', description: 'Get report signatures', auth: true },
      { method: 'POST', path: '/signatures/verify', description: 'Verify signature', auth: true },
    ],
    audit: [
      { method: 'GET', path: '/audit-logs', description: 'List audit logs', auth: true, query: { projectId: 'uuid', action: 'CREATE' } },
      { method: 'GET', path: '/audit-logs/:id', description: 'Get audit log details', auth: true },
    ],
  },

  emissionScopes: {
    scope1: {
      name: 'Direct Emissions',
      description: 'Emissions from owned or controlled sources',
      categories: ['Stationary Combustion', 'Mobile Combustion', 'Process Emissions', 'Fugitive Emissions'],
    },
    scope2: {
      name: 'Indirect Energy Emissions',
      description: 'Emissions from purchased electricity, steam, heating, and cooling',
      categories: ['Purchased Electricity', 'Purchased Heat/Steam', 'Purchased Cooling'],
    },
    scope3: {
      name: 'Value Chain Emissions',
      description: 'All other indirect emissions in the value chain',
      categories: [
        '1. Purchased Goods & Services',
        '2. Capital Goods',
        '3. Fuel & Energy Activities',
        '4. Upstream Transportation',
        '5. Waste Generated',
        '6. Business Travel',
        '7. Employee Commuting',
        '8. Upstream Leased Assets',
        '9. Downstream Transportation',
        '10. Processing of Sold Products',
        '11. Use of Sold Products',
        '12. End-of-Life Treatment',
        '13. Downstream Leased Assets',
        '14. Franchises',
        '15. Investments',
      ],
    },
  },

  activityTypes: {
    scope1: ['stationary_combustion', 'mobile_combustion', 'process_emissions', 'fugitive_emissions'],
    scope2: ['purchased_electricity', 'purchased_heat_steam', 'purchased_cooling'],
    scope3: ['purchased_goods', 'capital_goods', 'fuel_energy', 'upstream_transport', 'waste', 'business_travel', 'employee_commuting', 'downstream_transport', 'processing', 'use_of_products', 'end_of_life'],
  },

  commonUnits: {
    energy: ['kWh', 'MWh', 'GJ', 'BTU'],
    fuel: ['liters', 'gallons', 'm3', 'kg', 'tonnes'],
    distance: ['km', 'miles'],
    mass: ['kg', 'tonnes', 'lbs'],
    currency: ['USD', 'EUR', 'THB', 'CNY', 'JPY', 'KRW'],
  },
};

// Main help endpoint
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to ESG Reporting API. Use /api/help for full documentation.',
    quickLinks: {
      help: '/api/help',
      demo: '/api/help/demo',
      health: '/health',
      api: '/api/v1',
    },
  });
});

// Full documentation
router.get('/help', (req: Request, res: Response) => {
  res.json({ success: true, data: apiDocumentation });
});

// Demo quick start guide
router.get('/help/demo', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      title: 'ESG Reporting API - Demo Quick Start',
      accounts: apiDocumentation.demoAccounts,
      steps: [
        {
          step: 1,
          title: 'Login',
          method: 'POST',
          url: '/api/v1/auth/login',
          body: { email: 'admin@esgdemo.com', password: 'Demo@123' },
          note: 'Save the token from response for subsequent requests',
        },
        {
          step: 2,
          title: 'List Projects',
          method: 'GET',
          url: '/api/v1/projects',
          headers: { Authorization: 'Bearer <your-token>' },
          note: 'View demo projects with pre-loaded activities',
        },
        {
          step: 3,
          title: 'View Activities',
          method: 'GET',
          url: '/api/v1/projects/:projectId/activities',
          note: 'Replace :projectId with actual ID from step 2',
        },
        {
          step: 4,
          title: 'Calculate Emissions',
          method: 'POST',
          url: '/api/v1/calculate/project/:projectId',
          note: 'Calculates emissions for all activities using emission factors',
        },
        {
          step: 5,
          title: 'Generate Report',
          method: 'POST',
          url: '/api/v1/reports/generate',
          body: { projectId: '<uuid>', standard: 'eu_cbam', format: 'pdf' },
          note: 'Creates compliance report for selected standard',
        },
      ],
      curlExamples: {
        login: `curl -X POST http://localhost:2047/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@esgdemo.com","password":"Demo@123"}'`,
        listProjects: `curl http://localhost:2047/api/v1/projects -H "Authorization: Bearer <token>"`,
        createActivity: `curl -X POST http://localhost:2047/api/v1/projects/<id>/activities -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"name":"Electricity","scope":"scope2","activityType":"purchased_electricity","quantity":10000,"unit":"kWh"}'`,
      },
    },
  });
});

// Endpoint-specific help
router.get('/help/auth', (req: Request, res: Response) => {
  res.json({ success: true, data: { section: 'Authentication', endpoints: apiDocumentation.endpoints.auth, demo: apiDocumentation.demoAccounts } });
});

router.get('/help/projects', (req: Request, res: Response) => {
  res.json({ success: true, data: { section: 'Projects', endpoints: apiDocumentation.endpoints.projects } });
});

router.get('/help/activities', (req: Request, res: Response) => {
  res.json({ success: true, data: { section: 'Activities', endpoints: apiDocumentation.endpoints.activities, scopes: apiDocumentation.emissionScopes, activityTypes: apiDocumentation.activityTypes, units: apiDocumentation.commonUnits } });
});

router.get('/help/calculations', (req: Request, res: Response) => {
  res.json({ success: true, data: { section: 'Calculations', endpoints: apiDocumentation.endpoints.calculations } });
});

router.get('/help/reports', (req: Request, res: Response) => {
  res.json({ success: true, data: { section: 'Reports', endpoints: apiDocumentation.endpoints.reports, standards: apiDocumentation.supportedStandards } });
});

router.get('/help/emission-factors', (req: Request, res: Response) => {
  res.json({ success: true, data: { section: 'Emission Factors', endpoints: apiDocumentation.endpoints.emissionFactors } });
});

router.get('/help/standards', (req: Request, res: Response) => {
  res.json({ success: true, data: { section: 'Supported Standards', standards: apiDocumentation.supportedStandards } });
});

router.get('/help/scopes', (req: Request, res: Response) => {
  res.json({ success: true, data: { section: 'GHG Protocol Scopes', scopes: apiDocumentation.emissionScopes } });
});

export default router;
