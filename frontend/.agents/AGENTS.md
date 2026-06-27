# Project Context: Rent platform

## The Main Idea
The project is a **platform for rent** (using Material design). The main objective is to eliminate realtors.

## Architecture

**`app` folder responsibilities:**
| Layer | Responsibility |
|---|---|
| `pages/` | Orchestrators only. Call hooks, distribute state/callbacks to components. No UI markup. |
| `components/` | Presentational ("dumb"). Props in, callbacks out. No hooks, stores, or network calls. |
| `stores/` | Single source of truth. Holds state, calls datasources, maps LocalModel↔DTO, manages `isLoading`. |
| `hooks/` | Thin layer: form state (react-hook-form + Zod), error surfacing, calls store actions with local models only. |
| `datasources/` | HTTP only via `api-client.ts` (Axios with auth interceptors + 401 refresh). Returns raw DTOs, no logic. |
| `models/*.ts` | Local domain models + API DTOs + mapper functions. |
| `models/*.schema.ts` | Zod schemas for form validation (used only in hooks). Error messages in English. |
| `utils/` | Generic helpers (e.g., `cn()`). |
| `routes/` | React Router config. |
| `contexts/` | React contexts for deep component trees (e.g., editor toolbar). |

### Component Folder Structure & Encapsulation
- Every presentational component must be located in its own subfolder named after the component (e.g., `app/components/my-properties-screen/`).
- Inside this folder, the main component file should match the folder name (e.g., `my-properties-screen.tsx`).
- If a component is split into subcomponents for better composition, these subcomponents should be placed in the same folder.
- **Critical**: Subcomponents must NOT be exported from the folder's entry point or external files. Keep their imports and exports local to that folder to encapsulate the composition of the component. (e.g., helper child components of `my-properties-screen` reside within `my-properties-screen/` but are not exported globally).
- **Subcomponent Splitting Criteria**:
  - Whenever rendering lists using `.map` or loop constructs, the rendered list item should be extracted into its own private subcomponent.
  - If a component exceeds 2 levels of layout indentation depth and continues growing, it must be split into smaller, semantic private subcomponents to ensure readability and modularity.

## Forms Guidance (React Hook Form + Zod + Material UI / Material 3)

### Principles
1. **Separation of Concerns**: Validation logic and form state (`useForm`, `control`, `register`, submit handlers) are defined **strictly** in the main hooks of each page (`app/hooks/`). Presentational components (`app/components/`) are DUMB and only receive the necessary fields and methods to bind to MUI.
2. **Schema validation**: Schemas are declared using Zod in files matching `models/*.schema.ts` with descriptive error messages in English.
3. **MUI Integration**: Use the `<Controller>` component from `react-hook-form` to cleanly bind interactive MUI inputs (like `<TextField>`, `<Switch>`, `<Select>`) to the form state, resolving type checking and error rendering.

### Example Pattern

**1. Define Schema (`app/models/property.schema.ts`)**
```typescript
import { z } from "zod";

export const propertyFormSchema = z.object({
  name: z.string().min(2, "Name must have at least 2 characters"),
  monthlyRent: z.number().positive("Rent must be positive"),
});

export type PropertyFormData = z.infer<typeof propertyFormSchema>;
```

**2. Define Page Hook (`app/hooks/use-my-properties-page.ts`)**
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertyFormSchema, type PropertyFormData } from "../models/property.schema";

export function useMyPropertiesPage() {
  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: { name: "", monthlyRent: 0 },
  });

  const onSubmit = (data: PropertyFormData) => {
    // Call store actions
  };

  return {
    form,
    onSubmit,
    // ... other states
  };
}
```

**3. Render in Dumb Component (`app/components/add-property-dialog.tsx`)**
```tsx
import { Controller, UseFormReturn } from "react-hook-form";
import { TextField, Button } from "@mui/material";
import type { PropertyFormData } from "../models/property.schema";

interface AddPropertyProps {
  form: UseFormReturn<PropertyFormData>;
  onSubmit: (data: PropertyFormData) => void;
}

export function AddPropertyForm({ form, onSubmit }: AddPropertyProps) {
  const { control, handleSubmit } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            label="Name"
            error={!!error}
            helperText={error?.message || " "}
            fullWidth
          />
        )}
      />
      <Button type="submit" variant="contained">Cargar</Button>
    </form>
  );
}
```
