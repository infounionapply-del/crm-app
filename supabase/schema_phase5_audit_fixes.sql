-- Phase 5: Audit Fixes & Missing Modules Schema Updates

-- 1. Add missing fields for PDF Generation, Deal Closing (PO), and SO Process
ALTER TABLE public.quotations 
ADD COLUMN quotation_pdf_url VARCHAR(500),
ADD COLUMN po_pdf_url VARCHAR(500),
ADD COLUMN po_number VARCHAR(100) UNIQUE,
ADD COLUMN so_number VARCHAR(100) UNIQUE;

-- 2. Update Jobs table to track overall deal status more explicitly
-- Statuses can now include 'Won', 'Lost'
ALTER TABLE public.jobs
ADD COLUMN po_number VARCHAR(100),
ADD COLUMN so_number VARCHAR(100);

-- 3. Ensure Support Tasks can track SO updates
ALTER TABLE public.support_tasks
ADD COLUMN so_number VARCHAR(100);

-- 4. Create a unified Timeline View (Virtual View for easy querying)
CREATE OR REPLACE VIEW public.deal_timeline AS
SELECT 
    j.id as job_id,
    'Check-in' as event_type,
    c.check_in_time as event_date,
    u.first_name || ' ' || u.last_name as actor,
    'Check-in logged at ' || c.location_lat || ',' || c.location_lng as details
FROM public.jobs j
JOIN public.check_ins c ON j.customer_id = c.customer_id
JOIN public.users u ON c.user_id = u.id

UNION ALL

SELECT 
    j.id as job_id,
    'Job Created' as event_type,
    j.created_at as event_date,
    u.first_name || ' ' || u.last_name as actor,
    'Job: ' || j.title as details
FROM public.jobs j
JOIN public.users u ON j.created_by = u.id

UNION ALL

SELECT 
    q.job_id as job_id,
    'Quotation ' || q.status as event_type,
    q.updated_at as event_date,
    u.first_name || ' ' || u.last_name as actor,
    'Quotation ' || q.quotation_number || ' updated' as details
FROM public.quotations q
JOIN public.users u ON q.created_by = u.id
WHERE q.job_id IS NOT NULL

UNION ALL

SELECT 
    q.job_id as job_id,
    'Revision: ' || rh.action as event_type,
    rh.created_at as event_date,
    u.first_name || ' ' || u.last_name as actor,
    rh.comments as details
FROM public.revision_history rh
JOIN public.quotations q ON rh.reference_id = q.id
JOIN public.users u ON rh.changed_by = u.id
WHERE rh.reference_type = 'Quotation' AND q.job_id IS NOT NULL;
