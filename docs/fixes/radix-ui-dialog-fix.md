# Radix UI Dialog Module Resolution Fix

**Date**: 2026-02-11
**Status**: ✅ Resolved
**Project**: acdefense-website (ACDefenseCo)

## Problem Summary

The application was failing to load with a critical module resolution error:
```
Module not found: Can't resolve '@radix-ui/react-dialog'
```

This error occurred when trying to render course detail pages that use the booking dialog component.

## Root Causes

### 1. Incorrect Package in package.json
**File**: `package.json` line 31
```json
"radix-ui": "^1.4.3"  // ❌ This package doesn't exist!
```

**Issue**: There is no npm package named "radix-ui". The correct packages are scoped under `@radix-ui/*` (e.g., `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`).

### 2. Incorrect Import Statement
**File**: `components/ui/dialog.tsx` line 3
```typescript
import { Dialog as DialogPrimitive } from "radix-ui"  // ❌ Wrong!
```

**Issue**: Importing from non-existent "radix-ui" package instead of the correct `@radix-ui/react-dialog`.

## Solution Applied

### Step 1: Fixed Import in dialog.tsx
```typescript
// Before:
import { Dialog as DialogPrimitive } from "radix-ui"

// After:
import * as DialogPrimitive from "@radix-ui/react-dialog"
```

### Step 2: Updated package.json
```json
// Removed:
"radix-ui": "^1.4.3"

// Added:
"@radix-ui/react-dialog": "^1.1.15"
```

### Step 3: Reinstalled Dependencies
```bash
docker compose exec nextjs npm uninstall radix-ui
docker compose exec nextjs npm install @radix-ui/react-dialog
docker compose restart nextjs
```

## Verification

### Testing Performed
- ✅ Home page loads without errors
- ✅ Course detail pages load successfully
- ✅ 0 Radix UI module resolution errors in console
- ✅ Dialog component compiles correctly
- ✅ Next.js server starts successfully (Ready in 2.3s)

### Testing Tools Used
- Playwright MCP browser automation
- Docker logs analysis
- Console error monitoring

### Test Results
```
Page: http://localhost:3000/courses/concealed-carry-permit
Console Errors: 0 (Radix UI related)
Status: SUCCESS
```

## Important Notes for Future Development

### shadcn/ui Component Pattern
The project uses shadcn/ui components, which are built on Radix UI primitives. When adding new shadcn/ui components:

1. **Always use the official installation command**:
   ```bash
   docker compose exec nextjs npx shadcn@latest add <component-name>
   ```

2. **Correct Radix UI import pattern**:
   ```typescript
   import * as ComponentPrimitive from "@radix-ui/react-component"
   ```

3. **Common Radix UI packages for shadcn/ui**:
   - `@radix-ui/react-dialog` - Modals/dialogs
   - `@radix-ui/react-dropdown-menu` - Dropdowns
   - `@radix-ui/react-select` - Select inputs
   - `@radix-ui/react-label` - Form labels
   - `@radix-ui/react-slot` - Composition utility

### Docker Workflow
Since the project runs in Docker:
- Always install packages inside the container: `docker compose exec nextjs npm install <package>`
- Restart the container after major dependency changes: `docker compose restart nextjs`
- Check logs for errors: `docker compose logs nextjs --tail 50`

## Related Files Modified

1. `components/ui/dialog.tsx` - Fixed import statement
2. `package.json` - Removed incorrect package, added correct one
3. `package-lock.json` - Auto-updated by npm

## Database Note

During testing, discovered that the Concealed Carry Permit course schedule (Feb 10) is in the past, which is why the booking dialog doesn't appear on that course page. The page correctly filters schedules using:
```typescript
gte(courseSchedules.startDate, new Date())
```

Other courses with future schedules (Basic Pistol Safety - Feb 17, Advanced Tactical Shooting - Feb 24) will properly display the booking dialog.

## Prevention

To prevent similar issues in the future:
1. Always verify package names on npmjs.com before adding to package.json
2. Check official documentation for correct import syntax
3. Use TypeScript errors as early warning signals
4. Test thoroughly after adding new UI components
5. Keep shadcn/ui components updated via official CLI

## References

- Radix UI Docs: https://www.radix-ui.com/primitives/docs/overview/introduction
- shadcn/ui Docs: https://ui.shadcn.com
- Project CLAUDE.md: `/home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/CLAUDE.md`
