import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/app/layout';
import { Dashboard } from '@/app/pages/Dashboard';
import { PlantMap } from '@/app/pages/PlantMap';
import { Incidents } from '@/app/pages/Incidents';
import { Sensors } from '@/app/pages/Sensors';
import { Analytics } from '@/app/pages/Analytics';
import { Workers } from '@/app/pages/Workers';
import { Settings } from '@/app/pages/Settings';
import { Reports } from '@/app/pages/Reports';
import { LoginPage } from '@/app/pages/Login';
import { OnboardingWizard } from '@/onboarding/OnboardingWizard';
import { onboardingReducer, initialOnboardingState } from '@/onboarding/onboarding-reducer';
import type { OnboardingAction } from '@/onboarding/onboarding-reducer';
import { isOnboardingComplete, loadDraft, clearDraft } from '@/onboarding/onboarding-storage';
import { useAppStore } from '@/store/app-store';

function LoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[var(--bg-primary)]">
      <div className="h-12 w-12 rounded border-2 border-[var(--accent-cyan)] border-t-transparent animate-spin" />
      <p className="mt-4 font-mono text-sm text-[var(--text-secondary)]">Loading AdvanceSafe…</p>
    </div>
  );
}

function AppContent() {
  const [status, setStatus] = useState<'loading' | 'onboarding' | 'login' | 'dashboard' | 'draft-prompt'>('loading');
  const [draftPromptChoice, setDraftPromptChoice] = useState<boolean | null>(null);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const setOrganization = useAppStore((s) => s.setOrganization);
  const currentUser = useAppStore((s) => s.currentUser);

  const [wizardState, dispatch] = useReducer(onboardingReducer, initialOnboardingState);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const complete = await isOnboardingComplete();
        if (cancelled) return;
        if (complete) {
          setOnboardingComplete(true);
          window.advancesafe?.admin?.users?.ensureDefaultAdmin?.();
          const orgRow = await window.advancesafe?.admin?.org?.getProfile?.();
          if (orgRow && !cancelled) {
            setOrganization(orgRow as Parameters<typeof setOrganization>[0]);
          }
          if (!cancelled) setStatus('login');
          return;
        }
        const draft = await loadDraft();
        if (cancelled) return;
        if (draft && Object.keys(draft).length > 0) {
          setStatus('draft-prompt');
          return;
        }
        setStatus('onboarding');
      } catch {
        if (!cancelled) setStatus('onboarding');
      }
    })();
    return () => { cancelled = true; };
  }, [setOnboardingComplete]);

  useEffect(() => {
    if (draftPromptChoice === null) return;
    if (draftPromptChoice) {
      (async () => {
        const draft = await loadDraft();
        if (draft) dispatch({ type: 'RESTORE_DRAFT', payload: draft });
        setStatus('onboarding');
      })();
    } else {
      (async () => {
        await clearDraft();
        setStatus('onboarding');
      })();
    }
    setDraftPromptChoice(null);
  }, [draftPromptChoice]);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingComplete(true);
    window.advancesafe?.admin?.users?.ensureDefaultAdmin?.();
    setStatus('login');
  }, [setOnboardingComplete]);

  const handleLoginSuccess = useCallback(() => {
    setStatus('dashboard');
  }, []);

  if (status === 'loading') return <LoadingScreen />;

  if (status === 'draft-prompt') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[var(--bg-primary)] p-8">
        <p className="font-sans text-base text-[var(--text-primary)]">
          We found an incomplete setup. Continue where you left off?
        </p>
        <div className="mt-6 flex gap-4">
          <button type="button" onClick={() => setDraftPromptChoice(true)} className="rounded bg-[var(--accent-cyan)] px-6 py-2 font-mono text-sm font-medium text-[var(--bg-primary)]">YES</button>
          <button type="button" onClick={() => setDraftPromptChoice(false)} className="rounded border border-[var(--border-default)] px-6 py-2 font-mono text-sm text-[var(--text-secondary)]">NO — Start fresh</button>
        </div>
      </div>
    );
  }

  if (status === 'onboarding') {
    return <OnboardingWizard state={wizardState} dispatch={dispatch} onComplete={handleOnboardingComplete} />;
  }

  if (status === 'login' && !currentUser) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="plant-map" element={<PlantMap />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="sensors" element={<Sensors />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="workers" element={<Workers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
