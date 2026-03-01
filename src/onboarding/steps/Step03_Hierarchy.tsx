import { useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { sanitizeLength } from '../onboarding-validation';

interface Step03Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

export function Step03_Hierarchy({ state, dispatch, onNext, onBack }: Step03Props) {
  const hierarchy = state.alertHierarchy;
  const canNext = hierarchy.length >= 2 && hierarchy.every((l) => l.contacts.length >= 1);

  const addLevel = useCallback(() => dispatch({ type: 'ADD_HIERARCHY_LEVEL' }), [dispatch]);
  const removeLevel = useCallback(
    (tempId: string) => {
      if (hierarchy.length > 1) dispatch({ type: 'REMOVE_HIERARCHY_LEVEL', payload: tempId });
    },
    [dispatch, hierarchy.length]
  );
  const addContact = useCallback(
    (levelTempId: string) => dispatch({ type: 'ADD_CONTACT', payload: levelTempId }),
    [dispatch]
  );

  const previewLines = hierarchy.map((l, i) => {
    const prevDelay = hierarchy.slice(0, i).reduce((s, x) => s + x.escalationDelaySeconds, 0);
    const min = Math.floor(prevDelay / 60);
    const sec = prevDelay % 60;
    return `L${l.level} ${l.roleName || '—'} at ${min}:${String(sec).padStart(2, '0')}`;
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">
        ALERT ESCALATION HIERARCHY
      </h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">
        Define who gets notified and in what order when an incident occurs
      </p>
      <div className="mt-8 grid grid-cols-[1fr,320px] gap-8">
        <div className="space-y-4">
          <button
            type="button"
            onClick={addLevel}
            className="flex items-center gap-2 rounded border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-4 py-2 font-mono text-sm text-[var(--accent-cyan)]"
          >
            <Plus size={16} /> ADD LEVEL
          </button>
          {hierarchy.map((level) => (
            <Card key={level.tempId}>
              <div className="mb-3 flex items-center justify-between">
                <SectionLabel>Level {level.level}</SectionLabel>
                {hierarchy.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLevel(level.tempId)}
                    className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--status-danger)]"
                    aria-label="Remove level"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={level.roleName}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_HIERARCHY_LEVEL',
                    payload: { tempId: level.tempId, updates: { roleName: sanitizeLength(e.target.value, 50) } },
                  })
                }
                maxLength={50}
                placeholder="Supervisor / Manager / Plant Head"
                className="mb-3 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
              />
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-[10px] text-[var(--text-secondary)]">Delay (sec):</span>
                <input
                  type="range"
                  min={60}
                  max={600}
                  step={30}
                  value={level.escalationDelaySeconds}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_HIERARCHY_LEVEL',
                      payload: { tempId: level.tempId, updates: { escalationDelaySeconds: parseInt(e.target.value, 10) } },
                    })
                  }
                  className="flex-1"
                />
                <span className="font-mono text-sm text-[var(--text-mono)]">
                  {Math.floor(level.escalationDelaySeconds / 60)} min
                </span>
              </div>
              <SectionLabel>Contacts</SectionLabel>
              {level.contacts.map((c) => (
                <div key={c.tempId} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_CONTACT',
                        payload: { levelTempId: level.tempId, contactTempId: c.tempId, updates: { name: sanitizeLength(e.target.value, 100) } },
                      })
                    }
                    maxLength={100}
                    placeholder="Name"
                    className="flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-xs"
                  />
                  <input
                    type="tel"
                    value={c.phone}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_CONTACT',
                        payload: { levelTempId: level.tempId, contactTempId: c.tempId, updates: { phone: e.target.value.replace(/\D/g, '').slice(0, 10) } },
                      })
                    }
                    maxLength={10}
                    placeholder="Phone"
                    className="w-28 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-xs"
                  />
                  <input
                    type="text"
                    value={c.email}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_CONTACT',
                        payload: { levelTempId: level.tempId, contactTempId: c.tempId, updates: { email: sanitizeLength(e.target.value, 150) } },
                      })
                    }
                    maxLength={150}
                    placeholder="Email"
                    className="flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'REMOVE_CONTACT', payload: { levelTempId: level.tempId, contactTempId: c.tempId } })}
                    className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--status-danger)]"
                    aria-label="Remove contact"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addContact(level.tempId)}
                className="mt-2 flex items-center gap-1 font-mono text-xs text-[var(--accent-cyan)]"
              >
                <Plus size={12} /> Add Contact
              </button>
            </Card>
          ))}
          {!canNext && hierarchy.length > 0 && (
            <p className="font-mono text-xs text-[var(--status-warning)]">
              Minimum 2 levels and at least 1 contact per level required.
            </p>
          )}
        </div>
        <Card>
          <SectionLabel>Test alert chain</SectionLabel>
          <p className="mb-3 font-sans text-xs text-[var(--text-secondary)]">If incident occurs:</p>
          <div className="space-y-1 font-mono text-[10px] text-[var(--text-mono)]">
            {previewLines.length ? previewLines.map((line, i) => <div key={i}>{line}</div>) : 'Add levels to see preview'}
          </div>
        </Card>
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
