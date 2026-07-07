/** True when an on-chain ERC-721 token ID does not exist on the current network. */
export function isNonexistentTokenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ERC721NonexistentToken") ||
    message.includes("nonexistent token") ||
    message.includes("owner query for nonexistent")
  );
}
