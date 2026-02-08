# 📋 Standards Compliance

This document outlines the ESG and carbon reporting standards supported by the ESG Reporting Application.

---

## Table of Contents

1. [GHG Protocol](#ghg-protocol)
2. [EU CBAM](#eu-cbam)
3. [Regional Standards](#regional-standards)
4. [Compliance Matrix](#compliance-matrix)
5. [Reporting Requirements](#reporting-requirements)
6. [ESG Goals & Target Tracking](#esg-goals--target-tracking)

---

## GHG Protocol

### Overview

The GHG Protocol Corporate Standard is the most widely used international accounting tool for measuring and managing greenhouse gas emissions.

### Scope Coverage

| Scope | Description | Required |
|-------|-------------|----------|
| Scope 1 | Direct emissions | ✅ Mandatory |
| Scope 2 | Indirect energy | ✅ Mandatory |
| Scope 3 | Value chain | ⚠️ Recommended |

### Scope 3 Categories

| Category | Description | Tracked |
|----------|-------------|---------|
| 1 | Purchased goods & services | ✅ |
| 2 | Capital goods | ✅ |
| 3 | Fuel & energy activities | ✅ |
| 4 | Upstream transportation | ✅ |
| 5 | Waste generated | ✅ |
| 6 | Business travel | ✅ |
| 7 | Employee commuting | ✅ |
| 8 | Upstream leased assets | ✅ |
| 9 | Downstream transportation | ✅ |
| 10 | Processing of sold products | ✅ |
| 11 | Use of sold products | ✅ |
| 12 | End-of-life treatment | ✅ |
| 13 | Downstream leased assets | ✅ |
| 14 | Franchises | ✅ |
| 15 | Investments | ✅ |

### Reporting Principles

1. **Relevance** - Appropriately reflect emissions
2. **Completeness** - Account for all sources
3. **Consistency** - Allow meaningful comparisons
4. **Transparency** - Disclose assumptions
5. **Accuracy** - Reduce uncertainties

### Organizational Boundaries

| Approach | Description |
|----------|-------------|
| Equity Share | % of emissions based on ownership |
| Financial Control | 100% if financial control |
| Operational Control | 100% if operational control |

---

## EU CBAM

### Overview

The Carbon Border Adjustment Mechanism (CBAM) is the EU's carbon pricing system for imported goods to prevent carbon leakage.

### Covered Products

| Sector | CN Codes | Phase |
|--------|----------|-------|
| Iron & Steel | 72, 73 | Transitional |
| Aluminum | 76 | Transitional |
| Cement | 2523 | Transitional |
| Fertilizers | 2808, 2814, 3102-3105 | Transitional |
| Electricity | 2716 | Transitional |
| Hydrogen | 2804 | Transitional |

### Emissions Calculation

#### Direct Emissions (Scope 1)

```
Direct Emissions = Σ (Activity Data × Emission Factor)
```

For each production process:
- Combustion emissions
- Process emissions
- Fugitive emissions

#### Indirect Emissions (Scope 2)

```
Indirect Emissions = Electricity × Grid EF
```

Or supplier-specific factors if available.

### Specific Embedded Emissions (SEE)

```
SEE = (Direct + Indirect) / Production Volume
```

Unit: tonnes CO₂e per tonne of product

### CBAM Reporting Timeline

| Period | Requirement |
|--------|-------------|
| Oct 2023 - Dec 2025 | Transitional quarterly reports |
| Jan 2026 onwards | Full CBAM certificates required |

### Default Values

During transition, default values may be used:

| Product | Default Value | Unit |
|---------|---------------|------|
| Iron/Steel | 1.9-2.5 | tCO₂e/t |
| Aluminum | 8.0-15.0 | tCO₂e/t |
| Cement | 0.6-0.9 | tCO₂e/t |
| Fertilizers | 2.0-5.0 | tCO₂e/t |

---

## Regional Standards

### Thai ESG Framework

Thailand's ESG disclosure requirements for listed companies.

#### Requirements

| Category | Items |
|----------|-------|
| Environmental | GHG emissions, energy, water, waste |
| Social | Employee welfare, community, safety |
| Governance | Board structure, ethics, risk |

#### GHG Reporting

- Scope 1 and 2 mandatory
- Scope 3 encouraged
- Intensity metrics required
- Third-party verification recommended

### K-ESG (Korea)

Korean ESG disclosure framework.

#### Environmental Indicators

| Indicator | Description |
|-----------|-------------|
| E-1 | GHG Emissions (Scope 1, 2, 3) |
| E-2 | Energy consumption |
| E-3 | Water usage |
| E-4 | Waste management |
| E-5 | Environmental compliance |

### China Carbon Market

China's national ETS requirements.

#### Coverage

- Power generation sector (Phase 1)
- Expanding to 8 sectors:
  - Petrochemical
  - Chemical
  - Building materials
  - Steel
  - Non-ferrous metals
  - Paper
  - Aviation

#### Reporting Requirements

| Item | Frequency |
|------|-----------|
| Annual emissions report | Yearly |
| Verification | Every 3 years |
| MRV compliance | Ongoing |

### Japan ESG (TCFD)

Japan's climate disclosure based on TCFD recommendations.

#### Disclosure Areas

| Area | Content |
|------|---------|
| Governance | Board oversight, management role |
| Strategy | Climate risks/opportunities, scenarios |
| Risk Management | Identification, assessment, management |
| Metrics & Targets | GHG emissions, climate targets |

### MAFF ESG (Japan Agriculture)

Ministry of Agriculture, Forestry and Fisheries ESG framework.

#### Focus Areas

- Agricultural emissions
- Land use change
- Sustainable sourcing
- Food waste reduction

---

## Compliance Matrix

### Feature Mapping

| Feature | GHG Protocol | EU CBAM | Thai ESG | K-ESG | China ETS |
|---------|--------------|---------|----------|-------|-----------|
| Scope 1 Emissions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scope 2 (Location) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scope 2 (Market) | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| Scope 3 Full | ✅ | ⚠️ | ⚠️ | ✅ | ❌ |
| Product Footprint | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Precursor Tracking | ❌ | ✅ | ❌ | ❌ | ❌ |
| Verification | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| Targets | ✅ | ❌ | ✅ | ✅ | ✅ |

Legend: ✅ Required | ⚠️ Optional/Partial | ❌ Not Required

### Emission Factor Requirements

| Standard | Acceptable Sources |
|----------|-------------------|
| GHG Protocol | IPCC, EPA, DEFRA, ecoinvent |
| EU CBAM | EU Reference Values, Verified Actuals |
| Thai ESG | TGO, EGAT, International |
| K-ESG | KEMCO, International |
| China ETS | NDRC Guidelines, Verified |

---

## Reporting Requirements

### GHG Inventory Report

Required elements:

1. **Organizational Boundary**
   - Consolidation approach
   - Entities included/excluded

2. **Operational Boundary**
   - Scopes reported
   - Categories included

3. **Emissions Data**
   - Total by scope
   - By gas (CO₂, CH₄, N₂O, etc.)
   - By category

4. **Methodology**
   - Calculation approach
   - Emission factors used
   - GWP values

5. **Base Year**
   - Base year emissions
   - Recalculation policy

6. **Verification**
   - Assurance level
   - Verifier details

### EU CBAM Quarterly Report

Required fields:

| Section | Content |
|---------|---------|
| Declarant Info | Company details, EORI number |
| Product Info | CN codes, quantities |
| Origin | Country of production |
| Installation | Production facility details |
| Emissions | Direct, indirect, total |
| Carbon Price | Price paid in origin country |

### Sample Report Structure

```
1. Executive Summary
2. Company Profile
3. Reporting Boundaries
4. Methodology
5. Scope 1 Emissions
   - Stationary Combustion
   - Mobile Combustion
   - Process Emissions
   - Fugitive Emissions
6. Scope 2 Emissions
   - Location-Based
   - Market-Based
7. Scope 3 Emissions
   - By Category
8. Data Quality
9. Targets and Progress
10. Verification Statement
11. Appendices
```

---

## Verification & Assurance

### Assurance Levels

| Level | Confidence | Use Case |
|-------|------------|----------|
| Limited | Moderate | Annual disclosure |
| Reasonable | High | Regulatory compliance |

### Accredited Verifiers

- ISO 14064-3 accredited bodies
- EU CBAM accredited verifiers
- Regional certification bodies

### Verification Process

1. **Planning** - Scope, materiality, sampling
2. **Execution** - Data review, site visits
3. **Reporting** - Opinion, findings
4. **Follow-up** - Corrective actions

---

## Implementation Checklist

### Getting Started

- [ ] Define organizational boundary
- [ ] Identify emission sources
- [ ] Select calculation methodology
- [ ] Gather activity data
- [ ] Apply emission factors
- [ ] Calculate total emissions
- [ ] Quality assurance review
- [ ] Generate reports
- [ ] Seek verification (if required)

### Annual Process

- [ ] Update activity data
- [ ] Review emission factors
- [ ] Check for regulation changes
- [ ] Recalculate base year (if needed)
- [ ] Compare to targets
- [ ] Generate annual report
- [ ] External verification
- [ ] Disclosure submission

---

## Resources

### Official Guidelines

- [GHG Protocol Standards](https://ghgprotocol.org/)
- [EU CBAM Regulation](https://taxation-customs.ec.europa.eu/cbam_en)
- [IPCC Guidelines](https://www.ipcc-nggip.iges.or.jp/)
- [ISO 14064](https://www.iso.org/standard/66453.html)

### Support

- SEC Thailand ESG Guidelines
- Korea Exchange ESG Portal
- China MEE Carbon Market
- Japan METI Climate Disclosure

---

## ESG Goals & Target Tracking

### Overview

The ESG Goals module allows organizations to set, track, and report on sustainability targets aligned with reporting standards and regulatory requirements.

### Goal Types & Standard Alignment

| Goal Category | Aligned Standards | Description |
|---------------|-------------------|-------------|
| Emission Reduction | GHG Protocol, EU CBAM, All regional | Absolute or intensity-based reduction targets |
| Energy Efficiency | ISO 50001, Thai ESG, K-ESG | Energy consumption per unit of output |
| Renewable Energy | RE100, Thai ESG, MAFF ESG | % of energy from renewable sources |
| Waste Reduction | GRI 306, Thai ESG | Waste diversion and minimization |
| Water Conservation | GRI 303, Thai ESG | Water withdrawal reduction targets |
| Supply Chain | Scope 3, EU CBAM | Supplier engagement and assessment |

### Goal Status Workflow

```
draft → active → completed
                → cancelled
```

| Status | Description | Standard Relevance |
|--------|-------------|-------------------|
| **Draft** | Goal being defined, not yet committed | Internal planning |
| **Active** | Goal committed, progress being tracked | Reporting period active |
| **Completed** | Target achieved or period ended | Disclosed in annual reports |
| **Cancelled** | Goal withdrawn (with justification) | Must document reason |

### Regulatory Requirements for Targets

#### EU CBAM
- Must set **emission intensity targets** per product category
- Track progress against EU benchmark values
- Annual reporting on improvement trajectory

#### Thai ESG (SEC Thailand)
- **ESG goals disclosure** recommended for listed companies
- Quantitative targets with clear timelines
- Year-over-year comparison required

#### K-ESG (Korea)
- **Quantitative GHG reduction targets** mandatory for large emitters
- Must align with Korea 2050 Carbon Neutrality goal
- Interim milestones required (2030, 2040, 2050)

#### China Carbon Market
- Comply with **allocated emission allowances**
- Track actual vs. allocated emissions
- Surplus/deficit reported annually

#### MAFF ESG (Japan)
- Set targets aligned with Japan's **Green Food System Strategy**
- Agriculture and food-specific sustainability KPIs
- Annual progress reporting to MAFF

### Integration with Reports

ESG Goals data is integrated into generated reports:

1. **Goal summary** included in report header section
2. **Progress metrics** (current vs. target) embedded in standard-specific sections
3. **Status tracking** provides audit trail for compliance verification
4. **Historical comparison** enables year-over-year target assessment

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/projects/:id/goals` | Create a new ESG goal |
| GET | `/api/v1/projects/:id/goals` | List all goals for a project |
| GET | `/api/v1/projects/:id/goals/summary` | Goal progress summary dashboard |
| GET | `/api/v1/projects/:id/goals/:goalId` | Get specific goal details |
| PUT | `/api/v1/projects/:id/goals/:goalId` | Update goal definition |
| PATCH | `/api/v1/projects/:id/goals/:goalId/progress` | Update progress value |
| DELETE | `/api/v1/projects/:id/goals/:goalId` | Delete a goal |

---

*Last updated: June 2025*
