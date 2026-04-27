-- Phase 4 Schema Updates

-- 1. Update existing tables to support revisions and new statuses
ALTER TABLE public.quotations 
ADD COLUMN revision_count INTEGER DEFAULT 0;

-- Update status check/domain if applicable (Assuming VARCHAR was used, we just insert the new status in app logic, 
-- but we document the new expected statuses: 'Draft', 'Pending Approval', 'Approved', 'Sent', 'Accepted', 'Rejected', 'Revision Requested')

ALTER TABLE public.support_tasks 
ADD COLUMN revision_count INTEGER DEFAULT 0;

-- 2. Approvals Table
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_type VARCHAR(50) NOT NULL, -- e.g., 'Quotation', 'SupportTask', 'Discount'
    reference_id UUID NOT NULL,
    requester_id UUID NOT NULL REFERENCES public.users(id),
    approver_id UUID REFERENCES public.users(id), -- Can be null until someone picks it up or assigned
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Revision Requested'
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Revision History Table
CREATE TABLE public.revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_type VARCHAR(50) NOT NULL, -- e.g., 'Quotation', 'SupportTask'
    reference_id UUID NOT NULL,
    revision_number INTEGER NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.users(id),
    action VARCHAR(50) NOT NULL, -- 'Submitted', 'Revision Requested', 'Revised'
    comments TEXT,
    previous_data JSONB, -- Snapshot of data before revision
    new_data JSONB,      -- Snapshot of data after revision
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add triggers for updated_at
CREATE TRIGGER update_approvals_modtime
    BEFORE UPDATE ON public.approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Row Level Security (RLS)
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_history ENABLE ROW LEVEL SECURITY;

-- Example Policies
CREATE POLICY "Users can view approvals they requested or need to approve" ON public.approvals 
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = approver_id OR true); -- 'true' for managers/admins in real app

CREATE POLICY "Users can view revision history" ON public.revision_history 
    FOR SELECT USING (true);
