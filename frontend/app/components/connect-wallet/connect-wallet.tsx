import { Button, Box, Typography, CircularProgress } from "@mui/material";
import { useUserStore, isWalletConnected } from "@/stores/user-store";

export function ConnectWallet() {
  const wallet = useUserStore((state) => state.wallet);
  const isConnecting = useUserStore((state) => state.isConnecting);
  const connectWallet = useUserStore((state) => state.connectWallet);

  if (isWalletConnected(wallet)) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
          {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </Typography>
      </Box>
    );
  }

  return (
    <Button
      variant="contained"
      size="small"
      disabled={isConnecting}
      onClick={() => void connectWallet()}
      startIcon={isConnecting ? <CircularProgress size={14} color="inherit" /> : undefined}
    >
      {isConnecting ? "Conectando…" : "Conectar Wallet"}
    </Button>
  );
}
