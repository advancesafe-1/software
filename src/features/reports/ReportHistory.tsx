import React, { useState, useEffect } from 'react';
import type { ReportListItem } from './reports-types';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

export function ReportHistory() {
  const [list, setList] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const api = window.advancesafe?.reports;
    if (api?.getList) {
      api.getList().then((r: unknown) => {
        setList(Array.isArray(r) ? r as ReportListItem[] : []);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpen = (path: string) => {
    window.advancesafe?.reports?.open?.(path);
  };

  const handleDelete = (path: string, name: string) => {
    if (!confirm('Delete report "' + name + '"?')) return;
    window.advancesafe?.reports?.delete?.(path).then(() => load());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-cyan)] border-t-transparent" />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-8 text-center text-[var(--text-secondary)]">
        No reports generated yet. Generate a report using the cards above.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]">
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Report Name</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Generated</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Size</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.path} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-tertiary)]">
              <td className="px-4 py-3 text-[var(--text-primary)]">{item.name}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(item.createdAt)}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{formatSize(item.size)}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => handleOpen(item.path)} className="mr-2 text-[var(--accent-cyan)] hover:underline">Open</button>
                <button type="button" onClick={() => handleDelete(item.path, item.name)} className="text-[var(--status-danger)] hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
