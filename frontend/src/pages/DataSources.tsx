import React, { useEffect, useMemo, useState } from 'react';
import { dataSourcesApi } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type ConnectorType = 'rest_api' | 'ssh_sftp' | 'file_upload';

interface SiteCard {
  id: string;
  name: string;
  type: ConnectorType;
  hint: string;
}

const CARDS: SiteCard[] = [
  { id: 'rest', name: 'Website or REST API', type: 'rest_api', hint: 'Pull activity data from an HTTPS endpoint.' },
  { id: 'sftp', name: 'Secure file server', type: 'ssh_sftp', hint: 'Read files from an SFTP server.' },
  { id: 'file', name: 'Spreadsheet or CSV', type: 'file_upload', hint: 'Use a file you already have. Continue in Import after saving.' },
  { id: 'utility', name: 'Utility or energy portal', type: 'rest_api', hint: 'A REST preset for an electricity or fuel portal.' },
  { id: 'supplier', name: 'Supplier data site', type: 'rest_api', hint: 'A REST preset for a supplier portal.' },
  { id: 'drop', name: 'Internal file drop', type: 'ssh_sftp', hint: 'An SFTP preset for an internal drop folder.' },
];

interface SavedSource {
  id: string;
  name: string;
  type: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  last_sync_status?: string;
  last_sync_error?: string;
}

const emptyConfig = (type: ConnectorType) => {
  if (type === 'rest_api') {
    return { baseUrl: '', authType: 'none', endpoints: { activities: '/data' } };
  }
  if (type === 'ssh_sftp') {
    return { host: '', port: 22, username: '', password: '', remotePath: '/' };
  }
  return { note: 'Upload the workbook from Import after this source is saved.' };
};

export const DataSources: React.FC = () => {
  const currentProject = useAppStore((state) => state.currentProject);
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [card, setCard] = useState<SiteCard | null>(null);
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('0 2 * * *');
  const [configText, setConfigText] = useState('');
  const [mappingText, setMappingText] = useState('{\n  "name": "name"\n}');
  const [tested, setTested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (projectId: string) => {
    setLoading(true);
    const response = await dataSourcesApi.list(projectId);
    if (!response.success) {
      setError(response.error || 'Could not load connections');
      setSources([]);
    } else {
      setError(null);
      setSources(Array.isArray(response.data) ? response.data as SavedSource[] : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!currentProject?.id) {
      setSources([]);
      return;
    }
    load(currentProject.id);
  }, [currentProject?.id]);

  const parsedConfig = useMemo(() => {
    try {
      return JSON.parse(configText) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [configText]);

  const openCard = (next: SiteCard) => {
    setCard(next);
    setName(next.name);
    setConfigText(JSON.stringify(emptyConfig(next.type), null, 2));
    setTested(false);
    setError(null);
    setNotice(null);
  };

  const testConnection = async () => {
    if (!card || !parsedConfig) {
      setError('Connection details must be valid JSON.');
      setTested(false);
      return;
    }
    setError(null);
    const response = await dataSourcesApi.testConnection(card.type, parsedConfig);
    if (!response.success) {
      setTested(false);
      setError(response.error || (response as { message?: string }).message || 'Connection test failed');
      return;
    }
    setTested(true);
    setNotice(response.message || 'Connection successful');
  };

  const save = async () => {
    if (!card || !currentProject?.id || !parsedConfig || !tested) return;
    let mapping: Record<string, string> = {};
    try {
      mapping = mappingText.trim() ? JSON.parse(mappingText) : {};
    } catch {
      setError('Field mapping must be valid JSON.');
      return;
    }
    const response = await dataSourcesApi.create(currentProject.id, {
      name,
      type: card.type,
      config: parsedConfig,
      schedule: card.type === 'file_upload' ? undefined : schedule,
      mapping,
    });
    if (!response.success) {
      setError(response.error || 'Could not save the connection');
      return;
    }
    setNotice('Connection saved.');
    setCard(null);
    setTested(false);
    await load(currentProject.id);
  };

  const sync = async (id: string) => {
    if (!currentProject?.id) return;
    const response = await dataSourcesApi.sync(currentProject.id, id);
    if (!response.success) setError(response.error || 'Sync failed');
    else setNotice(response.message || 'Sync finished');
    await load(currentProject.id);
  };

  const remove = async (id: string) => {
    if (!currentProject?.id) return;
    const response = await dataSourcesApi.remove(currentProject.id, id);
    if (!response.success) setError(response.error || 'Could not remove the connection');
    await load(currentProject.id);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-earth-800 dark:text-earth-100">Connect a site</h1>
      <p className="text-sm text-earth-500">Pick a source, test it, map the fields, and save it on this project.</p>
      {error && <div role="alert" className="rounded-lg border border-error-500 bg-red-50 px-4 py-3 text-sm text-error-600">{error}</div>}
      {notice && <div className="rounded-lg border border-sustain-500 bg-green-50 px-4 py-3 text-sm">{notice}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openCard(item)}
            className={`rounded-2xl border p-4 text-left transition-colors duration-150 ${card?.id === item.id ? 'border-azure-500 bg-azure-50' : 'border-earth-200 bg-white hover:border-azure-300 dark:border-earth-600 dark:bg-earth-800'}`}
          >
            <p className="text-base font-semibold">{item.name}</p>
            <p className="mt-1 text-sm text-earth-500">{item.hint}</p>
          </button>
        ))}
      </div>

      {card && (
        <Card>
          <h2 className="mb-3 text-lg font-medium">{card.name}</h2>
          {!currentProject && <p className="text-sm text-earth-500">Select a project before saving.</p>}
          <div className="grid gap-3">
            <label className="text-sm">
              Name
              <input className="mt-1 w-full rounded-lg border border-earth-200 px-3 py-2 dark:border-earth-600 dark:bg-earth-900" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="text-sm">
              Connection details (JSON)
              <textarea aria-label="Connection details" className="mt-1 h-36 w-full rounded-lg border border-earth-200 px-3 py-2 font-mono text-xs dark:border-earth-600 dark:bg-earth-900" value={configText} onChange={(event) => { setConfigText(event.target.value); setTested(false); }} />
            </label>
            <label className="text-sm">
              Field mapping (JSON)
              <textarea aria-label="Field mapping" className="mt-1 h-24 w-full rounded-lg border border-earth-200 px-3 py-2 font-mono text-xs dark:border-earth-600 dark:bg-earth-900" value={mappingText} onChange={(event) => setMappingText(event.target.value)} />
            </label>
            {card.type !== 'file_upload' && (
              <label className="text-sm">
                Schedule (cron)
                <input className="mt-1 w-full rounded-lg border border-earth-200 px-3 py-2 dark:border-earth-600 dark:bg-earth-900" value={schedule} onChange={(event) => setSchedule(event.target.value)} />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={testConnection}>Test connection</Button>
              <Button variant="primary" disabled={!tested || !currentProject} onClick={save}>Save connection</Button>
            </div>
            {!tested && <p className="text-sm text-earth-500">Save stays off until the connection test succeeds.</p>}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-lg font-medium">Saved sites</h2>
        {loading && <p className="text-sm text-earth-500">Loading connections…</p>}
        {!loading && sources.length === 0 && <p className="text-sm text-earth-500">No sites saved for this project.</p>}
        <ul className="divide-y divide-earth-100 dark:divide-earth-700">
          {sources.map((source) => {
            const status = source.lastSyncStatus || source.last_sync_status || 'not run';
            const syncError = source.lastSyncError || source.last_sync_error;
            return (
              <li key={source.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{source.name} · {source.type}</p>
                  <p className="text-earth-500">Last sync: {status}{syncError ? ` — ${syncError}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => sync(source.id)}>Sync</Button>
                  <Button variant="outline" onClick={() => remove(source.id)}>Remove</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
};
