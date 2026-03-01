import type { OnboardingState } from './onboarding-types';

const DRAFT_KEY = 'onboarding_draft';
const COMPLETE_KEY = 'onboarding_complete';

function getApi() {
  return typeof window !== 'undefined' ? window.advancesafe : undefined;
}

export async function saveDraft(state: OnboardingState): Promise<void> {
  const api = getApi();
  if (!api?.database) return;
  try {
    const json = JSON.stringify({
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      licenseKey: state.licenseKey,
      licenseValidated: state.licenseValidated,
      licenseData: state.licenseData,
      orgProfile: state.orgProfile,
      alertHierarchy: state.alertHierarchy,
      floors: state.floors,
      floorPlans: state.floorPlans,
      cameras: state.cameras,
      sensors: state.sensors,
      ppeRules: state.ppeRules,
      workers: state.workers,
    });
    const rows = (await api.database.query(
      'select',
      'SELECT id FROM system_config WHERE key = ?',
      [DRAFT_KEY]
    )) as { id: string }[];
    if (rows.length > 0) {
      await api.database.execute(
        'update',
        'UPDATE system_config SET value_encrypted = ?, last_updated_at = datetime(\'now\') WHERE key = ?',
        [json, DRAFT_KEY]
      );
    } else {
      await api.database.execute(
        'insert',
        'INSERT INTO system_config (id, key, value_encrypted, last_updated_at, source) VALUES (lower(hex(randomblob(16))), ?, ?, datetime(\'now\'), \'local\')',
        [DRAFT_KEY, json]
      );
    }
  } catch {
    // Ignore storage errors; wizard continues in memory
  }
}

export async function loadDraft(): Promise<Partial<OnboardingState> | null> {
  const api = getApi();
  if (!api?.database) return null;
  try {
    const rows = (await api.database.query(
      'select',
      'SELECT value_encrypted FROM system_config WHERE key = ?',
      [DRAFT_KEY]
    )) as { value_encrypted: string | null }[];
    if (!rows.length || !rows[0].value_encrypted) return null;
    return JSON.parse(rows[0].value_encrypted) as Partial<OnboardingState>;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  const api = getApi();
  if (!api?.database) return;
  try {
    await api.database.execute('delete', 'DELETE FROM system_config WHERE key = ?', [
      DRAFT_KEY,
    ]);
  } catch {
    // Ignore
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  const api = getApi();
  if (!api?.database) return false;
  try {
    const rows = (await api.database.query(
      'select',
      'SELECT value_encrypted FROM system_config WHERE key = ?',
      [COMPLETE_KEY]
    )) as { value_encrypted: string | null }[];
    return rows.length > 0 && rows[0].value_encrypted === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  const api = getApi();
  if (!api?.database) return;
  try {
    const rows = (await api.database.query(
      'select',
      'SELECT id FROM system_config WHERE key = ?',
      [COMPLETE_KEY]
    )) as { id: string }[];
    if (rows.length > 0) {
      await api.database.execute(
        'update',
        'UPDATE system_config SET value_encrypted = \'true\', last_updated_at = datetime(\'now\') WHERE key = ?',
        [COMPLETE_KEY]
      );
    } else {
      await api.database.execute(
        'insert',
        'INSERT INTO system_config (id, key, value_encrypted, last_updated_at, source) VALUES (lower(hex(randomblob(16))), ?, \'true\', datetime(\'now\'), \'local\')',
        [COMPLETE_KEY]
      );
    }
  } catch {
    // Ignore
  }
}
