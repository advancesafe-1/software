import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/store/toast-store';
import { useAppStore } from '@/store/app-store';
import { INDIAN_STATES, INDUSTRY_TYPES } from '@/onboarding/onboarding-validation';

interface OrgProfileForm {
  name: string;
  address: string;
  city: string;
  state: string;
  industryType: string;
  totalWorkers: number;
  gstNumber: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const emptyForm: OrgProfileForm = {
  name: '',
  address: '',
  city: '',
  state: '',
  industryType: '',
  totalWorkers: 0,
  gstNumber: '',
  primaryContactName: '',
  primaryContactPhone: '',
  primaryContactEmail: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

function toForm(row: Record<string, unknown> | null): OrgProfileForm {
  if (!row) return { ...emptyForm };
  return {
    name: String(row.name ?? ''),
    address: String(row.address ?? ''),
    city: String(row.city ?? ''),
    state: String(row.state ?? ''),
    industryType: String(row.industry_type ?? ''),
    totalWorkers: Number(row.total_workers ?? 0),
    gstNumber: String(row.gst_number ?? ''),
    primaryContactName: String(row.primary_contact_name ?? ''),
    primaryContactPhone: String(row.primary_contact_phone ?? ''),
    primaryContactEmail: String(row.primary_contact_email ?? ''),
    emergencyContactName: String(row.emergency_contact_name ?? ''),
    emergencyContactPhone: String(row.emergency_contact_phone ?? ''),
  };
}

export function OrganizationSettings() {
  const [form, setForm] = useState<OrgProfileForm>(emptyForm);
  const [initial, setInitial] = useState<OrgProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);

  const load = useCallback(async () => {
    const row = await window.advancesafe?.admin?.org?.getProfile?.();
    const f = toForm(row as Record<string, unknown> | null);
    setForm(f);
    setInitial(f);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initial);

  const handleSave = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      const result = await window.advancesafe?.admin?.org?.updateProfile?.({
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        industryType: form.industryType || null,
        totalWorkers: form.totalWorkers,
        gstNumber: form.gstNumber || null,
        primaryContactName: form.primaryContactName || null,
        primaryContactPhone: form.primaryContactPhone || null,
        primaryContactEmail: form.primaryContactEmail || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        userId: currentUser.id,
      });
      if (result?.success) {
        setInitial(form);
        toast.success('Profile saved');
      } else {
        toast.error(result?.error ?? 'Save failed');
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => setForm(initial);

  if (loading) return <div className="font-mono text-sm text-[var(--text-dim)]">Loading…</div>;

  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">ORGANIZATION PROFILE</h2>
      <p className="mt-1 font-mono text-xs text-[var(--text-dim)]">Edit organization details</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Organization Name</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={150} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Address</label>
            <textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} maxLength={300} rows={2} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">City</label>
            <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} maxLength={100} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">State</label>
            <select value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]">
              <option value="">Select</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Industry Type</label>
            <select value={form.industryType} onChange={(e) => setForm((p) => ({ ...p, industryType: e.target.value }))} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]">
              <option value="">Select</option>
              {INDUSTRY_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Total Workers</label>
            <input type="number" min={0} max={100000} value={form.totalWorkers || ''} onChange={(e) => setForm((p) => ({ ...p, totalWorkers: parseInt(e.target.value, 10) || 0 }))} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">GST Number</label>
            <input value={form.gstNumber} onChange={(e) => setForm((p) => ({ ...p, gstNumber: e.target.value }))} maxLength={15} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Primary Contact Name</label>
            <input value={form.primaryContactName} onChange={(e) => setForm((p) => ({ ...p, primaryContactName: e.target.value }))} maxLength={100} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Primary Contact Phone</label>
            <input type="tel" value={form.primaryContactPhone} onChange={(e) => setForm((p) => ({ ...p, primaryContactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Primary Contact Email</label>
            <input type="email" value={form.primaryContactEmail} onChange={(e) => setForm((p) => ({ ...p, primaryContactEmail: e.target.value }))} maxLength={150} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Emergency Contact Name</label>
            <input value={form.emergencyContactName} onChange={(e) => setForm((p) => ({ ...p, emergencyContactName: e.target.value }))} maxLength={100} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">Emergency Contact Phone</label>
            <input type="tel" value={form.emergencyContactPhone} onChange={(e) => setForm((p) => ({ ...p, emergencyContactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={handleSave} disabled={!hasChanges || saving} className="rounded bg-[var(--accent-cyan)] px-3 py-1.5 font-mono text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50">Save changes</button>
        <button type="button" onClick={handleCancel} disabled={!hasChanges} className="rounded border border-[var(--border-default)] px-3 py-1.5 font-mono text-sm text-[var(--text-secondary)] disabled:opacity-50">Cancel</button>
      </div>
    </Card>
  );
}
