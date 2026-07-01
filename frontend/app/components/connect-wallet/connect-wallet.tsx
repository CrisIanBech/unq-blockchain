import { Button, Box, Typography } from "@mui/material"
import { useUserStore } from "@/stores/user-store"

const MOCK_WALLET = "0x7A3f...91Cd"

export function ConnectWallet() {
  const wallet = useUserStore((s) => s.wallet)
  const connectWallet = useUserStore((s) => s.connectWallet)
  const isConnected = !!wallet && wallet !== MOCK_WALLET

  if (isConnected) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
          {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </Typography>
      </Box>
    )
  }

  return (
    <Button variant="contained" size="small" onClick={connectWallet}>
      Conectar Wallet
    </Button>
  )
}
