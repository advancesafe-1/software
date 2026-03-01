export interface WorkerRow {
  id: string;
  employee_id: string;
  name: string;
  role: string | null;
  department: string | null;
  is_contract_worker: number;
  is_active: number;
}

export function transformWorker(row: WorkerRow): Record<string, unknown> {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    role: row.role ?? null,
    department: row.department ?? null,
    isContractWorker: Boolean(row.is_contract_worker),
    isActive: Boolean(row.is_active),
  };
}
