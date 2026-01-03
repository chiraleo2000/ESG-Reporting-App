import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Zap,
  Truck,
  Factory,
  Plane,
  Droplets,
  Trash2,
  Building2,
  Leaf,
  RefreshCw,
  Info,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from './Button';
import { Input, Select } from './Input';
import { Card, CardHeader } from './Card';
import { Badge, ScopeBadge } from './Badge';
import { Progress } from './Progress';

// Types
interface EmissionFactor {
  id: string;
  name: string;
  category: string;
  unit: string;
  factor: number;
  co2e: number;
  source: string;
  region?: string;
  year?: number;
}

interface CalculationInput {
  category: string;
  subcategory?: string;
  value: number;
  unit: string;
  emissionFactor?: EmissionFactor;
}

interface CalculationResult {
  input: CalculationInput;
  emissions: number;
  scope: 'scope1' | 'scope2' | 'scope3';
  uncertainty?: number;
  methodology?: string;
}

// Activity categories with emission factors
const categories = [
  {
    id: 'electricity',
    name: 'Electricity',
    icon: Zap,
    scope: 'scope2' as const,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    units: ['kWh', 'MWh'],
    defaultFactor: 0.4, // kg CO2e per kWh (varies by grid)
  },
  {
    id: 'natural_gas',
    name: 'Natural Gas',
    icon: Factory,
    scope: 'scope1' as const,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    units: ['m³', 'therms', 'MMBtu'],
    defaultFactor: 1.89, // kg CO2e per m³
  },
  {
    id: 'transport_diesel',
    name: 'Diesel Vehicles',
    icon: Truck,
    scope: 'scope1' as const,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    units: ['liters', 'gallons', 'km'],
    defaultFactor: 2.68, // kg CO2e per liter
  },
  {
    id: 'transport_petrol',
    name: 'Petrol Vehicles',
    icon: Truck,
    scope: 'scope1' as const,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    units: ['liters', 'gallons', 'km'],
    defaultFactor: 2.31, // kg CO2e per liter
  },
  {
    id: 'business_travel_flight',
    name: 'Air Travel',
    icon: Plane,
    scope: 'scope3' as const,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    units: ['km', 'miles', 'passenger-km'],
    defaultFactor: 0.255, // kg CO2e per passenger-km
  },
  {
    id: 'water',
    name: 'Water Supply',
    icon: Droplets,
    scope: 'scope3' as const,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    units: ['m³', 'liters', 'gallons'],
    defaultFactor: 0.344, // kg CO2e per m³
  },
  {
    id: 'waste',
    name: 'Waste Disposal',
    icon: Trash2,
    scope: 'scope3' as const,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    units: ['kg', 'tonnes'],
    defaultFactor: 0.71, // kg CO2e per kg (landfill)
  },
];

// Format number with commas and decimals
const formatNumber = (num: number, decimals = 2): string => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Real-time Calculator Component
export const EmissionCalculator: React.FC<{
  onCalculate?: (result: CalculationResult) => void;
  compact?: boolean;
}> = ({ onCalculate, compact = false }) => {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [value, setValue] = useState<string>('');
  const [unit, setUnit] = useState(categories[0].units[0]);
  const [customFactor, setCustomFactor] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);

  // Real-time calculated emissions
  const emissions = useMemo(() => {
    const numValue = parseFloat(value) || 0;
    const factor = parseFloat(customFactor) || selectedCategory.defaultFactor;
    return numValue * factor;
  }, [value, customFactor, selectedCategory]);

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      setSelectedCategory(category);
      setUnit(category.units[0]);
      setCustomFactor('');
    }
  };

  // Handle calculation submit
  const handleCalculate = useCallback(() => {
    if (!value || emissions <= 0) return;

    setIsCalculating(true);

    // Simulate API call delay for feedback
    setTimeout(() => {
      const result: CalculationResult = {
        input: {
          category: selectedCategory.id,
          value: parseFloat(value),
          unit,
        },
        emissions,
        scope: selectedCategory.scope,
        uncertainty: 5, // ±5% uncertainty
        methodology: 'GHG Protocol',
      };

      onCalculate?.(result);
      setIsCalculating(false);
    }, 300);
  }, [value, unit, selectedCategory, emissions, onCalculate]);

  const Icon = selectedCategory.icon;

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={selectedCategory.id}
            onChange={(e) => handleCategoryChange(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            type="number"
            placeholder="Value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-grass-50 dark:bg-grass-900/20">
          <span className="text-sm text-earth-600 dark:text-earth-400">CO₂e:</span>
          <span className="text-lg font-bold text-grass-600">
            {formatNumber(emissions / 1000)} tCO₂e
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card variant="default" className="overflow-hidden">
      <CardHeader
        title="Emission Calculator"
        subtitle="Real-time GHG calculations"
        action={
          <Badge variant="grass">
            <Sparkles className="w-3 h-3" />
            Live
          </Badge>
        }
      />

      <div className="p-6 space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-3">
            Activity Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categories.slice(0, 8).map((category) => {
              const CategoryIcon = category.icon;
              const isSelected = selectedCategory.id === category.id;
              return (
                <motion.button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                    ${isSelected
                      ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20'
                      : 'border-earth-200 dark:border-earth-700 hover:border-grass-300'
                    }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center`}>
                    <CategoryIcon className={`w-5 h-5 ${category.color}`} />
                  </div>
                  <span className="text-xs font-medium text-earth-700 dark:text-earth-300 text-center">
                    {category.name}
                  </span>
                  <ScopeBadge scope={category.scope} size="sm" />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Value Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
              Activity Value
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="Enter value..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="text-lg pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-earth-100 dark:bg-earth-700 rounded-lg px-2 py-1 text-sm border-0 
                           focus:ring-2 focus:ring-grass-500 cursor-pointer"
                >
                  {selectedCategory.units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
              Emission Factor (optional)
            </label>
            <Input
              type="number"
              placeholder={selectedCategory.defaultFactor.toString()}
              value={customFactor}
              onChange={(e) => setCustomFactor(e.target.value)}
              helperText={`Default: ${selectedCategory.defaultFactor} kg CO₂e/${selectedCategory.units[0]}`}
            />
          </div>
        </div>

        {/* Real-time Result Display */}
        <motion.div
          className="relative p-6 rounded-2xl bg-gradient-to-br from-grass-500 to-meadow-500 text-white overflow-hidden"
          animate={{ opacity: value ? 1 : 0.7 }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-grass-100 text-sm mb-1">Estimated Emissions</p>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={emissions}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold"
                >
                  {emissions >= 1000
                    ? formatNumber(emissions / 1000)
                    : formatNumber(emissions)}
                </motion.span>
                <span className="text-xl text-grass-100">
                  {emissions >= 1000 ? 'tCO₂e' : 'kg CO₂e'}
                </span>
              </div>
            </div>

            <div className={`w-16 h-16 rounded-full ${selectedCategory.bgColor} flex items-center justify-center`}>
              <Icon className={`w-8 h-8 ${selectedCategory.color}`} />
            </div>
          </div>

          {/* Info Bar */}
          <div className="relative mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Info className="w-4 h-4" />
                {selectedCategory.name}
              </span>
              <span>
                Factor: {customFactor || selectedCategory.defaultFactor} kg CO₂e/{unit}
              </span>
            </div>
            <ScopeBadge scope={selectedCategory.scope} />
          </div>
        </motion.div>

        {/* Action Button */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleCalculate}
          disabled={!value || emissions <= 0}
          loading={isCalculating}
        >
          <Calculator className="w-4 h-4" />
          Record Calculation
        </Button>
      </div>
    </Card>
  );
};

// Quick Calculator Widget (for dashboard)
export const QuickCalculatorWidget: React.FC<{
  onResult?: (emissions: number, scope: string) => void;
}> = ({ onResult }) => {
  const [category, setCategory] = useState(categories[0]);
  const [value, setValue] = useState('');

  const emissions = useMemo(() => {
    const numValue = parseFloat(value) || 0;
    return numValue * category.defaultFactor;
  }, [value, category]);

  useEffect(() => {
    if (emissions > 0 && onResult) {
      onResult(emissions, category.scope);
    }
  }, [emissions, category.scope, onResult]);

  const Icon = category.icon;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-earth-50 to-grass-50 dark:from-earth-800 dark:to-grass-900/20 border border-grass-200 dark:border-grass-800">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${category.color}`} />
        </div>
        <div>
          <h4 className="font-medium text-earth-800 dark:text-earth-100">Quick Calculate</h4>
          <p className="text-xs text-earth-500 dark:text-earth-400">Real-time emissions</p>
        </div>
      </div>

      <div className="space-y-3">
        <select
          value={category.id}
          onChange={(e) => {
            const cat = categories.find((c) => c.id === e.target.value);
            if (cat) setCategory(cat);
          }}
          className="w-full px-3 py-2 rounded-lg border border-earth-200 dark:border-earth-600 
                   bg-white dark:bg-earth-700 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="relative">
          <input
            type="number"
            placeholder="Enter value..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 pr-16 rounded-lg border border-earth-200 dark:border-earth-600 
                     bg-white dark:bg-earth-700 text-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-earth-500">
            {category.units[0]}
          </span>
        </div>

        <motion.div
          className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-earth-800 border border-grass-200 dark:border-grass-800"
          animate={{ scale: emissions > 0 ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-sm text-earth-600 dark:text-earth-400">Result:</span>
          <span className="text-lg font-bold text-grass-600 dark:text-grass-400">
            {formatNumber(emissions)} <span className="text-sm font-normal">kg CO₂e</span>
          </span>
        </motion.div>
      </div>
    </div>
  );
};

// Scope Summary Component
export const ScopeSummary: React.FC<{
  scope1: number;
  scope2: number;
  scope3: number;
  comparison?: { scope1: number; scope2: number; scope3: number };
}> = ({ scope1, scope2, scope3, comparison }) => {
  const total = scope1 + scope2 + scope3;
  const scopes = [
    { name: 'Scope 1', value: scope1, color: '#16a34a', icon: Factory },
    { name: 'Scope 2', value: scope2, color: '#22c55e', icon: Zap },
    { name: 'Scope 3', value: scope3, color: '#86efac', icon: Building2 },
  ];

  return (
    <div className="space-y-4">
      {scopes.map((scope, index) => {
        const percentage = total > 0 ? (scope.value / total) * 100 : 0;
        const prevValue = comparison ? Object.values(comparison)[index] : null;
        const change = prevValue ? ((scope.value - prevValue) / prevValue) * 100 : null;

        return (
          <div key={scope.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: scope.color }}
                />
                <span className="text-sm font-medium text-earth-700 dark:text-earth-300">
                  {scope.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-earth-800 dark:text-earth-100">
                  {formatNumber(scope.value / 1000)} tCO₂e
                </span>
                {change !== null && (
                  <span className={`flex items-center text-xs ${change < 0 ? 'text-grass-600' : 'text-red-500'}`}>
                    {change < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {Math.abs(change).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <Progress value={percentage} max={100} variant="grass" size="sm" />
          </div>
        );
      })}

      <div className="pt-3 border-t border-earth-200 dark:border-earth-700">
        <div className="flex items-center justify-between">
          <span className="font-medium text-earth-700 dark:text-earth-300">Total</span>
          <span className="text-lg font-bold text-earth-800 dark:text-earth-100">
            {formatNumber(total / 1000)} tCO₂e
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmissionCalculator;
