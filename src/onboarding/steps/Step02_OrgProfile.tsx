import { useCallback, useState } from 'react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import {
  validateIndianPhone,
  validateEmail,
  validateGstNumber,
  sanitizeOrgProfileField,
  INDIAN_STATES,
  INDUSTRY_TYPES,
} from '../onboarding-validation';

interface Step02Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

const fieldErrors = (p: OnboardingState['orgProfile']) => {
  const err: Record<string, string> = {};
  if (p.name.trim().length === 0) err.name = 'Required';
  if (p.address.trim().length === 0) err.address = 'Required';
  if (p.city.trim().length === 0) err.city = 'Required';
  if (p.state.trim().length === 0) err.state = 'Required';
  if (!p.industryType) err.industryType = 'Required';
  if (p.totalWorkers < 1 || p.totalWorkers > 100000) err.totalWorkers = 'Between 1 and 100000';
  if (p.gstNumber.trim() && !validateGstNumber(p.gstNumber)) err.gstNumber = 'Invalid GST format';
  if (p.primaryContactName.trim().length === 0) err.primaryContactName = 'Required';
  if (!validateIndianPhone(p.primaryContactPhone)) err.primaryContactPhone = 'Valid 10-digit Indian mobile required';
  if (!validateEmail(p.primaryContactEmail)) err.primaryContactEmail = 'Valid email required';
  if (p.emergencyContactName.trim().length === 0) err.emergencyContactName = 'Required';
  if (!validateIndianPhone(p.emergencyContactPhone)) err.emergencyContactPhone = 'Valid 10-digit Indian mobile required';
  return err;
};

export function Step02_OrgProfile({ state, dispatch, onNext, onBack }: Step02Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const profile = state.orgProfile;
  const errors = fieldErrors(profile);
  const canNext = Object.keys(errors).length === 0;

  const update = useCallback(
    (updates: Partial<OnboardingState['orgProfile']>) => {
      const sanitized: Partial<OnboardingState['orgProfile']> = {};
      if (updates.name !== undefined) sanitized.name = sanitizeOrgProfileField(updates.name, 150);
      if (updates.address !== undefined) sanitized.address = sanitizeOrgProfileField(updates.address, 300);
      if (updates.city !== undefined) sanitized.city = sanitizeOrgProfileField(updates.city, 100);
      if (updates.state !== undefined) sanitized.state = updates.state;
      if (updates.industryType !== undefined) sanitized.industryType = updates.industryType;
      if (updates.totalWorkers !== undefined) sanitized.totalWorkers = Math.min(100000, Math.max(0, updates.totalWorkers));
      if (updates.gstNumber !== undefined) sanitized.gstNumber = sanitizeOrgProfileField(updates.gstNumber.toUpperCase(), 15);
      if (updates.primaryContactName !== undefined) sanitized.primaryContactName = sanitizeOrgProfileField(updates.primaryContactName, 100);
      if (updates.primaryContactPhone !== undefined) sanitized.primaryContactPhone = updates.primaryContactPhone.replace(/\D/g, '').slice(0, 10);
      if (updates.primaryContactEmail !== undefined) sanitized.primaryContactEmail = updates.primaryContactEmail.trim().slice(0, 150);
      if (updates.emergencyContactName !== undefined) sanitized.emergencyContactName = sanitizeOrgProfileField(updates.emergencyContactName, 100);
      if (updates.emergencyContactPhone !== undefined) sanitized.emergencyContactPhone = updates.emergencyContactPhone.replace(/\D/g, '').slice(0, 10);
      dispatch({ type: 'UPDATE_ORG_PROFILE', payload: sanitized });
    },
    [dispatch]
  );

  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">
        ORGANIZATION PROFILE
      </h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">
        Tell us about your facility
      </p>
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Organization Name *
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => update({ name: e.target.value })}
              onBlur={blur('name')}
              maxLength={150}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.name && errors.name && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Address *
            </label>
            <textarea
              value={profile.address}
              onChange={(e) => update({ address: e.target.value })}
              onBlur={blur('address')}
              maxLength={300}
              rows={3}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.address && errors.address && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.address}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              City *
            </label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => update({ city: e.target.value })}
              onBlur={blur('city')}
              maxLength={100}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.city && errors.city && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.city}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              State *
            </label>
            <select
              value={profile.state}
              onChange={(e) => update({ state: e.target.value })}
              onBlur={blur('state')}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {touched.state && errors.state && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.state}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Industry Type *
            </label>
            <select
              value={profile.industryType}
              onChange={(e) => update({ industryType: e.target.value })}
              onBlur={blur('industryType')}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            >
              <option value="">Select</option>
              {INDUSTRY_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {touched.industryType && errors.industryType && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.industryType}</p>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Total Workers *
            </label>
            <input
              type="number"
              min={1}
              max={100000}
              value={profile.totalWorkers || ''}
              onChange={(e) => update({ totalWorkers: parseInt(e.target.value, 10) || 0 })}
              onBlur={blur('totalWorkers')}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.totalWorkers && errors.totalWorkers && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.totalWorkers}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              GST Number
            </label>
            <input
              type="text"
              value={profile.gstNumber}
              onChange={(e) => update({ gstNumber: e.target.value })}
              onBlur={blur('gstNumber')}
              maxLength={15}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.gstNumber && errors.gstNumber && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.gstNumber}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Primary Contact Name *
            </label>
            <input
              type="text"
              value={profile.primaryContactName}
              onChange={(e) => update({ primaryContactName: e.target.value })}
              onBlur={blur('primaryContactName')}
              maxLength={100}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.primaryContactName && errors.primaryContactName && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.primaryContactName}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Primary Contact Phone *
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={profile.primaryContactPhone}
              onChange={(e) => update({ primaryContactPhone: e.target.value })}
              onBlur={blur('primaryContactPhone')}
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.primaryContactPhone && errors.primaryContactPhone && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.primaryContactPhone}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Primary Contact Email *
            </label>
            <input
              type="email"
              value={profile.primaryContactEmail}
              onChange={(e) => update({ primaryContactEmail: e.target.value })}
              onBlur={blur('primaryContactEmail')}
              maxLength={150}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.primaryContactEmail && errors.primaryContactEmail && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.primaryContactEmail}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Emergency Contact Name *
            </label>
            <input
              type="text"
              value={profile.emergencyContactName}
              onChange={(e) => update({ emergencyContactName: e.target.value })}
              onBlur={blur('emergencyContactName')}
              maxLength={100}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.emergencyContactName && errors.emergencyContactName && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.emergencyContactName}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Emergency Contact Phone *
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={profile.emergencyContactPhone}
              onChange={(e) => update({ emergencyContactPhone: e.target.value })}
              onBlur={blur('emergencyContactPhone')}
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            />
            {touched.emergencyContactPhone && errors.emergencyContactPhone && (
              <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{errors.emergencyContactPhone}</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-between border-t border-[var(--border-default)] pt-6">
        <button type="button" onClick={onBack} className="rounded px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="rounded px-4 py-2 font-mono text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50"
          style={{ backgroundColor: canNext ? 'var(--accent-cyan)' : 'var(--text-dim)' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
