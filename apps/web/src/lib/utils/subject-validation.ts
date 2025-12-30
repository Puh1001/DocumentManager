/**
 * Valid subject names (string literals only, not object types)
 * These match the string literal part of the Subjects type union
 */
const VALID_SUBJECT_NAMES = [
  "Document",
  "Folder",
  "User",
  "Department",
  "Kpi",
  "Maintenance",
  "Permission",
  "all",
] as const;

type ValidSubjectName = (typeof VALID_SUBJECT_NAMES)[number];

/**
 * Type guard to check if a string is a valid Subject name (string literal)
 * Note: This only validates string literals, not object types
 * @param module - Module name to validate
 * @returns true if module is a valid Subject name string literal
 */
export function isValidSubject(module: string): module is ValidSubjectName {
  return (VALID_SUBJECT_NAMES as readonly string[]).includes(module);
}
