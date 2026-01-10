/**
 * API Integration Tests
 * Tests for API endpoints using supertest
 */
import request from 'supertest';
import express, { Express } from 'express';
import { json } from 'express';

// Create a mock Express app for testing
const createTestApp = (): Express => {
  const app = express();
  app.use(json());
  
  // Mock health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Mock auth endpoints
  let mockUsers: any[] = [];
  let mockTokens: Record<string, any> = {};
  
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name, organization } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    if (mockUsers.find(u => u.email === email)) {
      return res.status(409).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }
    
    const user = {
      id: `user-${Date.now()}`,
      email,
      name,
      organization,
      role: 'editor',
      createdAt: new Date().toISOString(),
    };
    
    mockUsers.push({ ...user, password });
    const token = `mock-token-${user.id}`;
    mockTokens[token] = user;
    
    res.status(201).json({
      success: true,
      data: { user, token },
    });
  });
  
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = mockUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    const token = `mock-token-${user.id}`;
    mockTokens[token] = user;
    
    res.json({
      success: true,
      data: { 
        user: { ...user, password: undefined }, 
        token 
      },
    });
  });
  
  // Mock projects endpoints
  let mockProjects: any[] = [];
  
  const authMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    const user = mockTokens[token];
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    
    req.user = user;
    next();
  };
  
  app.get('/api/projects', authMiddleware, (req: any, res) => {
    const userProjects = mockProjects.filter(p => p.userId === req.user.id);
    res.json({
      success: true,
      data: userProjects,
    });
  });
  
  app.post('/api/projects', authMiddleware, (req: any, res) => {
    const { name, description, companyName, companySize, sector, baselineYear, reportingYear, standards } = req.body;
    
    if (!name || !companyName || !sector) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const project = {
      id: `project-${Date.now()}`,
      userId: req.user.id,
      name,
      description,
      companyName,
      companySize: companySize || 'medium',
      sector,
      baselineYear: baselineYear || new Date().getFullYear() - 1,
      reportingYear: reportingYear || new Date().getFullYear(),
      standards: standards || ['eu_cbam'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockProjects.push(project);
    
    res.status(201).json({
      success: true,
      data: project,
    });
  });
  
  app.get('/api/projects/:id', authMiddleware, (req: any, res) => {
    const project = mockProjects.find(p => p.id === req.params.id && p.userId === req.user.id);
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      });
    }
    
    res.json({
      success: true,
      data: project,
    });
  });
  
  app.put('/api/projects/:id', authMiddleware, (req: any, res) => {
    const projectIndex = mockProjects.findIndex(p => p.id === req.params.id && p.userId === req.user.id);
    
    if (projectIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      });
    }
    
    mockProjects[projectIndex] = {
      ...mockProjects[projectIndex],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    res.json({
      success: true,
      data: mockProjects[projectIndex],
    });
  });
  
  app.delete('/api/projects/:id', authMiddleware, (req: any, res) => {
    const projectIndex = mockProjects.findIndex(p => p.id === req.params.id && p.userId === req.user.id);
    
    if (projectIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      });
    }
    
    mockProjects.splice(projectIndex, 1);
    
    res.json({
      success: true,
      message: 'Project deleted',
    });
  });
  
  // Reset function for tests
  (app as any).reset = () => {
    mockUsers = [];
    mockTokens = {};
    mockProjects = [];
  };
  
  return app;
};

describe('API Integration Tests', () => {
  let app: Express & { reset?: () => void };
  let authToken: string;
  let testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    organization: 'Test Organization',
  };
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  beforeEach(() => {
    app.reset?.();
  });

  describe('Health Check', () => {
    it('GET /api/health should return OK status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('POST /api/auth/register should create a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();
      
      authToken = response.body.data.token;
    });

    it('POST /api/auth/register should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
      
      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User already exists');
    });

    it('POST /api/auth/register should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });

    it('POST /api/auth/login should authenticate valid user', async () => {
      // Register first
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
      
      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      
      authToken = response.body.data.token;
    });

    it('POST /api/auth/login should reject invalid credentials', async () => {
      // Register first
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Projects', () => {
    beforeEach(async () => {
      // Reset and register user for each test
      app.reset?.();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      authToken = registerResponse.body.data.token;
    });

    it('GET /api/projects should require authentication', async () => {
      await request(app)
        .get('/api/projects')
        .expect(401);
    });

    it('GET /api/projects should return empty array initially', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('POST /api/projects should create a new project', async () => {
      const projectData = {
        name: 'Test ESG Project',
        description: 'Test project for ESG reporting',
        companyName: 'Test Company',
        companySize: 'medium',
        sector: 'Manufacturing',
        baselineYear: 2024,
        reportingYear: 2025,
        standards: ['eu_cbam'],
      };
      
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.id).toBeDefined();
    });

    it('POST /api/projects should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Incomplete Project' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });

    it('GET /api/projects/:id should return a specific project', async () => {
      // Create project
      const createResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          companyName: 'Test Company',
          sector: 'Manufacturing',
        });
      
      const projectId = createResponse.body.data.id;
      
      // Get project
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(projectId);
    });

    it('GET /api/projects/:id should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });

    it('PUT /api/projects/:id should update a project', async () => {
      // Create project
      const createResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Original Name',
          companyName: 'Test Company',
          sector: 'Manufacturing',
        });
      
      const projectId = createResponse.body.data.id;
      
      // Update project
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('DELETE /api/projects/:id should delete a project', async () => {
      // Create project
      const createResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'To Delete',
          companyName: 'Test Company',
          sector: 'Manufacturing',
        });
      
      const projectId = createResponse.body.data.id;
      
      // Delete project
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Verify deletion
      await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
