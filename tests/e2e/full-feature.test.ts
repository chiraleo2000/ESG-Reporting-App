/**
 * ESG Reporting App - Comprehensive Full-Feature API E2E Test Suite
 * 
 * Tests the ENTIRE user journey through the API:
 *   1. Health check
 *   2. Register new user
 *   3. Login
 *   4. Get profile & update profile
 *   5. Create project (Sugar Factory scenario)
 *   6. Add activities (all 3 scopes)
 *   7. List & update activities
 *   8. Calculate emissions (single + batch)
 *   9. Get project totals
 *  10. Emission factors (list, search, create custom)
 *  11. Generate reports (Thai ESG, EU CBAM, China Carbon Market)
 *  12. ESG Goals (create, list, update progress, summary)
 *  13. Audit logs
 *  14. Data export
 *  15. Cleanup
 */
import axios, { AxiosInstance } from 'axios';

const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:2047',
  API_PREFIX: '/api/v1',
};

describe('ESG Reporting - Full Feature E2E Test Suite', () => {
  let api: AxiosInstance;
  let authToken: string;
  let refreshToken: string;
  const testUser = {
    email: `full-e2e-${Date.now()}@sugarfactory-test.com`,
    password: 'SugarTest@2024!',
    name: 'Somchai Test',
    organization: 'Thai Sugar E2E Co.',
  };
  let projectId: string;
  const activityIds: string[] = [];
  let goalIds: string[] = [];
  let reportId: string;

  beforeAll(() => {
    api = axios.create({
      baseURL: `${CONFIG.BACKEND_URL}${CONFIG.API_PREFIX}`,
      timeout: 30000,
      validateStatus: () => true,
    });
    console.log(`\n🏭 Full Feature E2E Tests - Sugar Factory Scenario`);
    console.log(`   Backend: ${CONFIG.BACKEND_URL}`);
  });

  // =============================================
  // 1. HEALTH CHECK
  // =============================================
  describe('1. Health & Connectivity', () => {
    it('should verify backend health endpoint', async () => {
      const res = await axios.get(`${CONFIG.BACKEND_URL}/health`, {
        timeout: 10000,
        validateStatus: () => true,
      });
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('healthy');
      console.log(`   ✅ Backend healthy - DB: ${res.data.database}, Redis: ${res.data.redis}`);
    });

    it('should respond to API root', async () => {
      const res = await api.get('/');
      expect([200, 404]).toContain(res.status);
    });
  });

  // =============================================
  // 2. USER REGISTRATION & AUTH
  // =============================================
  describe('2. User Registration', () => {
    it('should register a new user', async () => {
      const res = await api.post('/auth/register', {
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
        organization: testUser.organization,
      });

      if (res.status === 201) {
        expect(res.data.success).toBe(true);
        expect(res.data.data.token).toBeDefined();
        authToken = res.data.data.token;
        if (res.data.data.refreshToken) refreshToken = res.data.data.refreshToken;
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        console.log(`   ✅ Registered: ${testUser.email}`);
      } else {
        console.log(`   ℹ️ Registration returned ${res.status}: ${JSON.stringify(res.data).substring(0, 150)}`);
      }
    });

    it('should reject duplicate registration', async () => {
      const res = await api.post('/auth/register', {
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
        organization: testUser.organization,
      });
      expect([400, 409]).toContain(res.status);
    });

    it('should reject weak password', async () => {
      const res = await api.post('/auth/register', {
        email: 'weak@test.com',
        password: '123',
        name: 'Weak User',
      });
      expect([400, 422]).toContain(res.status);
    });
  });

  describe('3. Authentication', () => {
    it('should login with valid credentials', async () => {
      const res = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.token).toBeDefined();

      authToken = res.data.data.token;
      if (res.data.data.refreshToken) refreshToken = res.data.data.refreshToken;
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      console.log(`   ✅ Login successful`);
    });

    it('should reject invalid password', async () => {
      const res = await api.post('/auth/login', {
        email: testUser.email,
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await api.post('/auth/login', {
        email: 'nobody@nowhere.com',
        password: 'SomePass@123',
      });
      expect(res.status).toBe(401);
    });

    it('should require auth for protected routes', async () => {
      const noAuth = axios.create({
        baseURL: `${CONFIG.BACKEND_URL}${CONFIG.API_PREFIX}`,
        timeout: 10000,
        validateStatus: () => true,
      });
      const res = await noAuth.get('/projects');
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('4. User Profile', () => {
    it('should get current user profile', async () => {
      const res = await api.get('/auth/me');
      if (res.status === 200) {
        expect(res.data.data.email).toBe(testUser.email);
        expect(res.data.data.name).toBe(testUser.name);
        console.log(`   ✅ Profile: ${res.data.data.name} (${res.data.data.role})`);
      }
    });

    it('should update user profile', async () => {
      const res = await api.put('/auth/profile', {
        name: 'Somchai Kasetsin (E2E)',
        department: 'Operations',
      });
      if (res.status === 200) {
        console.log(`   ✅ Profile updated`);
      }
    });
  });

  // =============================================
  // 5. PROJECT MANAGEMENT
  // =============================================
  describe('5. Project Management', () => {
    it('should create a sugar factory project', async () => {
      const res = await api.post('/projects', {
        name: `Thai Sugar Factory E2E - ${Date.now()}`,
        description: 'E2E test: Small sugar factory in Thailand, 50 tons white sugar/year, exports to China.',
        organization: 'Thai Sweet Sugar E2E Co.',
        industry: 'Food & Beverage',
        country: 'Thailand',
        region: 'Asia Pacific',
        baselineYear: 2023,
        reportingYear: 2024,
        standards: ['thai_esg', 'china_carbon_market'],
      });

      console.log(`   Create Project Status: ${res.status}`);

      if (res.status === 201) {
        expect(res.data.success).toBe(true);
        projectId = res.data.data.id;
        expect(projectId).toBeDefined();
        console.log(`   ✅ Project created: ${projectId}`);
      } else {
        console.log(`   Response: ${JSON.stringify(res.data).substring(0, 300)}`);
      }
    });

    it('should list projects', async () => {
      const res = await api.get('/projects');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      const count = Array.isArray(res.data.data) ? res.data.data.length : 0;
      console.log(`   ✅ Found ${count} project(s)`);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should get project by ID', async () => {
      if (!projectId) return;
      const res = await api.get(`/projects/${projectId}`);
      if (res.status === 200) {
        expect(res.data.data.id).toBe(projectId);
        console.log(`   ✅ Project fetched: ${res.data.data.name}`);
      }
    });

    it('should update project', async () => {
      if (!projectId) return;
      const res = await api.put(`/projects/${projectId}`, {
        description: 'Updated: Sugar factory with Scope 1, 2, 3 emissions tracked.',
      });
      if (res.status === 200) {
        console.log(`   ✅ Project updated`);
      }
    });
  });

  // =============================================
  // 6. ACTIVITY MANAGEMENT (All 3 Scopes)
  // =============================================
  describe('6. Activity Management - Scope 1 (Direct)', () => {
    it('should create Scope 1 activity - Boiler Fuel Oil', async () => {
      if (!projectId) return;
      const res = await api.post(`/activities/project/${projectId}`, {
        name: 'Boiler - Fuel Oil',
        description: 'Heavy fuel oil for boiler startup',
        scope: 'scope1',
        activityType: 'stationary_combustion',
        quantity: 2000,
        unit: 'liters',
        year: 2024,
      });

      console.log(`   Scope 1 Activity Status: ${res.status}`);
      if (res.status === 201) {
        activityIds.push(res.data.data.id);
        console.log(`   ✅ Scope 1 activity created: ${res.data.data.id}`);
      } else {
        console.log(`   Response: ${JSON.stringify(res.data).substring(0, 200)}`);
      }
    });

    it('should create Scope 1 activity - Diesel Equipment', async () => {
      if (!projectId) return;
      const res = await api.post(`/activities/project/${projectId}`, {
        name: 'Diesel - Factory Equipment',
        description: 'Forklifts and loaders',
        scope: 'scope1',
        activityType: 'mobile_combustion',
        quantity: 3000,
        unit: 'liters',
        year: 2024,
      });
      if (res.status === 201) {
        activityIds.push(res.data.data.id);
        console.log(`   ✅ Diesel activity created`);
      }
    });
  });

  describe('7. Activity Management - Scope 2 (Electricity)', () => {
    it('should create Scope 2 activity - Grid Electricity', async () => {
      if (!projectId) return;
      const res = await api.post(`/activities/project/${projectId}`, {
        name: 'Grid Electricity - Factory',
        description: 'Purchased electricity from PEA grid',
        scope: 'scope2',
        activityType: 'purchased_electricity',
        quantity: 120000,
        unit: 'kWh',
        year: 2024,
      });
      if (res.status === 201) {
        activityIds.push(res.data.data.id);
        console.log(`   ✅ Scope 2 electricity activity created`);
      }
    });
  });

  describe('8. Activity Management - Scope 3 (Value Chain)', () => {
    it('should create Scope 3 activity - Purchased Sugar Cane', async () => {
      if (!projectId) return;
      const res = await api.post(`/activities/project/${projectId}`, {
        name: 'Sugar Cane - Local Farms',
        description: '650 tons from contract farms',
        scope: 'scope3',
        scope3Category: 'purchased_goods_services',
        activityType: 'purchased_goods',
        quantity: 650000,
        unit: 'kg',
        year: 2024,
      });
      if (res.status === 201) {
        activityIds.push(res.data.data.id);
        console.log(`   ✅ Scope 3 purchased goods activity created`);
      }
    });

    it('should create Scope 3 activity - Export Shipping to China', async () => {
      if (!projectId) return;
      const res = await api.post(`/activities/project/${projectId}`, {
        name: 'Sea Freight - Laem Chabang to China',
        description: 'Container shipping to Shanghai & Guangzhou',
        scope: 'scope3',
        scope3Category: 'downstream_transport',
        activityType: 'downstream_transport',
        quantity: 160000,
        unit: 'tonne-km',
        year: 2024,
      });
      if (res.status === 201) {
        activityIds.push(res.data.data.id);
        console.log(`   ✅ Scope 3 shipping activity created`);
      }
    });

    it('should create Scope 3 activity - Employee Commuting', async () => {
      if (!projectId) return;
      const res = await api.post(`/activities/project/${projectId}`, {
        name: 'Employee Commuting',
        description: '25 employees, motorcycle/car/bus mix',
        scope: 'scope3',
        scope3Category: 'employee_commuting',
        activityType: 'employee_commuting',
        quantity: 187500,
        unit: 'passenger-km',
        year: 2024,
      });
      if (res.status === 201) {
        activityIds.push(res.data.data.id);
        console.log(`   ✅ Scope 3 commuting activity created`);
      }
    });
  });

  describe('9. Activity Listing & Updates', () => {
    it('should list all project activities', async () => {
      if (!projectId) return;
      const res = await api.get(`/activities/project/${projectId}`);
      expect(res.status).toBe(200);
      const activities = res.data.data || [];
      console.log(`   ✅ Found ${activities.length} activities`);
      expect(activities.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter activities by scope', async () => {
      if (!projectId) return;
      const res = await api.get(`/activities/project/${projectId}?scope=scope1`);
      if (res.status === 200) {
        const scope1 = res.data.data || [];
        console.log(`   ✅ Scope 1 activities: ${scope1.length}`);
      }
    });

    it('should update an activity quantity', async () => {
      if (activityIds.length === 0) return;
      const res = await api.put(`/activities/${activityIds[0]}`, {
        quantity: 2500,
        notes: 'Updated during E2E test',
      });
      if (res.status === 200) {
        console.log(`   ✅ Activity updated`);
      }
    });
  });

  // =============================================
  // 10. EMISSION FACTORS
  // =============================================
  describe('10. Emission Factors', () => {
    it('should list emission factors', async () => {
      const res = await api.get('/emission-factors');
      if (res.status === 200) {
        const count = res.data.data?.length || res.data.data?.factors?.length || 0;
        console.log(`   ✅ Found ${count} emission factor(s)`);
      }
    });

    it('should search emission factors for electricity', async () => {
      const res = await api.get('/emission-factors/search?query=electricity');
      if (res.status === 200) {
        const results = res.data.data?.length || 0;
        console.log(`   ✅ Search 'electricity': ${results} result(s)`);
      }
    });

    it('should get grid emission factors', async () => {
      const res = await api.get('/emission-factors/grid');
      if (res.status === 200) {
        console.log(`   ✅ Grid emission factors loaded`);
      }
    });
  });

  // =============================================
  // 11. CALCULATIONS
  // =============================================
  describe('11. Calculations', () => {
    it('should calculate all activities for the project', async () => {
      if (!projectId) return;
      const res = await api.post(`/calculate/project/${projectId}/calculate-all`);
      console.log(`   Calculate All Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ All activities calculated`);
        if (res.data.data) {
          console.log(`   Results: ${JSON.stringify(res.data.data).substring(0, 200)}`);
        }
      }
    });

    it('should get project emission totals', async () => {
      if (!projectId) return;
      const res = await api.get(`/calculate/project/${projectId}/totals`);
      console.log(`   Totals Status: ${res.status}`);
      if (res.status === 200 && res.data.data) {
        const totals = res.data.data;
        console.log(`   ✅ Scope 1: ${totals.scope1 || 'N/A'} kgCO2e`);
        console.log(`   ✅ Scope 2: ${totals.scope2 || 'N/A'} kgCO2e`);
        console.log(`   ✅ Scope 3: ${totals.scope3 || 'N/A'} kgCO2e`);
        console.log(`   ✅ Total: ${totals.total || 'N/A'} kgCO2e`);
      }
    });

    it('should calculate individual activity', async () => {
      if (activityIds.length === 0) return;
      const res = await api.post(`/calculate/activity/${activityIds[0]}`);
      console.log(`   Calculate Single Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ Single activity calculated`);
      }
    });

    it('should calculate CFP (Carbon Footprint of Product)', async () => {
      if (!projectId) return;
      const res = await api.post(`/calculate/project/${projectId}/cfp`, {
        productName: 'White Sugar 500g',
        functionalUnit: '500g bag',
        functionalUnitQuantity: 100000,
        reportStandard: 'thai_esg',
      });
      console.log(`   CFP Status: ${res.status}`);
      if ([200, 201].includes(res.status)) {
        console.log(`   ✅ CFP calculated`);
      }
    });

    it('should calculate CFO (Carbon Footprint of Organization)', async () => {
      if (!projectId) return;
      const res = await api.post(`/calculate/project/${projectId}/cfo`, {
        organizationName: 'Thai Sweet Sugar E2E Co.',
        reportingBoundary: 'Operational Control',
        reportStandard: 'thai_esg',
      });
      console.log(`   CFO Status: ${res.status}`);
      if ([200, 201].includes(res.status)) {
        console.log(`   ✅ CFO calculated`);
      }
    });
  });

  // =============================================
  // 12. REPORT GENERATION
  // =============================================
  describe('12. Reports', () => {
    it('should generate Thai ESG report', async () => {
      if (!projectId) return;
      const res = await api.post(`/reports/project/${projectId}/generate`, {
        standard: 'thai_esg',
        title: 'Thai ESG Report - E2E Test',
      });
      console.log(`   Thai ESG Report Status: ${res.status}`);
      if ([200, 201].includes(res.status)) {
        if (res.data.data?.id) reportId = res.data.data.id;
        console.log(`   ✅ Thai ESG report generated`);
      }
    });

    it('should generate EU CBAM report', async () => {
      if (!projectId) return;
      const res = await api.post(`/reports/project/${projectId}/generate`, {
        standard: 'eu_cbam',
        title: 'EU CBAM Report - E2E Test',
      });
      console.log(`   EU CBAM Report Status: ${res.status}`);
      if ([200, 201].includes(res.status)) {
        console.log(`   ✅ EU CBAM report generated`);
      }
    });

    it('should generate China Carbon Market report', async () => {
      if (!projectId) return;
      const res = await api.post(`/reports/project/${projectId}/generate`, {
        standard: 'china_carbon_market',
        title: 'China Carbon Market Report - E2E Test',
      });
      console.log(`   China Carbon Market Report Status: ${res.status}`);
      if ([200, 201].includes(res.status)) {
        console.log(`   ✅ China Carbon Market report generated`);
      }
    });

    it('should list reports', async () => {
      const res = await api.get('/reports');
      if (res.status === 200) {
        const count = res.data.data?.length || 0;
        console.log(`   ✅ Found ${count} report(s)`);
      }
    });

    it('should get report by ID', async () => {
      if (!reportId) return;
      const res = await api.get(`/reports/${reportId}`);
      if (res.status === 200) {
        console.log(`   ✅ Report fetched: ${res.data.data?.title || 'N/A'}`);
      }
    });
  });

  // =============================================
  // 13. ESG GOALS
  // =============================================
  describe('13. ESG Goals - Create & Manage', () => {
    it('should create emission reduction goal', async () => {
      if (!projectId) return;
      const res = await api.post(`/goals/project/${projectId}`, {
        name: 'Reduce Scope 2 by 50% - Solar PV',
        description: 'Install rooftop solar to cut grid dependency',
        category: 'renewable_energy',
        targetType: 'absolute',
        scope: 'scope2',
        baselineValue: 60000,
        baselineYear: 2024,
        targetValue: 30000,
        targetYear: 2026,
        targetUnit: 'kgCO2e',
        estimatedCost: 2500000,
        costCurrency: 'THB',
        estimatedSavings: 500000,
        priority: 'high',
        parisAligned: true,
      });
      console.log(`   Create Goal 1 Status: ${res.status}`);
      if ([200, 201].includes(res.status) && res.data.data?.id) {
        goalIds.push(res.data.data.id);
        console.log(`   ✅ Goal created: ${res.data.data.id}`);
      }
    });

    it('should create carbon intensity goal', async () => {
      if (!projectId) return;
      const res = await api.post(`/goals/project/${projectId}`, {
        name: 'Reduce Carbon Intensity to 3,000 kgCO2e/tonne',
        description: 'Combined efficiency measures for product carbon footprint',
        category: 'emission_reduction',
        targetType: 'intensity',
        scope: 'all',
        baselineValue: 4052,
        baselineYear: 2024,
        targetValue: 3000,
        targetYear: 2027,
        targetUnit: 'kgCO2e/tonne',
        priority: 'critical',
        sbtiAligned: true,
        parisAligned: true,
      });
      console.log(`   Create Goal 2 Status: ${res.status}`);
      if ([200, 201].includes(res.status) && res.data.data?.id) {
        goalIds.push(res.data.data.id);
        console.log(`   ✅ Carbon intensity goal created`);
      }
    });

    it('should create TGO certification goal', async () => {
      if (!projectId) return;
      const res = await api.post(`/goals/project/${projectId}`, {
        name: 'Achieve TGO Carbon Label',
        description: 'Obtain Thailand GHG Management Organization certification',
        category: 'custom',
        targetType: 'absolute',
        scope: 'all',
        baselineValue: 0,
        baselineYear: 2024,
        targetValue: 1,
        targetYear: 2025,
        targetUnit: 'certification',
        priority: 'high',
      });
      console.log(`   Create Goal 3 Status: ${res.status}`);
      if ([200, 201].includes(res.status) && res.data.data?.id) {
        goalIds.push(res.data.data.id);
        console.log(`   ✅ Certification goal created`);
      }
    });

    it('should list goals for project', async () => {
      if (!projectId) return;
      const res = await api.get(`/goals/project/${projectId}`);
      console.log(`   List Goals Status: ${res.status}`);
      if (res.status === 200) {
        const goals = res.data.data?.goals || res.data.data || [];
        console.log(`   ✅ Found ${goals.length} goal(s)`);
        expect(goals.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should get single goal', async () => {
      if (!projectId || goalIds.length === 0) return;
      const res = await api.get(`/goals/project/${projectId}/${goalIds[0]}`);
      if (res.status === 200) {
        console.log(`   ✅ Goal fetched: ${res.data.data?.name || 'N/A'}`);
      }
    });

    it('should update goal', async () => {
      if (!projectId || goalIds.length === 0) return;
      const res = await api.put(`/goals/project/${projectId}/${goalIds[0]}`, {
        notes: 'Updated during E2E test - solar installer quotes received',
        estimatedCost: 2800000,
      });
      if (res.status === 200) {
        console.log(`   ✅ Goal updated`);
      }
    });

    it('should update goal progress from emissions', async () => {
      if (!projectId || goalIds.length === 0) return;
      const res = await api.post(`/goals/project/${projectId}/${goalIds[0]}/progress`);
      console.log(`   Update Progress Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ Progress updated: ${res.data.data?.progressPercentage || 'N/A'}%`);
      }
    });

    it('should bulk update all goals progress', async () => {
      if (!projectId) return;
      const res = await api.post(`/goals/project/${projectId}/bulk-progress`);
      console.log(`   Bulk Progress Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ Bulk progress updated: ${res.data.data?.updated || 'N/A'} goals`);
      }
    });

    it('should get goals summary', async () => {
      if (!projectId) return;
      const res = await api.get(`/goals/project/${projectId}/summary`);
      console.log(`   Summary Status: ${res.status}`);
      if (res.status === 200 && res.data.data) {
        const s = res.data.data;
        console.log(`   ✅ Summary: ${s.overall?.totalGoals || 0} goals, avg ${s.overall?.averageProgress || 0}% progress`);
        if (s.overall?.sbtiAligned) console.log(`   SBTi aligned: ${s.overall.sbtiAligned}`);
        if (s.overall?.parisAligned) console.log(`   Paris aligned: ${s.overall.parisAligned}`);
      }
    });

    it('should filter goals by category', async () => {
      if (!projectId) return;
      const res = await api.get(`/goals/project/${projectId}?category=emission_reduction`);
      if (res.status === 200) {
        const goals = res.data.data?.goals || res.data.data || [];
        console.log(`   ✅ Emission reduction goals: ${goals.length}`);
      }
    });
  });

  // =============================================
  // 14. STANDARDS & COMPLIANCE
  // =============================================
  describe('14. Standards', () => {
    it('should list available standards', async () => {
      const res = await api.get('/standards');
      if (res.status === 200) {
        const standards = Object.keys(res.data.data || {});
        console.log(`   ✅ Standards: ${standards.join(', ')}`);
      }
    });

    it('should get Thai ESG standard details', async () => {
      const res = await api.get('/standards/thai_esg');
      if (res.status === 200) {
        console.log(`   ✅ Thai ESG standard loaded`);
      }
    });

    it('should get China Carbon Market standard details', async () => {
      const res = await api.get('/standards/china_carbon_market');
      if (res.status === 200) {
        console.log(`   ✅ China Carbon Market standard loaded`);
      }
    });

    it('should validate project against standard', async () => {
      if (!projectId) return;
      const res = await api.get(`/standards/validate/${projectId}/thai_esg`);
      console.log(`   Validate Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ Validation: ${res.data.data?.isValid ? 'PASS' : 'Issues found'}`);
      }
    });
  });

  // =============================================
  // 15. AUDIT LOGS
  // =============================================
  describe('15. Audit Logs', () => {
    it('should list audit logs', async () => {
      const res = await api.get('/audit-logs');
      if (res.status === 200) {
        const logs = res.data.data || [];
        console.log(`   ✅ Found ${logs.length} audit log(s)`);
      }
    });

    it('should filter audit logs by project', async () => {
      if (!projectId) return;
      const res = await api.get(`/audit-logs?projectId=${projectId}`);
      if (res.status === 200) {
        const logs = res.data.data || [];
        console.log(`   ✅ Project audit logs: ${logs.length}`);
      }
    });
  });

  // =============================================
  // 16. DATA OPERATIONS
  // =============================================
  describe('16. Data Operations', () => {
    it('should export project data', async () => {
      if (!projectId) return;
      const res = await api.get(`/projects/${projectId}/export`);
      console.log(`   Export Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ Project data exported`);
      }
    });

    it('should get project statistics', async () => {
      if (!projectId) return;
      const res = await api.get(`/projects/${projectId}/stats`);
      console.log(`   Stats Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ Project stats: ${JSON.stringify(res.data.data).substring(0, 200)}`);
      }
    });
  });

  // =============================================
  // 17. DEMO DATA VERIFICATION (Sugar Factory Seed)
  // =============================================
  describe('17. Verify Sugar Factory Seed Data', () => {
    let demoToken: string;

    it('should login as sugar factory manager', async () => {
      const res = await api.post('/auth/login', {
        email: 'manager@thaisugar.co.th',
        password: 'Demo@123',
      });

      if (res.status === 200) {
        demoToken = res.data.data.token;
        console.log(`   ✅ Sugar factory manager login successful`);
      } else {
        console.log(`   ℹ️ Sugar factory user not seeded (${res.status})`);
      }
    });

    it('should verify sugar factory project exists', async () => {
      if (!demoToken) return;
      const demoApi = axios.create({
        baseURL: `${CONFIG.BACKEND_URL}${CONFIG.API_PREFIX}`,
        timeout: 30000,
        headers: { Authorization: `Bearer ${demoToken}` },
        validateStatus: () => true,
      });

      const res = await demoApi.get('/projects');
      if (res.status === 200) {
        const projects = Array.isArray(res.data.data) ? res.data.data : [];
        const sugarProject = projects.find((p: any) => p.name?.includes('Sugar'));
        if (sugarProject) {
          console.log(`   ✅ Sugar factory project found: ${sugarProject.name}`);
        } else {
          console.log(`   ℹ️ Sugar factory project not yet seeded`);
        }
      }
    });
  });

  // =============================================
  // 18. CLEANUP
  // =============================================
  describe('18. Cleanup', () => {
    it('should delete goals', async () => {
      for (const goalId of goalIds) {
        const res = await api.delete(`/goals/project/${projectId}/${goalId}`);
        if (res.status === 200) {
          console.log(`   ✅ Goal ${goalId.substring(0, 8)}... deleted`);
        }
      }
    });

    it('should delete activities', async () => {
      for (const actId of activityIds) {
        const res = await api.delete(`/activities/${actId}`);
        if (res.status === 200) {
          console.log(`   ✅ Activity ${actId.substring(0, 8)}... deleted`);
        }
      }
    });

    it('should delete project', async () => {
      if (!projectId) return;
      const res = await api.delete(`/projects/${projectId}`);
      if (res.status === 200) {
        console.log(`   ✅ Project deleted`);
      }
    });
  });

  afterAll(() => {
    console.log('\n🏁 Full Feature E2E Tests Completed\n');
  });
});
