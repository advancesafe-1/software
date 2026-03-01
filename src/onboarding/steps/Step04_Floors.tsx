import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FLOOR_TYPES } from '../onboarding-validation';
import { sanitizeLength } from '../onboarding-validation';

interface Step04Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

export function Step04_Floors({ state, dispatch, onNext, onBack }: Step04Props) {
  const floors = state.floors;
  const names = floors.map((f) => f.name.trim()).filter(Boolean);
  const uniqueNames = new Set(names).size === names.length;
  const allFilled = floors.every((f) => f.name.trim().length > 0);
  const canNext = floors.length >= 1 && allFilled && uniqueNames;

  const addFloor = useCallback(() => dispatch({ type: 'ADD_FLOOR' }), [dispatch]);
  const removeFloor = useCallback(
    (tempId: string) => floors.length > 1 && dispatch({ type: 'REMOVE_FLOOR', payload: tempId }),
    [dispatch, floors.length]
  );
  const updateFloor = useCallback(
    (tempId: string, updates: Partial<OnboardingState['floors'][0]>) =>
      dispatch({ type: 'UPDATE_FLOOR', payload: { tempId, updates } }),
    [dispatch]
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">
        FACILITY STRUCTURE
      </h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">
        Define the floors and areas of your facility
      </p>
      <div className="mt-8 space-y-4">
        <p className="font-mono text-sm text-[var(--text-secondary)]">
          Floors / zones: {floors.length} (1–20)
        </p>
        {floors.map((floor) => (
          <Card key={floor.tempId}>
            <div className="mb-3 flex items-center justify-between">
              <SectionLabel>
                Floor {String(floor.floorNumber).padStart(2, '0')}
              </SectionLabel>
              {floors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFloor(floor.tempId)}
                  className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--status-danger)]"
                  aria-label="Delete floor"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block font-mono text-[10px] text-[var(--text-secondary)]">Floor Name *</label>
                <input
                  type="text"
                  value={floor.name}
                  onChange={(e) => updateFloor(floor.tempId, { name: sanitizeLength(e.target.value, 100) })}
                  maxLength={100}
                  placeholder="Ground Floor / Floor 1 / Basement"
                  className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] text-[var(--text-secondary)]">Floor Type</label>
                <select
                  value={floor.zoneType}
                  onChange={(e) => updateFloor(floor.tempId, { zoneType: e.target.value })}
                  className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
                >
                  {FLOOR_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block font-mono text-[10px] text-[var(--text-secondary)]">Description</label>
              <textarea
                value={floor.description}
                onChange={(e) => updateFloor(floor.tempId, { description: sanitizeLength(e.target.value, 200) })}
                maxLength={200}
                rows={2}
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
              />
            </div>
          </Card>
        ))}
        {floors.length < 20 && (
          <button
            type="button"
            onClick={addFloor}
            className="flex items-center gap-2 rounded border border-dashed border-[var(--border-accent)] px-4 py-3 font-mono text-sm text-[var(--accent-cyan)]"
          >
            <Plus size={16} /> ADD ANOTHER FLOOR
          </button>
        )}
        {!uniqueNames && names.length > 1 && (
          <p className="font-mono text-xs text-[var(--status-warning)]">Floor names must be unique.</p>
        )}
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
