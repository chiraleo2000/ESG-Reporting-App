import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  Zap,
  Factory,
  Truck,
  Leaf,
  History,
  Play,
  RefreshCw,
  Download,
  Info,
  CheckCircle,
  Clock,
  Plus,
  Settings,
  Edit,
  Trash2,
  Save,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Toggle } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// GHG Protocol Calculation Methods
const calculationMethods = {
  scope1_stationary: {
    name: 'Stationary Combustion',
    scope: 'Scope 1',
    formula: 'CO₂e = Fuel Consumption × Emission Factor × GWP',
    description: 'Direct emissions from fuel combustion in stationary equipment (boilers, furnaces, generators)',
  },
  scope1_mobile: {
    name: 'Mobile Combustion',
    scope: 'Scope 1',
    formula: 'CO₂e = Distance × Fuel Efficiency⁻¹ × Emission Factor',
    description: 'Direct emissions from company-owned or controlled vehicles',
  },
  scope2_location: {
    name: 'Location-Based (Scope 2)',
    scope: 'Scope 2',
    formula: 'CO₂e = Electricity Consumed × Grid Emission Factor',
    description: 'Indirect emissions from purchased electricity using grid average factors',
  },
  scope2_market: {
    name: 'Market-Based (Scope 2)',
    scope: 'Scope 2',
    formula: 'CO₂e = Electricity × Supplier Factor',
    description: 'Indirect emissions using supplier-specific or contractual factors',
  },
  scope3_transport: {
    name: 'Transportation & Distribution',
    scope: 'Scope 3',
    formula: 'CO₂e = Weight × Distance × Transport Mode Factor',
    description: 'Upstream/downstream transportation of goods',
  },
  scope3_purchased: {
    name: 'Purchased Goods & Services',
    scope: 'Scope 3',
    formula: 'CO₂e = Quantity × Cradle-to-Gate Factor',
    description: 'Embodied emissions in purchased materials',
  },
};

// Custom Emission Factors (user-defined)
const initialCustomFactors = [
  { id: 101, name: 'Company Solar Mix', category: 'electricity', factor: 0.12, unit: 'kgCO2e/kWh', source: 'Internal Audit 2024', region: 'Company', editable: true },
  { id: 102, name: 'Local Supplier Steel', category: 'material', factor: 1200, unit: 'kgCO2e/tonne', source: 'Supplier EPD', region: 'Thailand', editable: true },
];

// Calculation History
const calculationHistory = [
  {
    id: '1',
    name: 'Q4 2025 Manufacturing Emissions',
    project: 'Manufacturing Plant 2025',
    method: 'scope1_stationary',
    inputs: { fuel_quantity: 15000, emission_factor: 2.68, unit: 'liters diesel' },
    result: 40200,
    resultUnit: 'kgCO2e',
    status: 'completed',
    calculatedAt: '2025-12-29T14:30:00Z',
    calculatedBy: 'Admin User',
    notes: 'Quarterly diesel consumption for backup generators',
  },
  {
    id: '2',
    name: 'Office Electricity Dec 2025',
    project: 'Office Operations Carbon Footprint',
    method: 'scope2_location',
    inputs: { electricity: 45000, grid_factor: 0.4561, unit: 'kWh' },
    result: 20524.5,
    resultUnit: 'kgCO2e',
    status: 'completed',
    calculatedAt: '2025-12-28T10:15:00Z',
    calculatedBy: 'Project Manager',
    notes: 'Monthly electricity consumption for HQ office',
  },
  {
    id: '3',
    name: 'Raw Material Transport Q4',
    project: 'Supply Chain Scope 3 Assessment',
    method: 'scope3_transport',
    inputs: { weight: 500, distance: 1200, mode_factor: 0.107, unit: 'tonnes, km' },
    result: 64200,
    resultUnit: 'kgCO2e',
    status: 'completed',
    calculatedAt: '2025-12-27T09:00:00Z',
    calculatedBy: 'Admin User',
    notes: 'Steel shipment from port to factory',
  },
  {
    id: '4',
    name: 'Steel Procurement Batch',
    project: 'Supply Chain Scope 3 Assessment',
    method: 'scope3_purchased',
    inputs: { quantity: 200, material_factor: 1950, unit: 'tonnes steel' },
    result: 390000,
    resultUnit: 'kgCO2e',
    status: 'processing',
    calculatedAt: '2025-12-29T15:00:00Z',
    calculatedBy: 'Admin User',
    notes: 'Annual steel procurement embodied carbon',
  },
  {
    id: '5',
    name: 'Business Travel Nov 2025',
    project: 'Office Operations Carbon Footprint',
    method: 'scope3_transport',
    inputs: { distance: 8500, mode_factor: 0.255, unit: 'km air travel' },
    result: 2167.5,
    resultUnit: 'kgCO2e',
    status: 'completed',
    calculatedAt: '2025-12-15T11:30:00Z',
    calculatedBy: 'Project Manager',
    notes: 'Employee business travel flights',
  },
];

// Batch projects
const batchProjects = [
  { id: 'proj1', name: 'Manufacturing Plant 2025', pendingActivities: 14, scope1: 5, scope2: 2, scope3: 7, estimatedEmissions: 1856.45 },
  { id: 'proj2', name: 'Office Operations Carbon Footprint', pendingActivities: 3, scope1: 0, scope2: 2, scope3: 1, estimatedEmissions: 342.18 },
  { id: 'proj3', name: 'Supply Chain Scope 3 Assessment', pendingActivities: 8, scope1: 0, scope2: 0, scope3: 8, estimatedEmissions: 2456.72 },
];

export const Calculations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'batch' | 'history'>('calculator');
  const [selectedMethod, setSelectedMethod] = useState<string>('scope2_location');
  const [customFactors, setCustomFactors] = useState(initialCustomFactors);
  const [showFormulaDetails, setShowFormulaDetails] = useState(true);
  const [showCustomFactorForm, setShowCustomFactorForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  
  // Calculator state
  const [calculatorInputs, setCalculatorInputs] = useState<Record<string, number>>({});
  const [calculationResult, setCalculationResult] = useState<number | null>(null);
  const [resultBreakdown, setResultBreakdown] = useState<any>(null);

  // New custom factor form
  const [newFactor, setNewFactor] = useState({
    name: '',
    category: 'electricity',
    factor: '',
    unit: '',
    source: '',
    region: '',
  });

  const currentMethod = calculationMethods[selectedMethod as keyof typeof calculationMethods];

  const performCalculation = () => {
    let result = 0;
    let breakdown: any = {};

    switch (selectedMethod) {
      case 'scope1_stationary':
        result = (calculatorInputs.fuel_quantity || 0) * (calculatorInputs.emission_factor || 2.68);
        breakdown = {
          formula: `${calculatorInputs.fuel_quantity || 0} × ${calculatorInputs.emission_factor || 2.68}`,
          steps: [
            `Fuel Consumption: ${calculatorInputs.fuel_quantity || 0} liters`,
            `Emission Factor: ${calculatorInputs.emission_factor || 2.68} kgCO2e/liter`,
            `Result: ${result.toFixed(2)} kgCO2e`,
          ],
        };
        break;
      case 'scope1_mobile':
        const fuelUsed = (calculatorInputs.distance || 0) / (calculatorInputs.fuel_efficiency || 10);
        result = fuelUsed * (calculatorInputs.emission_factor || 2.31);
        breakdown = {
          formula: `(${calculatorInputs.distance || 0} ÷ ${calculatorInputs.fuel_efficiency || 10}) × ${calculatorInputs.emission_factor || 2.31}`,
          steps: [
            `Distance: ${calculatorInputs.distance || 0} km`,
            `Fuel Efficiency: ${calculatorInputs.fuel_efficiency || 10} km/liter`,
            `Fuel Used: ${fuelUsed.toFixed(2)} liters`,
            `Emission Factor: ${calculatorInputs.emission_factor || 2.31} kgCO2e/liter`,
            `Result: ${result.toFixed(2)} kgCO2e`,
          ],
        };
        break;
      case 'scope2_location':
        result = (calculatorInputs.electricity || 0) * (calculatorInputs.grid_factor || 0.4561);
        breakdown = {
          formula: `${calculatorInputs.electricity || 0} × ${calculatorInputs.grid_factor || 0.4561}`,
          steps: [
            `Electricity: ${calculatorInputs.electricity || 0} kWh`,
            `Grid Factor: ${calculatorInputs.grid_factor || 0.4561} kgCO2e/kWh`,
            `Result: ${result.toFixed(2)} kgCO2e`,
          ],
        };
        break;
      case 'scope2_market':
        result = (calculatorInputs.electricity || 0) * (calculatorInputs.supplier_factor || 0.3);
        breakdown = {
          formula: `${calculatorInputs.electricity || 0} × ${calculatorInputs.supplier_factor || 0.3}`,
          steps: [
            `Electricity: ${calculatorInputs.electricity || 0} kWh`,
            `Supplier Factor: ${calculatorInputs.supplier_factor || 0.3} kgCO2e/kWh`,
            `Result: ${result.toFixed(2)} kgCO2e`,
          ],
        };
        break;
      case 'scope3_transport':
        result = (calculatorInputs.weight || 0) * (calculatorInputs.distance || 0) * (calculatorInputs.mode_factor || 0.107);
        breakdown = {
          formula: `${calculatorInputs.weight || 0} × ${calculatorInputs.distance || 0} × ${calculatorInputs.mode_factor || 0.107}`,
          steps: [
            `Weight: ${calculatorInputs.weight || 0} tonnes`,
            `Distance: ${calculatorInputs.distance || 0} km`,
            `Mode Factor: ${calculatorInputs.mode_factor || 0.107} kgCO2e/tonne-km`,
            `Result: ${result.toFixed(2)} kgCO2e`,
          ],
        };
        break;
      case 'scope3_purchased':
        result = (calculatorInputs.quantity || 0) * (calculatorInputs.material_factor || 1950);
        breakdown = {
          formula: `${calculatorInputs.quantity || 0} × ${calculatorInputs.material_factor || 1950}`,
          steps: [
            `Quantity: ${calculatorInputs.quantity || 0} tonnes`,
            `Material Factor: ${calculatorInputs.material_factor || 1950} kgCO2e/tonne`,
            `Result: ${result.toFixed(2)} kgCO2e`,
          ],
        };
        break;
      default:
        result = 0;
    }

    setCalculationResult(result);
    setResultBreakdown(breakdown);
  };

  const addCustomFactor = () => {
    if (!newFactor.name || !newFactor.factor) return;
    const newId = Math.max(...customFactors.map(f => f.id), 100) + 1;
    setCustomFactors([
      ...customFactors,
      {
        id: newId,
        name: newFactor.name,
        category: newFactor.category,
        factor: parseFloat(newFactor.factor),
        unit: newFactor.unit,
        source: newFactor.source,
        region: newFactor.region,
        editable: true,
      },
    ]);
    setNewFactor({ name: '', category: 'electricity', factor: '', unit: '', source: '', region: '' });
    setShowCustomFactorForm(false);
  };

  const deleteCustomFactor = (id: number) => {
    setCustomFactors(customFactors.filter(f => f.id !== id));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedBatchProject = batchProjects.find(p => p.id === selectedProject);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
            GHG Calculations
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Calculate greenhouse gas emissions using GHG Protocol methodology
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={item}>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeTab === 'calculator' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('calculator')}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calculator
          </Button>
          <Button
            variant={activeTab === 'batch' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('batch')}
          >
            <Play className="w-4 h-4 mr-2" />
            Batch Calculate
          </Button>
          <Button
            variant={activeTab === 'history' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4 mr-2" />
            History ({calculationHistory.length})
          </Button>
        </div>
      </motion.div>

      {/* ==================== CALCULATOR TAB ==================== */}
      {activeTab === 'calculator' && (
        <motion.div variants={item} className="space-y-6">
          {/* Method Selection */}
          <Card variant="default">
            <CardHeader
              title="Select Calculation Method"
              subtitle="Choose the GHG Protocol methodology for your calculation"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {Object.entries(calculationMethods).map(([key, method]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedMethod(key);
                    setCalculatorInputs({});
                    setCalculationResult(null);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedMethod === key
                      ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20'
                      : 'border-grass-200 dark:border-earth-700 hover:border-grass-300 dark:hover:border-earth-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={method.scope === 'Scope 1' ? 'success' : method.scope === 'Scope 2' ? 'info' : 'warning'} size="sm">
                      {method.scope}
                    </Badge>
                    {selectedMethod === key && <CheckCircle className="w-4 h-4 text-grass-500 ml-auto" />}
                  </div>
                  <p className="font-medium text-earth-800 dark:text-earth-100">{method.name}</p>
                  <p className="text-xs text-earth-500 dark:text-earth-400 mt-1 line-clamp-2">{method.description}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Formula Display */}
          <Card variant="grass">
            <div className="flex items-center justify-between">
              <CardHeader
                title={currentMethod.name}
                subtitle={currentMethod.scope}
              />
              <Button variant="ghost" size="sm" onClick={() => setShowFormulaDetails(!showFormulaDetails)}>
                {showFormulaDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
            {showFormulaDetails && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-white dark:bg-earth-800 rounded-xl">
                  <p className="text-sm text-earth-500 dark:text-earth-400 mb-2">Calculation Formula:</p>
                  <p className="text-2xl font-mono font-bold text-grass-700 dark:text-grass-400">
                    {currentMethod.formula}
                  </p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-earth-800/50 rounded-xl">
                  <p className="text-sm text-earth-600 dark:text-earth-300">
                    <Info className="w-4 h-4 inline mr-2" />
                    {currentMethod.description}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Calculator Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="default">
              <CardHeader
                title="Input Values"
                subtitle="Enter activity data for calculation"
              />
              <div className="space-y-4 mt-4">
                {selectedMethod === 'scope1_stationary' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Fuel Quantity (liters)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 5000"
                        value={calculatorInputs.fuel_quantity || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, fuel_quantity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Emission Factor (kgCO2e/liter)
                      </label>
                      <Select
                        options={[
                          { value: '2.68', label: 'Diesel - 2.68 kgCO2e/liter (DEFRA)' },
                          { value: '2.31', label: 'Petrol - 2.31 kgCO2e/liter (DEFRA)' },
                          { value: '1.51', label: 'LPG - 1.51 kgCO2e/kg (IPCC)' },
                        ]}
                        value={String(calculatorInputs.emission_factor || '2.68')}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, emission_factor: parseFloat(e.target.value) || 2.68})}
                      />
                    </div>
                  </>
                )}

                {selectedMethod === 'scope1_mobile' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Distance Traveled (km)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 1000"
                        value={calculatorInputs.distance || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, distance: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Fuel Efficiency (km/liter)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 12"
                        value={calculatorInputs.fuel_efficiency || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, fuel_efficiency: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Emission Factor (kgCO2e/liter)
                      </label>
                      <Select
                        options={[
                          { value: '2.31', label: 'Petrol - 2.31 kgCO2e/liter (DEFRA)' },
                          { value: '2.68', label: 'Diesel - 2.68 kgCO2e/liter (DEFRA)' },
                        ]}
                        value={String(calculatorInputs.emission_factor || '2.31')}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, emission_factor: parseFloat(e.target.value) || 2.31})}
                      />
                    </div>
                  </>
                )}

                {selectedMethod === 'scope2_location' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Electricity Consumed (kWh)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 10000"
                        value={calculatorInputs.electricity || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, electricity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Grid Emission Factor (kgCO2e/kWh)
                      </label>
                      <Select
                        options={[
                          { value: '0.4561', label: 'Thailand - 0.4561 (EGAT 2024)' },
                          { value: '0.4085', label: 'Singapore - 0.4085 (EMA)' },
                          { value: '0.5810', label: 'China North - 0.5810 (NDRC)' },
                          { value: '0.2560', label: 'EU Average - 0.2560 (EEA)' },
                          { value: '0.2121', label: 'UK - 0.2121 (DEFRA)' },
                        ]}
                        value={String(calculatorInputs.grid_factor || '0.4561')}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, grid_factor: parseFloat(e.target.value) || 0.4561})}
                      />
                    </div>
                  </>
                )}

                {selectedMethod === 'scope2_market' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Electricity Consumed (kWh)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 10000"
                        value={calculatorInputs.electricity || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, electricity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Supplier Emission Factor (kgCO2e/kWh)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 0.3"
                        value={calculatorInputs.supplier_factor || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, supplier_factor: parseFloat(e.target.value) || 0})}
                      />
                      <p className="text-xs text-earth-500 mt-1">Enter the emission factor from your electricity supplier's contract or certificate</p>
                    </div>
                  </>
                )}

                {selectedMethod === 'scope3_transport' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Weight (tonnes)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 100"
                        value={calculatorInputs.weight || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, weight: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Distance (km)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        value={calculatorInputs.distance || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, distance: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Transport Mode Factor (kgCO2e/tonne-km)
                      </label>
                      <Select
                        options={[
                          { value: '0.107', label: 'Road Freight - 0.107 (DEFRA)' },
                          { value: '0.016', label: 'Rail Freight - 0.016 (DEFRA)' },
                          { value: '0.008', label: 'Sea Freight - 0.008 (DEFRA)' },
                          { value: '0.602', label: 'Air Freight - 0.602 (DEFRA)' },
                        ]}
                        value={String(calculatorInputs.mode_factor || '0.107')}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, mode_factor: parseFloat(e.target.value) || 0.107})}
                      />
                    </div>
                  </>
                )}

                {selectedMethod === 'scope3_purchased' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Quantity (tonnes)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g., 50"
                        value={calculatorInputs.quantity || ''}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, quantity: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                        Material Emission Factor (kgCO2e/tonne)
                      </label>
                      <Select
                        options={[
                          { value: '1950', label: 'Steel (BOF) - 1,950 (EU CBAM)' },
                          { value: '350', label: 'Steel (EAF) - 350 (EU CBAM)' },
                          { value: '15150', label: 'Aluminum (Primary) - 15,150 (EU CBAM)' },
                          { value: '1000', label: 'Aluminum (Recycled) - 1,000 (EU CBAM)' },
                          { value: '730', label: 'Cement - 730 (EU CBAM)' },
                          { value: '2070', label: 'Fertilizer (Urea) - 2,070 (EU CBAM)' },
                        ]}
                        value={String(calculatorInputs.material_factor || '1950')}
                        onChange={(e) => setCalculatorInputs({...calculatorInputs, material_factor: parseFloat(e.target.value) || 1950})}
                      />
                    </div>
                  </>
                )}

                <Button variant="primary" className="w-full" onClick={performCalculation}>
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate Emissions
                </Button>
              </div>
            </Card>

            {/* Result Display */}
            <Card variant={calculationResult !== null ? 'grass' : 'default'}>
              <CardHeader
                title="Calculation Result"
                subtitle="GHG emissions in CO2 equivalent"
              />
              <div className="flex flex-col items-center justify-center py-8">
                {calculationResult !== null ? (
                  <>
                    <div className="w-20 h-20 rounded-full bg-grass-200 dark:bg-earth-700 flex items-center justify-center mb-4">
                      <Leaf className="w-10 h-10 text-grass-600 dark:text-grass-400" />
                    </div>
                    <p className="text-4xl font-bold text-earth-800 dark:text-earth-100">
                      {calculationResult.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-lg text-earth-500 dark:text-earth-400 mt-1">kg CO₂e</p>
                    <p className="text-sm text-grass-600 dark:text-grass-400 mt-2">
                      = {(calculationResult / 1000).toFixed(4)} tonnes CO₂e
                    </p>

                    {resultBreakdown && (
                      <div className="w-full mt-6 p-4 bg-white dark:bg-earth-800 rounded-xl">
                        <p className="text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">Calculation Breakdown:</p>
                        <p className="text-sm font-mono text-grass-600 dark:text-grass-400 mb-3">
                          {resultBreakdown.formula} = {calculationResult.toFixed(2)}
                        </p>
                        <div className="space-y-1">
                          {resultBreakdown.steps.map((step: string, idx: number) => (
                            <p key={idx} className="text-xs text-earth-500 dark:text-earth-400">
                              {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <Button variant="outline" size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setCalculationResult(null);
                        setResultBreakdown(null);
                      }}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-grass-100 dark:bg-earth-700 flex items-center justify-center mb-4">
                      <Calculator className="w-10 h-10 text-grass-400 dark:text-earth-500" />
                    </div>
                    <p className="text-earth-500 dark:text-earth-400 text-center">
                      Select a method and enter values<br />to calculate emissions
                    </p>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Custom Emission Factors */}
          <Card variant="default">
            <CardHeader
              title="Custom Emission Factors"
              subtitle="Define your own emission factors for specific sources"
              action={
                <Button variant="primary" size="sm" onClick={() => setShowCustomFactorForm(!showCustomFactorForm)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Factor
                </Button>
              }
            />
            {showCustomFactorForm && (
              <div className="p-4 bg-grass-50 dark:bg-earth-800 rounded-xl mt-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Factor Name"
                    placeholder="e.g., Local Grid Mix"
                    value={newFactor.name}
                    onChange={(e) => setNewFactor({...newFactor, name: e.target.value})}
                  />
                  <Select
                    label="Category"
                    options={[
                      { value: 'electricity', label: 'Electricity' },
                      { value: 'fuel', label: 'Fuel' },
                      { value: 'transport', label: 'Transport' },
                      { value: 'material', label: 'Material' },
                    ]}
                    value={newFactor.category}
                    onChange={(e) => setNewFactor({...newFactor, category: e.target.value})}
                  />
                  <Input
                    label="Factor Value"
                    type="number"
                    placeholder="e.g., 0.45"
                    value={newFactor.factor}
                    onChange={(e) => setNewFactor({...newFactor, factor: e.target.value})}
                  />
                  <Input
                    label="Unit"
                    placeholder="e.g., kgCO2e/kWh"
                    value={newFactor.unit}
                    onChange={(e) => setNewFactor({...newFactor, unit: e.target.value})}
                  />
                  <Input
                    label="Source"
                    placeholder="e.g., Internal Audit"
                    value={newFactor.source}
                    onChange={(e) => setNewFactor({...newFactor, source: e.target.value})}
                  />
                  <Input
                    label="Region"
                    placeholder="e.g., Thailand"
                    value={newFactor.region}
                    onChange={(e) => setNewFactor({...newFactor, region: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="ghost" size="sm" onClick={() => setShowCustomFactorForm(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={addCustomFactor}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Factor
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-grass-100 dark:border-earth-700">
                    <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Name</th>
                    <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Category</th>
                    <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Factor</th>
                    <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Unit</th>
                    <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Source</th>
                    <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customFactors.map((factor) => (
                    <tr key={factor.id} className="border-b border-grass-50 dark:border-earth-800">
                      <td className="p-3 font-medium text-earth-800 dark:text-earth-100">{factor.name}</td>
                      <td className="p-3">
                        <Badge variant="default" size="sm">{factor.category}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-grass-600 dark:text-grass-400">{factor.factor}</td>
                      <td className="p-3 text-earth-600 dark:text-earth-300">{factor.unit}</td>
                      <td className="p-3 text-sm text-earth-500 dark:text-earth-400">{factor.source}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteCustomFactor(factor.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customFactors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-earth-500 dark:text-earth-400">
                        No custom factors defined. Click "Add Factor" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ==================== BATCH CALCULATE TAB ==================== */}
      {activeTab === 'batch' && (
        <motion.div variants={item} className="space-y-6">
          <Card variant="default">
            <CardHeader
              title="Batch Calculation"
              subtitle="Calculate emissions for all pending activities in a project"
            />
            <div className="space-y-6 mt-4">
              <Select
                label="Select Project"
                options={[
                  { value: '', label: 'Choose a project...' },
                  ...batchProjects.map(p => ({
                    value: p.id,
                    label: `${p.name} (${p.pendingActivities} pending activities)`
                  }))
                ]}
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              />

              {selectedBatchProject && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card variant="grass" className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Factory className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-earth-500">Scope 1</p>
                          <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">{selectedBatchProject.scope1}</p>
                          <p className="text-xs text-earth-400">activities</p>
                        </div>
                      </div>
                    </Card>
                    <Card variant="grass" className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-earth-500">Scope 2</p>
                          <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">{selectedBatchProject.scope2}</p>
                          <p className="text-xs text-earth-400">activities</p>
                        </div>
                      </div>
                    </Card>
                    <Card variant="grass" className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Truck className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-earth-500">Scope 3</p>
                          <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">{selectedBatchProject.scope3}</p>
                          <p className="text-xs text-earth-400">activities</p>
                        </div>
                      </div>
                    </Card>
                    <Card variant="grass" className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-grass-100 dark:bg-grass-900/30 flex items-center justify-center">
                          <Leaf className="w-6 h-6 text-grass-600" />
                        </div>
                        <div>
                          <p className="text-sm text-earth-500">Est. Total</p>
                          <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">
                            {selectedBatchProject.estimatedEmissions.toLocaleString()}
                          </p>
                          <p className="text-xs text-earth-400">tCO2e</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="p-4 bg-grass-50 dark:bg-earth-800 rounded-xl">
                    <h4 className="font-medium text-earth-800 dark:text-earth-100 mb-3">Batch Calculation Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-earth-700 rounded-lg">
                        <span className="text-sm text-earth-600 dark:text-earth-300">Use verified emission factors only</span>
                        <Toggle checked={true} onChange={() => {}} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-earth-700 rounded-lg">
                        <span className="text-sm text-earth-600 dark:text-earth-300">Include uncertainty analysis</span>
                        <Toggle checked={false} onChange={() => {}} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-earth-700 rounded-lg">
                        <span className="text-sm text-earth-600 dark:text-earth-300">Generate detailed breakdown</span>
                        <Toggle checked={true} onChange={() => {}} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-earth-700 rounded-lg">
                        <span className="text-sm text-earth-600 dark:text-earth-300">Auto-save to history</span>
                        <Toggle checked={true} onChange={() => {}} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Preview Calculations
                    </Button>
                    <Button variant="primary">
                      <Play className="w-4 h-4 mr-2" />
                      Start Batch Calculation
                    </Button>
                  </div>
                </>
              )}

              {!selectedBatchProject && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-grass-100 dark:bg-earth-700 flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 text-grass-400 dark:text-earth-500" />
                  </div>
                  <p className="text-earth-500 dark:text-earth-400 text-center">
                    Select a project to start batch calculation
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ==================== HISTORY TAB ==================== */}
      {activeTab === 'history' && (
        <motion.div variants={item}>
          <Card variant="default">
            <CardHeader
              title="Calculation History"
              subtitle={`${calculationHistory.length} calculations recorded`}
              action={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export All
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              }
            />
            <div className="space-y-3 mt-4">
              {calculationHistory.map((calc) => (
                <div
                  key={calc.id}
                  className="border border-grass-100 dark:border-earth-700 rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-grass-50 dark:hover:bg-earth-800 transition-colors"
                    onClick={() => setExpandedHistory(expandedHistory === calc.id ? null : calc.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        calc.method.includes('scope1') ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        calc.method.includes('scope2') ? 'bg-blue-100 dark:bg-blue-900/30' :
                        'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        {calc.method.includes('scope1') ? <Factory className="w-5 h-5 text-emerald-600" /> :
                         calc.method.includes('scope2') ? <Zap className="w-5 h-5 text-blue-600" /> :
                         <Truck className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-earth-800 dark:text-earth-100">{calc.name}</p>
                        <p className="text-sm text-earth-500 dark:text-earth-400">{calc.project}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-mono font-bold text-grass-600 dark:text-grass-400">
                          {calc.result.toLocaleString()} {calc.resultUnit}
                        </p>
                        <p className="text-xs text-earth-500">{formatDate(calc.calculatedAt)}</p>
                      </div>
                      {calc.status === 'completed' ? (
                        <Badge variant="grass" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          <Clock className="w-3 h-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
                      )}
                      {expandedHistory === calc.id ? <ChevronUp className="w-5 h-5 text-earth-400" /> : <ChevronDown className="w-5 h-5 text-earth-400" />}
                    </div>
                  </button>
                  {expandedHistory === calc.id && (
                    <div className="p-4 bg-grass-50 dark:bg-earth-800 border-t border-grass-100 dark:border-earth-700">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-earth-600 dark:text-earth-400 mb-1">Method</p>
                          <p className="text-earth-800 dark:text-earth-100">
                            {calculationMethods[calc.method as keyof typeof calculationMethods]?.name || calc.method}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-earth-600 dark:text-earth-400 mb-1">Inputs</p>
                          <p className="text-earth-800 dark:text-earth-100 font-mono text-sm">
                            {Object.entries(calc.inputs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-earth-600 dark:text-earth-400 mb-1">Calculated By</p>
                          <p className="text-earth-800 dark:text-earth-100">{calc.calculatedBy}</p>
                        </div>
                      </div>
                      {calc.notes && (
                        <div className="mt-3 p-3 bg-white dark:bg-earth-700 rounded-lg">
                          <p className="text-sm text-earth-600 dark:text-earth-300">
                            <Info className="w-4 h-4 inline mr-2" />
                            {calc.notes}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Recalculate
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Calculations;
