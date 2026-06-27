import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material"
import { useTheme } from "@mui/material/styles"
import { TYPE_LABEL } from "@/lib/format"
import type { PropertyType } from "@models/types"

const CATEGORIES: ("todos" | PropertyType)[] = ["todos", "departamento", "casa", "ph", "local", "oficina"]

interface CategorySelectorProps {
  cat: "todos" | PropertyType
  onSetCat: (cat: "todos" | PropertyType) => void
}

export function CategorySelector({ cat, onSetCat }: CategorySelectorProps) {
  const theme = useTheme()
  // Resolve all colors as concrete hex strings — avoids MUI's hover overlay making them transparent
  const bg = theme.palette.secondaryContainer.main
  const bgText = theme.palette.secondaryContainer.contrastText
  const bgHover = theme.palette.primaryContainer.main
  const selectedBg = theme.palette.primary.main
  const selectedText = theme.palette.primary.contrastText

  return (
    <Box
      sx={{
        display: "flex",
        overflowX: "auto",
        maxWidth: "100%",
        py: 1,
        px: 1.5,
        m: -1.5,
        mr: { xs: -1.5, sm: 0 },
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <ToggleButtonGroup
        value={cat}
        exclusive
        onChange={(_, v) => v && onSetCat(v)}
        sx={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 1.25,
          border: "none",
          "& .MuiToggleButtonGroup-grouped": {
            border: "none !important",
            mx: "0 !important",
          },
        }}
      >
        {CATEGORIES.map((c) => (
          <ToggleButton
            key={c}
            value={c}
            sx={{
              px: 2.5,
              py: 0.75,
              whiteSpace: "nowrap",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "9999px !important",
              border: "none !important",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              transition: "background-color 0.2s ease-in-out, filter 0.2s",
              // All states use !important to beat MUI's own hover overlay
              backgroundColor: `${bg} !important`,
              color: `${bgText} !important`,
              "&:hover": {
                backgroundColor: `${bgHover} !important`,
              },
              "&.Mui-selected": {
                backgroundColor: `${selectedBg} !important`,
                color: `${selectedText} !important`,
                fontWeight: 700,
                "&:hover": {
                  backgroundColor: `${selectedBg} !important`,
                  filter: "brightness(0.88)",
                },
              },
            }}
          >
            {c === "todos" ? "Todos" : TYPE_LABEL[c]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}
