import { useCallback, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ZONE_TYPES, RISK_LEVELS } from '../onboarding-validation';
import { sanitizeLength } from '../onboarding-validation';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPT_TYPES = '.jpg,.jpeg,.png,.pdf';

interface Step05Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

export function Step05_FloorPlans({ state, dispatch, onNext, onBack }: Step05Props) {
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const floors = state.floors;
  const activeFloor = floors[activeFloorIndex];
  const activeFloorId = activeFloor?.tempId ?? '';
  const plan = activeFloorId ? state.floorPlans[activeFloorId] : undefined;
  const zones = plan?.zones ?? [];

  const allHaveZone = floors.every((f) => {
    const z = state.floorPlans[f.tempId]?.zones ?? [];
    return z.length >= 1;
  });
  const canNext = floors.length > 0 && allHaveZone;

  const handleFile = useCallback(
    (file: File | null) => {
      if (!activeFloorId || !file) return;
      if (file.size > MAX_FILE_SIZE) return;
      const path = (file as File & { path?: string }).path ?? file.name;
      dispatch({
        type: 'SET_FLOOR_PLAN',
        payload: {
          floorTempId: activeFloorId,
          plan: { imagePath: path, processedImagePath: path },
        },
      });
    },
    [activeFloorId, dispatch]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const addZone = useCallback(() => {
    if (activeFloorId) dispatch({ type: 'ADD_ZONE', payload: activeFloorId });
  }, [activeFloorId, dispatch]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">
        FLOOR PLANS & ZONE MAPPING
      </h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">
        Upload your floor plan and define safety zones
      </p>
      <div className="mt-6 flex gap-2 border-b border-[var(--border-default)] pb-2">
        {floors.map((f, i) => (
          <button
            key={f.tempId}
            type="button"
            onClick={() => setActiveFloorIndex(i)}
            className={`rounded px-3 py-1.5 font-mono text-sm ${
              i === activeFloorIndex ? 'bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {f.name || `Floor ${f.floorNumber}`}
          </button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <SectionLabel>Upload floor plan</SectionLabel>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-2 rounded border-2 border-dashed p-6 text-center ${
              dragOver ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan-glow)]' : 'border-[var(--border-default)]'
            }`}
          >
            <p className="font-mono text-xs text-[var(--text-secondary)]">
              JPG, PNG, PDF — max 20MB
            </p>
            <input
              type="file"
              accept={ACCEPT_TYPES}
              className="mt-2 hidden"
              id="floor-plan-file"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <label htmlFor="floor-plan-file" className="mt-2 inline-block cursor-pointer rounded bg-[var(--bg-tertiary)] px-4 py-2 font-mono text-sm text-[var(--accent-cyan)]">
              Choose file
            </label>
            {plan?.imagePath && (
              <p className="mt-2 font-mono text-[10px] text-[var(--text-mono)]">{plan.imagePath}</p>
            )}
          </div>
          <button
            type="button"
            className="mt-4 font-mono text-xs text-[var(--text-dim)] underline"
            onClick={() => activeFloorId && dispatch({ type: 'SET_FLOOR_PLAN', payload: { floorTempId: activeFloorId, plan: { imagePath: '', processedImagePath: '', zones: plan?.zones ?? [] } } })}
          >
            Skip — I will add floor plan later
          </button>
        </div>
        <div>
          <SectionLabel>Zone mapping</SectionLabel>
          <p className="mt-2 font-mono text-[10px] text-[var(--text-secondary)]">Precise zone coordinates can be mapped after installation.</p>
          <button
            type="button"
            onClick={addZone}
            className="mt-3 flex items-center gap-2 rounded border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-3 py-2 font-mono text-sm text-[var(--accent-cyan)]"
          >
            <Plus size={14} /> ADD ZONE
          </button>
          <div className="mt-4 space-y-2">
            {zones.map((z) => (
              <Card key={z.tempId}>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={z.name}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_ZONE',
                        payload: { floorTempId: activeFloorId, zoneTempId: z.tempId, updates: { name: sanitizeLength(e.target.value, 100) } },
                      })
                    }
                    maxLength={100}
                    placeholder="Zone Name"
                    className="flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'REMOVE_ZONE', payload: { floorTempId: activeFloorId, zoneTempId: z.tempId } })}
                    className="ml-2 rounded p-1 text-[var(--status-danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    value={z.zoneType}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_ZONE',
                        payload: { floorTempId: activeFloorId, zoneTempId: z.tempId, updates: { zoneType: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 font-mono text-xs"
                  >
                    {ZONE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={z.riskLevel}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_ZONE',
                        payload: { floorTempId: activeFloorId, zoneTempId: z.tempId, updates: { riskLevel: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 font-mono text-xs"
                  >
                    {RISK_LEVELS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-between border-t border-[var(--border-default)] pt-6">
        <button type="button" onClick={onBack} className="rounded px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
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
