import { useAppStore } from '@/store/app-store';

export function useOrganization() {
  return useAppStore((state) => state.organization);
}
