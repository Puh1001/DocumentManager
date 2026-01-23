# Time-Based Permission Systems Research

**Date:** 2026-01-22  
**Status:** Complete

## Overview

Research on implementing time-based permission systems with 72-hour self-deletion rule and approval workflow patterns.

## Business Requirements

### 1. 72-Hour Self-Deletion Rule

**Policy:**
- File uploaders can delete files uploaded by themselves or their department within 72 hours
- After 72 hours, deletion privileges automatically locked
- Must submit request to DCC (Document Control Center) for review

### 2. DCC Approval Workflow

**Process:**
1. User submits deletion request with reason and replacement file
2. DCC reviews request against rules
3. If approved: DCC deletes file through system
4. If rejected: Request returned for resubmission

### 3. Frontend UX Requirements

**Clear Indicators:**
- Show remaining self-deletion time (countdown)
- Display timeout status clearly
- Provide request submission interface

## State Machine Model

### States

```
[Pending] → User can self-delete (< 72h)
  ↓
[Expired] → Must submit request to DCC (> 72h)
  ↓
[Requested] → Waiting for DCC review
  ↓
[Approved] → DCC approves deletion
  ↓
[Rejected] → DCC rejects, user must resubmit
  ↓
[Deleted] → File successfully deleted
```

### State Transitions

```typescript
type DeletionState = 
  | 'pending'      // Within 72h, can self-delete
  | 'expired'      // Past 72h, need DCC approval
  | 'requested'    // Submitted to DCC
  | 'approved'     // DCC approved
  | 'rejected'     // DCC rejected
  | 'deleted';     // File deleted

type DeletionEvent =
  | { type: 'DELETE' }                    // Self-delete
  | { type: 'SUBMIT_REQUEST', reason: string, replacementFileId?: string }
  | { type: 'DCC_APPROVE', reviewerId: string }
  | { type: 'DCC_REJECT', reviewerId: string, reason: string }
  | { type: 'TIMEOUT' }                   // 72h expired
```

### State Machine Implementation

```typescript
interface DeletionContext {
  documentId: string;
  uploadedAt: Date;
  uploadedBy: string;
  departmentId: string;
  expiresAt: Date;          // uploadedAt + 72h
  requestedAt?: Date;
  reason?: string;
  replacementFileId?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

const deletionMachine = createMachine({
  id: 'deletion',
  initial: 'pending',
  context: {
    uploadedAt: new Date(),
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
  },
  states: {
    pending: {
      after: {
        '72h': { target: 'expired' }
      },
      on: {
        DELETE: {
          target: 'deleted',
          cond: 'canSelfDelete'
        }
      }
    },
    expired: {
      on: {
        SUBMIT_REQUEST: {
          target: 'requested',
          actions: 'recordRequest'
        }
      }
    },
    requested: {
      on: {
        DCC_APPROVE: {
          target: 'approved',
          actions: 'recordApproval',
          cond: 'isDCCUser'
        },
        DCC_REJECT: {
          target: 'rejected',
          actions: 'recordRejection',
          cond: 'isDCCUser'
        }
      }
    },
    approved: {
      entry: 'executeDelete'
    },
    rejected: {
      on: {
        SUBMIT_REQUEST: {
          target: 'requested',
          actions: 'recordRequest'
        }
      }
    },
    deleted: {
      type: 'final'
    }
  }
});
```

## Database Schema

### Document Deletion Tracking

```prisma
model Document {
  id             String   @id @default(uuid())
  // ... existing fields
  uploadedBy     String   @map("uploaded_by")
  uploadedAt     DateTime @default(now()) @map("uploaded_at")
  deletionState  DeletionState @default(ACTIVE) @map("deletion_state")
  deletionExpiresAt DateTime? @map("deletion_expires_at")  // uploadedAt + 72h
  
  uploadedByUser User @relation("UploadedDocuments", fields: [uploadedBy], references: [id])
  deletionRequest DeletionRequest?
}

enum DeletionState {
  ACTIVE       // Can be deleted by uploader (< 72h)
  EXPIRED      // Past 72h, need DCC approval
  PENDING_DCC  // Awaiting DCC review
  APPROVED     // DCC approved deletion
  REJECTED     // DCC rejected
  DELETED      // File deleted
}

model DeletionRequest {
  id                 String   @id @default(uuid())
  documentId         String   @unique @map("document_id")
  requestedBy        String   @map("requested_by")
  requestedAt        DateTime @default(now()) @map("requested_at")
  reason             String
  replacementFileId  String?  @map("replacement_file_id")
  status             RequestStatus @default(PENDING)
  reviewedBy         String?  @map("reviewed_by")
  reviewedAt         DateTime? @map("reviewed_at")
  reviewerComment    String?  @map("reviewer_comment")
  
  document        Document @relation(fields: [documentId], references: [id])
  requester       User @relation("DeletionRequests", fields: [requestedBy], references: [id])
  reviewer        User? @relation("DeletionReviews", fields: [reviewedBy], references: [id])
  replacementFile Document? @relation("ReplacementFiles", fields: [replacementFileId], references: [id])
  
  @@index([documentId])
  @@index([requestedBy])
  @@index([status])
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

## Backend Implementation

### 1. Permission Guards

```typescript
@Injectable()
export class DeletionPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user, params } = context.switchToHttp().getRequest();
    const documentId = params.id;
    
    return this.checkDeletionPermission(user, documentId);
  }
  
  private async checkDeletionPermission(user: User, documentId: string) {
    const document = await this.documentService.findById(documentId);
    
    // Check if user is DCC
    if (user.roles.includes('dcc')) {
      return true;
    }
    
    // Check 72-hour rule
    const now = new Date();
    const expiresAt = new Date(document.uploadedAt.getTime() + 72 * 60 * 60 * 1000);
    
    if (now < expiresAt) {
      // Within 72h - check if uploader or same department
      return document.uploadedBy === user.id || 
             document.folder.departmentId === user.departmentId;
    }
    
    return false;
  }
}
```

### 2. Deletion Service

```typescript
@Injectable()
export class DocumentDeletionService {
  async checkDeletionStatus(documentId: string, userId: string) {
    const document = await this.findDocument(documentId);
    const now = new Date();
    const expiresAt = document.deletionExpiresAt;
    
    return {
      canDelete: now < expiresAt && this.isUploaderOrDepartment(document, userId),
      isExpired: now >= expiresAt,
      remainingHours: this.calculateRemainingHours(expiresAt),
      requiresDCCApproval: now >= expiresAt,
      hasActiverequest: !!document.deletionRequest
    };
  }
  
  async selfDelete(documentId: string, userId: string) {
    const status = await this.checkDeletionStatus(documentId, userId);
    
    if (!status.canDelete) {
      throw new ForbiddenException('Cannot delete: 72-hour window expired');
    }
    
    await this.executeDelete(documentId, userId);
  }
  
  async submitDeletionRequest(
    documentId: string, 
    userId: string, 
    reason: string,
    replacementFileId?: string
  ) {
    const status = await this.checkDeletionStatus(documentId, userId);
    
    if (!status.requiresDCCApproval) {
      throw new BadRequestException('Use self-delete within 72 hours');
    }
    
    return this.prisma.deletionRequest.create({
      data: {
        documentId,
        requestedBy: userId,
        reason,
        replacementFileId,
        status: 'PENDING'
      }
    });
  }
  
  async reviewRequest(requestId: string, userId: string, approve: boolean, comment?: string) {
    // Verify user is DCC
    const user = await this.usersService.findById(userId);
    if (!user.roles.includes('dcc')) {
      throw new ForbiddenException('Only DCC can review requests');
    }
    
    const request = await this.prisma.deletionRequest.update({
      where: { id: requestId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewerComment: comment
      }
    });
    
    if (approve) {
      await this.executeDelete(request.documentId, userId);
    }
    
    return request;
  }
  
  private calculateRemainingHours(expiresAt: Date): number {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (60 * 60 * 1000)));
  }
}
```

## Frontend Implementation

### 1. Deletion Status Component

```typescript
function DeletionStatusBadge({ document, user }) {
  const status = useDeletionStatus(document.id, user.id);
  
  if (status.canDelete) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="success">
          Can Delete ({status.remainingHours}h remaining)
        </Badge>
        <Button onClick={() => handleSelfDelete()}>
          Delete
        </Button>
      </div>
    );
  }
  
  if (status.isExpired && !status.hasActiveRequest) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="warning">
          Requires DCC Approval
        </Badge>
        <Button onClick={() => openRequestDialog()}>
          Submit Request
        </Button>
      </div>
    );
  }
  
  if (status.hasActiveRequest) {
    return (
      <Badge variant="info">
        Pending DCC Review
      </Badge>
    );
  }
  
  return null;
}
```

### 2. Countdown Timer

```typescript
function DeletionCountdown({ expiresAt }) {
  const [remaining, setRemaining] = useState(calculateRemaining(expiresAt));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calculateRemaining(expiresAt));
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [expiresAt]);
  
  if (remaining.hours <= 0) {
    return <span className="text-red-600">Expired</span>;
  }
  
  return (
    <span className={remaining.hours < 12 ? 'text-orange-600' : 'text-green-600'}>
      {remaining.hours}h {remaining.minutes}m remaining
    </span>
  );
}
```

### 3. Request Submission Dialog

```typescript
function DeletionRequestDialog({ document, onSubmit }) {
  const [reason, setReason] = useState('');
  const [replacementFile, setReplacementFile] = useState(null);
  
  const handleSubmit = async () => {
    await api.post(`/documents/${document.id}/deletion-requests`, {
      reason,
      replacementFileId: replacementFile?.id
    });
    onSubmit();
  };
  
  return (
    <Dialog>
      <DialogContent>
        <h2>Request Document Deletion</h2>
        <p>This document is past the 72-hour self-deletion window.</p>
        
        <Textarea
          label="Reason for deletion"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        
        <FileUpload
          label="Replacement file (optional)"
          onUpload={setReplacementFile}
        />
        
        <Button onClick={handleSubmit} disabled={!reason}>
          Submit Request
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. DCC Review Interface

```typescript
function DCCReviewPanel({ requests }) {
  const handleReview = async (requestId, approve, comment) => {
    await api.post(`/deletion-requests/${requestId}/review`, {
      approve,
      comment
    });
    refreshRequests();
  };
  
  return (
    <div>
      <h2>Pending Deletion Requests</h2>
      {requests.map(request => (
        <Card key={request.id}>
          <div>
            <strong>Document:</strong> {request.document.name}
          </div>
          <div>
            <strong>Requested by:</strong> {request.requester.fullName}
          </div>
          <div>
            <strong>Reason:</strong> {request.reason}
          </div>
          {request.replacementFile && (
            <div>
              <strong>Replacement:</strong> 
              <a href={`/documents/${request.replacementFile.id}`}>
                {request.replacementFile.name}
              </a>
            </div>
          )}
          <div className="flex gap-2">
            <Button 
              variant="success" 
              onClick={() => handleReview(request.id, true, '')}
            >
              Approve
            </Button>
            <Button 
              variant="destructive"
              onClick={() => openRejectDialog(request.id)}
            >
              Reject
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

## Authorization Integration

### CASL Rules

```typescript
// In CaslAbilityFactory
if (userRoles.includes('dcc')) {
  can('delete', 'Document');  // DCC can delete any document
  can('manage', 'DeletionRequest');
}

// For regular users
can('delete', 'Document', {
  uploadedBy: userId,
  deletionExpiresAt: { $gt: new Date() }  // Within 72h
});

can('create', 'DeletionRequest', {
  document: {
    deletionExpiresAt: { $lt: new Date() }  // Past 72h
  }
});
```

## Recommendations

1. **Track Upload Metadata:** Add `uploadedBy` and `uploadedAt` fields to Document
2. **Automatic Expiry Calculation:** Set `deletionExpiresAt` on upload (uploadedAt + 72h)
3. **Cron Job:** Daily cleanup of expired deletion states
4. **Notification System:** Alert users when approaching 72h deadline
5. **Audit Trail:** Log all deletion attempts and approvals
6. **Department Folder Mapping:** Ensure each department has designated folder(s)

## References

- XState documentation: https://stately.ai/docs/xstate
- Time-based access control patterns
- Approval workflow best practices
