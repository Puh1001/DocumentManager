# Phase 01 Code Review: Rename & Navigation (documents → ISO Document)

**Scope:** Phase 01 implementation per [phase-01-rename-and-navigation.md](../phase-01-rename-and-navigation.md)  
**Reviewed against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 01 is **i18n-only**: JSON message files in `apps/web/messages/{en,vi,zh}/` for common, documents, boss. No TypeScript/React or API changes. Review focused on key consistency, locale parity, and alignment with success criteria.

**Verdict:** Approved after fixing missing ISO wording in boss.json (en: viewDescriptions.documents, empty.noDocuments/Description; vi: viewType.documents, empty.noDocuments/Description; zh: viewDescriptions.documents, empty.noDocuments/Description). All fixes applied.

---

## Critical Issues (fixed)

1. **en/boss.json**
   - `viewDescriptions.documents` was "View documents" → set to "View ISO documents".
   - `empty.noDocuments` was "No documents found" → set to "No ISO documents found".
   - `empty.noDocumentsDescription` was "There are no documents in this department folder." → set to "There are no ISO documents in this department folder."

2. **vi/boss.json**
   - `viewType.documents` was "Tài liệu" → set to "Tài liệu ISO".
   - `empty.noDocuments` was "Không có tài liệu" → set to "Không có tài liệu ISO".
   - `empty.noDocumentsDescription` was "Không có tài liệu trong thư mục phòng ban này." → set to "Không có tài liệu ISO trong thư mục phòng ban này."

3. **zh/boss.json**
   - `viewDescriptions.documents` was "查看文档" → set to "查看ISO文档".
   - `empty.noDocuments` was "未找到文档" → set to "未找到ISO文档".
   - `empty.noDocumentsDescription` was "此部门文件夹中没有文档。" → set to "此部门文件夹中没有ISO文档。"

---

## Suggestions

- **Locale parity:** Keep en/vi/zh in sync when adding or changing keys (same keys in all three).
- **Optional follow-up (done):** Updated `permissions.json` ("Documents page" → "ISO Document page" in folderDocumentPermissionsDescription) and `dashboard.json` ("Total Documents" → "Total ISO Documents", "Recent Documents" → "Recent ISO documents", recentDocumentsDescription) for en/vi/zh.

---

## Positive Feedback

- **KISS/DRY:** Only display strings changed; route, i18n keys, and code identifiers unchanged — minimal surface area.
- **Code usage:** Sidebar uses `t("navigation.documents")`, boss uses `t("viewType.documents")` and `t("viewDescriptions.documents")`; keys unchanged, values updated — no code changes required.
- **common.json & documents.json:** navigation.documents, documents.title, searchPlaceholder updated consistently across en/vi/zh.
- **boss.json:** description, viewType.documents, notFound.document, error.loadDocumentsFailed were already correct; remaining keys fixed in this review.

---

## Security

- No impact. i18n string changes only; no auth, permissions, or data handling.

---

## Performance

- No impact. Same keys and bundle size; only string values changed.
