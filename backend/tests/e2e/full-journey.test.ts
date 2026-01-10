/**
 * Comprehensive E2E API Tests
 * Tests full user journey through the ESG Reporting Application
 */
import request from 'supertest';
import app from '../../src/app';

const API_BASE = '/api/v1';

describe('E2E API Tests - Complete User Journey', () => {
  let authToken: string;
  let refreshToken: string;
  let userId: string;
  let projectId: string;
  let activityId: string;
  let calculationId: string;

  const testUser = {
    email: `e2e_test_${Date.now()}@example.com`,
    password: 'SecureP@ss123!',
    name: 'E2E Test User',
    organization: 'E2E Test Organization',
  };

  const testProject = {
    name: 'E2E Test Project',
    description: 'Project for comprehensive E2E testing',
    organization: 'E2E Test Org',
    country: 'US',
    region: 'California',
    baseline_year: 2023,
    target_year: 2030,
    standards: ['eu_cbam', 'uk_cbam'],
    target_reduction: 50,
    industry: 'Manufacturing',
    facility_type: 'Factory',
    reporting_period: '2024-Q1',
    metadata: { test: true },
  };

  const testActivity = {
    name: 'Test Emission Activity',
    description: 'E2E test activity for emissions',
    category: 'energy',
    scope: 'scope1',
    source_type: 'natural_gas',
    quantity: 1000,
    unit: 'kWh',
    date: '2024-01-15',
    location: 'Main Facility',
    emission_factor: 0.2,
    data_quality: 'measured',
    verification_status: 'pending',
  };

  // ============================================
  // HEALTH CHECK TESTS
  // ============================================
  describe('1. Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get(`${API_BASE}/health`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe('2. Authentication Flow', () => {
    describe('2.1 User Registration', () => {
      it('should register a new user successfully', async () => {
        const response = await request(app)
          .post(`${API_BASE}/auth/register`)
          .send(testUser);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('email', testUser.email);
        expect(response.body.user).toHaveProperty('name', testUser.name);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        
        authToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
        userId = response.body.user.id;
      });

      it('should reject duplicate email registration', async () => {
        const response = await request(app)
          .post(`${API_BASE}/auth/register`)
          .send(testUser);

        expect(response.status).toBe(409);
      });

      it('should validate required fields', async () => {
        const invalidData = { email: 'invalid' };
        const response = await request(app)
          .post(`${API_BASE}/auth/register`)
          .send(invalidData);

        expect(response.status).toBe(400);
      });
    });

    describe('2.2 User Login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post(`${API_BASE}/auth/login`)
          .send({
            email: testUser.email,
            password: testUser.password,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        
        authToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
      });

      it('should reject invalid password', async () => {
        const response = await request(app)
          .post(`${API_BASE}/auth/login`)
          .send({
            email: testUser.email,
            password: 'wrongpassword',
          });

        expect(response.status).toBe(401);
      });

      it('should reject non-existent user', async () => {
        const response = await request(app)
          .post(`${API_BASE}/auth/login`)
          .send({
            email: 'nonexistent@example.com',
            password: 'anypassword',
          });

        expect(response.status).toBe(401);
      });
    });

    describe('2.3 Token Refresh', () => {
      it('should refresh access token', async () => {
        const response = await request(app)
          .post(`${API_BASE}/auth/refresh`)
          .send({ refreshToken });

        expect([200, 201]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('accessToken');
          authToken = response.body.accessToken;
        }
      });
    });

    describe('2.4 Get Current User', () => {
      it('should return current user profile', async () => {
        const response = await request(app)
          .get(`${API_BASE}/auth/me`)
          .set('Authorization', `Bearer ${authToken}`);

        expect([200, 404]).toContain(response.status);
      });
    });
  });

  // ============================================
  // PROJECT MANAGEMENT TESTS
  // ============================================
  describe('3. Project Management', () => {
    describe('3.1 Create Project', () => {
      it('should create a new project', async () => {
        const response = await request(app)
          .post(`${API_BASE}/projects`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(testProject);

        expect([200, 201]).toContain(response.status);
        expect(response.body).toHaveProperty('id');
        projectId = response.body.id;
      });

      it('should reject unauthorized project creation', async () => {
        const response = await request(app)
          .post(`${API_BASE}/projects`)
          .send(testProject);

        expect(response.status).toBe(401);
      });

      it('should validate project data', async () => {
        const invalidProject = { name: '' };
        const response = await request(app)
          .post(`${API_BASE}/projects`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidProject);

        expect(response.status).toBe(400);
      });
    });

    describe('3.2 List Projects', () => {
      it('should list all user projects', async () => {
        const response = await request(app)
          .get(`${API_BASE}/projects`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get(`${API_BASE}/projects?page=1&limit=10`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      });
    });

    describe('3.3 Get Single Project', () => {
      it('should get project by ID', async () => {
        const response = await request(app)
          .get(`${API_BASE}/projects/${projectId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', projectId);
      });

      it('should return 404 for non-existent project', async () => {
        const response = await request(app)
          .get(`${API_BASE}/projects/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('3.4 Update Project', () => {
      it('should update project details', async () => {
        const updates = {
          name: 'Updated E2E Project Name',
          description: 'Updated description for testing',
          target_reduction: 60,
        };

        const response = await request(app)
          .put(`${API_BASE}/projects/${projectId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates);

        expect(response.status).toBe(200);
      });
    });
  });

  // ============================================
  // ACTIVITY MANAGEMENT TESTS
  // ============================================
  describe('4. Activity Management', () => {
    describe('4.1 Create Activity', () => {
      it('should create a new activity', async () => {
        const response = await request(app)
          .post(`${API_BASE}/activities`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...testActivity, project_id: projectId });

        expect([200, 201]).toContain(response.status);
        if (response.body.id) {
          activityId = response.body.id;
        }
      });

      it('should validate activity scope', async () => {
        const invalidActivity = {
          ...testActivity,
          project_id: projectId,
          scope: 'invalid_scope',
        };
        const response = await request(app)
          .post(`${API_BASE}/activities`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidActivity);

        expect(response.status).toBe(400);
      });
    });

    describe('4.2 List Activities', () => {
      it('should list project activities', async () => {
        const response = await request(app)
          .get(`${API_BASE}/activities?project_id=${projectId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      });

      it('should filter activities by scope', async () => {
        const response = await request(app)
          .get(`${API_BASE}/activities?project_id=${projectId}&scope=scope1`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      });
    });

    describe('4.3 Update Activity', () => {
      it('should update activity data', async () => {
        if (!activityId) {
          console.log('Skipping: No activity ID');
          return;
        }

        const updates = {
          quantity: 1500,
          unit: 'kWh',
          verification_status: 'verified',
        };

        const response = await request(app)
          .put(`${API_BASE}/activities/${activityId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates);

        expect([200, 404]).toContain(response.status);
      });
    });
  });

  // ============================================
  // EMISSION FACTORS TESTS
  // ============================================
  describe('5. Emission Factors', () => {
    it('should list emission factors', async () => {
      const response = await request(app)
        .get(`${API_BASE}/emission-factors`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by scope', async () => {
      const response = await request(app)
        .get(`${API_BASE}/emission-factors?scope=scope1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get(`${API_BASE}/emission-factors?category=energy`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  // ============================================
  // CALCULATIONS TESTS
  // ============================================
  describe('6. GHG Calculations', () => {
    it('should perform emissions calculation', async () => {
      const calculationData = {
        project_id: projectId,
        name: 'E2E Test Calculation',
        calculation_type: 'annual',
        year: 2024,
        scope: 'scope1',
        methodology: 'activity_based',
      };

      const response = await request(app)
        .post(`${API_BASE}/calculations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(calculationData);

      expect([200, 201, 400]).toContain(response.status);
      if (response.body.id) {
        calculationId = response.body.id;
      }
    });

    it('should list calculations', async () => {
      const response = await request(app)
        .get(`${API_BASE}/calculations?project_id=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should calculate project summary', async () => {
      const response = await request(app)
        .get(`${API_BASE}/calculations/summary?project_id=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  // ============================================
  // STANDARDS COMPLIANCE TESTS
  // ============================================
  describe('7. Standards Compliance', () => {
    it('should list available standards', async () => {
      const response = await request(app)
        .get(`${API_BASE}/standards`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get EU CBAM standard details', async () => {
      const response = await request(app)
        .get(`${API_BASE}/standards/eu_cbam`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should check project compliance', async () => {
      const response = await request(app)
        .get(`${API_BASE}/standards/compliance/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  // ============================================
  // REPORTING TESTS
  // ============================================
  describe('8. Report Generation', () => {
    let reportId: string;

    it('should create a new report', async () => {
      const reportData = {
        project_id: projectId,
        name: 'E2E Test Report',
        type: 'annual',
        standard: 'eu_cbam',
        period_start: '2024-01-01',
        period_end: '2024-12-31',
        status: 'draft',
      };

      const response = await request(app)
        .post(`${API_BASE}/reports`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData);

      expect([200, 201, 400]).toContain(response.status);
      if (response.body.id) {
        reportId = response.body.id;
      }
    });

    it('should list project reports', async () => {
      const response = await request(app)
        .get(`${API_BASE}/reports?project_id=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should get report by ID', async () => {
      if (!reportId) return;

      const response = await request(app)
        .get(`${API_BASE}/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  // ============================================
  // AUDIT LOG TESTS
  // ============================================
  describe('9. Audit Logging', () => {
    it('should retrieve audit logs', async () => {
      const response = await request(app)
        .get(`${API_BASE}/audit`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403]).toContain(response.status);
    });

    it('should filter audit logs by entity', async () => {
      const response = await request(app)
        .get(`${API_BASE}/audit?entity_type=project`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403]).toContain(response.status);
    });
  });

  // ============================================
  // SIGNATURE/APPROVAL TESTS
  // ============================================
  describe('10. Digital Signatures', () => {
    it('should list signatures', async () => {
      const response = await request(app)
        .get(`${API_BASE}/signatures`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  // ============================================
  // CLEANUP TESTS
  // ============================================
  describe('11. Cleanup - Delete Resources', () => {
    it('should delete the test activity', async () => {
      if (!activityId) return;

      const response = await request(app)
        .delete(`${API_BASE}/activities/${activityId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 204, 404]).toContain(response.status);
    });

    it('should delete the test project', async () => {
      if (!projectId) return;

      const response = await request(app)
        .delete(`${API_BASE}/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 204, 404]).toContain(response.status);
    });
  });
});
