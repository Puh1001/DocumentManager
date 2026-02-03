-- ============================================
-- Query để kiểm tra cấu trúc storage hiện tại
-- ============================================
-- Mục đích: Kiểm tra files và folders đang được lưu trong DB như thế nào
-- Trước khi migration sang cấu trúc mới

-- ============================================
-- 1. KIỂM TRA FOLDERS - Tên folder và path
-- ============================================

-- 1.1. Tổng quan folders theo department
SELECT 
    d.code AS department_code,
    d.name AS department_name,
    COUNT(DISTINCT f.id) AS folder_count,
    COUNT(DISTINCT CASE WHEN f.deleted_at IS NULL THEN f.id END) AS active_folder_count
FROM departments d
LEFT JOIN folders f ON f.department_id = d.id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;

-- 1.2. Kiểm tra folders có tên "Documents" (cần đổi thành "ISO_documents")
SELECT 
    f.id,
    f.name,
    f.path,
    d.code AS department_code,
    f.parent_id,
    f.is_internal,
    f.internal_type,
    f.deleted_at,
    (SELECT COUNT(*) FROM documents doc WHERE doc.folder_id = f.id) AS document_count
FROM folders f
LEFT JOIN departments d ON d.id = f.department_id
WHERE f.name = 'Documents' 
   OR f.path LIKE '%/Documents'
   OR f.path LIKE '%/Documents/%'
ORDER BY f.path;

-- 1.3. Kiểm tra folders có tên "Deleted files" hoặc "Delete_files"
SELECT 
    f.id,
    f.name,
    f.path,
    d.code AS department_code,
    f.is_internal,
    f.internal_type,
    f.deleted_at,
    (SELECT COUNT(*) FROM documents doc WHERE doc.folder_id = f.id AND doc.status = 'DELETED') AS deleted_document_count
FROM folders f
LEFT JOIN departments d ON d.id = f.department_id
WHERE f.name LIKE '%Delete%'
   OR f.path LIKE '%/Deleted files%'
   OR f.path LIKE '%/Delete_files%'
   OR f.internal_type = 'DELETE_FILES'
ORDER BY f.path;

-- 1.4. Kiểm tra cấu trúc folder theo department (4 folders chính: KPI, ISO_documents, Maintenance, Delete_files)
SELECT 
    d.code AS department_code,
    f.name AS folder_name,
    f.path,
    f.is_internal,
    f.internal_type,
    CASE 
        WHEN f.name = 'KPI' THEN 'KPI'
        WHEN f.name = 'Documents' THEN 'DOCUMENTS_OLD'
        WHEN f.name = 'ISO_documents' THEN 'ISO_DOCUMENTS'
        WHEN f.name = 'Maintenance' THEN 'MAINTENANCE'
        WHEN f.name LIKE '%Delete%' THEN 'DELETE_FILES'
        ELSE 'OTHER'
    END AS expected_section,
    (SELECT COUNT(*) FROM documents doc WHERE doc.folder_id = f.id) AS document_count
FROM departments d
LEFT JOIN folders f ON f.department_id = d.id AND f.deleted_at IS NULL
WHERE f.parent_id IS NULL 
   OR f.path NOT LIKE '%/versions%'
ORDER BY d.code, f.name;

-- ============================================
-- 2. KIỂM TRA DOCUMENTS - File paths và locations
-- ============================================

-- 2.1. Tổng quan documents theo status
SELECT 
    status,
    COUNT(*) AS count,
    SUM(file_size) AS total_size_bytes,
    ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) AS total_size_mb
FROM documents
GROUP BY status
ORDER BY status;

-- 2.2. Documents đang ở trong "current" subfolder (cần di chuyển ra section root)
SELECT 
    d.id,
    d.name,
    d.file_name,
    d.file_path,
    d.status,
    f.path AS folder_path,
    f.name AS folder_name,
    dept.code AS department_code,
    CASE 
        WHEN d.file_path LIKE '%/current/%' THEN 'IN_CURRENT_SUBFOLDER'
        WHEN d.file_path LIKE '%/versions/%' THEN 'IN_VERSIONS'
        ELSE 'DIRECT_IN_SECTION'
    END AS location_type
FROM documents d
JOIN folders f ON f.id = d.folder_id
LEFT JOIN departments dept ON dept.id = f.department_id
WHERE d.file_path LIKE '%/current/%'
   OR d.file_path LIKE '%/Current/%'
ORDER BY d.file_path;

-- 2.3. Documents theo section (KPI, ISO_documents/Documents, Maintenance)
SELECT 
    CASE 
        WHEN f.path LIKE '%/KPI%' AND f.path NOT LIKE '%/versions%' THEN 'KPI'
        WHEN f.path LIKE '%/Documents%' AND f.path NOT LIKE '%/versions%' THEN 'DOCUMENTS'
        WHEN f.path LIKE '%/ISO_documents%' AND f.path NOT LIKE '%/versions%' THEN 'ISO_DOCUMENTS'
        WHEN f.path LIKE '%/Maintenance%' AND f.path NOT LIKE '%/versions%' THEN 'MAINTENANCE'
        WHEN f.path LIKE '%/Delete%' THEN 'DELETE_FILES'
        WHEN f.path LIKE '%/versions%' THEN 'VERSIONS'
        ELSE 'OTHER'
    END AS section_type,
    COUNT(*) AS document_count,
    SUM(d.file_size) AS total_size_bytes,
    ROUND(SUM(d.file_size) / 1024.0 / 1024.0, 2) AS total_size_mb
FROM documents d
JOIN folders f ON f.id = d.folder_id
WHERE d.status != 'DELETED'
GROUP BY section_type
ORDER BY section_type;

-- 2.4. Documents đang ở trong "versions" folder (có thể là current file, không phải version)
SELECT 
    d.id,
    d.name,
    d.file_name,
    d.file_path,
    d.status,
    f.path AS folder_path,
    dept.code AS department_code,
    (SELECT COUNT(*) FROM document_versions dv WHERE dv.document_id = d.id) AS version_count
FROM documents d
JOIN folders f ON f.id = d.folder_id
LEFT JOIN departments dept ON dept.id = f.department_id
WHERE d.file_path LIKE '%/versions/%'
ORDER BY d.file_path
LIMIT 50;

-- 2.5. Documents theo department và section
SELECT 
    dept.code AS department_code,
    CASE 
        WHEN f.path LIKE '%/KPI%' AND f.path NOT LIKE '%/versions%' AND f.path NOT LIKE '%/current%' THEN 'KPI'
        WHEN f.path LIKE '%/Documents%' AND f.path NOT LIKE '%/versions%' AND f.path NOT LIKE '%/current%' THEN 'DOCUMENTS'
        WHEN f.path LIKE '%/ISO_documents%' AND f.path NOT LIKE '%/versions%' AND f.path NOT LIKE '%/current%' THEN 'ISO_DOCUMENTS'
        WHEN f.path LIKE '%/Maintenance%' AND f.path NOT LIKE '%/versions%' AND f.path NOT LIKE '%/current%' THEN 'MAINTENANCE'
        WHEN f.path LIKE '%/Delete%' THEN 'DELETE_FILES'
        ELSE 'OTHER'
    END AS section,
    COUNT(*) AS document_count,
    SUM(d.file_size) AS total_size_bytes
FROM documents d
JOIN folders f ON f.id = d.folder_id
LEFT JOIN departments dept ON dept.id = f.department_id
WHERE d.status = 'ACTIVE'
GROUP BY dept.code, section
ORDER BY dept.code, section;

-- ============================================
-- 3. KIỂM TRA VERSIONS - File versions
-- ============================================

-- 3.1. Tổng quan versions
SELECT 
    COUNT(*) AS total_versions,
    COUNT(DISTINCT document_id) AS documents_with_versions,
    SUM(file_size) AS total_size_bytes,
    ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) AS total_size_mb
FROM document_versions;

-- 3.2. Versions đang ở đâu (có trong versions folder không)
SELECT 
    CASE 
        WHEN dv.file_path LIKE '%/versions/%' THEN 'IN_VERSIONS_FOLDER'
        WHEN dv.file_path LIKE '%/current/%' THEN 'IN_CURRENT_FOLDER'
        ELSE 'OTHER_LOCATION'
    END AS location_type,
    COUNT(*) AS version_count
FROM document_versions dv
GROUP BY location_type;

-- ============================================
-- 4. KIỂM TRA CẤU TRÚC FOLDER THEO DEPARTMENT
-- ============================================

-- 4.1. Kiểm tra mỗi department có đủ 4 folders chính không
SELECT 
    d.code AS department_code,
    d.name AS department_name,
    COUNT(DISTINCT CASE WHEN f.name = 'KPI' AND f.deleted_at IS NULL THEN f.id END) AS has_kpi,
    COUNT(DISTINCT CASE WHEN (f.name = 'Documents' OR f.name = 'ISO_documents') AND f.deleted_at IS NULL THEN f.id END) AS has_documents,
    COUNT(DISTINCT CASE WHEN f.name = 'Maintenance' AND f.deleted_at IS NULL THEN f.id END) AS has_maintenance,
    COUNT(DISTINCT CASE WHEN (f.name LIKE '%Delete%' OR f.internal_type = 'DELETE_FILES') AND f.deleted_at IS NULL THEN f.id END) AS has_delete_files,
    COUNT(DISTINCT CASE WHEN f.name = 'versions' OR f.internal_type = 'VERSIONS' THEN f.id END) AS has_versions_folders
FROM departments d
LEFT JOIN folders f ON f.department_id = d.id
WHERE d.is_active = true
GROUP BY d.id, d.code, d.name
ORDER BY d.code;

-- 4.2. Chi tiết folder structure của một department cụ thể (thay 'DH' bằng department code)
SELECT 
    f.id,
    f.name,
    f.path,
    f.parent_id,
    f.is_internal,
    f.internal_type,
    f.deleted_at,
    (SELECT COUNT(*) FROM documents doc WHERE doc.folder_id = f.id) AS document_count,
    (SELECT COUNT(*) FROM folders child WHERE child.parent_id = f.id) AS child_folder_count
FROM folders f
JOIN departments d ON d.id = f.department_id
WHERE d.code = 'DH'  -- Thay đổi department code ở đây
ORDER BY f.path;

-- ============================================
-- 5. KIỂM TRA FILE PATHS - Pattern analysis
-- ============================================

-- 5.1. Phân tích pattern của file_path
SELECT 
    CASE 
        WHEN file_path ~ '/current/' THEN 'HAS_CURRENT_SUBFOLDER'
        WHEN file_path ~ '/Current/' THEN 'HAS_CURRENT_SUBFOLDER_CAPITAL'
        WHEN file_path ~ '/versions/' THEN 'HAS_VERSIONS_SUBFOLDER'
        WHEN file_path ~ '/Documents/' THEN 'HAS_DOCUMENTS_FOLDER'
        WHEN file_path ~ '/ISO_documents/' THEN 'HAS_ISO_DOCUMENTS_FOLDER'
        WHEN file_path ~ '/KPI/' THEN 'HAS_KPI_FOLDER'
        WHEN file_path ~ '/Maintenance/' THEN 'HAS_MAINTENANCE_FOLDER'
        WHEN file_path ~ '/Delete' THEN 'HAS_DELETE_FOLDER'
        ELSE 'OTHER_PATTERN'
    END AS path_pattern,
    COUNT(*) AS count
FROM documents
WHERE status = 'ACTIVE'
GROUP BY path_pattern
ORDER BY count DESC;

-- 5.2. Sample file paths để xem cấu trúc
SELECT 
    d.id,
    d.file_name,
    d.file_path,
    f.path AS folder_path,
    dept.code AS department_code,
    d.status
FROM documents d
JOIN folders f ON f.id = d.folder_id
LEFT JOIN departments dept ON dept.id = f.department_id
WHERE d.status = 'ACTIVE'
ORDER BY d.file_path
LIMIT 20;

-- ============================================
-- 6. KIỂM TRA INCONSISTENCIES
-- ============================================

-- 6.1. Documents có file_path không khớp với folder.path
SELECT 
    d.id,
    d.file_name,
    d.file_path,
    f.path AS folder_path,
    dept.code AS department_code,
    CASE 
        WHEN d.file_path NOT LIKE f.path || '%' THEN 'PATH_MISMATCH'
        ELSE 'OK'
    END AS status_check
FROM documents d
JOIN folders f ON f.id = d.folder_id
LEFT JOIN departments dept ON dept.id = f.department_id
WHERE d.file_path NOT LIKE f.path || '%'
LIMIT 50;

-- 6.2. Folders có tên không đúng chuẩn
SELECT 
    f.id,
    f.name,
    f.path,
    d.code AS department_code,
    CASE 
        WHEN f.name = 'Documents' THEN 'SHOULD_BE_ISO_DOCUMENTS'
        WHEN f.name LIKE '%Deleted files%' THEN 'SHOULD_BE_DELETE_FILES'
        WHEN f.name LIKE '%Delete files%' THEN 'SHOULD_BE_DELETE_FILES'
        ELSE 'OK'
    END AS issue
FROM folders f
LEFT JOIN departments d ON d.id = f.department_id
WHERE f.name = 'Documents'
   OR f.name LIKE '%Deleted files%'
   OR f.name LIKE '%Delete files%'
ORDER BY f.path;

-- ============================================
-- 7. SUMMARY REPORT
-- ============================================

-- 7.1. Tổng hợp tình trạng migration
SELECT 
    'Folders named "Documents"' AS check_item,
    COUNT(*) AS count,
    STRING_AGG(DISTINCT d.code, ', ') AS affected_departments
FROM folders f
LEFT JOIN departments d ON d.id = f.department_id
WHERE f.name = 'Documents' AND f.deleted_at IS NULL

UNION ALL

SELECT 
    'Folders named "Deleted files" or similar' AS check_item,
    COUNT(*) AS count,
    STRING_AGG(DISTINCT d.code, ', ') AS affected_departments
FROM folders f
LEFT JOIN departments d ON d.id = f.department_id
WHERE (f.name LIKE '%Deleted files%' OR f.name LIKE '%Delete files%') 
  AND f.name != 'Delete_files'
  AND f.deleted_at IS NULL

UNION ALL

SELECT 
    'Documents in /current/ subfolder' AS check_item,
    COUNT(*) AS count,
    STRING_AGG(DISTINCT dept.code, ', ') AS affected_departments
FROM documents d
JOIN folders f ON f.id = d.folder_id
LEFT JOIN departments dept ON dept.id = f.department_id
WHERE d.file_path LIKE '%/current/%' OR d.file_path LIKE '%/Current/%'

UNION ALL

SELECT 
    'Active documents total' AS check_item,
    COUNT(*) AS count,
    NULL AS affected_departments
FROM documents
WHERE status = 'ACTIVE'

UNION ALL

SELECT 
    'Deleted documents total' AS check_item,
    COUNT(*) AS count,
    NULL AS affected_departments
FROM documents
WHERE status = 'DELETED';
