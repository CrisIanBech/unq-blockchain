import { Box, ButtonBase, Stack, Typography } from "@mui/material"
import { alpha, useTheme } from "@mui/material/styles"
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded"
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded"
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded"

interface SideSelectorProps {
  keyMode: boolean
  list: { id: string; name: string; address?: string }[]
  selId: string
  onSelectId: (id: string) => void
}

export function SideSelector({ keyMode, list, selId, onSelectId }: SideSelectorProps) {
  const theme = useTheme()
  // Resolve actual CSS color strings so they work on all sx properties (color, bgcolor, border, etc.)
  const accentMain = keyMode ? theme.palette.tertiary.main : theme.palette.primary.main
  const accentA = (opacity: number) => alpha(accentMain, opacity)

  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 0.5, letterSpacing: 1.5 }}>
        {keyMode ? "Mis alquileres" : "Mis propiedades"}
      </Typography>

      {list.map((item) => {
        const isSel = item.id === selId
        return (
          <ButtonBase
            key={item.id}
            onClick={() => onSelectId(item.id)}
            sx={{
              display: "flex",
              alignItems: "flex-start", // align icon with first text line, not centered with the whole block
              justifyContent: "flex-start",
              textAlign: "left",
              width: "100%",
              borderRadius: "12px",
              p: 1.25,
              gap: 1.25,
              bgcolor: isSel ? accentA(0.12) : accentA(0.03),
              transition: "background-color 0.2s ease-in-out",
              "&:hover": {
                bgcolor: isSel ? accentA(0.16) : accentA(0.07),
              },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: accentA(isSel ? 0.18 : 0.10),
                color: accentMain, // Plain CSS color string — works on all sx properties
              }}
            >
              {keyMode ? <VpnKeyRoundedIcon fontSize="small" /> : <HomeWorkRoundedIcon fontSize="small" />}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: isSel ? 700 : 600, color: isSel ? accentMain : "text.primary", lineHeight: 1.3 }}
              >
                {item.name}
              </Typography>
              {item.address && (
                <Stack direction="row" alignItems="center" gap={0.25} sx={{ mt: 0.25 }}>
                  <LocationOnRoundedIcon sx={{ fontSize: 11, color: "text.disabled", flexShrink: 0 }} />
                  <Typography variant="caption" noWrap color="text.secondary" sx={{ lineHeight: 1.3 }}>
                    {item.address}
                  </Typography>
                </Stack>
              )}
            </Box>
          </ButtonBase>
        )
      })}
    </Stack>
  )
}
