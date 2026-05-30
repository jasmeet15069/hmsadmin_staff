import { PlanID, PlanLimits } from '@/hooks/usePlanLimits';

const CORE_MODULES = new Set([
  'dashboard',
  'staff',
  'rooms',
  'guests',
  'housekeeping',
  'maintenance',
  'complaints',
  'payments',
  'settings',
]);

const PRO_MODULES = new Set([
  ...CORE_MODULES,
  'menu',
  'inventory',
  'order_queue',
  'reports',
]);

const PREMIUM_MODULES = new Set([
  ...PRO_MODULES,
  'ai_voice_agent',
  'ai_voice_booking',
]);

export function modulesForPlan(plan: PlanID | undefined) {
  if (plan === 'premium') return PREMIUM_MODULES;
  if (plan === 'pro') return PRO_MODULES;
  return CORE_MODULES;
}

export function isModuleLockedForPlan(moduleID: string, limits?: PlanLimits | null) {
  if (!moduleID || moduleID === 'platform') return false;
  if (!limits) return false;
  return !modulesForPlan(limits.plan).has(moduleID);
}

export function upgradeMessage(moduleLabel: string, limits?: PlanLimits | null) {
  const planName = limits?.plan_name || 'Basic';
  return `${moduleLabel} is not included in the ${planName} plan. Unlock Pro plan or more to use this panel.`;
}

