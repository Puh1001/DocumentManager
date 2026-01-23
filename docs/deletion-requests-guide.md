# DELETION REQUESTS USER GUIDE

## 1. OVERVIEW

The **Deletion Requests** feature allows users to request deletion of documents that have exceeded the self-deletion time window (72 hours). All deletion requests after 72 hours must be approved by DCC (Document Control Center) before the document is deleted.

### 1.1. 72-Hour Rule

- **Within the first 72 hours**: Users can delete documents themselves without approval
- **After 72 hours**: Users must submit a deletion request and wait for DCC approval
- **DCC**: Can delete documents at any time without waiting 72 hours

### 1.2. Who Can Use This Feature?

- **All users**: Can submit deletion requests for their own documents or documents in their department
- **DCC**: Can view, approve, or reject all deletion requests
- **Admin**: Can view all deletion requests

---

## 2. HOW TO SUBMIT A DELETION REQUEST

### 2.1. When Do You Need to Submit a Request?

You need to submit a deletion request when:
- The document has been uploaded **more than 72 hours ago**
- You want to delete a document but cannot delete it directly
- The system displays the **"Requires DCC Approval"** badge

### 2.2. Steps to Submit a Request

1. **Find the document to delete**
   - Navigate to the document list
   - Find the document you want to delete
   - Check the status badge: if it shows "Requires DCC Approval", you need to submit a request

2. **Open the deletion request dialog**
   - Click the **"Request Deletion"** button on the document
   - The deletion request dialog will appear

3. **Fill in the request information**
   - **Deletion reason** (required): Explain why you want to delete this document
     - Minimum 10 characters
     - Should be detailed and clear
     - Example: "Document is outdated, a new updated version is available"
   - **Replacement file** (optional): If you have a new file to replace it, enter the file ID
     - Upload the new file first (if applicable)
     - Copy the new file's ID
     - Paste it into the "Replacement file ID" field

4. **Submit the request**
   - Click the **"Submit Request"** button
   - The system will confirm the request has been submitted
   - The status badge will change to **"Pending DCC Review"**

### 2.3. Example Deletion Reasons

**Good examples:**
- "This document has been replaced by a new updated version (file ID: abc123). The old version contains inaccurate information."
- "Document is duplicated with another file in the same folder. The file to keep is version 2.0."
- "Document has expired according to regulations. A new replacement document is available."

**Bad examples:**
- "Delete" (too short, less than 10 characters)
- "Not needed anymore" (not clear)
- "Test" (not appropriate)

---

## 3. TRACKING REQUEST STATUS

### 3.1. Request Status Badges

The system displays different status badges:

| Badge | Meaning | Description |
|-------|---------|-------------|
| 🟢 **Can Delete** | Document is within 72 hours | You can delete it immediately without a request |
| 🟡 **Requires DCC Approval** | Exceeded 72 hours, no request yet | Need to submit a deletion request for DCC approval |
| 🟠 **Pending DCC Review** | Request submitted, awaiting review | Your request is being reviewed by DCC |
| 🔴 **Rejected** | DCC has rejected the request | Click the badge to view the rejection reason |
| ❌ **No Permission** | No deletion permission | You are not the uploader or not in the department |

### 3.2. Viewing Rejected Request Details

When a request is rejected:
1. The badge will display **"Rejected"** in red
2. Click the badge to view details:
   - The reason you provided
   - DCC's rejection reason (if provided)
   - Reviewer information
   - Review time

### 3.3. Resubmitting After Rejection

If your request is rejected, you can:
1. Review the rejection reason from DCC
2. Update the deletion reason (if needed)
3. Resubmit a new request with updated information

---

## 4. DCC REVIEW PROCESS

### 4.1. Viewing Request List

**DCC** can:
1. Log in to the system
2. Navigate to **Dashboard → DCC → Deletion Requests**
3. View all pending deletion requests

### 4.2. Information Displayed for DCC

Each request displays:
- **Document name** and filename
- **Requester**: Name and username
- **Request time**: Date and time the request was submitted
- **Deletion reason**: Reason provided by the user
- **Replacement file** (if applicable): Link to the new file

### 4.3. Approving a Request

**Approval steps:**
1. Review the request information
2. Click the **"Approve"** button
3. Confirm in the confirmation dialog
4. The system will:
   - Automatically delete the document (move to "Deleted files" folder)
   - Update the request status to "APPROVED"
   - Send notification to the requester (if applicable)

### 4.4. Rejecting a Request

**Rejection steps:**
1. Review the request information
2. Click the **"Reject"** button
3. Enter rejection reason (optional but recommended):
   - Explain why the request is not accepted
   - Guide the user on what to do (if applicable)
4. Click **"Reject Request"**
5. The system will:
   - Update the request status to "REJECTED"
   - Save the rejection reason
   - Send notification to the requester (if applicable)

### 4.5. Notes for DCC

- **Review carefully**: Read the deletion reason thoroughly and check the replacement file (if provided)
- **Clear notes**: When rejecting, provide clear reasons so users understand
- **Process promptly**: Try to process requests within a reasonable time
- **Verify replacement files**: If a replacement file is provided, verify it is appropriate

---

## 5. COMMON SCENARIOS

### 5.1. Scenario 1: Accidental Upload Within 72 Hours

**Problem**: You just uploaded a document by mistake and want to delete it immediately.

**Solution**: 
- You can delete it immediately without a request
- Find the document in the list
- Click the "Delete" button
- Confirm deletion

### 5.2. Scenario 2: Document Exceeded 72 Hours

**Problem**: You want to delete a document but it has exceeded 72 hours.

**Solution**:
1. Submit a deletion request with a clear reason
2. Wait for DCC approval
3. If rejected, review the reason and resubmit (if needed)

### 5.3. Scenario 3: New Replacement File Available

**Problem**: You have uploaded a new file and want to delete the old one.

**Solution**:
1. Upload the new file first
2. Copy the new file's ID
3. Submit a deletion request for the old file
4. In the request, enter the new file's ID in the "Replacement file ID" field
5. Clearly explain in the reason: "Old file has been replaced by new file (ID: xxx)"

### 5.4. Scenario 4: Request Rejected

**Problem**: Your deletion request was rejected by DCC.

**Solution**:
1. Click the "Rejected" badge to view the reason
2. Read the rejection reason carefully
3. If needed, update the reason and resubmit the request
4. If you disagree, contact DCC to discuss

### 5.5. Scenario 5: Delete Button Not Visible

**Problem**: You don't see the delete button or request deletion button.

**Possible causes**:
- You are not the document uploader
- You are not in the document's department
- You don't have deletion permission

**Solution**:
- Contact the uploader or administrator
- If you are DCC, you can delete any document

---

## 6. FREQUENTLY ASKED QUESTIONS (FAQ)

### Q1: Why is there a 72-hour rule?

**Answer**: The 72-hour rule helps:
- Users have time to correct mistakes if they upload incorrectly
- Protect important data from accidental deletion
- Ensure the integrity of the document management system

### Q2: How do I know how much time is left for self-deletion?

**Answer**: 
- The status badge will display: "Can Delete (Xh Ym left)"
- Example: "Can Delete (5h 30m left)" means 5 hours and 30 minutes remaining

### Q3: How long does it take for a deletion request to be processed?

**Answer**: 
- Depends on DCC
- Usually within 1-2 business days
- For urgent requests, contact DCC directly

### Q4: Can I cancel a deletion request?

**Answer**: 
- Currently, there is no cancel function
- If you want to cancel, contact DCC to reject the request
- Or wait for DCC to process and explain

### Q5: Where do deleted files go?

**Answer**: 
- Files are not permanently deleted
- Files are moved to the department's "Deleted files" folder
- DCC can restore them if needed

### Q6: Can I delete multiple documents at once?

**Answer**: 
- Currently, only one document can be deleted at a time
- Each document requires a separate request (if exceeded 72 hours)

### Q7: Can DCC delete documents without a request?

**Answer**: 
- Yes, DCC can delete any document at any time
- DCC does not need to wait 72 hours
- DCC does not need to submit a request

### Q8: How do I know if my request has been processed?

**Answer**: 
- The status badge will change:
  - "Pending DCC Review" → "Rejected" or the document disappears (if approved)
- The system updates in real-time when DCC processes the request

---

## 7. IMPORTANT NOTES

### 7.1. Before Submitting a Request

- ✅ Carefully check if the document really needs to be deleted
- ✅ Ensure you have a replacement file (if needed)
- ✅ Write a clear, detailed reason
- ✅ Review the information before submitting

### 7.2. After Submitting a Request

- ⏰ Monitor the request status
- 📧 Check notifications from the system
- 🔄 Be ready to resubmit if rejected

### 7.3. Rights and Responsibilities

- **Users**: 
  - Responsible for the deletion reason
  - Provide accurate information
  - Follow the process

- **DCC**: 
  - Review each request carefully
  - Make fair decisions
  - Provide clear notes when rejecting

---

## 8. SUPPORT AND CONTACT

If you encounter issues or have questions:

1. **Check the FAQ** above first
2. **Contact DCC** if you need support regarding deletion requests
3. **Contact IT Support** if you encounter technical errors
4. **View other guides** in the system

---

**Document Version**: 1.0  
**Last Updated**: January 23, 2026  
**Prepared by**: Document Management System
