'use client';

import { useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useGuidanceContext } from '@/components/guidance/guidance-provider';
import { useGuidanceStore } from '@/store/use-guidance-store';
import {
  getGuidanceForPathname,
  ModuleGuidanceDefinition,
} from '@/config/guidance-registry';

/**
 * Hook to consume page guidance, welcome content, prerequisites,
 * and scoped dismissal state for the current route.
 */
export function usePageGuidance(pathnameOverride?: string) {
  const currentPathname = usePathname();
  const pathname = pathnameOverride || currentPathname || '';

  const {
    scopeKey,
    tenantSlug,
    userId,
    isHelpDrawerOpen,
    setHelpDrawerOpen,
    hasHydrated,
  } = useGuidanceContext();

  const guidance = useMemo<ModuleGuidanceDefinition | null>(() => {
    return getGuidanceForPathname(pathname);
  }, [pathname]);

  const moduleKey = guidance?.moduleKey;

  // Store queries
  const isWelcomeDismissed = useGuidanceStore(
    useCallback(
      (state) => (moduleKey ? state.isWelcomeDismissed(moduleKey, scopeKey) : false),
      [moduleKey, scopeKey]
    )
  );

  // Store actions
  const dismissWelcome = useCallback(() => {
    if (moduleKey) {
      useGuidanceStore.getState().dismissWelcome(moduleKey, scopeKey);
    }
  }, [moduleKey, scopeKey]);

  const resetWelcome = useCallback(() => {
    if (moduleKey) {
      useGuidanceStore.getState().resetWelcome(moduleKey, scopeKey);
    }
  }, [moduleKey, scopeKey]);

  const isPrerequisiteDismissed = useCallback(
    (prereqId: string) => {
      return useGuidanceStore.getState().isPrerequisiteDismissed(prereqId, scopeKey);
    },
    [scopeKey]
  );

  const dismissPrerequisite = useCallback(
    (prereqId: string) => {
      useGuidanceStore.getState().dismissPrerequisite(prereqId, scopeKey);
    },
    [scopeKey]
  );

  const resetPrerequisite = useCallback(
    (prereqId: string) => {
      useGuidanceStore.getState().resetPrerequisite(prereqId, scopeKey);
    },
    [scopeKey]
  );

  const isStepCompleted = useCallback(
    (stepId: string) => {
      return useGuidanceStore.getState().isStepCompleted(stepId, scopeKey);
    },
    [scopeKey]
  );

  const completeStep = useCallback(
    (stepId: string) => {
      useGuidanceStore.getState().completeStep(stepId, scopeKey);
    },
    [scopeKey]
  );

  const resetStep = useCallback(
    (stepId: string) => {
      useGuidanceStore.getState().resetStep(stepId, scopeKey);
    },
    [scopeKey]
  );

  const toggleHelpDrawer = useCallback(() => {
    setHelpDrawerOpen(!isHelpDrawerOpen);
  }, [isHelpDrawerOpen, setHelpDrawerOpen]);

  return {
    guidance,
    hasGuidance: Boolean(guidance),
    moduleKey,
    scopeKey,
    tenantSlug,
    userId,
    hasHydrated,

    // Welcome pop-up state
    isWelcomeDismissed,
    dismissWelcome,
    resetWelcome,

    // Prerequisite state
    isPrerequisiteDismissed,
    dismissPrerequisite,
    resetPrerequisite,

    // Workflow steps state
    isStepCompleted,
    completeStep,
    resetStep,

    // Help drawer state
    isHelpDrawerOpen,
    setHelpDrawerOpen,
    toggleHelpDrawer,
  };
}
