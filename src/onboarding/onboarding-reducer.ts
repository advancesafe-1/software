import type {
  OnboardingState,
  LicenseData,
  OrgProfile,
  HierarchyLevel,
  HierarchyContact,
  FloorDraft,
  FloorPlanDraft,
  ZoneDraft,
  CameraDraft,
  SensorDraft,
  PPERulesDraft,
  WorkerDraft,
  InitProgressItem,
  InitStatus,
} from './onboarding-types';

const defaultOrgProfile: OrgProfile = {
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

const defaultInitProgress: InitProgressItem[] = [
  { task: 'Validating configuration', status: 'pending', message: '' },
  { task: 'Creating organization record', status: 'pending', message: '' },
  { task: 'Setting up floor structure', status: 'pending', message: '' },
  { task: 'Configuring zone parameters', status: 'pending', message: '' },
  { task: 'Registering camera connections', status: 'pending', message: '' },
  { task: 'Configuring sensor network', status: 'pending', message: '' },
  { task: 'Setting PPE rule engine', status: 'pending', message: '' },
  { task: 'Building alert hierarchy', status: 'pending', message: '' },
  { task: 'Importing worker registry', status: 'pending', message: '' },
  { task: 'Generating QR codes for workers', status: 'pending', message: '' },
  { task: 'Initializing Guardian Score engine', status: 'pending', message: '' },
  { task: 'Building floor map visualizations', status: 'pending', message: '' },
  { task: 'Running system diagnostics', status: 'pending', message: '' },
  { task: 'Syncing configuration backup', status: 'pending', message: '' },
  { task: 'AdvanceSafe is Live', status: 'pending', message: '' },
];

function generateTempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const initialOnboardingState: OnboardingState = {
  currentStep: 1,
  completedSteps: [],
  isLoading: false,
  error: null,
  licenseKey: '',
  licenseValidated: false,
  licenseData: null,
  orgProfile: defaultOrgProfile,
  alertHierarchy: [],
  floors: [{ tempId: generateTempId(), name: '', floorNumber: 1, description: '', zoneType: 'Production Floor' }],
  floorPlans: {},
  cameras: [],
  sensors: [],
  ppeRules: {},
  workers: [],
  initializationStatus: 'idle',
  initializationProgress: defaultInitProgress,
};

export type OnboardingAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LICENSE_KEY'; payload: string }
  | { type: 'SET_LICENSE_VALIDATED'; payload: boolean }
  | { type: 'SET_LICENSE_DATA'; payload: LicenseData | null }
  | { type: 'UPDATE_ORG_PROFILE'; payload: Partial<OrgProfile> }
  | { type: 'ADD_HIERARCHY_LEVEL' }
  | { type: 'UPDATE_HIERARCHY_LEVEL'; payload: { tempId: string; updates: Partial<HierarchyLevel> } }
  | { type: 'REMOVE_HIERARCHY_LEVEL'; payload: string }
  | { type: 'ADD_CONTACT'; payload: string }
  | { type: 'UPDATE_CONTACT'; payload: { levelTempId: string; contactTempId: string; updates: Partial<HierarchyContact> } }
  | { type: 'REMOVE_CONTACT'; payload: { levelTempId: string; contactTempId: string } }
  | { type: 'ADD_FLOOR' }
  | { type: 'UPDATE_FLOOR'; payload: { tempId: string; updates: Partial<FloorDraft> } }
  | { type: 'REMOVE_FLOOR'; payload: string }
  | { type: 'SET_FLOOR_PLAN'; payload: { floorTempId: string; plan: Partial<FloorPlanDraft> } }
  | { type: 'ADD_ZONE'; payload: string }
  | { type: 'UPDATE_ZONE'; payload: { floorTempId: string; zoneTempId: string; updates: Partial<ZoneDraft> } }
  | { type: 'REMOVE_ZONE'; payload: { floorTempId: string; zoneTempId: string } }
  | { type: 'ADD_CAMERA'; payload: { floorTempId: string; zoneTempId: string } }
  | { type: 'UPDATE_CAMERA'; payload: { tempId: string; updates: Partial<CameraDraft> } }
  | { type: 'REMOVE_CAMERA'; payload: string }
  | { type: 'SET_CAMERA_TEST_STATUS'; payload: { tempId: string; status: CameraDraft['testStatus'] } }
  | { type: 'ADD_SENSOR'; payload: { floorTempId: string; zoneTempId: string } }
  | { type: 'UPDATE_SENSOR'; payload: { tempId: string; updates: Partial<SensorDraft> } }
  | { type: 'REMOVE_SENSOR'; payload: string }
  | { type: 'UPDATE_PPE_RULES'; payload: { zoneTempId: string; rules: Partial<PPERulesDraft> } }
  | { type: 'ADD_WORKER' }
  | { type: 'ADD_WORKER_WITH_DATA'; payload: Omit<WorkerDraft, 'tempId'> }
  | { type: 'UPDATE_WORKER'; payload: { tempId: string; updates: Partial<WorkerDraft> } }
  | { type: 'REMOVE_WORKER'; payload: string }
  | { type: 'IMPORT_WORKERS_CSV'; payload: WorkerDraft[] }
  | { type: 'SET_INITIALIZATION_STATUS'; payload: InitStatus }
  | { type: 'UPDATE_INITIALIZATION_PROGRESS'; payload: { index: number; status: InitProgressItem['status']; message?: string } }
  | { type: 'RESTORE_DRAFT'; payload: Partial<OnboardingState> }
  | { type: 'RESET_WIZARD' }
  | { type: 'COMPLETE_STEP'; payload: number };

export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_LICENSE_KEY':
      return { ...state, licenseKey: action.payload };
    case 'SET_LICENSE_VALIDATED':
      return { ...state, licenseValidated: action.payload };
    case 'SET_LICENSE_DATA':
      return { ...state, licenseData: action.payload };
    case 'UPDATE_ORG_PROFILE':
      return { ...state, orgProfile: { ...state.orgProfile, ...action.payload } };
    case 'ADD_HIERARCHY_LEVEL': {
      const level = state.alertHierarchy.length + 1;
      return {
        ...state,
        alertHierarchy: [
          ...state.alertHierarchy,
          {
            tempId: generateTempId(),
            level,
            roleName: '',
            escalationDelaySeconds: 180,
            contacts: [],
          },
        ],
      };
    }
    case 'UPDATE_HIERARCHY_LEVEL': {
      return {
        ...state,
        alertHierarchy: state.alertHierarchy.map((l) =>
          l.tempId === action.payload.tempId
            ? { ...l, ...action.payload.updates }
            : l
        ),
      };
    }
    case 'REMOVE_HIERARCHY_LEVEL':
      if (state.alertHierarchy.length <= 1) return state;
      const afterRemove = state.alertHierarchy
        .filter((l) => l.tempId !== action.payload)
        .map((l, i) => ({ ...l, level: i + 1 }));
      return { ...state, alertHierarchy: afterRemove };
    case 'ADD_CONTACT': {
      return {
        ...state,
        alertHierarchy: state.alertHierarchy.map((l) =>
          l.tempId === action.payload
            ? {
                ...l,
                contacts: [
                  ...l.contacts,
                  { tempId: generateTempId(), name: '', phone: '', email: '', whatsapp: '' },
                ],
              }
            : l
        ),
      };
    }
    case 'UPDATE_CONTACT': {
      return {
        ...state,
        alertHierarchy: state.alertHierarchy.map((l) =>
          l.tempId === action.payload.levelTempId
            ? {
                ...l,
                contacts: l.contacts.map((c) =>
                  c.tempId === action.payload.contactTempId
                    ? { ...c, ...action.payload.updates }
                    : c
                ),
              }
            : l
        ),
      };
    }
    case 'REMOVE_CONTACT': {
      return {
        ...state,
        alertHierarchy: state.alertHierarchy.map((l) =>
          l.tempId === action.payload.levelTempId
            ? { ...l, contacts: l.contacts.filter((c) => c.tempId !== action.payload.contactTempId) }
            : l
        ),
      };
    }
    case 'ADD_FLOOR': {
      const floorNumber = state.floors.length + 1;
      return {
        ...state,
        floors: [
          ...state.floors,
          {
            tempId: generateTempId(),
            name: '',
            floorNumber,
            description: '',
            zoneType: 'Production Floor',
          },
        ],
      };
    }
    case 'UPDATE_FLOOR':
      return {
        ...state,
        floors: state.floors.map((f) =>
          f.tempId === action.payload.tempId ? { ...f, ...action.payload.updates } : f
        ),
      };
    case 'REMOVE_FLOOR':
      if (state.floors.length <= 1) return state;
      const remaining = state.floors.filter((f) => f.tempId !== action.payload);
      return {
        ...state,
        floors: remaining.map((f, i) => ({ ...f, floorNumber: i + 1 })),
      };
    case 'SET_FLOOR_PLAN': {
      const existing = state.floorPlans[action.payload.floorTempId] ?? {
        imagePath: '',
        processedImagePath: '',
        zones: [],
      };
      return {
        ...state,
        floorPlans: {
          ...state.floorPlans,
          [action.payload.floorTempId]: { ...existing, ...action.payload.plan },
        },
      };
    }
    case 'ADD_ZONE': {
      const existing = state.floorPlans[action.payload] ?? {
        imagePath: '',
        processedImagePath: '',
        zones: [],
      };
      const newZone: ZoneDraft = {
        tempId: generateTempId(),
        name: '',
        zoneType: 'Chemical',
        coordinates: [],
        riskLevel: 'Low',
      };
      return {
        ...state,
        floorPlans: {
          ...state.floorPlans,
          [action.payload]: { ...existing, zones: [...existing.zones, newZone] },
        },
      };
    }
    case 'UPDATE_ZONE': {
      const plan = state.floorPlans[action.payload.floorTempId];
      if (!plan) return state;
      return {
        ...state,
        floorPlans: {
          ...state.floorPlans,
          [action.payload.floorTempId]: {
            ...plan,
            zones: plan.zones.map((z) =>
              z.tempId === action.payload.zoneTempId
                ? { ...z, ...action.payload.updates }
                : z
            ),
          },
        },
      };
    }
    case 'REMOVE_ZONE': {
      const plan = state.floorPlans[action.payload.floorTempId];
      if (!plan) return state;
      return {
        ...state,
        floorPlans: {
          ...state.floorPlans,
          [action.payload.floorTempId]: {
            ...plan,
            zones: plan.zones.filter((z) => z.tempId !== action.payload.zoneTempId),
          },
        },
      };
    }
    case 'ADD_CAMERA':
      return {
        ...state,
        cameras: [
          ...state.cameras,
          {
            tempId: generateTempId(),
            floorTempId: action.payload.floorTempId,
            zoneTempId: action.payload.zoneTempId,
            name: '',
            ipAddress: '',
            rtspUrl: '',
            username: '',
            password: '',
            positionX: 0,
            positionY: 0,
            testStatus: 'untested',
          },
        ],
      };
    case 'UPDATE_CAMERA':
      return {
        ...state,
        cameras: state.cameras.map((c) =>
          c.tempId === action.payload.tempId ? { ...c, ...action.payload.updates } : c
        ),
      };
    case 'REMOVE_CAMERA':
      return { ...state, cameras: state.cameras.filter((c) => c.tempId !== action.payload) };
    case 'SET_CAMERA_TEST_STATUS':
      return {
        ...state,
        cameras: state.cameras.map((c) =>
          c.tempId === action.payload.tempId ? { ...c, testStatus: action.payload.status } : c
        ),
      };
    case 'ADD_SENSOR':
      return {
        ...state,
        sensors: [
          ...state.sensors,
          {
            tempId: generateTempId(),
            floorTempId: action.payload.floorTempId,
            zoneTempId: action.payload.zoneTempId,
            name: '',
            sensorType: '',
            protocol: '',
            connectionConfig: {},
            unit: '',
            safeMin: 0,
            safeMax: 100,
            warningMin: 100,
            warningMax: 200,
            dangerMin: 200,
            dangerMax: 500,
            criticalMin: 500,
            criticalMax: 1000,
            positionX: 0,
            positionY: 0,
          },
        ],
      };
    case 'UPDATE_SENSOR':
      return {
        ...state,
        sensors: state.sensors.map((s) =>
          s.tempId === action.payload.tempId ? { ...s, ...action.payload.updates } : s
        ),
      };
    case 'REMOVE_SENSOR':
      return { ...state, sensors: state.sensors.filter((s) => s.tempId !== action.payload) };
    case 'UPDATE_PPE_RULES': {
      const existing = state.ppeRules[action.payload.zoneTempId] ?? {
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
      return {
        ...state,
        ppeRules: {
          ...state.ppeRules,
          [action.payload.zoneTempId]: { ...existing, ...action.payload.rules },
        },
      };
    }
    case 'ADD_WORKER':
      return {
        ...state,
        workers: [
          ...state.workers,
          {
            tempId: generateTempId(),
            employeeId: '',
            name: '',
            role: '',
            department: '',
            phone: '',
            isContractWorker: false,
            contractorCompany: '',
            languagePreference: 'en',
          },
        ],
      };
    case 'ADD_WORKER_WITH_DATA':
      return {
        ...state,
        workers: [
          ...state.workers,
          { ...action.payload, tempId: generateTempId() },
        ],
      };
    case 'UPDATE_WORKER':
      return {
        ...state,
        workers: state.workers.map((w) =>
          w.tempId === action.payload.tempId ? { ...w, ...action.payload.updates } : w
        ),
      };
    case 'REMOVE_WORKER':
      return { ...state, workers: state.workers.filter((w) => w.tempId !== action.payload) };
    case 'IMPORT_WORKERS_CSV':
      return { ...state, workers: [...state.workers, ...action.payload] };
    case 'SET_INITIALIZATION_STATUS':
      return { ...state, initializationStatus: action.payload };
    case 'UPDATE_INITIALIZATION_PROGRESS': {
      const progress = [...state.initializationProgress];
      const item = progress[action.payload.index];
      if (item) {
        progress[action.payload.index] = {
          ...item,
          status: action.payload.status,
          message: action.payload.message ?? item.message,
        };
      }
      return { ...state, initializationProgress: progress };
    }
    case 'RESTORE_DRAFT':
      return { ...state, ...action.payload };
    case 'RESET_WIZARD':
      return { ...initialOnboardingState };
    case 'COMPLETE_STEP': {
      const completed = state.completedSteps.includes(action.payload)
        ? state.completedSteps
        : [...state.completedSteps, action.payload].sort((a, b) => a - b);
      return { ...state, completedSteps: completed };
    }
    default:
      return state;
  }
}
