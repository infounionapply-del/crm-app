# 🧪 TEST CASES & VALIDATION (CRM Production V3)

This document contains the test cases for validating the CRM system against the 12 specified modules.

## Module 1: Authentication & Roles
*   **Test Case 1.1:** Login with valid credentials.
    *   **Action:** Send `POST /auth/login` with valid email/password.
    *   **Expected:** Returns `200 OK` with JWT token.
*   **Test Case 1.2:** Role-based Access Control (RBAC).
    *   **Action:** As a `Sale` user, attempt to call `DELETE /customers/:id` (Manager only).
    *   **Expected:** Returns `403 Forbidden`.

## Module 2: Customer Module
*   **Test Case 2.1:** Create Quotation without Customer.
    *   **Action:** Send `POST /quotations` with `customer_id: null` or missing.
    *   **Expected:** Returns `400 Bad Request` (Validation error).
*   **Test Case 2.2:** Customer Creation Flow.
    *   **Action:** Send `POST /customers` with valid data.
    *   **Expected:** Returns `201 Created` and customer is saved in DB.

## Module 3: Check-in & Job
*   **Test Case 3.1:** Check-in Linkage.
    *   **Action:** Send `POST /check-ins` with a valid `customer_id`.
    *   **Expected:** Returns `201 Created`. Querying `GET /customers/:id/check-ins` returns the record.
*   **Test Case 3.2:** Job Creation Triggers Support Task.
    *   **Action:** Send `POST /jobs` with valid data.
    *   **Expected:** Job is created. The `EventEmitter` automatically inserts a record into `support_tasks` linked to the `job_id`.

## Module 4: Quotation System
*   **Test Case 4.1:** Create Quotation with Price List.
    *   **Action:** Send `POST /quotations` referencing an active `price_list_id`.
    *   **Expected:** Returns `201 Created`. Items are saved in `quotation_items` with prices snapshotted from the price list.
*   **Test Case 4.2:** Discount Logic.
    *   **Action:** Create quotation with a `discount_percentage` of 10 on a $1000 item.
    *   **Expected:** The `subtotal` is $1000, `discount_amount` is $100, and `total_amount` is $900.

## Module 5: Price List System
*   **Test Case 5.1:** Use Inactive Price List.
    *   **Action:** Attempt to create a quotation using a `price_list_id` where `is_active = false`.
    *   **Expected:** Returns `400 Bad Request` ("Price list is not active").
*   **Test Case 5.2:** Version Control.
    *   **Action:** Update a price list.
    *   **Expected:** The old price list is marked `is_active = false`, and a new price list record is created with `version = old_version + 1` and `is_active = true`.

## Module 6: Approval Process
*   **Test Case 6.1:** Manager Rejects Quotation.
    *   **Action:** Manager calls `PATCH /approvals/:id/reject` with `comments: "Price too low"`.
    *   **Expected:** Quotation status becomes `Rejected`. The rejection reason is saved in the `approvals` table.

## Module 7: Revision Loop (CRITICAL FIX APPLIED)
*   **Test Case 7.1:** Sale Requests Revision.
    *   **Action:** Sale user calls `PATCH /approvals/:id/request-revision` with `comments: "Need to add item"`.
    *   **Expected:** Quotation status becomes `Revision Requested`.
*   **Test Case 7.2:** Support Resubmits.
    *   **Action:** Support user calls `PATCH /quotations/:id/resubmit` with updated items.
    *   **Expected:** Quotation status becomes `Pending Approval`. `revision_count` increments by 1. History is saved in `revision_history`.

## Module 8: PDF Generation
*   **Test Case 8.1:** Generate Quotation PDF.
    *   **Action:** Call `POST /quotations/:id/generate-pdf`.
    *   **Expected:** Returns a URL to the generated PDF. The `quotation_pdf_url` field in the DB is updated.

## Module 9: Deal Closing
*   **Test Case 9.1:** Enter PO Number.
    *   **Action:** Call `POST /quotations/:id/close-deal` with `po_number: "PO-2024-999"`.
    *   **Expected:** Quotation and linked Job status updated to `Won`. `po_number` is saved.

## Module 10: SO Process
*   **Test Case 10.1:** Enter SO Number.
    *   **Action:** Call `POST /quotations/:id/process-so` with `so_number: "SO-2024-111"`.
    *   **Expected:** Quotation is updated with `so_number`. The linked `support_tasks` record is updated with `so_number` and status changes to `In Progress`.

## Module 11: Tracking / Timeline
*   **Test Case 11.1:** Fetch Full Timeline.
    *   **Action:** Call `GET /timeline/job/:id`.
    *   **Expected:** Returns an ordered array of events (Check-in -> Job Created -> Quotation Updated -> Revision -> Approval -> PO -> SO) sourced from the `deal_timeline` SQL View.

## Module 12: Multi-language (TH/EN)
*   **Test Case 12.1:** Switch Language.
    *   **Action:** Click the TH/EN toggle in the UI.
    *   **Expected:** All text updates immediately without page reload. No hardcoded text remains visible. Layout does not break.
