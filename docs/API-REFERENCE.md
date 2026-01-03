# 📡 API Reference

Complete REST API documentation for the ESG Reporting Application.

---

## Base URL

```
http://localhost:2047/api/v1
```

Production:
```
https://your-domain.com/api/v1
```

---

## Authentication

All API requests (except login/register) require a JWT token.

### Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "admin@esgdemo.com",
  "password": "Demo@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr_abc123",
      "email": "admin@esgdemo.com",
      "name": "Admin User",
      "role": "admin",
      "organization": "ESG Demo Corp"
    }
  }
}
```

### Register

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "name": "New User",
  "organization": "My Company"
}
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "admin@esgdemo.com",
    "name": "Admin User",
    "role": "admin",
    "organization": "ESG Demo Corp",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## Projects

### List Projects

```http
GET /projects
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| search | string | Search by name |
| industry | string | Filter by industry |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_abc123",
      "name": "Manufacturing Plant 2025",
      "description": "Carbon accounting for main facility",
      "organization": "ESG Demo Corp",
      "industry": "Manufacturing",
      "country": "Thailand",
      "baseline_year": 2023,
      "reporting_year": 2025,
      "standards": ["eu_cbam", "ghg_protocol"],
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
```

### Get Project

```http
GET /projects/:id
Authorization: Bearer <token>
```

### Create Project

```http
POST /projects
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Project 2025",
  "description": "Project description",
  "organization": "My Company",
  "industry": "Manufacturing",
  "country": "Thailand",
  "baseline_year": 2024,
  "reporting_year": 2025,
  "standards": ["ghg_protocol"]
}
```

### Update Project

```http
PUT /projects/:id
Authorization: Bearer <token>
```

### Delete Project

```http
DELETE /projects/:id
Authorization: Bearer <token>
```

---

## Activities

### List Activities

```http
GET /activities
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| project_id | string | Filter by project |
| scope | string | Filter by scope (scope1, scope2, scope3) |
| year | number | Filter by year |

### Get Project Activities

```http
GET /activities/project/:projectId
Authorization: Bearer <token>
```

### Create Activity

```http
POST /activities
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "project_id": "proj_abc123",
  "name": "Diesel Generator Operation",
  "scope": "scope1",
  "scope3_category": null,
  "activity_type": "stationary_combustion",
  "activity_data": 5000,
  "activity_unit": "liters",
  "facility": "Main Plant",
  "year": 2025,
  "data_source": "Fuel purchase records"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "act_xyz789",
    "project_id": "proj_abc123",
    "name": "Diesel Generator Operation",
    "scope": "scope1",
    "activity_type": "stationary_combustion",
    "activity_data": 5000,
    "activity_unit": "liters",
    "emissions_co2e": 13250.5,
    "emission_factor_used": 2.6501,
    "calculation_method": "ipcc_2006",
    "created_at": "2025-06-15T10:30:00.000Z"
  }
}
```

### Update Activity

```http
PUT /activities/:id
Authorization: Bearer <token>
```

### Delete Activity

```http
DELETE /activities/:id
Authorization: Bearer <token>
```

---

## Calculations

### Calculate Emissions

```http
POST /calculations/emissions
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "method": "scope1_stationary",
  "inputs": {
    "fuel_type": "diesel",
    "quantity": 1000,
    "unit": "liters"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "method": "scope1_stationary",
    "inputs": {
      "fuel_type": "diesel",
      "quantity": 1000,
      "unit": "liters"
    },
    "emission_factor": {
      "value": 2.6501,
      "unit": "kg CO2e/liter",
      "source": "IPCC 2006"
    },
    "result": {
      "co2": 2650.1,
      "ch4": 0.1,
      "n2o": 0.02,
      "co2e": 2650.1
    },
    "formula": "CO2e = Quantity × Emission Factor",
    "calculation": "2650.1 = 1000 × 2.6501"
  }
}
```

### Calculation Methods

| Method | Description | Required Inputs |
|--------|-------------|-----------------|
| `scope1_stationary` | Stationary combustion | fuel_type, quantity, unit |
| `scope1_mobile` | Mobile combustion | vehicle_type, fuel_type, quantity |
| `scope2_location` | Location-based electricity | country, quantity_kwh |
| `scope2_market` | Market-based electricity | supplier_ef, quantity_kwh |
| `scope3_transport` | Transportation | mode, weight, distance |
| `scope3_purchased` | Purchased goods | category, spend_amount |

### Get Emission Summary

```http
GET /calculations/summary/:projectId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "project_id": "proj_abc123",
    "total_emissions": 15420.5,
    "by_scope": {
      "scope1": 5230.2,
      "scope2": 4890.3,
      "scope3": 5300.0
    },
    "by_category": {
      "stationary_combustion": 3200.5,
      "mobile_combustion": 2029.7,
      "purchased_electricity": 4890.3,
      "business_travel": 2100.0,
      "upstream_transport": 3200.0
    },
    "unit": "kg CO2e"
  }
}
```

---

## Emission Factors

### List Emission Factors

```http
GET /emission-factors
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Factor type (fuel, grid, transport) |
| country | string | Country code |

### Get Grid Emission Factors

```http
GET /emission-factors/grid
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "gef_001",
      "country": "Thailand",
      "region": "National Grid",
      "year": 2025,
      "location_based_ef": 0.4561,
      "market_based_ef": null,
      "unit": "kg CO2e/kWh",
      "source": "EGAT 2024"
    }
  ]
}
```

### Create Custom Factor

```http
POST /emission-factors/custom
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Company Vehicle Fleet",
  "factor_value": 2.31,
  "unit": "kg CO2e/liter",
  "source": "Internal measurement",
  "valid_from": "2025-01-01"
}
```

---

## Reports

### List Reports

```http
GET /reports
Authorization: Bearer <token>
```

### Generate Report

```http
POST /reports/generate
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "project_id": "proj_abc123",
  "report_type": "ghg_inventory",
  "date_from": "2025-01-01",
  "date_to": "2025-12-31",
  "format": "pdf",
  "options": {
    "include_charts": true,
    "executive_summary": true,
    "detailed_calculations": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report_id": "rpt_123",
    "status": "generating",
    "download_url": null
  }
}
```

### Get Report Status

```http
GET /reports/:id/status
Authorization: Bearer <token>
```

### Download Report

```http
GET /reports/:id/download
Authorization: Bearer <token>
```

---

## Files

### Upload File

```http
POST /files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: File to upload
- `project_id`: Associated project
- `activity_id`: Associated activity (optional)
- `description`: File description

### List Files

```http
GET /files
Authorization: Bearer <token>
```

### Download File

```http
GET /files/:id/download
Authorization: Bearer <token>
```

### Delete File

```http
DELETE /files/:id
Authorization: Bearer <token>
```

---

## Signatures

### Request Signature

```http
POST /signatures/request
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "document_id": "doc_123",
  "signers": ["usr_abc", "usr_xyz"],
  "message": "Please review and sign"
}
```

### Sign Document

```http
POST /signatures/:id/sign
Authorization: Bearer <token>
```

### Get Signature Status

```http
GET /signatures/:id
Authorization: Bearer <token>
```

---

## Audit Log

### Get Audit Log

```http
GET /audit
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | string | Filter by user |
| action | string | Filter by action type |
| from | date | Start date |
| to | date | End date |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "aud_001",
      "user_id": "usr_abc",
      "user_email": "admin@esgdemo.com",
      "action": "activity.create",
      "resource_type": "activity",
      "resource_id": "act_xyz",
      "details": {
        "name": "Diesel Generator"
      },
      "ip_address": "192.168.1.1",
      "created_at": "2025-06-15T10:30:00.000Z"
    }
  ]
}
```

---

## Embeddings (Vector Search)

### Create Embedding

```http
POST /embeddings
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "GHG Protocol Scope 3 Category 4 covers upstream transportation...",
  "metadata": {
    "type": "standard",
    "source": "ghg_protocol"
  }
}
```

### Search Similar

```http
POST /embeddings/search
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "query": "How to calculate transportation emissions?",
  "limit": 5,
  "threshold": 0.7
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Authentication | 10 requests/minute |
| General API | 100 requests/minute |
| File Upload | 10 requests/minute |
| Report Generation | 5 requests/minute |

Exceeded limits return:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retry_after": 60
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const API_BASE = 'http://localhost:2047/api/v1';

// Login
const response = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@esgdemo.com',
    password: 'Demo@123'
  })
});
const { data } = await response.json();
const token = data.token;

// Create Activity
const activity = await fetch(`${API_BASE}/activities`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    project_id: 'proj_abc123',
    name: 'Electricity Usage',
    scope: 'scope2',
    activity_type: 'purchased_electricity',
    activity_data: 10000,
    activity_unit: 'kWh',
    year: 2025
  })
});
```

### Python

```python
import requests

API_BASE = 'http://localhost:2047/api/v1'

# Login
response = requests.post(f'{API_BASE}/auth/login', json={
    'email': 'admin@esgdemo.com',
    'password': 'Demo@123'
})
token = response.json()['data']['token']

# Create Activity
headers = {'Authorization': f'Bearer {token}'}
activity = requests.post(f'{API_BASE}/activities', 
    headers=headers,
    json={
        'project_id': 'proj_abc123',
        'name': 'Electricity Usage',
        'scope': 'scope2',
        'activity_type': 'purchased_electricity',
        'activity_data': 10000,
        'activity_unit': 'kWh',
        'year': 2025
    }
)
```

### cURL

```bash
# Login
curl -X POST http://localhost:2047/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@esgdemo.com","password":"Demo@123"}'

# Create Activity
curl -X POST http://localhost:2047/api/v1/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "project_id": "proj_abc123",
    "name": "Electricity Usage",
    "scope": "scope2",
    "activity_type": "purchased_electricity",
    "activity_data": 10000,
    "activity_unit": "kWh",
    "year": 2025
  }'
```

---

*Last updated: January 2026*
