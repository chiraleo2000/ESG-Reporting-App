# 🚀 Getting Started with ESG Reporting App

This guide will help you get the ESG Reporting Application up and running in minutes.

---

## 📋 Prerequisites

Before you begin, ensure you have:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Docker Desktop | Latest | `docker --version` |
| Git | 2.0+ | `git --version` |
| Node.js (optional) | 18+ | `node --version` |

> **Note**: Docker Desktop is required for the recommended setup. For manual setup without Docker, you'll also need PostgreSQL 16 and Redis 7.

---

## ⚡ Quick Start (Recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/chiraleo2000/ESG-Reporting-App.git
cd ESG-Reporting-App
```

### Step 2: Start Docker Desktop

Make sure Docker Desktop is running on your machine.

### Step 3: Launch the Application

```bash
docker compose up -d
```

This command starts 4 services:
- **PostgreSQL** - Database (port 5434)
- **Redis** - Cache (port 6379)
- **Backend** - API Server (port 2047)
- **Frontend** - Web App (port 2048)

### Step 4: Wait for Initialization

Wait approximately 30 seconds for all services to fully start.

Check status:
```bash
docker ps
```

You should see all 4 containers with status "healthy" or "Up".

### Step 5: Open the Application

Open your browser and navigate to:

🌐 **http://localhost:2048**

---

## 👤 Login with Demo Account

Use one of these demo accounts (password for all: **`Demo@123`**):

| Account | Email | Best For |
|---------|-------|----------|
| **Admin** | admin@esgdemo.com | Full access, settings, user management |
| **Manager** | manager@esgdemo.com | Creating projects and activities |
| **Viewer** | viewer@esgdemo.com | Read-only browsing |
| **Auditor** | auditor@esgdemo.com | Review and audit |
| **Demo User** | demo@esgdemo.com | **Clean slate - no data** |

> 💡 **Tip**: Use `demo@esgdemo.com` if you want to start fresh without any demo data!

---

## 🗺️ Application Overview

After logging in, you'll see the main navigation:

### 📊 Dashboard
- Overview of total emissions across all projects
- Scope breakdown (Scope 1, 2, 3)
- Quick statistics and charts

### 📁 Projects
- Create and manage ESG reporting projects
- Configure standards (EU CBAM, GHG Protocol, etc.)
- Set baseline and reporting years

### 📋 Activities
- Record emission activities
- Enter fuel consumption, electricity use, transport data
- Automatic emission calculations

### 📈 Analytics
- **Overview** - Emission distribution charts
- **Trends** - Year-over-year comparisons
- **Benchmarks** - Industry comparisons
- **AI Insights** - Automated recommendations

### 🧮 Calculations
- **Calculator** - Calculate emissions using GHG methods
- **Batch Calculate** - Process multiple activities
- **History** - View calculation history

### 📑 Reports
- Generate compliance reports
- Export to PDF, Excel, CSV
- Standards-compliant formatting

### ⚡ Emission Factors
- View built-in emission factors
- Manage custom factors for your organization

### 🛠️ Tools
- **Signatures** - Digital document signing
- **Audit Log** - Activity tracking
- **Data Import** - Bulk data upload
- **Data Export** - Export your data
- **AI Assistant** - Get help with ESG questions

### ⚙️ Settings
- Profile management
- Notification preferences
- Data management (clear/load demo data)

---

## 📝 First Steps Tutorial

### 1. Create Your First Project

1. Go to **Projects** → **Create Project**
2. Fill in:
   - **Name**: "My Company 2025 Carbon Footprint"
   - **Organization**: Your company name
   - **Industry**: Select your industry
   - **Standards**: Choose applicable standards
   - **Reporting Year**: 2025
3. Click **Create Project**

### 2. Add Emission Activities

1. Go to **Activities** → **Add Activity**
2. Select your project
3. Choose activity type:
   - **Scope 1**: Diesel Generator
   - **Scope 2**: Purchased Electricity
   - **Scope 3**: Business Travel
4. Enter quantity and unit
5. Save - emissions are calculated automatically!

### 3. Calculate Emissions

1. Go to **Calculations** → **Calculator**
2. Select a GHG calculation method
3. Enter activity data
4. Click **Calculate**
5. View detailed breakdown with formulas

### 4. View Analytics

1. Go to **Analytics**
2. Explore:
   - Emission distribution by scope
   - Monthly trends
   - Year-over-year comparisons
   - AI-powered recommendations

### 5. Generate a Report

1. Go to **Reports** → **Generate Report**
2. Select project and date range
3. Choose report format
4. Download your compliance report

---

## 🔧 Troubleshooting

### Application won't load?

1. Check Docker is running:
   ```bash
   docker ps
   ```

2. Restart containers:
   ```bash
   docker compose down
   docker compose up -d
   ```

3. Check logs:
   ```bash
   docker compose logs -f
   ```

### Login fails with "Failed to fetch"?

The API might not be ready. Wait 30 seconds and try again.

### Database is empty?

Run the seed script:
```bash
docker compose exec backend npm run seed
```

### Need to reset everything?

```bash
docker compose down -v  # -v removes volumes (database data)
docker compose up -d
```

---

## 🖥️ Development Setup

For local development without Docker:

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database settings
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📚 Next Steps

- Read the [User Guide](docs/USER-GUIDE.md) for detailed features
- Check the [API Reference](docs/API-REFERENCE.md) for integration
- Review [GHG Calculation Methods](docs/GHG-CALCULATIONS.md)
- Explore [Standards Compliance](docs/STANDARDS-COMPLIANCE.md)

---

## 🆘 Need Help?

- **Documentation**: `/docs` folder
- **GitHub Issues**: [Report a bug](https://github.com/chiraleo2000/ESG-Reporting-App/issues)
- **Email**: support@esgdemo.com

---

Happy ESG Reporting! 🌱
