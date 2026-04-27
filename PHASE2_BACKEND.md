# Phase 2: Backend API Documentation & Code (NestJS + Supabase)

This document contains the implementation details for Phase 2, which includes the Check-in system, Job creation, automated Support Task generation, and Notification triggers using NestJS Event Emitter.

## 1. Database Schema Updates
The SQL schema for Phase 2 has been created in `/supabase/schema_phase2.sql`. It includes tables for `check_ins`, `jobs`, `support_tasks`, and `notifications`.

---

## 2. NestJS Backend Code Structure

### A. App Module Setup (Event Emitter)
To handle the automated tasks and notifications asynchronously, we use `@nestjs/event-emitter`.

**`src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CheckInsModule } from './check-ins/check-ins.module';
import { JobsModule } from './jobs/jobs.module';
import { SupportTasksModule } from './support-tasks/support-tasks.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(), // Enable Event Emitter
    CheckInsModule,
    JobsModule,
    SupportTasksModule,
    NotificationsModule
  ],
})
export class AppModule {}
```

---

### B. Check-in System

**`src/check-ins/check-ins.controller.ts`**
```typescript
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CheckInsService } from './check-ins.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('check-ins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  @Roles(Role.Sale, Role.Manager)
  async createCheckIn(@Body() createCheckInDto: any, @Request() req) {
    // createCheckInDto should contain customer_id, location_lat, location_lng, notes
    return this.checkInsService.create(req.user.sub, createCheckInDto);
  }
}
```

**`src/check-ins/check-ins.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CheckInsService {
  constructor(private supabase: SupabaseService) {}

  async create(userId: string, data: any) {
    const { data: checkIn, error } = await this.supabase.getClient()
      .from('check_ins')
      .insert([{
        user_id: userId,
        customer_id: data.customer_id,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        notes: data.notes
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return checkIn;
  }
}
```

---

### C. Job Creation & Event Trigger

**`src/jobs/jobs.controller.ts`**
```typescript
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Roles(Role.Sale, Role.Manager, Role.Administrator)
  async createJob(@Body() createJobDto: any, @Request() req) {
    return this.jobsService.create(req.user.sub, createJobDto);
  }
}
```

**`src/jobs/jobs.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';

export class JobCreatedEvent {
  jobId: string;
  customerId: string;
  title: string;
  createdBy: string;
}

@Injectable()
export class JobsService {
  constructor(
    private supabase: SupabaseService,
    private eventEmitter: EventEmitter2
  ) {}

  async create(userId: string, data: any) {
    // 1. Create the Job in the database
    const { data: job, error } = await this.supabase.getClient()
      .from('jobs')
      .insert([{
        customer_id: data.customer_id,
        title: data.title,
        description: data.description,
        value: data.value,
        created_by: userId
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 2. Trigger the Job Created Event
    const jobEvent = new JobCreatedEvent();
    jobEvent.jobId = job.id;
    jobEvent.customerId = job.customer_id;
    jobEvent.title = job.title;
    jobEvent.createdBy = userId;
    
    this.eventEmitter.emit('job.created', jobEvent);

    return job;
  }
}
```

---

### D. Business Logic: Auto-Create Support Task & Notification

We use an Event Listener to handle the side effects of a job creation asynchronously.

**`src/jobs/listeners/job-created.listener.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JobCreatedEvent } from '../jobs.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JobCreatedListener {
  private readonly logger = new Logger(JobCreatedListener.name);

  constructor(private supabase: SupabaseService) {}

  @OnEvent('job.created')
  async handleJobCreatedEvent(event: JobCreatedEvent) {
    this.logger.log(`Processing job.created event for Job ID: ${event.jobId}`);

    try {
      // 1. Auto-create Support Task
      const { error: taskError } = await this.supabase.getClient()
        .from('support_tasks')
        .insert([{
          job_id: event.jobId,
          customer_id: event.customerId,
          title: `Onboarding/Support for: ${event.title}`,
          description: `Automated task generated from new job creation. Please review requirements for ${event.title}.`,
          status: 'Open'
        }]);

      if (taskError) throw taskError;
      this.logger.log(`Support task auto-created for Job ID: ${event.jobId}`);

      // 2. Fetch Support Team Users to notify them (Optional logic: notify all 'Support' roles or a specific manager)
      const { data: supportUsers } = await this.supabase.getClient()
        .from('users')
        .select('id')
        .eq('role', 'Support');

      // 3. Create Notifications
      if (supportUsers && supportUsers.length > 0) {
        const notifications = supportUsers.map(user => ({
          user_id: user.id,
          title: 'New Job & Support Task Created',
          message: `A new job "${event.title}" has been created. An automated support task has been assigned to the queue.`
        }));

        await this.supabase.getClient().from('notifications').insert(notifications);
        this.logger.log(`Notifications sent to Support team.`);
      }

    } catch (error) {
      this.logger.error(`Error processing job.created event: ${error.message}`);
    }
  }
}
```

---

## 3. API Endpoints & Request/Response Examples

### 1. Create Check-in
**Endpoint:** `POST /check-ins`
**Headers:** `Authorization: Bearer <token>`
**Roles Allowed:** `Sale`, `Manager`

**Request:**
```json
{
  "customer_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "location_lat": 13.7563,
  "location_lng": 100.5018,
  "notes": "Met with the client to discuss Q3 requirements. Very positive feedback."
}
```

**Response (201 Created):**
```json
{
  "id": "c82b12a4-1234-5678-90ab-cdef12345678",
  "customer_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "location_lat": 13.7563,
  "location_lng": 100.5018,
  "notes": "Met with the client to discuss Q3 requirements. Very positive feedback.",
  "check_in_time": "2024-10-24T14:30:00Z"
}
```

### 2. Create Job (Triggers Auto-Task & Notification)
**Endpoint:** `POST /jobs`
**Headers:** `Authorization: Bearer <token>`
**Roles Allowed:** `Sale`, `Manager`, `Administrator`

**Request:**
```json
{
  "customer_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "Enterprise Cloud Migration",
  "description": "Full migration of legacy servers to the new cloud infrastructure.",
  "value": 150000.00
}
```

**Response (201 Created):**
```json
{
  "id": "j9876543-abcd-efgh-ijkl-1234567890ab",
  "customer_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "title": "Enterprise Cloud Migration",
  "description": "Full migration of legacy servers to the new cloud infrastructure.",
  "value": 150000.00,
  "stage": "New",
  "status": "Pending",
  "created_by": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "created_at": "2024-10-24T15:00:00Z"
}
```
*(Note: The Support Task and Notifications are created asynchronously in the background via the Event Emitter, so they do not block the API response.)*
