export interface LicenseData {
  organizationTier: string;
  maxCameras: number;
  maxSensors: number;
  maxWorkers: number;
  expiresAt: string;
}

export interface OrgProfile {
  name: string;
  address: string;
  city: string;
  state: string;
  industryType: string;
  totalWorkers: number;
  gstNumber: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface HierarchyContact {
  tempId: string;
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
}

export interface HierarchyLevel {
  tempId: string;
  level: number;
  roleName: string;
  escalationDelaySeconds: number;
  contacts: HierarchyContact[];
}

export interface FloorDraft {
  tempId: string;
  name: string;
  floorNumber: number;
  description: string;
  zoneType: string;
}

export interface ZoneDraft {
  tempId: string;
  name: string;
  zoneType: string;
  coordinates: number[][];
  riskLevel: string;
}

export interface FloorPlanDraft {
  imagePath: string;
  processedImagePath: string;
  zones: ZoneDraft[];
}

export type CameraTestStatus = 'untested' | 'testing' | 'success' | 'failed';

export interface CameraDraft {
  tempId: string;
  floorTempId: string;
  zoneTempId: string;
  name: string;
  ipAddress: string;
  rtspUrl: string;
  username: string;
  password: string;
  positionX: number;
  positionY: number;
  testStatus: CameraTestStatus;
}

export interface SensorDraft {
  tempId: string;
  floorTempId: string;
  zoneTempId: string;
  name: string;
  sensorType: string;
  protocol: string;
  connectionConfig: Record<string, string>;
  unit: string;
  safeMin: number;
  safeMax: number;
  warningMin: number;
  warningMax: number;
  dangerMin: number;
  dangerMax: number;
  criticalMin: number;
  criticalMax: number;
  positionX: number;
  positionY: number;
}

export interface PPERulesDraft {
  helmetRequired: boolean;
  vestRequired: boolean;
  glovesRequired: boolean;
  maskRequired: boolean;
  bootsRequired: boolean;
  helmetConfidence: number;
  vestConfidence: number;
  glovesConfidence: number;
  maskConfidence: number;
  violationDurationSeconds: number;
}

export type WorkerLanguage = 'en' | 'hi' | 'gu';

export interface WorkerDraft {
  tempId: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  isContractWorker: boolean;
  contractorCompany: string;
  languagePreference: WorkerLanguage;
}

export interface InitProgressItem {
  task: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  message: string;
}

export type InitStatus = 'idle' | 'running' | 'complete' | 'failed';

export interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  isLoading: boolean;
  error: string | null;

  licenseKey: string;
  licenseValidated: boolean;
  licenseData: LicenseData | null;

  orgProfile: OrgProfile;

  alertHierarchy: HierarchyLevel[];

  floors: FloorDraft[];

  floorPlans: Record<string, FloorPlanDraft>;

  cameras: CameraDraft[];

  sensors: SensorDraft[];

  ppeRules: Record<string, PPERulesDraft>;

  workers: WorkerDraft[];

  initializationStatus: InitStatus;
  initializationProgress: InitProgressItem[];
}
