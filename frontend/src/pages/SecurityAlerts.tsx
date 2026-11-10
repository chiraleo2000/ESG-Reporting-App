import React, { useCallback, useEffect, useState } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { securityApi, type SecurityAlert, type SecuritySummary } from '@/lib/api';

const severityVariant = (severity: string): 'error' | 'warning' | 'info' | 'default' => {
  if (severity === 'critical' || severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  if (severity === 'low') return 'info';
  return 'default';
};

export const SecurityAlerts: React.FC = () => {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [summaryRes, alertsRes] = await Promise.all([
      securityApi.getSummary(),
      securityApi.getAlerts({ resolved: false, limit: 100 }),
    ]);
    if (!summaryRes.success) {
      setError(summaryRes.error || 'Could not load security summary');
      setLoading(false);
      return;
    }
    setSummary(summaryRes.data || null);
    if (!alertsRes.success) {
      setError(alertsRes.error || 'Could not load alerts');
      setAlerts([]);
    } else {
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    const res = await securityApi.resolveAlert(id);
    if (!res.success) {
      setError(res.error || 'Could not resolve alert');
    } else {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      if (summary) {
        setSummary({ ...summary, unresolved: Math.max(0, summary.unresolved - 1) });
      }
    }
    setResolvingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100 flex items-center gap-2">
            <Shield className="w-7 h-7 text-grass-600" />
            Security alerts
          </h1>
          <p className="text-sm text-earth-500 dark:text-earth-400 mt-1">
            Monitor authentication anomalies and sensitive access patterns
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error-500 bg-red-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-earth-500">Unresolved alerts</p>
            <p className="text-2xl font-bold text-earth-800 dark:text-earth-100 mt-1">{summary.unresolved}</p>
          </Card>
          <Card>
            <p className="text-sm text-earth-500">Failed auth (24h)</p>
            <p className="text-2xl font-bold text-earth-800 dark:text-earth-100 mt-1">{summary.failedAuthLast24h}</p>
          </Card>
          <Card>
            <p className="text-sm text-earth-500">Sensitive reads (24h)</p>
            <p className="text-2xl font-bold text-earth-800 dark:text-earth-100 mt-1">{summary.sensitiveReadsLast24h}</p>
          </Card>
          <Card>
            <p className="text-sm text-earth-500 mb-2">By severity</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(summary.bySeverity).length === 0 ? (
                <span className="text-sm text-earth-400">None open</span>
              ) : (
                Object.entries(summary.bySeverity).map(([sev, count]) => (
                  <Badge key={sev} variant={severityVariant(sev)} size="sm">
                    {sev}: {count}
                  </Badge>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title="Open alerts" subtitle="Review and resolve security events" />
        {loading && <p className="text-sm text-earth-500 p-4">Loading…</p>}
        {!loading && alerts.length === 0 && (
          <p className="text-sm text-earth-500 p-4">No unresolved alerts.</p>
        )}
        {!loading && alerts.length > 0 && (
          <Table variant="striped" className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Badge variant={severityVariant(alert.severity)} size="sm">
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-earth-800 dark:text-earth-100">{alert.title}</p>
                    {alert.description && (
                      <p className="text-xs text-earth-500 mt-0.5 max-w-md">{alert.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-earth-600 dark:text-earth-300">{alert.alertType}</TableCell>
                  <TableCell className="text-earth-500 text-xs">
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resolvingId === alert.id}
                      onClick={() => handleResolve(alert.id)}
                    >
                      {resolvingId === alert.id ? 'Resolving…' : 'Resolve'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default SecurityAlerts;
