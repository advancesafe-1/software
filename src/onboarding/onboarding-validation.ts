const LICENSE_FORMAT = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const INDIAN_PHONE = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

function sanitizeString(value: string, maxLength: number): string {
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.replace(/[<>'"&]/g, '');
}

export function validateLicenseFormat(key: string): boolean {
  const normalized = key.replace(/-/g, '').toUpperCase();
  if (normalized.length !== 16) return false;
  const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}`;
  return LICENSE_FORMAT.test(formatted);
}

export function formatLicenseKey(input: string): string {
  const cleaned = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;
}

export function validateIndianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 && INDIAN_PHONE.test(digits);
}

export function validateEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 150 && EMAIL_REGEX.test(trimmed);
}

export function validateGstNumber(gst: string): boolean {
  if (gst.trim() === '') return true;
  return GST_REGEX.test(gst.trim().toUpperCase());
}

export function validateIpAddress(ip: string): boolean {
  return IP_REGEX.test(ip.trim());
}

export function sanitizeOrgProfileField(
  value: string,
  maxLength: number
): string {
  return sanitizeString(value, maxLength);
}

export function sanitizeLength(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
] as const;

export const INDUSTRY_TYPES = [
  'Chemicals & Petrochemicals',
  'Pharmaceuticals',
  'Steel & Metals',
  'Manufacturing & Engineering',
  'Food Processing',
  'Textiles',
  'Cement & Construction',
  'Power & Energy',
  'Automotive',
  'Other',
] as const;

export const FLOOR_TYPES = [
  'Production Floor',
  'Chemical Storage',
  'Assembly Area',
  'Boiler Room',
  'Warehouse',
  'Office Area',
  'Quality Control',
  'Outdoor / Perimeter',
  'Other',
] as const;

export const ZONE_TYPES = [
  'Chemical',
  'Assembly',
  'Boiler',
  'Office',
  'Storage',
  'Warehouse',
  'Quality Control',
  'Entry/Exit',
  'Other',
] as const;

export const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;

export const CAMERA_BRANDS = [
  'Hikvision',
  'Dahua',
  'CP Plus',
  'Bosch',
  'Axis',
  'Other',
] as const;

export const SENSOR_TYPES = [
  'Gas — H2S',
  'Gas — CO',
  'Gas — CO2',
  'Gas — LPG/CNG',
  'Oxygen Level',
  'Temperature',
  'Humidity',
  'Noise Level',
  'Vibration',
  'Pressure',
  'Smoke/Fire',
  'Other',
] as const;

export const SENSOR_PROTOCOLS = [
  'MQTT',
  'Modbus TCP',
  'OPC-UA',
  'Analog (4-20mA)',
  'Digital I/O',
] as const;

export const SENSOR_DEFAULTS: Record<
  string,
  {
    unit: string;
    safeMin: number;
    safeMax: number;
    warningMin: number;
    warningMax: number;
    dangerMin: number;
    dangerMax: number;
    criticalMin: number;
    criticalMax: number;
  }
> = {
  'Gas — H2S': {
    unit: 'ppm',
    safeMin: 0,
    safeMax: 1,
    warningMin: 1,
    warningMax: 5,
    dangerMin: 5,
    dangerMax: 10,
    criticalMin: 50,
    criticalMax: 100,
  },
  'Gas — CO': {
    unit: 'ppm',
    safeMin: 0,
    safeMax: 25,
    warningMin: 25,
    warningMax: 35,
    dangerMin: 35,
    dangerMax: 50,
    criticalMin: 200,
    criticalMax: 500,
  },
  'Gas — CO2': {
    unit: 'ppm',
    safeMin: 0,
    safeMax: 1000,
    warningMin: 1000,
    warningMax: 2000,
    dangerMin: 2000,
    dangerMax: 5000,
    criticalMin: 5000,
    criticalMax: 10000,
  },
  'Oxygen Level': {
    unit: '%',
    safeMin: 19.5,
    safeMax: 23.5,
    warningMin: 18,
    warningMax: 19.5,
    dangerMin: 16,
    dangerMax: 18,
    criticalMin: 0,
    criticalMax: 16,
  },
  Temperature: {
    unit: '°C',
    safeMin: 0,
    safeMax: 35,
    warningMin: 35,
    warningMax: 40,
    dangerMin: 40,
    dangerMax: 45,
    criticalMin: 50,
    criticalMax: 60,
  },
  Humidity: {
    unit: '%',
    safeMin: 30,
    safeMax: 70,
    warningMin: 70,
    warningMax: 85,
    dangerMin: 85,
    dangerMax: 95,
    criticalMin: 95,
    criticalMax: 100,
  },
  'Noise Level': {
    unit: 'dB',
    safeMin: 0,
    safeMax: 85,
    warningMin: 85,
    warningMax: 90,
    dangerMin: 90,
    dangerMax: 100,
    criticalMin: 115,
    criticalMax: 140,
  },
  Other: {
    unit: '',
    safeMin: 0,
    safeMax: 100,
    warningMin: 100,
    warningMax: 200,
    dangerMin: 200,
    dangerMax: 500,
    criticalMin: 500,
    criticalMax: 1000,
  },
};
