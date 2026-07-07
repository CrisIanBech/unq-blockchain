/** Smartlock runs without on-chain verification when mock mode is enabled. */
export function isSmartlockMockMode(): boolean {
  return import.meta.env.VITE_SMARTLOCK_MOCK_MODE === "true";
}
