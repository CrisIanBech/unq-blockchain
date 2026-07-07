/** Mock property/rental/geocoding repos — does not mock MetaMask signing. */
export function usesMockRepositories(): boolean {
  return import.meta.env.VITE_USE_MOCKS === "true";
}
