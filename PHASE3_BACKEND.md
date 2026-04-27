# Phase 3: Backend API Documentation & Code (NestJS + Supabase)

This document contains the implementation details for Phase 3, which includes the Price List system (with version control) and the Quotation system (with customer validation, active price list enforcement, and discount support).

## 1. Database Schema Updates
The SQL schema for Phase 3 has been created in `/supabase/schema_phase3.sql`. It includes tables for `price_lists`, `price_list_items`, `quotations`, and `quotation_items`.

---

## 2. NestJS Backend Code Structure

### A. Price List Module (Version Control)

**`src/price-lists/price-lists.controller.ts`**
```typescript
import { Controller, Post, Body, Get, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('price-lists')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Post()
  @Roles(Role.Manager, Role.Administrator) // Only Managers/Admins can create price lists
  async createPriceList(@Body() createDto: any, @Request() req) {
    return this.priceListsService.create(req.user.sub, createDto);
  }

  @Patch(':id/activate')
  @Roles(Role.Manager, Role.Administrator)
  async activatePriceList(@Param('id') id: string) {
    return this.priceListsService.activate(id);
  }

  @Get('active')
  async getActivePriceList() {
    return this.priceListsService.getActive();
  }
}
```

**`src/price-lists/price-lists.service.ts`**
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PriceListsService {
  constructor(private supabase: SupabaseService) {}

  async create(userId: string, data: any) {
    const { items, ...priceListData } = data;

    // 1. Create Price List Header
    const { data: priceList, error: plError } = await this.supabase.getClient()
      .from('price_lists')
      .insert([{
        ...priceListData,
        created_by: userId,
        is_active: false // Always false on creation, must be explicitly activated
      }])
      .select()
      .single();

    if (plError) throw new Error(plError.message);

    // 2. Insert Items
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        price_list_id: priceList.id
      }));

      const { error: itemsError } = await this.supabase.getClient()
        .from('price_list_items')
        .insert(itemsToInsert);

      if (itemsError) throw new Error(itemsError.message);
    }

    return priceList;
  }

  async activate(priceListId: string) {
    const client = this.supabase.getClient();

    // 1. Deactivate all currently active price lists
    await client
      .from('price_lists')
      .update({ is_active: false })
      .eq('is_active', true);

    // 2. Activate the target price list
    const { data, error } = await client
      .from('price_lists')
      .update({ is_active: true })
      .eq('id', priceListId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getActive() {
    const { data, error } = await this.supabase.getClient()
      .from('price_lists')
      .select('*, price_list_items(*)')
      .eq('is_active', true)
      .single();

    if (error || !data) throw new NotFoundException('No active price list found');
    return data;
  }
}
```

---

### B. Quotation Module

**`src/quotations/quotations.controller.ts`**
```typescript
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @Roles(Role.Sale, Role.Manager, Role.Administrator)
  async createQuotation(@Body() createDto: any, @Request() req) {
    return this.quotationsService.create(req.user.sub, createDto);
  }
}
```

**`src/quotations/quotations.service.ts`**
```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class QuotationsService {
  constructor(private supabase: SupabaseService) {}

  async create(userId: string, data: any) {
    const client = this.supabase.getClient();

    // 1. Validate Customer
    const { data: customer, error: customerError } = await client
      .from('customers')
      .select('id')
      .eq('id', data.customer_id)
      .single();

    if (customerError || !customer) {
      throw new NotFoundException(`Customer with ID ${data.customer_id} not found.`);
    }

    // 2. Fetch Active Price List
    const { data: activePriceList, error: plError } = await client
      .from('price_lists')
      .select('id, price_list_items(id, unit_price)')
      .eq('is_active', true)
      .single();

    if (plError || !activePriceList) {
      throw new BadRequestException('Cannot create quotation: No active price list found.');
    }

    const priceMap = new Map(activePriceList.price_list_items.map(item => [item.id, item.unit_price]));

    // 3. Calculate Line Items & Subtotal
    let subtotal = 0;
    const quotationItems = data.items.map(item => {
      const unitPrice = priceMap.get(item.price_list_item_id);
      if (unitPrice === undefined) {
        throw new BadRequestException(`Invalid price list item ID: ${item.price_list_item_id}`);
      }

      let finalLinePrice = unitPrice * item.quantity;

      // Apply Line Item Discount
      if (item.discount_type === 'Percentage') {
        finalLinePrice -= finalLinePrice * (item.discount_value / 100);
      } else if (item.discount_type === 'Fixed') {
        finalLinePrice -= item.discount_value;
      }

      subtotal += finalLinePrice;

      return {
        price_list_item_id: item.price_list_item_id,
        quantity: item.quantity,
        unit_price: unitPrice, // Snapshot
        discount_type: item.discount_type || 'None',
        discount_value: item.discount_value || 0,
        final_line_price: finalLinePrice
      };
    });

    // 4. Apply Global Quotation Discount
    let totalAmount = subtotal;
    if (data.discount_type === 'Percentage') {
      totalAmount -= totalAmount * (data.discount_value / 100);
    } else if (data.discount_type === 'Fixed') {
      totalAmount -= data.discount_value;
    }

    // Generate Quotation Number (e.g., QT-2024-XXXX)
    const qtNumber = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. Insert Quotation Header
    const { data: quotation, error: qtError } = await client
      .from('quotations')
      .insert([{
        quotation_number: qtNumber,
        customer_id: data.customer_id,
        job_id: data.job_id,
        price_list_id: activePriceList.id,
        subtotal: subtotal,
        discount_type: data.discount_type || 'None',
        discount_value: data.discount_value || 0,
        total_amount: totalAmount,
        valid_until: data.valid_until,
        created_by: userId
      }])
      .select()
      .single();

    if (qtError) throw new Error(qtError.message);

    // 6. Insert Quotation Items
    const itemsToInsert = quotationItems.map(item => ({
      ...item,
      quotation_id: quotation.id
    }));

    const { error: itemsError } = await client
      .from('quotation_items')
      .insert(itemsToInsert);

    if (itemsError) throw new Error(itemsError.message);

    return { ...quotation, items: quotationItems };
  }
}
```

---

## 3. API Endpoints & Request/Response Examples

### 1. Create Price List
**Endpoint:** `POST /price-lists`
**Headers:** `Authorization: Bearer <token>`
**Roles Allowed:** `Manager`, `Administrator`

**Request:**
```json
{
  "name": "Enterprise Software Pricing 2024",
  "version": "v1.0",
  "valid_from": "2024-01-01T00:00:00Z",
  "items": [
    {
      "sku": "ENT-LIC-01",
      "product_name": "Enterprise License (Annual)",
      "unit_price": 12000.00
    },
    {
      "sku": "SUP-PREM-01",
      "product_name": "Premium Support (Annual)",
      "unit_price": 3500.00
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "p1234567-abcd-efgh-ijkl-1234567890ab",
  "name": "Enterprise Software Pricing 2024",
  "version": "v1.0",
  "is_active": false,
  "created_at": "2024-10-24T10:00:00Z"
}
```

### 2. Activate Price List
**Endpoint:** `PATCH /price-lists/:id/activate`
**Headers:** `Authorization: Bearer <token>`
**Roles Allowed:** `Manager`, `Administrator`

**Response (200 OK):**
```json
{
  "id": "p1234567-abcd-efgh-ijkl-1234567890ab",
  "is_active": true,
  "version": "v1.0"
}
```

### 3. Create Quotation (With Validation & Discounts)
**Endpoint:** `POST /quotations`
**Headers:** `Authorization: Bearer <token>`
**Roles Allowed:** `Sale`, `Manager`, `Administrator`

**Request:**
```json
{
  "customer_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "job_id": "j9876543-abcd-efgh-ijkl-1234567890ab",
  "valid_until": "2024-11-24T23:59:59Z",
  "discount_type": "Percentage",
  "discount_value": 10, 
  "items": [
    {
      "price_list_item_id": "item-uuid-1",
      "quantity": 2,
      "discount_type": "None",
      "discount_value": 0
    },
    {
      "price_list_item_id": "item-uuid-2",
      "quantity": 1,
      "discount_type": "Fixed",
      "discount_value": 500.00
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "q1111111-2222-3333-4444-555555555555",
  "quotation_number": "QT-2024-4829",
  "customer_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "price_list_id": "p1234567-abcd-efgh-ijkl-1234567890ab",
  "subtotal": 27000.00,
  "discount_type": "Percentage",
  "discount_value": 10,
  "total_amount": 24300.00,
  "status": "Draft",
  "items": [
    {
      "price_list_item_id": "item-uuid-1",
      "quantity": 2,
      "unit_price": 12000.00,
      "discount_type": "None",
      "discount_value": 0,
      "final_line_price": 24000.00
    },
    {
      "price_list_item_id": "item-uuid-2",
      "quantity": 1,
      "unit_price": 3500.00,
      "discount_type": "Fixed",
      "discount_value": 500.00,
      "final_line_price": 3000.00
    }
  ]
}
```
*(Note: If the `customer_id` is invalid, the API returns a `404 Not Found`. If there is no active price list, it returns a `400 Bad Request`.)*
