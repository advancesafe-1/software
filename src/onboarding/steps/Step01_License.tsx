import { useState, useCallback } from 'react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import { validateLicenseFormat, formatLicenseKey } from '../onboarding-validation';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';

interface Step01Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

const LICENSE_DISPLAY_LENGTH = 19;

export function Step01_License({ state, dispatch, onNext, onBack }: Step01Props) {
  const [localKey, setLocalKey] = useState(state.licenseKey);
  const [activating, setActivating] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatLicenseKey(e.target.value);
      setLocalKey(formatted);
      dispatch({ type: 'SET_LICENSE_KEY', payload: formatted });
      dispatch({ type: 'SET_ERROR', payload: null });
    },
    [dispatch]
  );

  const handleActivate = useCallback(async () => {
    if (!validateLicenseFormat(localKey)) {
      dispatch({ type: 'SET_ERROR', payload: 'License key format invalid' });
      return;
    }
    dispatch({ type: 'SET_ERROR', payload: null });
    setActivating(true);
    dispatch({ type: 'SET_LOADING', payload: true });
    await new Promise((r) => setTimeout(r, 1500));
    const formatted = localKey.replace(/-/g, '');
    const valid = formatted.length === 16;
    if (valid) {
      dispatch({
        type: 'SET_LICENSE_DATA',
        payload: {
          organizationTier: 'PROFESSIONAL',
          maxCameras: 30,
          maxSensors: 20,
          maxWorkers: 2000,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      dispatch({ type: 'SET_LICENSE_VALIDATED', payload: true });
    } else {
      dispatch({
        type: 'SET_ERROR',
        payload: 'License key not found. Contact support@advancesafe.in',
      });
    }
    setActivating(false);
    dispatch({ type: 'SET_LOADING', payload: false });
  }, [localKey, dispatch]);

  const canNext = state.licenseValidated;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">
        ACTIVATE YOUR LICENSE
      </h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">
        Enter the license key provided by AdvanceSafe team
      </p>
      <div className="mt-8">
        <input
          type="text"
          value={localKey}
          onChange={handleChange}
          onBlur={() => dispatch({ type: 'SET_LICENSE_KEY', payload: localKey })}
          maxLength={LICENSE_DISPLAY_LENGTH}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-4 py-3 font-mono text-lg uppercase tracking-widest text-[var(--text-primary)] placeholder:text-[var(--text-dim)]"
          disabled={activating || state.licenseValidated}
          autoComplete="off"
        />
        {state.error && (
          <p className="mt-2 font-mono text-sm text-[var(--status-critical)]">{state.error}</p>
        )}
        {!state.licenseValidated && (
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating || localKey.replace(/-/g, '').length !== 16}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded py-3 font-mono text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-cyan)' }}
          >
            {activating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-primary)] border-t-transparent" />
                Activating…
              </>
            ) : (
              'ACTIVATE'
            )}
          </button>
        )}
        {state.licenseValidated && state.licenseData && (
          <Card className="mt-6">
            <SectionLabel>License details</SectionLabel>
            <div className="mt-2 flex items-center gap-2 font-mono text-[var(--status-safe)]">
              <span className="h-2 w-2 rounded-full bg-[var(--status-safe)]" />
              ACTIVE
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-sm">
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>TIER: </span>
                <span style={{ color: 'var(--text-mono)' }}>{state.licenseData.organizationTier}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>MAX CAMERAS: </span>
                <span style={{ color: 'var(--text-mono)' }}>{state.licenseData.maxCameras}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>MAX SENSORS: </span>
                <span style={{ color: 'var(--text-mono)' }}>{state.licenseData.maxSensors}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>MAX WORKERS: </span>
                <span style={{ color: 'var(--text-mono)' }}>{state.licenseData.maxWorkers}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
      <div className="mt-8 flex justify-between border-t border-[var(--border-default)] pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
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
