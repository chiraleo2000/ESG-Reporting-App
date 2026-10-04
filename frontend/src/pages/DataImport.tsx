import React, { useEffect, useState } from 'react';
import { filesApi } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TARGETS = ['Name', 'Scope', 'Activity Type', 'Quantity', 'Unit', 'Description'];

interface FileRow {
  id: string;
  originalName?: string;
  original_name?: string;
  createdAt?: string;
  created_at?: string;
}

export const DataImport: React.FC = () => {
  const currentProject = useAppStore((state) => state.currentProject);
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<FileRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadHistory = async (projectId: string) => {
    const response = await filesApi.listByProject(projectId);
    if (!response.success) {
      setError(response.error || 'Could not load import history');
      setHistory([]);
      return;
    }
    const data = response.data as { files?: FileRow[] } | FileRow[] | undefined;
    const list = Array.isArray(data) ? data : data?.files || [];
    setHistory(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    if (!currentProject?.id) {
      setHistory([]);
      return;
    }
    loadHistory(currentProject.id);
  }, [currentProject?.id]);

  const downloadTemplate = async (format: string) => {
    setError(null);
    const response = await filesApi.downloadTemplate(format);
    if (!response.ok) {
      setError('Could not download the template');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity_template.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uploadAndParse = async () => {
    if (!file || !currentProject?.id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const uploaded = await filesApi.upload(file, currentProject.id);
    if (!uploaded?.success || !uploaded.data?.id) {
      setError(uploaded?.error || uploaded?.message || 'Upload failed');
      setBusy(false);
      return;
    }
    setFileId(uploaded.data.id);
    const parsed = await filesApi.parse(uploaded.data.id);
    if (!parsed.success) {
      setError(parsed.error || 'Could not read the file');
      setBusy(false);
      return;
    }
    const data = parsed.data as { headers?: string[] };
    const nextHeaders = data.headers || [];
    setHeaders(nextHeaders);
    const nextMappings: Record<string, string> = {};
    for (const target of TARGETS) {
      const match = nextHeaders.find((header) => header.toLowerCase() === target.toLowerCase());
      if (match) nextMappings[target] = match;
    }
    setMappings(nextMappings);
    setNotice('File read. Check the column mapping, then import.');
    await loadHistory(currentProject.id);
    setBusy(false);
  };

  const importRows = async () => {
    if (!fileId || !currentProject?.id) return;
    setBusy(true);
    setError(null);
    const response = await filesApi.importAsActivities(fileId, currentProject.id, mappings);
    if (!response.success) {
      setError(response.error || 'Import failed');
    } else {
      const imported = (response.data as { imported?: number })?.imported;
      setNotice(`Imported ${imported ?? 0} activities.`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-earth-800 dark:text-earth-100">Import activities</h1>
          <p className="text-sm text-earth-500">Upload a spreadsheet, map the columns, and create activities.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadTemplate('xlsx')}>Excel template</Button>
          <Button variant="outline" onClick={() => downloadTemplate('csv')}>CSV template</Button>
        </div>
      </div>
      {error && <div role="alert" className="rounded-lg border border-error-500 bg-red-50 px-4 py-3 text-sm text-error-600">{error}</div>}
      {notice && <div className="rounded-lg border border-sustain-500 bg-green-50 px-4 py-3 text-sm">{notice}</div>}
      <Card>
        {!currentProject && <p className="text-sm text-earth-500">Select a project before uploading.</p>}
        {currentProject && (
          <div className="space-y-3">
            <input aria-label="Activity file" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <Button variant="primary" disabled={!file || busy} onClick={uploadAndParse}>{busy ? 'Working…' : 'Upload and read'}</Button>
            {headers.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {TARGETS.map((target) => (
                  <label key={target} className="text-sm">
                    {target}
                    <select
                      className="mt-1 w-full rounded-lg border border-earth-200 px-3 py-2 dark:border-earth-600 dark:bg-earth-900"
                      value={mappings[target] || ''}
                      onChange={(event) => setMappings((current) => ({ ...current, [target]: event.target.value }))}
                    >
                      <option value="">Skip</option>
                      {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
                <Button variant="primary" disabled={busy} onClick={importRows}>Import activities</Button>
              </div>
            )}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-2 text-lg font-medium">Files for this project</h2>
        {history.length === 0 && <p className="text-sm text-earth-500">No files uploaded yet.</p>}
        <ul className="divide-y divide-earth-100 text-sm dark:divide-earth-700">
          {history.map((row) => (
            <li key={row.id} className="py-2">{row.originalName || row.original_name || row.id}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
