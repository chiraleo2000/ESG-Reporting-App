import React from 'react';
import { Link } from 'react-router-dom';
import { mainTabs } from '@/components/layout/MainNav';
import { Card } from '@/components/ui/Card';

export const HelpGuide: React.FC = () => (
  <div className="space-y-4">
    <h1 className="text-2xl font-semibold text-earth-800 dark:text-earth-100">Help</h1>
    <p className="text-sm text-earth-500">Use the large tabs at the top. Each tab opens only its own sections.</p>
    <div className="grid gap-3 md:grid-cols-2">
      {mainTabs.map((tab) => (
        <Card key={tab.id}>
          <h2 className="text-lg font-medium">{tab.name}</h2>
          <p className="mt-1 text-sm text-earth-500">
            {tab.children.length > 0 ? tab.children.map((child) => child.name).join(', ') : 'Project dashboard'}
          </p>
          <Link className="mt-3 inline-block text-sm font-semibold text-azure-600" to={tab.path}>Open {tab.name}</Link>
        </Card>
      ))}
    </div>
    <Card>
      <h2 className="text-lg font-medium">AI Assistant</h2>
      <p className="mt-1 text-sm text-earth-500">The assistant answers from a fixed list of phrases. It is not connected to a model.</p>
      <Link className="mt-3 inline-block text-sm font-semibold text-azure-600" to="/ai-assistant">Open the demo assistant</Link>
    </Card>
  </div>
);
