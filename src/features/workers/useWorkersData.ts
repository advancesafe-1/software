import { useState, useEffect, useMemo } from 'react';

export interface WorkerRow {
  id: string;
  organization_id: string;
  employee_id: string;
  name: string;
  role: string | null;
  department: string | null;
  phone: string | null;
  is_contract_worker: number;
  contractor_company: string | null;
  language_preference: string;
  current_zone_id: string | null;
  current_zone_name: string | null;
}

export interface WorkerCounts {
  total: number;
  activeNow: number;
  contractWorkers: number;
  permanentWorkers: number;
}

const REFRESH_MS = 30_000;

function sanitizeSearch(s: string): string {
  return s.replace(/[%_\\]/g, '').trim().slice(0, 200);
}

export function useWorkersData(searchQuery: string) {
  const [list, setList] = useState<WorkerRow[]>([]);
  const [counts, setCounts] = useState<WorkerCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = useMemo(() => sanitizeSearch(searchQuery), [searchQuery]);

  useEffect(() => {
    const api = window.advancesafe?.features?.workers;
    if (!api) return;
    setError(null);
    setLoading(true);
    api
      .getAll(search ? { search, limit: 200, offset: 0 } : { limit: 200, offset: 0 })
      .then((rows: unknown) => setList(Array.isArray(rows) ? (rows as WorkerRow[]) : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    api.getCounts().then((c: unknown) => setCounts(c as WorkerCounts)).catch(() => {});
  }, [search]);

  useEffect(() => {
    const t = setInterval(() => {
      const api = window.advancesafe?.features?.workers;
      if (!api) return;
      api.getAll(search ? { search, limit: 200, offset: 0 } : { limit: 200, offset: 0 }).then((rows: unknown) => setList(Array.isArray(rows) ? (rows as WorkerRow[]) : []));
      api.getCounts().then((c: unknown) => setCounts(c as WorkerCounts)).catch(() => {});
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [search]);

  return { list, counts, loading, error };
}
