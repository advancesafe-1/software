import { useReducer, useCallback, useEffect, type ReactNode } from 'react';
import {
  KeyRound,
  Building2,
  Users,
  Layers,
  Image,
  Camera,
  Activity,
  Shield,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import {
  onboardingReducer,
  initialOnboardingState,
  type OnboardingAction,
} from './onboarding-reducer';
import type { OnboardingState } from './onboarding-types';
import { saveDraft } from './onboarding-storage';
import { Step01_License } from './steps/Step01_License';
import { Step02_OrgProfile } from './steps/Step02_OrgProfile';
import { Step03_Hierarchy } from './steps/Step03_Hierarchy';
import { Step04_Floors } from './steps/Step04_Floors';
import { Step05_FloorPlans } from './steps/Step05_FloorPlans';
import { Step06_Cameras } from './steps/Step06_Cameras';
import { Step07_Sensors } from './steps/Step07_Sensors';
import { Step08_PPERules } from './steps/Step08_PPERules';
import { Step09_Workers } from './steps/Step09_Workers';
import { Step10_ReviewCreate } from './steps/Step10_ReviewCreate';
import { InitializationView } from './InitializationView';

const STEP_CONFIG: {
  num: number;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}[] = [
  { num: 1, label: 'LICENSE ACTIVATION', shortDesc: 'Activate your AdvanceSafe license', icon: KeyRound },
  { num: 2, label: 'ORGANIZATION PROFILE', shortDesc: 'Facility details and contacts', icon: Building2 },
  { num: 3, label: 'ALERT HIERARCHY', shortDesc: 'Escalation order and contacts', icon: Users },
  { num: 4, label: 'FACILITY STRUCTURE', shortDesc: 'Floors and areas', icon: Layers },
  { num: 5, label: 'FLOOR PLANS', shortDesc: 'Upload and zone mapping', icon: Image },
  { num: 6, label: 'CAMERA SETUP', shortDesc: 'IP camera connections', icon: Camera },
  { num: 7, label: 'SENSOR SETUP', shortDesc: 'Sensors and thresholds', icon: Activity },
  { num: 8, label: 'PPE RULES', shortDesc: 'Mandatory PPE per zone', icon: Shield },
  { num: 9, label: 'WORKER SETUP', shortDesc: 'Register workforce', icon: UserPlus },
  { num: 10, label: 'REVIEW & CREATE', shortDesc: 'Review and go live', icon: CheckCircle2 },
];

interface OnboardingWizardProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onComplete: () => void;
}

function StepContent({
  step,
  state,
  dispatch,
  onNext,
  onBack,
}: {
  step: number;
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}) {
  const common = { state, dispatch, onNext, onBack };
  switch (step) {
    case 1:
      return <Step01_License {...common} />;
    case 2:
      return <Step02_OrgProfile {...common} />;
    case 3:
      return <Step03_Hierarchy {...common} />;
    case 4:
      return <Step04_Floors {...common} />;
    case 5:
      return <Step05_FloorPlans {...common} />;
    case 6:
      return <Step06_Cameras {...common} />;
    case 7:
      return <Step07_Sensors {...common} />;
    case 8:
      return <Step08_PPERules {...common} />;
    case 9:
      return <Step09_Workers {...common} />;
    case 10:
      return <Step10_ReviewCreate {...common} />;
    default:
      return null;
  }
}

export function OnboardingWizard({ state, dispatch, onComplete }: OnboardingWizardProps) {
  const progressPct = (state.completedSteps.length / 10) * 100;

  useEffect(() => {
    if (state.initializationStatus === 'complete') {
      onComplete();
    }
  }, [state.initializationStatus, onComplete]);

  const goNext = useCallback(() => {
    if (state.currentStep < 10) {
      dispatch({ type: 'COMPLETE_STEP', payload: state.currentStep });
      saveDraft({ ...state, currentStep: state.currentStep + 1, completedSteps: [...state.completedSteps, state.currentStep] });
      dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 });
    }
  }, [state, dispatch]);

  const goBack = useCallback(() => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', payload: state.currentStep - 1 });
    }
  }, [state.currentStep, dispatch]);

  if (state.initializationStatus === 'running' || state.initializationStatus === 'complete') {
    return (
      <InitializationView
        state={state}
        dispatch={dispatch}
        onComplete={onComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-[var(--bg-primary)]">
      <aside
        className="flex shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
        style={{ width: '320px' }}
      >
        <div className="mb-6 flex items-center gap-2">
          <div
            className="h-8 w-8 shrink-0 rounded"
            style={{ backgroundColor: 'var(--accent-cyan)' }}
          />
          <span className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">
            ADVANCESAFE
          </span>
        </div>
        <nav className="flex-1 space-y-0.5">
          {STEP_CONFIG.map(({ num, label, shortDesc, icon: Icon }) => {
            const isCurrent = state.currentStep === num;
            const isDone = state.completedSteps.includes(num);
            const isUpcoming = num > state.currentStep;
            return (
              <div
                key={num}
                className={`flex items-start gap-2 rounded px-2 py-1.5 ${
                  isCurrent ? 'border-l-2 border-[var(--accent-cyan)] bg-[var(--bg-tertiary)]' : ''
                }`}
                style={isCurrent ? { borderLeftColor: 'var(--accent-cyan)' } : undefined}
              >
                <span className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={16} style={{ color: 'var(--accent-cyan)' }} />
                  ) : (
                    <Icon
                      size={16}
                      className="shrink-0"
                      style={{
                        color: isUpcoming ? 'var(--text-dim)' : 'var(--text-secondary)',
                      }}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className="font-mono text-[10px] font-medium uppercase tracking-wider"
                    style={{
                      color: isUpcoming ? 'var(--text-dim)' : isCurrent ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    }}
                  >
                    STEP {String(num).padStart(2, '0')} — {label}
                  </div>
                  <div
                    className="mt-0.5 font-sans text-xs"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    {shortDesc}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-[var(--border-default)] pt-4">
          <div className="mb-1 flex justify-between font-mono text-[10px] text-[var(--text-secondary)]">
            <span>Progress</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]"
          >
            <div
              className="h-full rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${progressPct}%`,
                backgroundColor: 'var(--accent-cyan)',
              }}
            />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="flex-1 overflow-auto p-8"
          style={{ animation: 'slideLeft 200ms ease-out' }}
        >
          <StepContent
            step={state.currentStep}
            state={state}
            dispatch={dispatch}
            onNext={goNext}
            onBack={goBack}
          />
        </div>
      </div>
      <style>{`
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export { onboardingReducer, initialOnboardingState };
export type { OnboardingAction };
