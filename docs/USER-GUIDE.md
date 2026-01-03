# 📖 User Guide

Complete guide for using the ESG Reporting Application.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Projects](#projects)
4. [Activities](#activities)
5. [Calculations](#calculations)
6. [Analytics](#analytics)
7. [Reports](#reports)
8. [Emission Factors](#emission-factors)
9. [Tools](#tools)
10. [Settings](#settings)

---

## Getting Started

### Logging In

1. Navigate to `http://localhost:2048`
2. Enter your email and password
3. Click **Sign In**

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@esgdemo.com | Demo@123 | Administrator |
| manager@esgdemo.com | Demo@123 | Project Editor |
| viewer@esgdemo.com | Demo@123 | Read Only |
| auditor@esgdemo.com | Demo@123 | Auditor |
| demo@esgdemo.com | Demo@123 | Clean User (no data) |

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, user management, system settings |
| **Editor** | Create/edit projects, activities, reports |
| **Viewer** | Read-only access to all data |
| **Auditor** | View data, add audit comments, digital signatures |

---

## Dashboard

The Dashboard provides an overview of your organization's emissions:

### Key Metrics
- **Total Emissions** - Sum of all CO₂e across projects
- **Scope 1** - Direct emissions (fuel, refrigerants)
- **Scope 2** - Indirect energy (electricity, heat)
- **Scope 3** - Value chain (travel, procurement)

### Charts
- **Scope Distribution** - Pie chart showing emission breakdown
- **Monthly Trend** - Bar chart of emissions over time
- **Project Comparison** - Compare emissions across projects

### Quick Actions
- Create new project
- Add activity
- Generate report

---

## Projects

Projects are containers for organizing emission activities by facility, year, or reporting requirement.

### Creating a Project

1. Go to **Projects** → **Create Project**
2. Fill in required fields:
   - **Name** - Descriptive project name
   - **Organization** - Company name
   - **Industry** - Select industry sector
   - **Country/Location** - Geographic scope
   - **Baseline Year** - Reference year for comparisons
   - **Reporting Year** - Year being reported
   - **Standards** - Select applicable standards (EU CBAM, GHG Protocol, etc.)

### Project Details

Each project shows:
- Total emissions by scope
- Activity list
- Team members
- Compliance status

### Project Members

Add team members with specific roles:
- **Owner** - Full project control
- **Editor** - Add/edit activities
- **Viewer** - Read-only access

---

## Activities

Activities are individual emission sources tracked within projects.

### Activity Types

#### Scope 1 - Direct Emissions
| Type | Examples | Units |
|------|----------|-------|
| Stationary Combustion | Boilers, furnaces, generators | liters, m³, kg |
| Mobile Combustion | Fleet vehicles, forklifts | liters, km |
| Fugitive Emissions | Refrigerant leaks, SF6 | kg |
| Process Emissions | Chemical reactions | tonnes |

#### Scope 2 - Indirect Energy
| Type | Examples | Units |
|------|----------|-------|
| Purchased Electricity | Grid power | kWh, MWh |
| Purchased Heat/Steam | District heating | MWh, GJ |
| Purchased Cooling | Chilled water | MWh |

#### Scope 3 - Value Chain
| Category | Examples | Units |
|----------|----------|-------|
| Purchased Goods | Materials, supplies | tonnes, USD |
| Business Travel | Flights, hotels | km, trips |
| Employee Commuting | Staff transport | km |
| Upstream Transport | Inbound logistics | tonne-km |
| Downstream Transport | Product delivery | tonne-km |
| Waste | Disposal, recycling | tonnes |

### Adding an Activity

1. Go to **Activities** → **Add Activity**
2. Select project
3. Choose scope and activity type
4. Enter:
   - Activity name
   - Quantity
   - Unit
   - Data source
   - Evidence (optional file attachment)
5. Click **Save**

Emissions are calculated automatically using built-in emission factors.

---

## Calculations

The Calculations page provides detailed GHG emission calculations.

### Calculator Tab

Perform single calculations with full formula display:

1. Select **Calculation Method**:
   - Scope 1 - Stationary Combustion
   - Scope 1 - Mobile Combustion
   - Scope 2 - Location Based
   - Scope 2 - Market Based
   - Scope 3 - Transport
   - Scope 3 - Purchased Goods

2. Enter **Input Parameters** (varies by method)

3. Click **Calculate**

4. View results with:
   - Formula used
   - Input values
   - Emission factors applied
   - Final CO₂e result

### Batch Calculate Tab

Calculate emissions for multiple activities:

1. Select project
2. Review activities list
3. Click **Calculate All**
4. View batch results

### History Tab

View past calculations with:
- Date/time
- Method used
- Input parameters
- Results
- Expandable details

### Custom Emission Factors

Add organization-specific factors:

1. Go to **Custom Factors** section
2. Click **Add Factor**
3. Enter:
   - Factor name
   - Value (kg CO₂e per unit)
   - Unit
   - Source reference
4. Save

Use custom factors in calculations by selecting "Custom Factor" as the source.

---

## Analytics

The Analytics page provides insights into your emission data.

### Overview Tab

- **Scope Distribution** - Visual breakdown of Scope 1, 2, 3
- **Top Emission Sources** - Highest contributing activities
- **Reduction Targets** - Progress toward goals

### Trends Tab

- **Monthly Emissions** - Bar chart by month
- **Year-over-Year Comparison** - Change vs. previous year
- **Seasonal Patterns** - Identify high/low periods

### Benchmarks Tab

- **Industry Comparison** - How you compare to sector average
- **Percentile Ranking** - Your position (e.g., 72nd percentile)
- **Improvement Opportunities** - Gap analysis

### AI Insights Tab

AI-powered recommendations:
- **High Priority** - Critical emission reduction opportunities
- **Medium Priority** - Efficiency improvements
- **Low Priority** - Long-term optimization

Each insight includes:
- Description
- Estimated impact
- Confidence score
- Implementation difficulty

---

## Reports

Generate compliance reports for stakeholders and regulators.

### Report Types

| Type | Description | Standards |
|------|-------------|-----------|
| **GHG Inventory** | Complete emission inventory | GHG Protocol |
| **CBAM Report** | EU Carbon Border Adjustment | EU CBAM |
| **Annual Disclosure** | Yearly ESG summary | Multiple |
| **Custom Report** | Configurable report | Any |

### Generating a Report

1. Go to **Reports** → **Generate Report**
2. Select:
   - Project(s)
   - Report type
   - Date range
   - Format (PDF, Excel, CSV)
3. Configure options:
   - Include charts
   - Add executive summary
   - Detailed calculations
4. Click **Generate**

### Report Contents

- Executive summary
- Methodology description
- Emission inventory (Scope 1, 2, 3)
- Year-over-year comparison
- Verification statement (if applicable)
- Data tables
- Supporting evidence

---

## Emission Factors

View and manage emission factors used in calculations.

### Fuel Factors Tab

Built-in factors for:
- Natural Gas
- Diesel
- Gasoline/Petrol
- LPG
- Coal
- Biomass

Source: IPCC 2006 Guidelines

### Grid Factors Tab

Electricity emission factors by country:
- Location-based factors (grid average)
- Market-based factors (supplier-specific)

Updated annually from official sources:
- EGAT (Thailand)
- EMA (Singapore)
- DEFRA (UK)
- EPA (USA)
- Others

### Custom Factors Tab

Your organization's custom factors:
- Add new factors
- Edit existing
- Import from file
- Export for sharing

---

## Tools

### Signatures

Digital document signing workflow:
1. Upload document
2. Request signatures from team members
3. Track signature status
4. View completed documents

### Audit Log

Complete activity tracking:
- User actions (login, data changes)
- System events
- Filter by date, user, action type
- Export for compliance

### Data Import

Bulk upload data:
1. Download template (CSV/Excel)
2. Fill in data
3. Upload file
4. Review and confirm
5. Data is validated and imported

Supports:
- Activities
- Emission factors
- Project data

### Data Export

Export your data:
- JSON (full backup)
- CSV (spreadsheet compatible)
- Excel (formatted workbook)
- PDF (printable reports)

### AI Assistant

Ask questions about:
- ESG terminology
- Calculation methods
- Compliance requirements
- Best practices

Example questions:
- "What is Scope 3 Category 4?"
- "How do I calculate fleet emissions?"
- "What standards apply to my industry?"

---

## Settings

### Profile

Update your information:
- Name
- Email
- Organization
- Password

### Notifications

Configure alerts:
- Email notifications
- In-app notifications
- Report reminders
- Audit alerts

### Data & Export

Data management options:
- **Clear Demo Data** - Remove sample data
- **Load Demo Data** - Restore sample data
- **Export All** - Download complete backup
- **Storage Usage** - View data size

### Appearance

Customize the interface:
- Theme (Light/Dark)
- Language
- Date format
- Number format

---

## Demo Tutorial

Step-by-step walkthrough for new users:

### 1. Login
- Use `admin@esgdemo.com` / `Demo@123`

### 2. Explore Dashboard
- View total emissions
- Check scope breakdown

### 3. Browse Projects
- Open "Manufacturing Plant 2025"
- Review activities

### 4. Add an Activity
- Click "Add Activity"
- Select Scope 1 - Diesel Generator
- Enter 1000 liters
- Save

### 5. Calculate Emissions
- Go to Calculations
- Select "Scope 1 - Stationary Combustion"
- Enter same values
- View formula and result

### 6. View Analytics
- Check emission trends
- Review AI insights

### 7. Generate Report
- Create GHG Inventory report
- Download PDF

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Quick search |
| `Ctrl + N` | New activity |
| `Ctrl + P` | New project |
| `Ctrl + R` | Generate report |
| `?` | Show shortcuts |

---

## Troubleshooting

### Data Not Loading

1. Check internet connection
2. Refresh the page
3. Clear browser cache
4. Try another browser

### Calculation Errors

1. Verify input values
2. Check unit compatibility
3. Ensure emission factor exists

### Export Fails

1. Check data size
2. Try smaller date range
3. Use different format

### Need Help?

- Check documentation
- Contact support
- Report issue on GitHub

---

*Last updated: January 2026*
