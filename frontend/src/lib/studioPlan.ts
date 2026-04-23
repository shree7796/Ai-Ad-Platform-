import type { ModelOption } from '@/components/studio/ModelDropdown';

/** Image model `value`s allowed on the free plan (must match backend `allowed_image_models`). */
export const FREE_PLAN_IMAGE_MODEL_VALUES = new Set(['flux-dev', 'nano-banana']);

export function isFreeStudioPlan(plan: string | undefined | null): boolean {
  return !plan || plan.toLowerCase() === 'free';
}

/** Full model list with `disabled: true` on rows that need a paid plan (free tier still sees them). */
export function imageModelsWithLocksForPlan(
  plan: string | undefined | null,
  allModels: ModelOption[],
): ModelOption[] {
  if (!isFreeStudioPlan(plan)) {
    return allModels.map((m) => ({ ...m, disabled: false }));
  }
  return allModels.map((m) => ({
    ...m,
    disabled: !FREE_PLAN_IMAGE_MODEL_VALUES.has(m.value),
  }));
}
