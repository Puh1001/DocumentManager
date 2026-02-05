/**
 * Revision label rule: Original = A/0, first revision = A/1, ... up to A/10.
 * After 10 revisions, switch to B/0..B/10, then C/0..C/10, etc.
 */

const REVISION_NUM_MAX = 10; // 0..10 per letter
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** All allowed revision labels: A/0..A/10, B/0..B/10, ... Z/0..Z/10 */
export const REVISION_LABEL_OPTIONS: string[] = [];
for (let i = 0; i < LETTERS.length; i++) {
  for (let n = 0; n <= REVISION_NUM_MAX; n++) {
    REVISION_LABEL_OPTIONS.push(`${LETTERS[i]}/${n}`);
  }
}

const OPTIONS_SET = new Set(REVISION_LABEL_OPTIONS);

export function isValidRevisionLabel(value: string): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 && OPTIONS_SET.has(normalized);
}

/**
 * Derive revision label from version index (1-based version count).
 * versionCount 1 -> A/0, 2 -> A/1, ... 11 -> A/10, 12 -> B/0, etc.
 */
export function getRevisionLabelFromVersionCount(versionCount: number): string {
  if (versionCount < 1) return REVISION_LABEL_OPTIONS[0];
  const index = versionCount - 1;
  const letterIndex = Math.floor(index / (REVISION_NUM_MAX + 1));
  const revIndex = index % (REVISION_NUM_MAX + 1);
  const letter = LETTERS[letterIndex % LETTERS.length];
  return `${letter}/${revIndex}`;
}
