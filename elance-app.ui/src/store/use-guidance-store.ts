import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Tenant and User scoped partition data.
 * Keeps only lightweight user-guidance preferences and completion states.
 */
export interface UserGuidanceScopeData {
  dismissedWelcomes: Record<string, boolean>;
  dismissedPrerequisites: Record<string, boolean>;
  completedSteps: Record<string, boolean>;
}

interface GuidanceStoreState {
  /**
   * Partitions keyed by `${tenantSlug}:${userId}`.
   * Example: 'socobois:14', 'piqbit:3', 'socobois:anonymous'.
   */
  partitions: Record<string, UserGuidanceScopeData>;
  _hasHydrated: boolean;

  setHasHydrated: (hydrated: boolean) => void;

  // Reads
  isWelcomeDismissed: (moduleKey: string, scopeKey: string) => boolean;
  isPrerequisiteDismissed: (prereqId: string, scopeKey: string) => boolean;
  isStepCompleted: (stepId: string, scopeKey: string) => boolean;

  // Writes
  dismissWelcome: (moduleKey: string, scopeKey: string) => void;
  resetWelcome: (moduleKey: string, scopeKey: string) => void;
  dismissPrerequisite: (prereqId: string, scopeKey: string) => void;
  resetPrerequisite: (prereqId: string, scopeKey: string) => void;
  completeStep: (stepId: string, scopeKey: string) => void;
  resetStep: (stepId: string, scopeKey: string) => void;
  resetScope: (scopeKey: string) => void;
}

/**
 * Helper to safely extract the active tenant slug on the client.
 */
export function resolveCurrentTenantSlug(): string {
  if (typeof window === 'undefined') return 'default';
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3 || (parts.length === 2 && host.endsWith('.localhost'))) {
    const potentialSlug = parts[0].toLowerCase();
    const reserved = ['www', 'api', 'admin', 'app', 'dev', 'staging', 'mail'];
    if (!reserved.includes(potentialSlug)) {
      return potentialSlug;
    }
  }
  const urlParams = new URLSearchParams(window.location.search);
  const queryTenant = urlParams.get('tenant');
  if (queryTenant) return queryTenant.toLowerCase();
  return 'default';
}

/**
 * Computes the unique partition key for a tenant + user pair.
 */
export function getGuidanceScopeKey(tenantSlug?: string | null, userId?: string | number | null): string {
  const safeTenant = (tenantSlug || resolveCurrentTenantSlug()).trim().toLowerCase();
  const safeUser = userId !== undefined && userId !== null && String(userId).trim() !== ''
    ? String(userId).trim()
    : 'anonymous';
  return `${safeTenant}:${safeUser}`;
}

const emptyPartition: UserGuidanceScopeData = {
  dismissedWelcomes: {},
  dismissedPrerequisites: {},
  completedSteps: {},
};

export const useGuidanceStore = create<GuidanceStoreState>()(
  persist(
    (set, get) => ({
      partitions: {},
      _hasHydrated: false,

      setHasHydrated: (hydrated: boolean) => set({ _hasHydrated: hydrated }),

      isWelcomeDismissed: (moduleKey: string, scopeKey: string) => {
        const partition = get().partitions[scopeKey];
        return Boolean(partition?.dismissedWelcomes?.[moduleKey]);
      },

      isPrerequisiteDismissed: (prereqId: string, scopeKey: string) => {
        const partition = get().partitions[scopeKey];
        return Boolean(partition?.dismissedPrerequisites?.[prereqId]);
      },

      isStepCompleted: (stepId: string, scopeKey: string) => {
        const partition = get().partitions[scopeKey];
        return Boolean(partition?.completedSteps?.[stepId]);
      },

      dismissWelcome: (moduleKey: string, scopeKey: string) => {
        set((state) => {
          const current = state.partitions[scopeKey] || { ...emptyPartition };
          return {
            partitions: {
              ...state.partitions,
              [scopeKey]: {
                ...current,
                dismissedWelcomes: {
                  ...current.dismissedWelcomes,
                  [moduleKey]: true,
                },
              },
            },
          };
        });
      },

      resetWelcome: (moduleKey: string, scopeKey: string) => {
        set((state) => {
          const current = state.partitions[scopeKey];
          if (!current) return state;
          const updatedWelcomes = { ...current.dismissedWelcomes };
          delete updatedWelcomes[moduleKey];
          return {
            partitions: {
              ...state.partitions,
              [scopeKey]: {
                ...current,
                dismissedWelcomes: updatedWelcomes,
              },
            },
          };
        });
      },

      dismissPrerequisite: (prereqId: string, scopeKey: string) => {
        set((state) => {
          const current = state.partitions[scopeKey] || { ...emptyPartition };
          return {
            partitions: {
              ...state.partitions,
              [scopeKey]: {
                ...current,
                dismissedPrerequisites: {
                  ...current.dismissedPrerequisites,
                  [prereqId]: true,
                },
              },
            },
          };
        });
      },

      resetPrerequisite: (prereqId: string, scopeKey: string) => {
        set((state) => {
          const current = state.partitions[scopeKey];
          if (!current) return state;
          const updated = { ...current.dismissedPrerequisites };
          delete updated[prereqId];
          return {
            partitions: {
              ...state.partitions,
              [scopeKey]: {
                ...current,
                dismissedPrerequisites: updated,
              },
            },
          };
        });
      },

      completeStep: (stepId: string, scopeKey: string) => {
        set((state) => {
          const current = state.partitions[scopeKey] || { ...emptyPartition };
          return {
            partitions: {
              ...state.partitions,
              [scopeKey]: {
                ...current,
                completedSteps: {
                  ...current.completedSteps,
                  [stepId]: true,
                },
              },
            },
          };
        });
      },

      resetStep: (stepId: string, scopeKey: string) => {
        set((state) => {
          const current = state.partitions[scopeKey];
          if (!current) return state;
          const updated = { ...current.completedSteps };
          delete updated[stepId];
          return {
            partitions: {
              ...state.partitions,
              [scopeKey]: {
                ...current,
                completedSteps: updated,
              },
            },
          };
        });
      },

      resetScope: (scopeKey: string) => {
        set((state) => {
          const updated = { ...state.partitions };
          delete updated[scopeKey];
          return { partitions: updated };
        });
      },
    }),
    {
      name: 'elance_guidance_storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
