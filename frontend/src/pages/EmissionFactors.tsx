import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Database,
  Globe,
  Calendar,
  Leaf,
  Factory,
  Zap,
  Truck,
  Building,
  RefreshCw,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Demo emission factors data
const gridEmissionFactors = [
  { id: 1, country: 'Thailand', region: 'National Grid', year: 2025, factor: 0.4561, unit: 'kgCO2e/kWh', source: 'EGAT 2024' },
  { id: 2, country: 'Thailand', region: 'National Grid', year: 2024, factor: 0.4672, unit: 'kgCO2e/kWh', source: 'EGAT 2023' },
  { id: 3, country: 'Singapore', region: 'National Grid', year: 2025, factor: 0.4085, unit: 'kgCO2e/kWh', source: 'EMA Singapore' },
  { id: 4, country: 'China', region: 'North Grid', year: 2025, factor: 0.5810, unit: 'kgCO2e/kWh', source: 'NDRC China' },
  { id: 5, country: 'China', region: 'East Grid', year: 2025, factor: 0.5102, unit: 'kgCO2e/kWh', source: 'NDRC China' },
  { id: 6, country: 'Japan', region: 'Tokyo Electric', year: 2025, factor: 0.4410, unit: 'kgCO2e/kWh', source: 'TEPCO' },
  { id: 7, country: 'South Korea', region: 'KEPCO Grid', year: 2025, factor: 0.4590, unit: 'kgCO2e/kWh', source: 'KEPCO' },
  { id: 8, country: 'EU Average', region: 'European Union', year: 2025, factor: 0.2560, unit: 'kgCO2e/kWh', source: 'EEA' },
  { id: 9, country: 'UK', region: 'National Grid', year: 2025, factor: 0.2121, unit: 'kgCO2e/kWh', source: 'DEFRA' },
];

const fuelFactors = [
  { id: 1, fuel: 'Natural Gas', unit: 'kgCO2e/m³', factor: 2.02, scope: 'Scope 1', source: 'IPCC 2019' },
  { id: 2, fuel: 'Diesel', unit: 'kgCO2e/liter', factor: 2.68, scope: 'Scope 1', source: 'DEFRA 2024' },
  { id: 3, fuel: 'Petrol/Gasoline', unit: 'kgCO2e/liter', factor: 2.31, scope: 'Scope 1', source: 'DEFRA 2024' },
  { id: 4, fuel: 'LPG', unit: 'kgCO2e/kg', factor: 2.98, scope: 'Scope 1', source: 'IPCC 2019' },
  { id: 5, fuel: 'Coal (Bituminous)', unit: 'kgCO2e/kg', factor: 2.42, scope: 'Scope 1', source: 'IPCC 2019' },
  { id: 6, fuel: 'Fuel Oil', unit: 'kgCO2e/liter', factor: 3.17, scope: 'Scope 1', source: 'DEFRA 2024' },
];

const materialFactors = [
  { id: 1, material: 'Steel (BOF)', unit: 'tCO2e/tonne', factor: 1.95, category: 'CBAM Materials', source: 'EU CBAM' },
  { id: 2, material: 'Steel (EAF)', unit: 'tCO2e/tonne', factor: 0.35, category: 'CBAM Materials', source: 'EU CBAM' },
  { id: 3, material: 'Aluminum (Primary)', unit: 'tCO2e/tonne', factor: 15.15, category: 'CBAM Materials', source: 'EU CBAM' },
  { id: 4, material: 'Aluminum (Recycled)', unit: 'tCO2e/tonne', factor: 1.00, category: 'CBAM Materials', source: 'EU CBAM' },
  { id: 5, material: 'Cement', unit: 'tCO2e/tonne', factor: 0.73, category: 'CBAM Materials', source: 'EU CBAM' },
  { id: 6, material: 'Fertilizer (Urea)', unit: 'tCO2e/tonne', factor: 2.07, category: 'CBAM Materials', source: 'EU CBAM' },
];

export const EmissionFactors: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grid' | 'fuel' | 'materials'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const currentFactors = activeTab === 'grid' ? gridEmissionFactors : activeTab === 'fuel' ? fuelFactors : materialFactors;

  const filteredFactors = currentFactors.filter((f: any) => {
    const searchLower = searchTerm.toLowerCase();
    if (activeTab === 'grid') {
      return f.country.toLowerCase().includes(searchLower) || f.region.toLowerCase().includes(searchLower);
    } else if (activeTab === 'fuel') {
      return f.fuel.toLowerCase().includes(searchLower);
    } else {
      return f.material.toLowerCase().includes(searchLower);
    }
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
            Emission Factors Database
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Reference database of emission factors for GHG calculations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-grass-200 dark:bg-earth-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-grass-600 dark:text-grass-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Grid Factors</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{gridEmissionFactors.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Factory className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Fuel Factors</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{fuelFactors.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Material Factors</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{materialFactors.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Regions Covered</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">9</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={item}>
        <Card variant="default" className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search emission factors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('grid')}
              >
                <Zap className="w-4 h-4 mr-1" />
                Grid
              </Button>
              <Button
                variant={activeTab === 'fuel' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('fuel')}
              >
                <Factory className="w-4 h-4 mr-1" />
                Fuel
              </Button>
              <Button
                variant={activeTab === 'materials' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('materials')}
              >
                <Building className="w-4 h-4 mr-1" />
                Materials
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Data Table */}
      <motion.div variants={item}>
        <Card variant="default">
          <CardHeader
            title={activeTab === 'grid' ? 'Grid Emission Factors' : activeTab === 'fuel' ? 'Fuel Emission Factors' : 'Material Emission Factors'}
            subtitle={`${filteredFactors.length} factors found`}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-grass-100 dark:border-earth-700">
                  {activeTab === 'grid' ? (
                    <>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Country</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Region</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Year</th>
                      <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Factor</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Unit</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Source</th>
                    </>
                  ) : activeTab === 'fuel' ? (
                    <>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Fuel Type</th>
                      <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Factor</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Unit</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Scope</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Source</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Material</th>
                      <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Factor</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Unit</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Category</th>
                      <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Source</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredFactors.map((f: any) => (
                  <tr
                    key={f.id}
                    className="border-b border-grass-50 dark:border-earth-800 hover:bg-grass-50 dark:hover:bg-earth-800/50 transition-colors"
                  >
                    {activeTab === 'grid' ? (
                      <>
                        <td className="p-3 text-earth-800 dark:text-earth-100 font-medium">{f.country}</td>
                        <td className="p-3 text-earth-600 dark:text-earth-300">{f.region}</td>
                        <td className="p-3 text-earth-600 dark:text-earth-300">{f.year}</td>
                        <td className="p-3 text-right font-mono text-grass-600 dark:text-grass-400">{f.factor.toFixed(4)}</td>
                        <td className="p-3 text-earth-500 dark:text-earth-400 text-sm">{f.unit}</td>
                        <td className="p-3">
                          <Badge variant="default" size="sm">{f.source}</Badge>
                        </td>
                      </>
                    ) : activeTab === 'fuel' ? (
                      <>
                        <td className="p-3 text-earth-800 dark:text-earth-100 font-medium">{f.fuel}</td>
                        <td className="p-3 text-right font-mono text-grass-600 dark:text-grass-400">{f.factor.toFixed(2)}</td>
                        <td className="p-3 text-earth-500 dark:text-earth-400 text-sm">{f.unit}</td>
                        <td className="p-3">
                          <Badge variant="grass" size="sm">{f.scope}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="default" size="sm">{f.source}</Badge>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-earth-800 dark:text-earth-100 font-medium">{f.material}</td>
                        <td className="p-3 text-right font-mono text-grass-600 dark:text-grass-400">{f.factor.toFixed(2)}</td>
                        <td className="p-3 text-earth-500 dark:text-earth-400 text-sm">{f.unit}</td>
                        <td className="p-3">
                          <Badge variant="warning" size="sm">{f.category}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="default" size="sm">{f.source}</Badge>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default EmissionFactors;
