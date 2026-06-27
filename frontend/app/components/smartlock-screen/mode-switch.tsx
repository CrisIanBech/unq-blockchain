import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { alpha } from "@mui/material/styles"
import LockRoundedIcon from "@mui/icons-material/LockRounded"
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded"

interface ModeSwitchProps {
  keyMode: boolean
  onSetKeyMode: (val: boolean) => void
}

export function ModeSwitch({ keyMode, onSetKeyMode }: ModeSwitchProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
      <ToggleButtonGroup
        value={keyMode ? "key" : "lock"}
        exclusive
        onChange={(_, v) => v !== null && onSetKeyMode(v === "key")}
        sx={{
          width: 320, // Fixed width so flex:1 on children distributes space equally
          "& .MuiToggleButtonGroup-grouped": {
            border: "none !important",
            mx: "0 !important",
          },
        }}
      >
        <ToggleButton
          value="lock"
          size="large"
          aria-label="Modo cerradura"
          sx={{
            flex: 1,
            justifyContent: "center",
            px: 3.5,
            py: 1,
            gap: 0.75,
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "9999px 0 0 9999px !important",
            border: "none !important",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            color: "text.secondary",
            transition: "background-color 0.2s ease-in-out",
            "& .MuiTouchRipple-root": { color: "primary.main" },
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            },
            "&.Mui-selected": {
              bgcolor: (theme) => `${alpha(theme.palette.primary.main, 0.12)} !important`,
              color: "primary.main !important",
              "&:hover": {
                bgcolor: (theme) => `${alpha(theme.palette.primary.main, 0.16)} !important`,
              },
            },
          }}
        >
          <LockRoundedIcon fontSize="medium" />
          <Typography variant="body2" fontWeight={600}>
            Cerradura
          </Typography>
        </ToggleButton>

        <ToggleButton
          value="key"
          aria-label="Modo llave"
          sx={{
            flex: 1,
            justifyContent: "center",
            px: 3.5,
            py: 1,
            gap: 0.75,
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "0 9999px 9999px 0 !important",
            border: "none !important",
            bgcolor: (theme) => alpha(theme.palette.tertiary.main, 0.04),
            color: "text.secondary",
            transition: "background-color 0.2s ease-in-out",
            "& .MuiTouchRipple-root": { color: "tertiary.main" },
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.tertiary.main, 0.08),
            },
            "&.Mui-selected": {
              bgcolor: (theme) => `${alpha(theme.palette.tertiary.main, 0.12)} !important`,
              color: "tertiary.main !important",
              "&:hover": {
                bgcolor: (theme) => `${alpha(theme.palette.tertiary.main, 0.16)} !important`,
              },
            },
          }}
        >
          <VpnKeyRoundedIcon fontSize="medium" />
          <Typography variant="body2" fontWeight={600}>
            Llave
          </Typography>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}
