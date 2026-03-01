import React, { useState, useEffect, useCallback } from 'react';
import type { ReportType, ReportConfig, ReportJob } from './reports-types';
import { REPORT_TYPE_LABELS, REPORT_SECTIONS_UI } from './reports-types';

const QUICK_RANGES: { label: string; getValue: () => { from: string; to: string } }[] = [
  { label: 'Last 7 Days', getValue: () => { const d = new Date(); const to = d.toISOString().slice(0, 10); d.setDate(d.getDate() - 7); return { from: d.toISOString().slice(0, 10), to }; } },
  { label: 'Last 30 Days', getValue: () => { const d = new Date(); const to = d.toISOString().slice(0, 10); d.setDate(d.getDate() - 30); return { from: d.toISOString().slice(0, 10), to }; } },
  { label: 'Last 90 Days', getValue: () => { const d = new Date(); const to = d.toISOString().slice(0, 10); d.setDate(d.getDate() - 90); return { from: d.toISOString().slice(0, 10), to }; } },
  { label: 'This Month', getValue: () => { const d = new Date(); const to = d.toISOString().slice(0, 10); const from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; return { from, to }; } },
  { label: 'Last Month', getValue: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const lastDay = new Date(y, d.getMonth() + 1, 0).getDate(); return { from: y + '-' + m + '-01', to: y + '-' + m + '-' + String(lastDay).padStart(2, '0') }; } },
  { label: 'This Year', getValue: () => { const d = new Date(); return { from: d.getFullYear() + '-01-01', to: d.toISOString().slice(0, 10) }; } },
];

interface ReportGeneratorProps {
  reportType: ReportType;
  organizationId: string;
  generatedBy: string;
  generatedByName: string;
  onClose: () => void;
  onGenerated: () => void;
}

export function ReportGenerator({
  reportType,
  organizationId,
  generatedBy,
  generatedByName,
  onClose,
  onGenerated,
}: ReportGeneratorProps) {
  const meta = REPORT_TYPE_LABELS[reportType];
  const sectionsForType = REPORT_SECTIONS_UI[reportType] ?? [];
  const defaultSections = sectionsForType.filter((s) => s.includeByDefault).map((s) => s.id);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState(meta.title);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sections, setSections] = useState<string[]>(defaultSections);
  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<ReportJob | null>(null);

  useEffect(() => {
    const d = new Date();
    const to = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - 30);
    setDateFrom(d.toISOString().slice(0, 10));
    setDateTo(to);
  }, []);

  const unsubProgress = useCallback(() => {
    const unsub = window.advancesafe?.reports?.onProgress?.((j) => setJob(j as ReportJob));
    return unsub;
  }, []);

  useEffect(() => {
    if (!generating) return;
    const unsub = unsubProgress();
    return () => unsub?.();
  }, [generating, unsubProgress]);

  useEffect(() => {
    if (job?.status === 'complete') onGenerated();
  }, [job?.status, onGenerated]);

  const toggleSection = (id: string) => {
    setSections((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setJob(null);
    const config: ReportConfig = {
      type: reportType,
      title,
      organizationId,
      generatedBy,
      generatedByName,
      dateFrom: dateFrom + 'T00:00:00',
      dateTo: dateTo + 'T23:59:59',
      sections,
    };
    try {
      const result = await window.advancesafe?.reports?.generate?.(config as unknown as Record<string, unknown>);
      if (result) setJob(result as ReportJob);
    } catch {
      setJob({ id: '', config, status: 'failed', progress: 0, outputPath: null, errorMessage: 'Generation failed', startedAt: '', completedAt: null, fileSizeBytes: null });
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenReport = () => {
    if (job?.outputPath) window.advancesafe?.reports?.open?.(job.outputPath);
    onGenerated();
    onClose();
  };

  const handleOpenFolder = () => {
    window.advancesafe?.reports?.openFolder?.();
  };

  const progressLabel = job?.progress < 30 ? 'Collecting data...' : job?.progress < 60 ? 'Building report...' : job?.progress < 95 ? 'Rendering PDF...' : 'Finalizing...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--bg-secondary)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[var(--border-default)] p-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Generate {meta.title}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{meta.description}</p>
        </div>
        <div className="p-4 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Report Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date Range</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {QUICK_RANGES.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => { const v = r.getValue(); setDateFrom(v.from); setDateTo(v.to); }}
                      className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] hover:bg-[var(--accent-cyan)]/20"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)]" />
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)]" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setStep(2)} className="rounded bg-[var(--accent-cyan)] px-4 py-2 font-medium text-[var(--bg-primary)]">Next: Sections</button>
              </div>
            </>
          )}
          {step === 2 && !generating && !job && (
            <>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Sections to include</label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setSections(sectionsForType.map((s) => s.id))} className="text-xs text-[var(--accent-cyan)]">All</button>
                    <button type="button" onClick={() => setSections(defaultSections)} className="text-xs text-[var(--accent-cyan)]">Default</button>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sectionsForType.map((s) => (
                    <label key={s.id} className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={sections.includes(s.id)} onChange={() => toggleSection(s.id)} className="mt-1" />
                      <span className="text-sm text-[var(--text-primary)]">{s.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="rounded border border-[var(--border-default)] px-4 py-2 text-[var(--text-primary)]">Back</button>
                <button type="button" onClick={handleGenerate} className="rounded bg-[var(--accent-cyan)] px-4 py-2 font-medium text-[var(--bg-primary)]">Generate Report</button>
              </div>
            </>
          )}
          {generating && (
            <div className="py-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full border-4 border-[var(--accent-cyan)] border-t-transparent animate-spin mb-4" />
              <p className="text-[var(--text-primary)] font-medium">{progressLabel}</p>
              <p className="text-sm text-[var(--text-secondary)]">{job?.progress ?? 0}%</p>
            </div>
          )}
          {job?.status === 'complete' && (
            <div className="py-4 text-center">
              <p className="text-[var(--status-safe)] font-medium mb-2">Report generated</p>
              {job.fileSizeBytes != null && <p className="text-sm text-[var(--text-secondary)] mb-4">Size: {(job.fileSizeBytes / 1024).toFixed(1)} KB</p>}
              <div className="flex flex-wrap gap-2 justify-center">
                <button type="button" onClick={handleOpenReport} className="rounded bg-[var(--accent-cyan)] px-4 py-2 font-medium text-[var(--bg-primary)]">Open Report</button>
                <button type="button" onClick={handleOpenFolder} className="rounded border border-[var(--border-default)] px-4 py-2 text-[var(--text-primary)]">Open Folder</button>
                <button type="button" onClick={() => { onGenerated(); onClose(); }} className="rounded border border-[var(--border-default)] px-4 py-2 text-[var(--text-primary)]">Generate Another</button>
              </div>
            </div>
          )}
          {job?.status === 'failed' && (
            <div className="py-4">
              <p className="text-[var(--status-danger)] mb-2">{job.errorMessage ?? 'Generation failed'}</p>
              <button type="button" onClick={() => { setJob(null); setGenerating(false); }} className="rounded border border-[var(--border-default)] px-4 py-2 text-[var(--text-primary)]">Try Again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
