import React, { useEffect, useState } from 'react';
import { auditLogsApi } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { Card } from '@/components/ui/Card';

interface AuditRow {
  id: string;
  userName?: string;
  action: string;
  entityType?: string;
  createdAt?: string;
}

export const AuditLog: React.FC = () => {
  const currentProject = useAppStore((state) => state.currentProject);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentProject?.id) {
      setRows([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    auditLogsApi.getByProject(currentProject.id).then((response) => {
      if (cancelled) return;
      if (!response.success) {
        setRows([]);
        setError(response.error || 'Could not load the audit log');
      } else {
        setError(null);
        setRows(Array.isArray(response.data) ? response.data as AuditRow[] : []);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentProject?.id]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-earth-800 dark:text-earth-100">Audit log</h1>
      <p className="text-sm text-earth-500">Changes recorded for the project selected in the header.</p>
      {error && <div role="alert" className="rounded-lg border border-error-500 bg-red-50 px-4 py-3 text-sm text-error-600">{error}</div>}
      <Card>
        {loading && <p className="text-sm text-earth-500">Loading audit log…</p>}
        {!currentProject && <p className="text-sm text-earth-500">Select a project to load its audit log.</p>}
        {currentProject && !loading && rows.length === 0 && !error && (
          <p className="text-sm text-earth-500">No audit entries for this project yet.</p>
        )}
        <ul className="divide-y divide-earth-100 dark:divide-earth-700">
          {rows.map((row) => (
            <li key={row.id} className="py-3 text-sm">
              <p className="font-medium">{row.action}{row.entityType ? ` · ${row.entityType}` : ''}</p>
              <p className="text-earth-500">{row.userName || 'Unknown user'}{row.createdAt ? ` · ${new Date(row.createdAt).toLocaleString()}` : ''}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
