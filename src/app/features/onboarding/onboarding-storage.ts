/**
 * localStorage keys for the first-run wizard — kept in their own file so the
 * dashboard can check the flag without pulling the wizard into its chunk.
 * Both are scoped per user so shared browsers do not bleed state.
 */
export const ONBOARDING_DONE_KEY = (userId: string) => `xetax.onboarding.done.${userId}`;
export const ONBOARDING_STEP_KEY = (userId: string) => `xetax.onboarding.step.${userId}`;
