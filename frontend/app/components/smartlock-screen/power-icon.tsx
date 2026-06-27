import { Box, ButtonBase } from "@mui/material"
import LockRoundedIcon from "@mui/icons-material/LockRounded"
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded"
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded"

interface PowerIconProps {
  active: boolean
  keyMode: boolean
  unlocked: boolean
  onClick: () => void
}

export function PowerIcon({ active, keyMode, unlocked, onClick }: PowerIconProps) {
  const ring = keyMode ? "tertiary.main" : "primary.main"
  const ringRgb = keyMode ? "var(--mui-palette-tertiary-main)" : "var(--mui-palette-primary-main)"
  const Icon = keyMode ? VpnKeyRoundedIcon : unlocked ? LockOpenRoundedIcon : LockRoundedIcon
  return (
    <Box sx={{ position: "relative", width: 160, height: 160, display: "grid", placeItems: "center", mx: "auto" }}>
      {active &&
        [0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              width: 140,
              height: 140,
              borderRadius: "50%",
              border: `2px solid ${ringRgb}`,
              animation: "pulse 2s ease-out infinite",
              animationDelay: `${i * 0.6}s`,
              "@keyframes pulse": {
                "0%": { transform: "scale(0.7)", opacity: 0.7 },
                "100%": { transform: "scale(1.25)", opacity: 0 },
              },
            }}
          />
        ))}
      <ButtonBase
        onClick={onClick}
        sx={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: active ? 4 : 2,
          borderColor: active ? ring : "outlineVariant",
          bgcolor: active ? (keyMode ? "tertiaryContainer.main" : "primaryContainer.main") : "surfaceContainer.high",
          color: active
            ? keyMode
              ? "tertiaryContainer.contrastText"
              : "primaryContainer.contrastText"
            : "text.secondary",
          display: "grid",
          placeItems: "center",
          transition: "all .3s ease",
          boxShadow: active ? 4 : 0,
          "&:hover": { transform: "scale(1.04)" },
        }}
        aria-label={active ? "Apagar NFC" : "Encender NFC"}
      >
        <Icon sx={{ fontSize: 52 }} />
      </ButtonBase>
    </Box>
  )
}
