import React, { useCallback, useEffect, useState } from 'react';
import { reportsApi, signaturesApi } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface SignatureRow {
  id: string;
  reportId: string;
  standard?: string;
  signatureType?: string;
  signer?: { name?: string; email?: string };
  createdAt?: string;
}

export const Signatures: React.FC = () => {
  const { currentProject, user } = useAppStore();
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [reports, setReports] = useState<Array<{ id: string; title?: string; standard?: string }>>([]);
  const [reportId, setReportId] = useState('');
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentProject?.id) {
      setRows([]);
      setReports([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const [signatureResponse, reportResponse] = await Promise.all([
      signaturesApi.getByProject(currentProject.id),
      reportsApi.getByProject(currentProject.id),
    ]);
    if (!signatureResponse.success) {
      setRows([]);
      setError(signatureResponse.error || 'Could not load signatures');
    } else {
      const data = signatureResponse.data;
      setRows(Array.isArray(data) ? data as SignatureRow[] : []);
    }
    if (reportResponse.success) {
      const data = reportResponse.data as { reports?: unknown[] } | unknown[] | undefined;
      const list = Array.isArray(data) ? data : data?.reports || [];
      setReports(Array.isArray(list) ? list as Array<{ id: string; title?: string; standard?: string }> : []);
    }
    setLoading(false);
  }, [currentProject?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const sign = async () => {
    if (!reportId || !user) return;
    setNotice(null);
    setError(null);
    const response = await signaturesApi.sign(reportId, {
      signerName: user.name,
      signerTitle: title || user.role,
      signerOrganization: organization || 'Independent',
    });
    if (!response.success) {
      setError(response.error || 'Could not sign the report');
      return;
    }
    setNotice('Report signed.');
    await load();
  };

  const verify = async (id: string) => {
    setNotice(null);
    setError(null);
    const response = await signaturesApi.verify(id);
    if (!response.success) {
      setError(response.error || 'Verification failed');
      return;
    }
    setNotice('Signature verified.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-earth-800 dark:text-earth-100">Digital signatures</h1>
          <p className="text-sm text-earth-500">Sign a report for the current project, or verify one that is already signed.</p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-error-500 bg-red-50 px-4 py-3 text-sm text-error-600">{error}</div>}
      {notice && <div className="rounded-lg border border-sustain-500 bg-green-50 px-4 py-3 text-sm text-sustain-700">{notice}</div>}

      <Card>
        <h2 className="mb-3 text-lg font-medium">Sign a report</h2>
        {!currentProject ? (
          <p className="text-sm text-earth-500">Select a project to see reports you can sign.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Report
              <select className="mt-1 w-full rounded-lg border border-earth-200 px-3 py-2 dark:border-earth-600 dark:bg-earth-900" value={reportId} onChange={(event) => setReportId(event.target.value)}>
                <option value="">Choose a report</option>
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>{report.title || report.standard || report.id}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Title
              <input className="mt-1 w-full rounded-lg border border-earth-200 px-3 py-2 dark:border-earth-600 dark:bg-earth-900" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Sustainability lead" />
            </label>
            <label className="text-sm md:col-span-2">
              Organization
              <input className="mt-1 w-full rounded-lg border border-earth-200 px-3 py-2 dark:border-earth-600 dark:bg-earth-900" value={organization} onChange={(event) => setOrganization(event.target.value)} />
            </label>
            <Button variant="primary" onClick={sign} disabled={!reportId}>Sign report</Button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-medium">Signatures on this project</h2>
        {loading && <p className="text-sm text-earth-500">Loading signatures…</p>}
        {!loading && rows.length === 0 && !error && <p className="text-sm text-earth-500">No signatures yet. Sign a report above.</p>}
        <ul className="divide-y divide-earth-100 dark:divide-earth-700">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium">{row.signer?.name || 'Signer'} · {row.standard || row.signatureType || 'approval'}</p>
                <p className="text-earth-500">{row.createdAt ? new Date(row.createdAt).toLocaleString() : row.reportId}</p>
              </div>
              <Button variant="outline" onClick={() => verify(row.reportId)}>Verify</Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
