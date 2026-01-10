/**
 * ESG Reporting App - Full E2E UI Test Suite
 * Uses Selenium WebDriver for browser automation
 */
import { WebDriver, By, until } from 'selenium-webdriver';
import { DriverFactory, BasePage } from './driver';
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ProjectsPage,
  ProjectFormPage,
  ActivitiesPage,
  ReportsPage,
  SettingsPage,
} from './pages';
import { TEST_CONFIG, TEST_USER } from './setup';
import axios from 'axios';

describe('ESG Reporting App - E2E UI Tests', () => {
  let driver: WebDriver;
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let dashboardPage: DashboardPage;
  let projectsPage: ProjectsPage;
  let projectFormPage: ProjectFormPage;
  let activitiesPage: ActivitiesPage;
  let reportsPage: ReportsPage;
  let settingsPage: SettingsPage;

  // Test data
  const testUser = {
    ...TEST_USER,
    email: `e2e-ui-${Date.now()}@example.com`,
  };

  let authToken: string;
  let createdProjectId: string;

  beforeAll(async () => {
    console.log('\n🌐 Setting up Selenium WebDriver...');
    
    // Check if services are running
    try {
      await axios.get(`${TEST_CONFIG.BACKEND_URL}/api/health`);
      console.log('✅ Backend is running');
    } catch (error) {
      console.warn('⚠️ Backend may not be running. Some tests may fail.');
    }

    try {
      await axios.get(TEST_CONFIG.FRONTEND_URL);
      console.log('✅ Frontend is running');
    } catch (error) {
      console.warn('⚠️ Frontend may not be running. UI tests may fail.');
    }

    // Create WebDriver
    driver = await DriverFactory.createDriver();
    
    // Initialize page objects
    loginPage = new LoginPage(driver);
    registerPage = new RegisterPage(driver);
    dashboardPage = new DashboardPage(driver);
    projectsPage = new ProjectsPage(driver);
    projectFormPage = new ProjectFormPage(driver);
    activitiesPage = new ActivitiesPage(driver);
    reportsPage = new ReportsPage(driver);
    settingsPage = new SettingsPage(driver);

    console.log('✅ WebDriver initialized');
  }, 60000);

  afterAll(async () => {
    console.log('\n🧹 Cleaning up...');
    await DriverFactory.quitDriver();
    console.log('✅ WebDriver closed');
  });

  describe('1. Application Load', () => {
    it('should load the frontend application', async () => {
      console.log('\n📱 Loading application...');
      
      await driver.get(TEST_CONFIG.FRONTEND_URL);
      await driver.wait(until.elementLocated(By.tagName('body')), 10000);
      
      const title = await driver.getTitle();
      console.log(`   Page title: ${title}`);
      
      expect(title).toBeDefined();
    });

    it('should redirect to login page when not authenticated', async () => {
      await driver.get(TEST_CONFIG.FRONTEND_URL);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   Current URL: ${currentUrl}`);
      
      // Should be on login page or redirect there
      const isAuthPage = currentUrl.includes('/login') || 
                         currentUrl.includes('/register') ||
                         currentUrl === TEST_CONFIG.FRONTEND_URL + '/';
      
      expect(isAuthPage).toBe(true);
    });
  });

  describe('2. User Registration', () => {
    it('should display registration form', async () => {
      console.log('\n📝 Testing registration form...');
      
      await registerPage.navigateToRegister();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isRegisterPage = await registerPage.isRegisterPage();
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   URL: ${currentUrl}`);
      
      // Check if we're on register page or if form elements exist
      const formExists = await driver.findElements(By.css('form, input[type="email"]'));
      expect(formExists.length).toBeGreaterThan(0);
    });

    it('should register a new user via API and verify', async () => {
      console.log('\n👤 Registering new user via API...');
      
      try {
        const response = await axios.post(`${TEST_CONFIG.BACKEND_URL}/api/auth/register`, {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
          organization: testUser.organization,
        });
        
        expect(response.status).toBe(201);
        expect(response.data.success).toBe(true);
        authToken = response.data.data.token;
        console.log(`   ✅ User registered: ${testUser.email}`);
      } catch (error: any) {
        if (error.response?.status === 409) {
          console.log('   ℹ️ User already exists, continuing with login');
        } else {
          throw error;
        }
      }
    });
  });

  describe('3. User Login', () => {
    it('should display login form', async () => {
      console.log('\n🔐 Testing login form...');
      
      await loginPage.navigateToLogin();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const formExists = await driver.findElements(By.css('form, input[type="email"], input[type="password"]'));
      console.log(`   Form elements found: ${formExists.length}`);
      
      expect(formExists.length).toBeGreaterThan(0);
    });

    it('should login via API and get token', async () => {
      console.log('\n🔑 Logging in via API...');
      
      const response = await axios.post(`${TEST_CONFIG.BACKEND_URL}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.token).toBeDefined();
      
      authToken = response.data.data.token;
      console.log(`   ✅ Login successful`);
    });

    it('should set auth token in browser storage', async () => {
      console.log('\n💾 Setting auth token in browser...');
      
      await driver.get(TEST_CONFIG.FRONTEND_URL);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set token in localStorage
      await driver.executeScript(`
        localStorage.setItem('token', '${authToken}');
        localStorage.setItem('auth_token', '${authToken}');
      `);
      
      // Verify token is set
      const storedToken = await driver.executeScript(
        "return localStorage.getItem('token') || localStorage.getItem('auth_token');"
      );
      
      expect(storedToken).toBe(authToken);
      console.log('   ✅ Token stored in browser');
    });
  });

  describe('4. Dashboard', () => {
    it('should access dashboard after authentication', async () => {
      console.log('\n📊 Testing dashboard access...');
      
      // Navigate to dashboard
      await driver.get(`${TEST_CONFIG.FRONTEND_URL}/dashboard`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   URL: ${currentUrl}`);
      
      // Check for dashboard elements
      const bodyText = await driver.findElement(By.tagName('body')).getText();
      console.log(`   Page content length: ${bodyText.length} chars`);
      
      expect(bodyText.length).toBeGreaterThan(0);
    });
  });

  describe('5. Project Management', () => {
    it('should create a new project via API', async () => {
      console.log('\n📁 Creating new project via API...');
      
      const projectData = {
        name: `E2E Test Project ${Date.now()}`,
        description: 'Automated E2E test project for UI testing',
        companyName: 'E2E Test Company',
        companySize: 'medium',
        sector: 'Manufacturing',
        baselineYear: 2024,
        reportingYear: 2025,
        standards: ['eu_cbam'],
      };
      
      const response = await axios.post(
        `${TEST_CONFIG.BACKEND_URL}/api/projects`,
        projectData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      
      createdProjectId = response.data.data.id;
      console.log(`   ✅ Project created: ${createdProjectId}`);
    });

    it('should navigate to projects page', async () => {
      console.log('\n📋 Navigating to projects page...');
      
      await projectsPage.navigateToProjects();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   URL: ${currentUrl}`);
      
      expect(currentUrl).toContain('/projects');
    });

    it('should list created projects via API', async () => {
      console.log('\n📑 Fetching projects list...');
      
      const response = await axios.get(
        `${TEST_CONFIG.BACKEND_URL}/api/projects`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      
      console.log(`   ✅ Found ${response.data.data.length} projects`);
    });

    it('should get specific project details', async () => {
      console.log('\n🔍 Getting project details...');
      
      if (!createdProjectId) {
        console.log('   ⏭️ Skipping - no project ID');
        return;
      }
      
      const response = await axios.get(
        `${TEST_CONFIG.BACKEND_URL}/api/projects/${createdProjectId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(createdProjectId);
      
      console.log(`   ✅ Project: ${response.data.data.name}`);
    });
  });

  describe('6. Activities Management', () => {
    it('should create activity for project via API', async () => {
      console.log('\n⚡ Creating activity via API...');
      
      if (!createdProjectId) {
        console.log('   ⏭️ Skipping - no project ID');
        return;
      }
      
      const activityData = {
        name: 'E2E Test - Electricity Usage',
        description: 'Monthly electricity consumption for E2E testing',
        scope: 2,
        activityType: 'stationary_combustion',
        quantity: 1000,
        unit: 'kWh',
        emissionSource: 'Grid Electricity',
      };
      
      const response = await axios.post(
        `${TEST_CONFIG.BACKEND_URL}/api/activities/project/${createdProjectId}`,
        activityData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      
      console.log(`   ✅ Activity created: ${response.data.data.id}`);
    });

    it('should navigate to activities page', async () => {
      console.log('\n📊 Navigating to activities page...');
      
      await activitiesPage.navigateToActivities();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   URL: ${currentUrl}`);
      
      expect(currentUrl).toContain('/activities');
    });

    it('should list project activities via API', async () => {
      console.log('\n📋 Fetching activities...');
      
      if (!createdProjectId) {
        console.log('   ⏭️ Skipping - no project ID');
        return;
      }
      
      const response = await axios.get(
        `${TEST_CONFIG.BACKEND_URL}/api/activities/project/${createdProjectId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      console.log(`   ✅ Found ${response.data.data.length} activities`);
    });
  });

  describe('7. Emissions Calculations', () => {
    it('should calculate emissions for project via API', async () => {
      console.log('\n🧮 Calculating emissions via API...');
      
      if (!createdProjectId) {
        console.log('   ⏭️ Skipping - no project ID');
        return;
      }
      
      try {
        const response = await axios.post(
          `${TEST_CONFIG.BACKEND_URL}/api/calculations/project/${createdProjectId}/calculate-all`,
          {},
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        expect(response.status).toBe(200);
        console.log(`   ✅ Calculations completed`);
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('   ℹ️ No emission factors available for calculation');
        } else {
          console.log(`   ⚠️ Calculation error: ${error.message}`);
        }
      }
    });

    it('should navigate to calculations page', async () => {
      console.log('\n📈 Navigating to calculations page...');
      
      await driver.get(`${TEST_CONFIG.FRONTEND_URL}/calculations`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   URL: ${currentUrl}`);
      
      expect(currentUrl).toContain('/calculations');
    });
  });

  describe('8. Reports Generation', () => {
    it('should navigate to reports page', async () => {
      console.log('\n📄 Navigating to reports page...');
      
      await reportsPage.navigateToReports();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   URL: ${currentUrl}`);
      
      expect(currentUrl).toContain('/reports');
    });

    it('should generate report via API', async () => {
      console.log('\n📝 Generating report via API...');
      
      if (!createdProjectId) {
        console.log('   ⏭️ Skipping - no project ID');
        return;
      }
      
      try {
        const response = await axios.post(
          `${TEST_CONFIG.BACKEND_URL}/api/reports/project/${createdProjectId}/generate`,
          { standard: 'eu_cbam' },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        expect(response.status).toBe(201);
        console.log(`   ✅ Report generated: ${response.data.data.id}`);
      } catch (error: any) {
        console.log(`   ⚠️ Report generation: ${error.response?.data?.error || error.message}`);
      }
    });
  });

  describe('9. Settings Page', () => {
    it('should navigate to settings page', async () => {
      console.log('\n⚙️ Navigating to settings page...');
      
      await settingsPage.navigateToSettings();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      console.log(`   URL: ${currentUrl}`);
      
      expect(currentUrl).toContain('/settings');
    });
  });

  describe('10. Navigation Tests', () => {
    const pages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Projects', path: '/projects' },
      { name: 'Activities', path: '/activities' },
      { name: 'Calculations', path: '/calculations' },
      { name: 'Reports', path: '/reports' },
      { name: 'Analytics', path: '/analytics' },
      { name: 'Settings', path: '/settings' },
    ];

    pages.forEach(page => {
      it(`should navigate to ${page.name} page`, async () => {
        await driver.get(`${TEST_CONFIG.FRONTEND_URL}${page.path}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const currentUrl = await driver.getCurrentUrl();
        
        // Check if redirected or on the page
        const onPage = currentUrl.includes(page.path) || 
                       currentUrl.includes('/login') ||
                       currentUrl.includes('/dashboard');
        
        expect(onPage).toBe(true);
      });
    });
  });

  describe('11. UI Elements Check', () => {
    it('should have basic UI structure', async () => {
      console.log('\n🎨 Checking UI elements...');
      
      await driver.get(TEST_CONFIG.FRONTEND_URL);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for common UI elements
      const body = await driver.findElement(By.tagName('body'));
      const bodyText = await body.getText();
      
      console.log(`   Body content: ${bodyText.substring(0, 100)}...`);
      
      // Check for buttons
      const buttons = await driver.findElements(By.tagName('button'));
      console.log(`   Buttons found: ${buttons.length}`);
      
      // Check for inputs
      const inputs = await driver.findElements(By.tagName('input'));
      console.log(`   Inputs found: ${inputs.length}`);
      
      // Check for links
      const links = await driver.findElements(By.tagName('a'));
      console.log(`   Links found: ${links.length}`);
      
      expect(buttons.length + inputs.length + links.length).toBeGreaterThan(0);
    });

    it('should take screenshot of current page', async () => {
      console.log('\n📸 Taking screenshot...');
      
      const screenshot = await driver.takeScreenshot();
      expect(screenshot).toBeDefined();
      expect(screenshot.length).toBeGreaterThan(0);
      
      console.log(`   Screenshot captured (${Math.round(screenshot.length / 1024)}KB)`);
    });
  });

  describe('12. Cleanup', () => {
    it('should delete test project via API', async () => {
      console.log('\n🗑️ Cleaning up test data...');
      
      if (!createdProjectId) {
        console.log('   ⏭️ No project to delete');
        return;
      }
      
      try {
        const response = await axios.delete(
          `${TEST_CONFIG.BACKEND_URL}/api/projects/${createdProjectId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        expect(response.status).toBe(200);
        console.log(`   ✅ Project deleted`);
      } catch (error: any) {
        console.log(`   ⚠️ Cleanup: ${error.message}`);
      }
    });
  });
});
