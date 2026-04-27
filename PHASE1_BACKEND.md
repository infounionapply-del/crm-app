# Phase 1: Backend API Documentation & Code (NestJS + Supabase)

This document contains the implementation details for the Phase 1 Backend, including the custom JWT authentication, role-based access control, and the Customer module using NestJS and Supabase.

## 1. Database Schema (Supabase)
The SQL schema has been created in `/supabase/schema.sql`. You can run this directly in your Supabase SQL Editor to generate the `users` and `customers` tables with the required roles enum (`Sale`, `Support`, `Manager`, `Administrator`).

---

## 2. NestJS Backend Code Structure

Here is the core implementation for the NestJS backend.

### A. Role-Based Access Control (RBAC)

**`src/common/enums/role.enum.ts`**
```typescript
export enum Role {
  Sale = 'Sale',
  Support = 'Support',
  Manager = 'Manager',
  Administrator = 'Administrator',
}
```

**`src/common/decorators/roles.decorator.ts`**
```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

**`src/common/guards/roles.guard.ts`**
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

### B. Authentication Module (Custom JWT)

**`src/auth/auth.controller.ts`**
```typescript
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}
```

**`src/auth/auth.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const { data: user } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (user && await bcrypt.compare(pass, user.password_hash)) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      }
    };
  }
}
```

### C. Customer Module

**`src/customers/customers.controller.ts`**
```typescript
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.Sale, Role.Manager, Role.Administrator)
  create(@Body() createCustomerDto: any, @Request() req) {
    return this.customersService.create(createCustomerDto, req.user.sub);
  }

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.Sale, Role.Manager, Role.Administrator)
  update(@Param('id') id: string, @Body() updateCustomerDto: any) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @Roles(Role.Manager, Role.Administrator) // Only Managers and Admins can delete
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
```

---

## 3. API Endpoints & Request/Response Examples

### 1. Authentication (Login)
**Endpoint:** `POST /auth/login`
**Description:** Authenticates a user and returns a JWT token.

**Request:**
```json
{
  "email": "sale@company.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "email": "sale@company.com",
    "role": "Sale",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### 2. Create Customer
**Endpoint:** `POST /customers`
**Headers:** `Authorization: Bearer <token>`
**Roles Allowed:** `Sale`, `Manager`, `Administrator`

**Request:**
```json
{
  "name": "TechCorp Industries",
  "email": "contact@techcorp.com",
  "phone": "+1234567890",
  "company": "TechCorp",
  "type": "Enterprise"
}
```

**Response (201 Created):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "TechCorp Industries",
  "email": "contact@techcorp.com",
  "phone": "+1234567890",
  "company": "TechCorp",
  "status": "Active",
  "type": "Enterprise",
  "created_by": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "created_at": "2024-10-24T10:00:00Z"
}
```

### 3. Get All Customers
**Endpoint:** `GET /customers`
**Headers:** `Authorization: Bearer <token>`
**Roles Allowed:** All Authenticated Users

**Response (200 OK):**
```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "TechCorp Industries",
    "company": "TechCorp",
    "status": "Active",
    "assigned_to": null
  }
]
```

### 4. Delete Customer
**Endpoint:** `DELETE /customers/:id`
**Headers:** `Authorization: Bearer <token>`
**Roles Allowed:** `Manager`, `Administrator` (Sales/Support will get 403 Forbidden)

**Response (200 OK):**
```json
{
  "message": "Customer successfully deleted",
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Response (403 Forbidden - if user is 'Sale'):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```
