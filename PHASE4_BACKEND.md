# Phase 4: Backend API Documentation & Code (NestJS + Supabase)

This document contains the implementation details for Phase 4, which includes the Approval system, the Revision loop (Sales ↔ Support), tracking `revision_count`, and storing revision history.

## 1. Database Schema Updates
The SQL schema for Phase 4 has been created in `/supabase/schema_phase4.sql`. It adds `revision_count` to existing tables and introduces the `approvals` and `revision_history` tables.

---

## 2. NestJS Backend Code Structure

### A. Approvals Module

**`src/approvals/approvals.controller.ts`**
```typescript
import { Controller, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('request')
  @Roles(Role.Sale, Role.Manager)
  async requestApproval(@Body() requestDto: any, @Request() req) {
    return this.approvalsService.requestApproval(req.user.sub, requestDto);
  }

  @Patch(':id/approve')
  @Roles(Role.Support, Role.Manager, Role.Administrator)
  async approve(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.approvalsService.processApproval(id, req.user.sub, 'Approved', body.comments);
  }

  @Patch(':id/reject')
  @Roles(Role.Support, Role.Manager, Role.Administrator)
  async reject(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.approvalsService.processApproval(id, req.user.sub, 'Rejected', body.comments);
  }

  @Patch(':id/request-revision')
  @Roles(Role.Support, Role.Manager, Role.Administrator)
  async requestRevision(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.approvalsService.requestRevision(id, req.user.sub, body.comments);
  }
}
```

**`src/approvals/approvals.service.ts`**
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ApprovalsService {
  constructor(private supabase: SupabaseService) {}

  async requestApproval(userId: string, data: any) {
    const client = this.supabase.getClient();

    // 1. Create Approval Record
    const { data: approval, error } = await client
      .from('approvals')
      .insert([{
        reference_type: data.reference_type, // e.g., 'Quotation'
        reference_id: data.reference_id,
        requester_id: userId,
        status: 'Pending'
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 2. Update Target Entity Status
    const targetTable = data.reference_type === 'Quotation' ? 'quotations' : 'support_tasks';
    await client
      .from(targetTable)
      .update({ status: 'Pending Approval' })
      .eq('id', data.reference_id);

    // 3. Log History
    await this.logRevisionHistory(
      data.reference_type, 
      data.reference_id, 
      userId, 
      'Submitted', 
      'Approval requested'
    );

    return approval;
  }

  async processApproval(approvalId: string, approverId: string, status: string, comments: string) {
    const client = this.supabase.getClient();

    // 1. Update Approval Record
    const { data: approval, error } = await client
      .from('approvals')
      .update({ status, approver_id: approverId, comments })
      .eq('id', approvalId)
      .select()
      .single();

    if (error || !approval) throw new NotFoundException('Approval request not found');

    // 2. Update Target Entity Status
    const targetTable = approval.reference_type === 'Quotation' ? 'quotations' : 'support_tasks';
    await client
      .from(targetTable)
      .update({ status })
      .eq('id', approval.reference_id);

    // 3. Log History
    await this.logRevisionHistory(
      approval.reference_type, 
      approval.reference_id, 
      approverId, 
      status, 
      comments
    );

    return approval;
  }

  async requestRevision(approvalId: string, approverId: string, comments: string) {
    const client = this.supabase.getClient();

    // 1. Fetch Approval
    const { data: approval, error: fetchError } = await client
      .from('approvals')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (fetchError || !approval) throw new NotFoundException('Approval request not found');

    // 2. Update Approval Record
    await client
      .from('approvals')
      .update({ status: 'Revision Requested', approver_id: approverId, comments })
      .eq('id', approvalId);

    // 3. Update Target Entity (Increment Revision Count & Change Status)
    const targetTable = approval.reference_type === 'Quotation' ? 'quotations' : 'support_tasks';
    
    // Fetch current revision count
    const { data: entity } = await client
      .from(targetTable)
      .select('revision_count')
      .eq('id', approval.reference_id)
      .single();

    const newRevisionCount = (entity?.revision_count || 0) + 1;

    await client
      .from(targetTable)
      .update({ 
        status: 'Revision Requested',
        revision_count: newRevisionCount
      })
      .eq('id', approval.reference_id);

    // 4. Log History
    await this.logRevisionHistory(
      approval.reference_type, 
      approval.reference_id, 
      approverId, 
      'Revision Requested', 
      comments,
      newRevisionCount
    );

    return { message: 'Revision requested successfully', revision_count: newRevisionCount };
  }

  // Helper function to log history
  private async logRevisionHistory(refType: string, refId: string, userId: string, action: string, comments: string, revisionNumber: number = 0) {
    await this.supabase.getClient()
      .from('revision_history')
      .insert([{
        reference_type: refType,
        reference_id: refId,
        changed_by: userId,
        action: action,
        comments: comments,
        revision_number: revisionNumber
      }]);
  }
}
```

---

### C. Revision Flow Logic (Sales Resubmitting)

When Sales makes changes to a Quotation that is in `Revision Requested` status, they will call a specific endpoint to resubmit it.

**`src/quotations/quotations.controller.ts` (Addition)**
```typescript
  @Patch(':id/resubmit')
  @Roles(Role.Sale, Role.Manager)
  async resubmitQuotation(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    return this.quotationsService.resubmit(id, req.user.sub, updateDto);
  }
```

**`src/quotations/quotations.service.ts` (Addition)**
```typescript
  async resubmit(quotationId: string, userId: string, updateData: any) {
    const client = this.supabase.getClient();

    // 1. Fetch current quotation to save as previous_data snapshot
    const { data: oldQuotation } = await client
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .single();

    // 2. Update Quotation Data & Status
    const { data: updatedQuotation, error } = await client
      .from('quotations')
      .update({
        ...updateData,
        status: 'Pending Approval' // Reset status
      })
      .eq('id', quotationId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 3. Log Revision History with diff
    await client.from('revision_history').insert([{
      reference_type: 'Quotation',
      reference_id: quotationId,
      changed_by: userId,
      action: 'Revised',
      comments: 'Sales updated the quotation based on revision request.',
      revision_number: updatedQuotation.revision_count,
      previous_data: oldQuotation,
      new_data: updatedQuotation
    }]);

    // 4. Reset Approval Record Status
    await client
      .from('approvals')
      .update({ status: 'Pending' })
      .eq('reference_id', quotationId)
      .eq('reference_type', 'Quotation');

    return updatedQuotation;
  }
```

---

## 3. API Endpoints & Request/Response Examples

### 1. Request Approval (Sales)
**Endpoint:** `POST /approvals/request`
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "reference_type": "Quotation",
  "reference_id": "q1111111-2222-3333-4444-555555555555"
}
```

**Response (201 Created):**
```json
{
  "id": "a9999999-8888-7777-6666-555555555555",
  "reference_type": "Quotation",
  "reference_id": "q1111111-2222-3333-4444-555555555555",
  "requester_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "status": "Pending"
}
```

### 2. Request Revision (Support / Manager)
**Endpoint:** `PATCH /approvals/:id/request-revision`
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "comments": "The discount applied is too high for this tier. Please reduce to 5%."
}
```

**Response (200 OK):**
```json
{
  "message": "Revision requested successfully",
  "revision_count": 1
}
```
*(Note: The Quotation status is now `Revision Requested` and its `revision_count` is `1`.)*

### 3. Resubmit Revised Quotation (Sales)
**Endpoint:** `PATCH /quotations/:id/resubmit`
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "discount_value": 5,
  "total_amount": 25650.00
}
```

**Response (200 OK):**
```json
{
  "id": "q1111111-2222-3333-4444-555555555555",
  "status": "Pending Approval",
  "revision_count": 1,
  "discount_value": 5,
  "total_amount": 25650.00
}
```
*(Note: The `revision_history` table now contains a JSON snapshot of the old data and the new data, and the approval status is reset to `Pending`.)*
