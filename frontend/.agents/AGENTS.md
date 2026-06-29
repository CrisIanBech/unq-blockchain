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

---

# BlockRent Blockchain Integration Rules

You MUST strictly adhere to the following architecture and guidelines when implementing new features, connecting endpoints, or updating the state in the BlockRent application.

## 1. Architectural Boundaries

Every blockchain or API action must pass sequentially through these boundaries:

```
[ Zustand Stores (UI State) ]
             ↓
[ Domain Services (Business Logic & Error Translation) ]
             ↓
[ Repositories (Domain Persistence Abstraction) ]
             ↓
[ Blockchain Infrastructure (Ethers.js / Web3 Providers) ]
             ↓
[ Smart Contracts / External APIs ]
```

### Constraints:
*   **Zustand Stores & UI Components:** MUST NEVER import `ethers` or interact with raw smart contract instances. They must only interact with Domain Services.
*   **Domain Services:** Responsible for orchestrating repository actions, validating parameters, converting numeric currencies (e.g. converting user-friendly numbers to 6-decimal `USDC` raw bigint), translating raw errors into domain errors, and returning **pure domain objects** (no ethers types like `TransactionReceipt` or `Contract`).
*   **Repositories:** Represent persistence of the business domain. They call contract wrappers under the hood, but their methods should hide the contract names and parameters using clean business terminology (e.g., `payRent`, `withdrawRent` instead of raw `payRent()` calls).
*   **Blockchain Infrastructure:** Holds the ABI files, `WeakMap` cached contract instance resolving logic, providers, and MetaMask/network switching scripts.

---

## 2. Dynamic Address Resolving vs. Mock IDs
*   **Never reuse UI string IDs** (e.g., `"rent-1"`) as contract addresses on-chain.
*   The `Rental` and `OwnedProperty` interface objects explicitly define `propertyId: bigint`, `agreementAddress?: string`, and `rentalNFTAddress?: string`. Always check for `agreementAddress` or the dynamic `propertyId` when executing real on-chain actions.

---

## 3. Domain-Level Error Handling
*   All blockchain exceptions (e.g., MetaMask user cancellation `ACTION_REJECTED`, out of gas, or EVM reverts like `NotPropertyOwner`) must be caught at the **Domain Service** layer using the `translateError` helper (`frontend/app/lib/errors/translator.ts`).
*   Stores and UI components must only receive translated **Domain Errors** (`UserRejectedTransaction`, `InsufficientFunds`, etc.) to show clean, localized messages.
