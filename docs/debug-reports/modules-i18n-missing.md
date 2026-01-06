# Debug Report: Missing i18n Translations for Modules Page

**Date:** 2025-12-26  
**Issue:** Missing internationalization (i18n) translations for Modules page  
**Status:** 🔴 Root Cause Identified

---

## Problem Summary

The Modules Management page has several hardcoded strings and missing translation keys:

- Missing `modules.json` translation file
- Missing `modules` namespace in `i18n/request.ts`
- Hardcoded module display names from database
- Hardcoded action names (create, delete, edit, manage, view)
- Missing translation keys for UI elements

---

## Root Cause Analysis (5 Whys)

### Why 1: Why are strings not translated?

**Answer:** The code uses `t("modules.*")` but the `modules` namespace doesn't exist in the translation system.

### Why 2: Why doesn't the modules namespace exist?

**Answer:** The `modules.json` translation file was never created, and it's not imported in `i18n/request.ts`.

### Why 3: Why wasn't the translation file created?

**Answer:** When the Modules page was implemented, the i18n setup was not completed.

### Why 4: Why are module display names hardcoded?

**Answer:** Module display names come from the database (`module.displayName`), which are stored in English only.

### Why 5: Why are action names hardcoded?

**Answer:** Action names are extracted from permission names (`action:Module`) and displayed directly without translation.

---

## Root Cause

**Missing i18n infrastructure for modules:**

1. No `modules.json` translation file exists
2. `modules` namespace not imported in `i18n/request.ts`
3. Module display names from database are not translated
4. Action names (create, delete, edit, manage, view) are not translated

---

## Evidence

### 1. Missing Translation File

- ❌ `apps/web/messages/en/modules.json` - **DOES NOT EXIST**
- ❌ `apps/web/messages/vi/modules.json` - **DOES NOT EXIST**
- ❌ `apps/web/messages/zh/modules.json` - **DOES NOT EXIST**

### 2. Missing Namespace Import

**File:** `apps/web/i18n/request.ts:17-41`

```typescript
const [
  common,
  auth,
  dashboard,
  documents,
  departments,
  errors,
  kpi,
  maintenance,
  boss,
  users,
  permissions,
] = await Promise.all([
  // ... imports ...
]);
```

❌ **Missing:** `modules` import

```typescript
messages: {
  common: common.default,
  auth: auth.default,
  // ... other namespaces ...
  permissions: permissions.default,
},
```

❌ **Missing:** `modules: modules.default`

### 3. Hardcoded Strings in Code

**File:** `apps/web/src/app/[locale]/dashboard/modules/page.tsx`

- Line 322: `{module.displayName}` - Hardcoded from database
- Line 325: `({module.name})` - Hardcoded from database
- Line 335: `{module.description}` - Hardcoded from database
- Line 349: `{action}` - Hardcoded action name (create, delete, etc.)

### 4. Missing Translation Keys

The code uses these keys but they don't exist:

- `modules.title`
- `modules.description`
- `modules.addModule`
- `modules.list`
- `modules.search`
- `modules.permissions`
- And many more...

---

## Impact

- ❌ Modules page not fully internationalized
- ❌ English-only text for module names and descriptions
- ❌ Action names not translated
- ❌ Poor user experience for non-English users

---

## Fix Plan

### Step 1: Create Translation Files

Create `modules.json` files for all locales:

- `apps/web/messages/en/modules.json`
- `apps/web/messages/vi/modules.json`
- `apps/web/messages/zh/modules.json`

### Step 2: Add Translation Keys

Include all missing keys:

- Page titles and descriptions
- Form labels and placeholders
- Action names (create, delete, edit, manage, view)
- Success/error messages
- Module status labels

### Step 3: Update i18n Request Config

**File:** `apps/web/i18n/request.ts`

- Import `modules.json` for all locales
- Add `modules` to messages object

### Step 4: Update Modules Page

**File:** `apps/web/src/app/[locale]/dashboard/modules/page.tsx`

- Use `tModules` hook: `const tModules = useTranslations("modules");`
- Translate action names
- Add fallback translations for module display names (optional, as they come from DB)

### Step 5: Create Action Name Translation Helper

Create a helper function to translate action names:

```typescript
const translateAction = (action: string) => {
  return tModules(`actions.${action}`) || action;
};
```

---

## Translation Keys Needed

### Page Structure

- `title`: "Module Management"
- `description`: "Manage system modules and their permissions"
- `list`: "Modules"
- `search`: "Search modules..."
- `addModule`: "Add Module"
- `empty`: "No modules available"
- `noResults`: "No modules found"

### Module Display

- `permissions`: "Permissions"
- `noPermissions`: "No permissions assigned"
- `inactive`: "Inactive"

### Actions

- `actions.create`: "Create"
- `actions.delete`: "Delete"
- `actions.edit`: "Edit"
- `actions.manage`: "Manage"
- `actions.view`: "View"

### Form

- `createModule`: "Create Module"
- `editModule`: "Edit Module"
- `name`: "Name"
- `displayName`: "Display Name"
- `description`: "Description"
- `nameHint`: "PascalCase format (e.g., User, Department, Kpi)"
- `createDescription`: "Create a new module. Permissions will be auto-generated."
- `editDescription`: "Update module information"

### Messages

- `createSuccess`: "Module created"
- `createSuccessDesc`: "Module has been created and permissions have been auto-generated."
- `updateSuccess`: "Module updated"
- `updateSuccessDesc": "Module has been updated successfully."
- `deleteSuccess": "Module deleted"
- `deleteSuccessDesc": "Module has been deleted successfully."
- `deleteConfirm": "Delete Module"
- `deleteConfirmDesc": "Are you sure you want to delete this module? This action cannot be undone."
- `delete": "Delete"

---

## Testing Checklist

- [ ] Translation files created for all locales
- [ ] i18n request config updated
- [ ] All hardcoded strings replaced with translation keys
- [ ] Action names translated
- [ ] Page displays correctly in English
- [ ] Page displays correctly in Vietnamese
- [ ] Page displays correctly in Chinese
- [ ] No console errors

---

## Related Files

- `apps/web/messages/en/modules.json` (to be created)
- `apps/web/messages/vi/modules.json` (to be created)
- `apps/web/messages/zh/modules.json` (to be created)
- `apps/web/i18n/request.ts` (to be updated)
- `apps/web/src/app/[locale]/dashboard/modules/page.tsx` (to be updated)

---

## Prevention

When creating new pages:

1. ✅ Create translation files for all locales
2. ✅ Add namespace to `i18n/request.ts`
3. ✅ Use translation keys instead of hardcoded strings
4. ✅ Test in all supported locales

---

**Report Generated:** 2025-12-26  
**Next Step:** Implement fix plan
