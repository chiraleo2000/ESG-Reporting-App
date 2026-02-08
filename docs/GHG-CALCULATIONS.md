# 🔢 GHG Calculation Methods

This document details the greenhouse gas (GHG) calculation methodologies implemented in the ESG Reporting Application, following the GHG Protocol Corporate Standard and IPCC Guidelines.

---

## Table of Contents

1. [Overview](#overview)
2. [Scope 1: Direct Emissions](#scope-1-direct-emissions)
3. [Scope 2: Indirect Energy](#scope-2-indirect-energy)
4. [Scope 3: Value Chain](#scope-3-value-chain)
5. [Global Warming Potentials](#global-warming-potentials)
6. [Emission Factor Sources](#emission-factor-sources)
7. [Uncertainty & Quality](#uncertainty--quality)
8. [Carbon Footprint of Product (CFP)](#carbon-footprint-of-product-cfp)
9. [Carbon Footprint of Organization (CFO)](#carbon-footprint-of-organization-cfo)
10. [Industry Example: Sugar Factory](#industry-example-sugar-factory)

---

## Overview

### GHG Protocol Scopes

| Scope | Description | Examples |
|-------|-------------|----------|
| **Scope 1** | Direct emissions from owned/controlled sources | Fuel combustion, company vehicles, refrigerant leaks |
| **Scope 2** | Indirect emissions from purchased energy | Electricity, steam, heating, cooling |
| **Scope 3** | All other indirect emissions in value chain | Business travel, procurement, waste, transport |

### General Formula

```
CO₂e = Activity Data × Emission Factor × GWP
```

Where:
- **Activity Data** = Measured quantity (fuel, electricity, distance, etc.)
- **Emission Factor** = Emissions per unit of activity
- **GWP** = Global Warming Potential (converts to CO₂ equivalent)

---

## Scope 1: Direct Emissions

### 1.1 Stationary Combustion

Emissions from fuel burned in stationary equipment (boilers, furnaces, generators).

#### Formula

```
CO₂e = Fuel Consumed × Emission Factor
```

#### Detailed Calculation

```
CO₂ = Fuel × CO₂ EF
CH₄ = Fuel × CH₄ EF × GWP_CH₄
N₂O = Fuel × N₂O EF × GWP_N₂O
CO₂e = CO₂ + CH₄ + N₂O
```

#### Emission Factors (IPCC 2006)

| Fuel Type | CO₂ (kg/unit) | CH₄ (kg/unit) | N₂O (kg/unit) | Unit |
|-----------|---------------|---------------|---------------|------|
| Natural Gas | 1.885 | 0.000001 | 0.0000001 | m³ |
| Diesel | 2.6501 | 0.00039 | 0.00039 | liter |
| Gasoline | 2.3035 | 0.00025 | 0.00022 | liter |
| LPG | 1.6108 | 0.00006 | 0.00006 | liter |
| Coal (Bituminous) | 2.4213 | 0.0001 | 0.00015 | kg |
| Fuel Oil | 3.1496 | 0.0001 | 0.00006 | liter |

#### Example

**Diesel Generator - 5,000 liters**

```
CO₂  = 5,000 × 2.6501 = 13,250.5 kg
CH₄  = 5,000 × 0.00039 × 25 = 48.75 kg CO₂e
N₂O  = 5,000 × 0.00039 × 298 = 581.1 kg CO₂e
─────────────────────────────────────────────
Total CO₂e = 13,880.35 kg = 13.88 tonnes CO₂e
```

---

### 1.2 Mobile Combustion

Emissions from fuel burned in transportation (company vehicles, forklifts, machinery).

#### Formula

```
CO₂e = Fuel Consumed × (CO₂ EF + CH₄ EF × 25 + N₂O EF × 298)
```

Or distance-based:
```
CO₂e = Distance × Vehicle EF
```

#### Vehicle Emission Factors

| Vehicle Type | Fuel | Factor | Unit |
|--------------|------|--------|------|
| Passenger Car (gasoline) | Petrol | 0.171 | kg CO₂e/km |
| Passenger Car (diesel) | Diesel | 0.168 | kg CO₂e/km |
| Light Commercial | Diesel | 0.249 | kg CO₂e/km |
| Heavy Truck | Diesel | 0.846 | kg CO₂e/km |
| Forklift | LPG | 2.983 | kg CO₂e/hour |

#### Example

**Fleet Vehicles - 45,000 liters diesel**

```
Using fuel-based method:
CO₂e = 45,000 × 2.6501 × 1.01 (mobile adjustment)
CO₂e = 120,379.5 kg = 120.38 tonnes CO₂e
```

---

### 1.3 Fugitive Emissions

Emissions from intentional or unintentional releases (refrigerants, SF6).

#### Formula

```
CO₂e = Refrigerant Leaked × GWP
```

#### Refrigerant GWPs (AR5)

| Refrigerant | GWP (100-year) |
|-------------|----------------|
| R-22 (HCFC-22) | 1,810 |
| R-134a | 1,430 |
| R-410A | 2,088 |
| R-404A | 3,922 |
| R-407C | 1,774 |
| SF6 | 22,800 |

#### Example

**R-410A Leakage - 12 kg**

```
CO₂e = 12 kg × 2,088 = 25,056 kg CO₂e = 25.06 tonnes CO₂e
```

---

### 1.4 Process Emissions

Emissions from industrial processes (not combustion).

#### Formula

```
CO�ite = Production × Process EF
```

| Process | Factor | Unit |
|---------|--------|------|
| Cement Production | 0.5-0.9 | tCO₂/t cement |
| Steel (BOF) | 1.8-2.2 | tCO₂/t steel |
| Aluminum (Primary) | 1.5-2.0 | tCO₂/t aluminum |
| Ammonia | 1.5-2.5 | tCO₂/t ammonia |

---

## Scope 2: Indirect Energy

### 2.1 Location-Based Method

Uses average grid emission factors for the location.

#### Formula

```
CO₂e = Electricity (kWh) × Grid Emission Factor
```

#### Grid Emission Factors (2025)

| Country/Region | Factor (kg CO₂e/kWh) | Source |
|----------------|----------------------|--------|
| Thailand | 0.4561 | EGAT |
| Singapore | 0.4085 | EMA |
| China (North) | 0.5810 | NDRC |
| China (East) | 0.5102 | NDRC |
| Japan | 0.4410 | TEPCO |
| South Korea | 0.4590 | KEPCO |
| EU Average | 0.2560 | EEA |
| UK | 0.2121 | DEFRA |
| USA Average | 0.3860 | EPA |
| Australia | 0.6800 | CER |
| India | 0.7080 | CEA |

#### Example

**Thailand Facility - 2,850,000 kWh**

```
CO₂e = 2,850,000 × 0.4561 = 1,299,885 kg
CO₂e = 1,299.89 tonnes CO₂e
```

---

### 2.2 Market-Based Method

Uses supplier-specific or contractual emission factors.

#### Formula

```
CO₂e = Electricity × (Supplier EF - RECs/Guarantees)
```

#### Hierarchy of Factors

1. **Energy Attribute Certificates** (RECs, GOs) - Can reduce to 0
2. **Supplier-Specific EF** - From energy supplier
3. **Residual Mix** - Grid minus green energy claims
4. **Location-Based** - Fallback if no other data

#### Example

**With Renewable Energy Certificates**

```
Electricity: 1,000,000 kWh
RECs Purchased: 400,000 kWh (at 0 kg CO₂e/kWh)
Grid Electricity: 600,000 kWh × 0.4561 = 273,660 kg
─────────────────────────────────────────────────────
Total CO₂e = 273.66 tonnes
```

---

### 2.3 Purchased Heat/Steam/Cooling

#### Formula

```
CO₂e = Energy (MWh) × Heat EF
```

| Energy Type | Factor | Unit |
|-------------|--------|------|
| District Steam | 66.4 | kg CO₂e/MWh |
| District Hot Water | 45.0 | kg CO₂e/MWh |
| District Cooling | 25.0 | kg CO₂e/MWh |

---

## Scope 3: Value Chain

### 3.1 Category 1: Purchased Goods & Services

#### Spend-Based Method

```
CO₂e = Spend (USD) × Industry EF
```

| Category | Factor (kg CO₂e/USD) |
|----------|----------------------|
| Steel Products | 1.85 |
| Aluminum Products | 2.10 |
| Plastics | 0.95 |
| Paper Products | 0.65 |
| Electronics | 0.45 |
| Textiles | 0.72 |
| Chemicals | 1.20 |
| Food Products | 0.85 |

#### Mass-Based Method

```
CO₂e = Mass (tonnes) × Material EF
```

| Material | Factor (kg CO₂e/kg) |
|----------|---------------------|
| Steel (BOF) | 2.20 |
| Steel (EAF) | 0.50 |
| Aluminum (Primary) | 11.50 |
| Aluminum (Secondary) | 0.60 |
| Plastic (PE) | 2.00 |
| Cement | 0.85 |

---

### 3.2 Category 4: Upstream Transportation

#### Formula

```
CO₂e = Mass × Distance × Mode EF
```

Or:
```
CO₂e = Tonne-km × Mode EF
```

#### Transport Mode Factors

| Mode | Factor | Unit |
|------|--------|------|
| Road (Truck) | 0.0620 | kg CO₂e/tonne-km |
| Rail (Freight) | 0.0276 | kg CO₂e/tonne-km |
| Sea (Container) | 0.0160 | kg CO₂e/tonne-km |
| Sea (Bulk) | 0.0080 | kg CO₂e/tonne-km |
| Air (Freight) | 0.6020 | kg CO₂e/tonne-km |
| Air (Belly) | 1.1000 | kg CO₂e/tonne-km |

#### Example

**Raw Materials - 180,000 tonne-km by truck**

```
CO₂e = 180,000 × 0.0620 = 11,160 kg = 11.16 tonnes CO₂e
```

---

### 3.3 Category 5: Waste Generated

#### Formula

```
CO₂e = Waste Mass × Disposal EF
```

#### Disposal Factors

| Method | Factor | Unit |
|--------|--------|------|
| Landfill (Mixed) | 0.460 | kg CO₂e/kg |
| Landfill (Organic) | 0.580 | kg CO₂e/kg |
| Incineration (Mixed) | 0.990 | kg CO₂e/kg |
| Recycling (Paper) | 0.021 | kg CO₂e/kg |
| Recycling (Plastic) | 0.021 | kg CO₂e/kg |
| Recycling (Metal) | 0.021 | kg CO₂e/kg |
| Composting | 0.010 | kg CO₂e/kg |

---

### 3.4 Category 6: Business Travel

#### Formula

```
CO₂e = Distance × Mode EF × Class Factor
```

#### Air Travel Factors

| Flight Type | Economy | Business | First |
|-------------|---------|----------|-------|
| Domestic (<500 km) | 0.255 | 0.382 | 0.510 |
| Short-haul (<3,500 km) | 0.156 | 0.234 | 0.468 |
| Long-haul (>3,500 km) | 0.195 | 0.585 | 0.780 |

Units: kg CO₂e/passenger-km

#### Other Travel Factors

| Mode | Factor | Unit |
|------|--------|------|
| Train | 0.035 | kg CO₂e/km |
| Bus | 0.089 | kg CO₂e/km |
| Taxi | 0.149 | kg CO₂e/km |
| Rental Car | 0.171 | kg CO₂e/km |

#### Example

**Long-haul Business Travel - 125,000 km**

```
CO₂e = 125,000 × 0.195 × 1.0 (economy)
CO₂e = 24,375 kg = 24.38 tonnes CO₂e
```

---

### 3.5 Category 7: Employee Commuting

#### Formula

```
CO₂e = Employees × Avg Distance × Working Days × Mode EF
```

Or survey-based:
```
CO₂e = Total Distance × Mode EF
```

#### Commuting Factors

| Mode | Factor | Unit |
|------|--------|------|
| Car (single) | 0.171 | kg CO₂e/km |
| Car (carpool) | 0.085 | kg CO₂e/km |
| Public Bus | 0.089 | kg CO₂e/km |
| Metro/Train | 0.035 | kg CO₂e/km |
| Motorcycle | 0.103 | kg CO₂e/km |
| Bicycle/Walking | 0.000 | kg CO₂e/km |
| Working from Home | 0.004 | kg CO₂e/day |

---

## Global Warming Potentials

GWP values convert non-CO₂ gases to CO₂ equivalent.

### AR5 Values (100-year horizon)

| Gas | Chemical | GWP |
|-----|----------|-----|
| Carbon Dioxide | CO₂ | 1 |
| Methane | CH₄ | 28 |
| Nitrous Oxide | N₂O | 265 |
| HFC-134a | CF₃CH₂F | 1,430 |
| HFC-152a | CH₃CHF₂ | 124 |
| Sulfur Hexafluoride | SF₆ | 22,800 |
| NF₃ | NF₃ | 17,200 |

### AR4 Values (Legacy)

| Gas | GWP |
|-----|-----|
| CH₄ | 25 |
| N₂O | 298 |

---

## Emission Factor Sources

### Primary Sources

| Source | Coverage | Update Frequency |
|--------|----------|------------------|
| **IPCC** | Global | Every ~6 years |
| **EPA** | USA | Annual |
| **DEFRA** | UK | Annual |
| **ecoinvent** | Global LCA | Continuous |
| **GaBi** | Global LCA | Continuous |

### Regional Sources

| Region | Source |
|--------|--------|
| Thailand | EGAT, TGO |
| Singapore | EMA, NEA |
| EU | EEA, Eurostat |
| China | NDRC, MEE |
| Japan | MOE, METI |

### Industry Sources

| Standard | Organization |
|----------|--------------|
| EU CBAM | European Commission |
| GHG Protocol | WRI/WBCSD |
| ISO 14064 | ISO |
| CDP | CDP Worldwide |

---

## Uncertainty & Quality

### Data Quality Indicators

| Score | Description | Uncertainty |
|-------|-------------|-------------|
| 1 | Measured data, verified | ±5% |
| 2 | Calculated from measurements | ±10% |
| 3 | Industry average data | ±20% |
| 4 | Modeled/estimated | ±30% |
| 5 | Default/proxy data | ±50% |

### Reporting Requirements

1. **Document methodology** - Calculation approach used
2. **State assumptions** - Key assumptions made
3. **Report uncertainties** - Confidence intervals
4. **Track data quality** - Score each data point
5. **Note exclusions** - Any excluded sources

---

## References

1. GHG Protocol Corporate Standard (2015)
2. GHG Protocol Scope 2 Guidance (2015)
3. GHG Protocol Scope 3 Standard (2011)
4. IPCC Guidelines for National GHG Inventories (2006)
5. IPCC 2019 Refinement
6. DEFRA Conversion Factors 2024
7. EPA Emission Factors Hub
8. EU CBAM Implementing Regulation (2023)
9. ISO 14067:2018 - Carbon Footprint of Products
10. ISO 14064-1:2018 - Organization-level GHG quantification

---

## Carbon Footprint of Product (CFP)

### Overview

CFP quantifies the total GHG emissions associated with a product throughout its life cycle (cradle-to-gate or cradle-to-grave), following ISO 14067 and the GHG Protocol Product Standard.

### Calculation Method

The system calculates CFP using calculated activity emissions grouped by scope:

```
CFP = Σ(Scope 1 emissions) + Σ(Scope 2 emissions) + Σ(Scope 3 emissions)
```

### Breakdown Categories

| Category | Description | Source Scopes |
|----------|-------------|---------------|
| Raw Materials | Upstream material extraction & processing | Scope 3 (Cat 1) |
| Manufacturing | Direct production emissions | Scope 1 |
| Energy | Electricity & purchased energy | Scope 2 |
| Transportation | Inbound & outbound logistics | Scope 3 (Cat 4, 9) |
| Waste | Waste generated in production | Scope 3 (Cat 5) |

### Per-Unit Metrics

```
CFP per unit = Total CFP / Production Volume
Functional Unit example: kg CO₂e / tonne of product
```

### Biogenic Carbon

Biogenic CO₂ (from biological sources such as bagasse combustion) is reported **separately** per ISO 14067:

```
Biogenic CO₂ = Σ(emissions where gas_type = 'biogenic_co2')
```

---

## Carbon Footprint of Organization (CFO)

### Overview

CFO quantifies the total GHG emissions from all activities within an organization's boundary, following ISO 14064-1 and the GHG Protocol Corporate Standard.

### Calculation Method

```
Total CFO = Scope 1 Total + Scope 2 Total + Scope 3 Total
```

Each scope is calculated as:
```
Scope Total = Σ(Activity Emissions for all activities in that scope)
```

### Intensity Metrics

| Metric | Formula | Use Case |
|--------|---------|----------|
| Revenue Intensity | Total CFO / Revenue | Financial comparison |
| Employee Intensity | Total CFO / Headcount | Workforce benchmarking |
| Production Intensity | Total CFO / Output Volume | Operational efficiency |

### Scope Breakdown Example

```
Organization: Thai Sugar Co., Ltd.
Period: FY 2024

Scope 1:  45,280 kg CO₂e  (Boilers, Vehicles, Process)
Scope 2:  12,450 kg CO₂e  (Grid Electricity)
Scope 3:  18,920 kg CO₂e  (Transport, Waste, Procurement)
────────────────────────────────────
Total CFO: 76,650 kg CO₂e = 76.65 tonnes CO₂e
```

---

## Industry Example: Sugar Factory

### Emission Sources

A typical sugar factory has emissions across all three scopes:

#### Scope 1 — Direct Emissions

| Activity | Source | Typical Annual | EF | Emissions |
|----------|--------|----------------|-----|-----------|
| Bagasse Boiler | Combustion | 50,000 tonnes | 0.030 kg CO₂/kg | 1,500 t CO₂e |
| Diesel Generators | Backup power | 25,000 liters | 2.6501 kg/L | 66.25 t CO₂e |
| Company Vehicles | Transport | 15,000 liters diesel | 2.6501 kg/L | 39.75 t CO₂e |
| Lime Kiln | Process | 2,000 tonnes CaCO₃ | 0.44 t CO₂/t | 880 t CO₂e |
| Refrigerant Leaks | Fugitive | 50 kg R-410A | 2,088 GWP | 104.4 t CO₂e |

#### Scope 2 — Indirect Energy

| Activity | Source | Typical Annual | EF | Emissions |
|----------|--------|----------------|-----|-----------|
| Grid Electricity | PEA/EGAT | 2,000,000 kWh | 0.4999 kg/kWh | 999.8 t CO₂e |

#### Scope 3 — Value Chain

| Activity | Source | Category | Typical Annual | Emissions |
|----------|--------|----------|----------------|-----------|
| Sugarcane Transport | Inbound logistics | Cat 4 | 100,000 t × 50 km | 350 t CO₂e |
| Chemical Procurement | Purchased goods | Cat 1 | Various | 120 t CO₂e |
| Waste Disposal | Filter cake, ash | Cat 5 | 5,000 tonnes | 75 t CO₂e |
| Employee Commuting | Workforce | Cat 7 | 500 employees | 45 t CO₂e |

### Sugar Factory CFP Example

**Product: Refined White Sugar (1 tonne)**

```
Raw Materials (Scope 3):   15.2 kg CO₂e/t  (sugarcane farming, chemicals)
Manufacturing (Scope 1):   28.5 kg CO₂e/t  (milling, boiling, centrifuging)
Energy (Scope 2):          12.1 kg CO₂e/t  (grid electricity for processing)
Transportation (Scope 3):   4.8 kg CO₂e/t  (cane transport + distribution)
Waste (Scope 3):            1.9 kg CO₂e/t  (filter cake, ash disposal)
─────────────────────────────────────────
Total CFP:                 62.5 kg CO₂e/t of refined sugar
Biogenic CO₂ (separate):  85.0 kg CO₂/t   (bagasse combustion)
```

### Data Quality in Sugar Industry

| Data Point | Source | Quality Score |
|------------|--------|--------------|
| Fuel consumption | Metered purchases | 1 (±5%) |
| Electricity | Utility bills | 1 (±5%) |
| Bagasse burned | Weigh bridge | 2 (±10%) |
| Cane transport | GPS + fuel logs | 2 (±10%) |
| Waste volumes | Estimated | 4 (±30%) |
| Employee commuting | Survey | 4 (±30%) |

### Seed Data

The application includes seed data for a sugar factory demonstration:

```sql
-- Load sugar factory demo data
psql -U postgres -d esg_reporting -f database/seed-sugar-factory.sql
```

This creates:
- 🏭 **Thai Sugar Co., Ltd.** project (Thai ESG standard)
- 📊 **17 activities** across Scope 1, 2, and 3
- 👥 **3 team members** (owner, editor, viewer roles)
- 🔬 Pre-calculated emissions for all activities

---

*Last updated: June 2025*
