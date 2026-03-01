import { useCallback } from 'react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';

interface Step08Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

const PPE_ITEMS: { key: keyof OnboardingState['ppeRules'][string]; label: string }[] = [
  { key: 'helmetRequired', label: 'Hard Helmet Required' },
  { key: 'vestRequired', label: 'Safety Vest Required' },
  { key: 'glovesRequired', label: 'Safety Gloves Required' },
  { key: 'maskRequired', label: 'Face Mask Required' },
  { key: 'bootsRequired', label: 'Safety Boots Required' },
];

const PRESETS: { name: string; rules: Partial<OnboardingState['ppeRules'][string]> }[] = [
  { name: 'CHEMICAL ZONE', rules: { helmetRequired: true, vestRequired: true, glovesRequired: true, maskRequired: true, bootsRequired: true } },
  { name: 'ASSEMBLY LINE', rules: { helmetRequired: true, vestRequired: true, glovesRequired: false, maskRequired: false, bootsRequired: false } },
  { name: 'OFFICE AREA', rules: { helmetRequired: false, vestRequired: false, glovesRequired: false, maskRequired: false, bootsRequired: false } },
];

function getZoneName(zoneTempId: string, state: OnboardingState): string {
  for (const floor of state.floors) {
    const zones = state.floorPlans[floor.tempId]?.zones ?? [];
    const z = zones.find((x) => x.tempId === zoneTempId);
    if (z) return z.name || z.zoneType || 'Zone';
  }
  return 'Zone';
}

export function Step08_PPERules({ state, dispatch, onNext, onBack }: Step08Props) {
  const zoneIds = state.floors.flatMap((f) => state.floorPlans[f.tempId]?.zones ?? []).map((z) => z.tempId);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">
        PPE COMPLIANCE RULES
      </h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">
        Define which protective equipment is mandatory in each zone
      </p>
      <div className="mt-8 space-y-6">
        {zoneIds.length === 0 ? (
          <p className="font-mono text-sm text-[var(--text-dim)]">No zones defined. Add zones in Floor Plans step.</p>
        ) : (
          zoneIds.map((zoneTempId) => (
            <PPEZoneCard key={zoneTempId} zoneTempId={zoneTempId} state={state} dispatch={dispatch} />
          ))
        )}
      </div>
      <div className="mt-8 flex justify-between border-t border-[var(--border-default)] pt-6">
        <button type="button" onClick={onBack} className="rounded px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Back</button>
        <button type="button" onClick={onNext} className="rounded px-4 py-2 font-mono text-sm font-medium text-[var(--bg-primary)]" style={{ backgroundColor: 'var(--accent-cyan)' }}>Next</button>
      </div>
    </div>
  );
}

function PPEZoneCard({
  zoneTempId,
  state,
  dispatch,
}: {
  zoneTempId: string;
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
}) {
  const existing = state.ppeRules[zoneTempId] ?? {
    helmetRequired: false,
    vestRequired: false,
    glovesRequired: false,
    maskRequired: false,
    bootsRequired: false,
    helmetConfidence: 70,
    vestConfidence: 70,
    glovesConfidence: 70,
    maskConfidence: 70,
    violationDurationSeconds: 8,
  };

  const update = useCallback(
    (rules: Partial<typeof existing>) =>
      dispatch({ type: 'UPDATE_PPE_RULES', payload: { zoneTempId, rules } }),
    [dispatch, zoneTempId]
  );

  const zoneName = getZoneName(zoneTempId, state);

  return (
    <Card>
      <SectionLabel>{zoneName}</SectionLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => update(preset.rules)}
            className="rounded border border-[var(--border-default)] px-2 py-1 font-mono text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          >
            {preset.name}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {PPE_ITEMS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <label className="font-mono text-sm text-[var(--text-primary)]">{label}</label>
            <button
              type="button"
              role="switch"
              aria-checked={existing[key]}
              onClick={() => update({ [key]: !existing[key] })}
              className={`h-6 w-10 rounded-full border transition-colors ${
                existing[key] ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]' : 'border-[var(--border-default)] bg-[var(--bg-tertiary)]'
              }`}
            >
              <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-[var(--bg-primary)] transition-transform ${existing[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
        <div className="mt-4 border-t border-[var(--border-default)] pt-4">
          <label className="block font-mono text-[10px] text-[var(--text-secondary)]">
            Confidence threshold when PPE toggled on: 50–95% (default 70%)
          </label>
          <input
            type="range"
            min={50}
            max={95}
            value={existing.helmetConfidence}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              update({ helmetConfidence: v, vestConfidence: v, glovesConfidence: v, maskConfidence: v });
            }}
            className="mt-1 w-full"
          />
        </div>
        <div className="mt-2">
          <label className="block font-mono text-[10px] text-[var(--text-secondary)]">
            Violation duration: 5–30 seconds (alert after sustained for X seconds)
          </label>
          <input
            type="range"
            min={5}
            max={30}
            value={existing.violationDurationSeconds}
            onChange={(e) => update({ violationDurationSeconds: parseInt(e.target.value, 10) })}
            className="mt-1 w-full"
          />
          <p className="mt-1 font-mono text-[10px] text-[var(--text-dim)]">Prevents false alerts from brief obstructions.</p>
        </div>
      </div>
    </Card>
  );
}
