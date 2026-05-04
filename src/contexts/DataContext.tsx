import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { createTranslatedRecord, getLocalizedValue } from '../services/translationService';

export const defaultPdfSettings = {
  logoUrl: 'https://via.placeholder.com/200x80?text=COMPANY+LOGO',
  companyName: 'Acme Corporation Co., Ltd.',
  companyAddress: '123 Business Road, Tech District, Bangkok 10110, Thailand',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  taxId: '0105555555555',
  vatRate: 7,
  primaryColor: '#0ea5e9',
  footerNotes: '1. Quotation valid for 30 days.\n2. Payment terms: 50% advance, 50% upon delivery.\n3. Please sign and return to confirm your order.'
};

interface DataContextType {
  jobs: any[];
  setJobs: React.Dispatch<React.SetStateAction<any[]>>;
  quotations: any[];
  setQuotations: React.Dispatch<React.SetStateAction<any[]>>;
  customers: any[];
  salesReps: any[];
  salesTargets: any[];
  setSalesTargets: React.Dispatch<React.SetStateAction<any[]>>;
  users: any[];
  setUsers: React.Dispatch<React.SetStateAction<any[]>>;
  pdfSettings: any;
  companySettings: any;
  updateCompanySettings: (settings: any) => Promise<void>;
  addUser: (userData: any) => Promise<void>;
  updateUser: (id: string, userData: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateProfile: (id: string, profileData: any) => Promise<void>;
  isLoadingData: boolean;
  refreshData: () => Promise<void>;
  addCustomer: (customerData: any) => Promise<any>;
  updateCustomer: (id: string, customerData: any) => Promise<any>;
  addJob: (jobData: any) => Promise<any>;
  updateJob: (id: string, jobData: any) => Promise<any>;
  deleteJob: (id: string) => Promise<any>;
  addQuotation: (quotationData: any, items: any[]) => Promise<any>;
  updateQuotation: (id: string, quotationData: any) => Promise<any>;
  deleteQuotation: (id: string) => Promise<any>;
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  approvals: any[];
  setApprovals: React.Dispatch<React.SetStateAction<any[]>>;
  updateSalesTarget: (salesRepId: string, month: string, targetAmount: number) => Promise<void>;
  addProduct: (productData: any) => Promise<void>;
  updateProduct: (id: string, productData: any) => Promise<void>;
  addApproval: (approvalData: any) => Promise<void>;
  updateApprovalStatus: (id: string, status: string, reason?: string) => Promise<void>;
  checkIns: any[];
  setCheckIns: React.Dispatch<React.SetStateAction<any[]>>;
  addCheckIn: (checkInData: any) => Promise<void>;
  formatCurrency: (amount: number | string) => string;
  formatDate: (dateString: string | Date | null) => string;
  notifications: any[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [jobs, setJobs] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [salesTargets, setSalesTargets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);

  const formatCurrency = (amount: number | string) => {
    let numericAmount = 0;
    if (typeof amount === 'string') {
      numericAmount = Number(amount.replace(/[^0-9.-]+/g, ""));
    } else if (typeof amount === 'number') {
      numericAmount = amount;
    }
    
    // Strictly Thai Baht, removing decimals if not needed or keeping 2 decimal places
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 }).format(numericAmount || 0);
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Read from companySettings.system_preferences.dateFormat
    const format = companySettings?.system_preferences?.dateFormat || 'DD/MM/YYYY';
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();

    if (format === 'MM/DD/YYYY') return `${m}/${d}/${yyyy}`;
    if (format === 'YYYY-MM-DD') return `${yyyy}-${m}-${d}`;
    return `${d}/${m}/${yyyy}`; // DD/MM/YYYY
  };
  const [companySettings, setCompanySettings] = useState<any>({
    pdf_settings: defaultPdfSettings,
    company_details: {},
    system_preferences: { dateFormat: 'DD/MM/YYYY', currency: 'USD' }
  });

  const pdfSettings = companySettings.pdf_settings || defaultPdfSettings;

  const salesReps = users.filter((u: any) => u.role === 'Sales');

  const refreshData = async () => {
    if (!session?.user) return;
    setIsLoadingData(true);
    try {
      // Fetch company settings
      const { data: settingsData } = await supabase.from('company_settings').select('*').eq('id', 1).single();
      if (settingsData) {
        setCompanySettings({
          ...settingsData,
          pdf_settings: { ...defaultPdfSettings, ...(settingsData.pdf_settings || {}) }
        });
      }

      // Fetch users
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        const mappedUsers = usersData.map(u => ({
          ...u,
          name: `${u.first_name} ${u.last_name}`,
          team: u.role
        }));
        setUsers(mappedUsers);
      }

      // Determine reliable role, since profile state might be stale during realtime subscription callbacks
      let currentRole = profile?.role;
      if (!currentRole && session?.user?.id && usersData) {
        const currentUser = usersData.find((u: any) => u.id === session.user.id);
        if (currentUser) currentRole = currentUser.role;
      }
      const isSales = currentRole === 'Sales';

      // Fetch customers
      let customersQuery = supabase.from('customers').select('*');
      if (isSales && session?.user?.id) {
        customersQuery = customersQuery.eq('created_by', session.user.id);
      }
      const { data: customersData } = await customersQuery;
      
      if (customersData) {
        const mappedCustomers = customersData.map(c => ({
          ...c,
          name: getLocalizedValue(c.name, language),
          contact: c.company || '',
          typeBu: c.type_bu || '',
          groupBu: c.group_bu || '',
          taxId: c.tax_id || '',
          address: getLocalizedValue(c.address, language),
          province: c.province || '',
          district: c.district || '',
          tambon: c.tambon || '',
          gpsLocation: c.gps_location || ''
        }));
        setCustomers(mappedCustomers);
      }

      // Fetch jobs
      let jobsQuery = supabase.from('jobs').select('*');
      if (isSales && session?.user?.id) {
        jobsQuery = jobsQuery.eq('created_by', session.user.id);
      }
      const { data: jobsData } = await jobsQuery;
      
      if (jobsData && customersData) {
        // Map jobs to match UI expectations
        const mappedJobs = jobsData.map(job => {
          const cust = customersData.find(c => c.id === job.customer_id);
          return {
            ...job,
            title: getLocalizedValue(job.title, language),
            description: getLocalizedValue(job.description, language),
            customer: cust ? getLocalizedValue(cust.name, language) : 'Unknown',
            value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(job.value || 0),
            date: new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            estimatedCompletionDate: job.estimated_completion_date ? new Date(job.estimated_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
          };
        });
        setJobs(mappedJobs);
      }

      // Fetch Approvals
      const { data: approvalsData } = await supabase.from('approvals').select('*').order('created_at', { ascending: false });
      if (approvalsData) {
        setApprovals(approvalsData.map(a => ({
          ...a,
          date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        })));
      }

      // Fetch quotations
      const { data: rawQuotesData } = await supabase.from('quotations').select('*');
      
      let quotesData = rawQuotesData;
      // If Sales, only keep quotations that belong to their jobs
      if (isSales && jobsData && rawQuotesData) {
        quotesData = rawQuotesData.filter(q => jobsData.some(j => j.id === q.job_id));
      }
      
      if (quotesData && customersData && jobsData) {
        const mappedQuotes = quotesData.map(quote => {
          const cust = customersData.find(c => c.id === quote.customer_id);
          const job = jobsData.find(j => j.id === quote.job_id);
          const creator = usersData.find(u => u.id === (job ? job.created_by : quote.created_by));
          const approver = usersData.find(u => u.id === quote.approved_by);
          
          // Find the approval for this quotation to get the approver
          const quoteApproval = approvalsData?.find(a => 
            (a.reference === quote.id || a.reference === quote.quotation_number) && 
            a.status === 'Approved'
          );
          const approvalManager = quoteApproval ? usersData.find(u => u.id === quoteApproval.approved_by) : null;
          
          return {
            ...quote,
            customer: cust ? getLocalizedValue(cust.name, language) : 'Unknown',
            customer_address: cust ? `${getLocalizedValue(cust.address, language) || ''} ${cust.tambon || ''} ${cust.district || ''} ${cust.province || ''}`.trim() : '',
            customer_street: cust ? getLocalizedValue(cust.address, language) : '',
            customer_subdistrict: cust ? cust.tambon : '',
            customer_district: cust ? cust.district : '',
            customer_province: cust ? cust.province : '',
            customer_email: cust ? cust.email : '',
            customer_phone: cust ? cust.phone : '',
            customer_company: cust ? cust.company : '',
            customer_tax_id: cust ? cust.tax_id : '',
            created_by: quote.created_by,
            creator_name: creator ? `${creator.first_name} ${creator.last_name}` : (quote.owner || quote.sales_person || '-'),
            owner_name: creator ? `${creator.first_name} ${creator.last_name}` : (quote.owner || quote.sales_person || '-'),
            approver_name: approvalManager ? `${approvalManager.first_name} ${approvalManager.last_name}` : (approver ? `${approver.first_name} ${approver.last_name}` : '-'),
            jobTitle: job ? getLocalizedValue(job.title, language) : 'Unknown Job',
            job_description: job ? getLocalizedValue(job.description, language) : '-',
            jobNumber: job ? job.job_number : null,
            jobPoNumber: job ? job.po_number : null,
            jobPoAttachment: job ? job.po_attachment_url : null,
            value: formatCurrency(quote.total_amount || 0),
            date: new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            validUntil: quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
            revisionCount: quote.revision_count || 0
          };
        });
        setQuotations(mappedQuotes);
      }

      // Fetch Sales Targets
      const { data: targetsData } = await supabase.from('sales_targets').select('*');
      if (targetsData) {
        setSalesTargets(targetsData.map(t => ({
          id: t.id,
          salesRepId: t.sales_rep_id,
          month: t.month,
          target: Number(t.target)
        })));
      }

      // Fetch Products
      const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (productsData) {
        setProducts(productsData.map(p => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          currentPrice: Number(p.current_price),
          status: p.status,
          effectiveDate: p.effective_date,
          history: p.history || []
        })));
      }

      // Fetch CheckIns
      let checkInsQuery = supabase.from('check_ins').select('*');
      if (isSales && session?.user?.id) {
        checkInsQuery = checkInsQuery.eq('sales_rep_id', session.user.id);
      }
      const { data: checkInsData } = await checkInsQuery.order('created_at', { ascending: false });
      
      if (checkInsData && customersData && usersData) {
        setCheckIns(checkInsData.map(ci => {
          const cust = customersData.find(c => c.id === ci.customer_id);
          const rep = usersData.find(u => u.id === ci.sales_rep_id);
          return {
            ...ci,
            customer: cust ? cust.name : 'Unknown',
            salesRep: rep ? `${rep.first_name} ${rep.last_name}` : 'Unknown',
            date: new Date(ci.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: new Date(ci.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          };
        }));
      }

    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const updateCompanySettings = async (settings: any) => {
    try {
      const { error } = await supabase.from('company_settings').update(settings).eq('id', 1);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  };

  const addUser = async (userData: any) => {
    try {
      const [firstName, ...lastNameArr] = (userData.name || '').split(' ');
      const lastName = lastNameArr.join(' ');
      
      const { error } = await supabase.from('users').insert([{
        email: userData.email,
        first_name: firstName || 'New',
        last_name: lastName || 'User',
        role: userData.role || 'Sales',
        password_hash: userData.password || 'temp123'
      }]);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, userData: any) => {
    try {
      const updatePayload: any = {};
      if (userData.name) {
        const [firstName, ...lastNameArr] = userData.name.split(' ');
        updatePayload.first_name = firstName;
        updatePayload.last_name = lastNameArr.join(' ');
      }
      if (userData.email) updatePayload.email = userData.email;
      if (userData.role) updatePayload.role = userData.role;
      if (userData.password) updatePayload.password_hash = userData.password;
      if (userData.preferences) updatePayload.preferences = userData.preferences;

      const { error } = await supabase.from('users').update(updatePayload).eq('id', id);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const updateProfile = async (id: string, profileData: any) => {
    try {
      const { error } = await supabase.from('users').update(profileData).eq('id', id);
      if (error) throw error;
      await refreshData();
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const addCustomer = async (customerData: any) => {
    try {
      const translatedName = await createTranslatedRecord(customerData.name);
      const translatedAddress = customerData.address ? await createTranslatedRecord(customerData.address) : '';

      const { data, error } = await supabase.from('customers').insert([{
        name: translatedName,
        company: customerData.contact,
        email: customerData.email,
        phone: customerData.phone,
        type: customerData.type,
        status: customerData.status,
        type_bu: customerData.typeBu,
        group_bu: customerData.groupBu,
        tax_id: customerData.taxId,
        address: translatedAddress,
        province: customerData.province,
        district: customerData.district,
        tambon: customerData.tambon,
        gps_location: customerData.gpsLocation,
        created_by: session?.user?.id
      }]).select();
      if (error) throw error;
      await refreshData();
      return data;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (id: string, customerData: any) => {
    try {
      const translatedName = await createTranslatedRecord(customerData.name);
      const translatedAddress = customerData.address ? await createTranslatedRecord(customerData.address) : '';

      const { data, error } = await supabase.from('customers').update({
        name: translatedName,
        company: customerData.contact,
        email: customerData.email,
        phone: customerData.phone,
        type: customerData.type,
        status: customerData.status,
        type_bu: customerData.typeBu,
        group_bu: customerData.groupBu,
        tax_id: customerData.taxId,
        address: translatedAddress,
        province: customerData.province,
        district: customerData.district,
        tambon: customerData.tambon,
        gps_location: customerData.gpsLocation
      }).eq('id', id).select();
      if (error) throw error;
      await refreshData();
      return data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const generateDocumentNumber = async (type: 'job' | 'quotation'): Promise<string> => {
    const prefix = type === 'job' ? 'SA' : 'QT';
    const tableName = type === 'job' ? 'jobs' : 'quotations';
    const columnName = type === 'job' ? 'job_number' : 'quotation_number';
    
    const currentYear = new Date().getFullYear() + 543;
    const yy = currentYear.toString().slice(-2);
    const pattern = `${prefix}-${yy}%`;
    
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .like(columnName, pattern)
      .order(columnName, { ascending: false })
      .limit(1);

    let nextSequence = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0][columnName];
      if (lastNumber) {
        // e.g., SA-690001 -> split by '-' -> 690001 -> substring(2) -> 0001
        const seqStr = lastNumber.split('-')[1]?.substring(2);
        if (seqStr) {
          nextSequence = parseInt(seqStr, 10) + 1;
        }
      }
    }

    return `${prefix}-${yy}${nextSequence.toString().padStart(4, '0')}`;
  };

  const addJob = async (jobData: any) => {
    try {
      const translatedTitle = await createTranslatedRecord(jobData.title);
      const translatedDescription = jobData.description ? await createTranslatedRecord(jobData.description) : '';

      const jobNumber = await generateDocumentNumber('job');

      const { data, error } = await supabase.from('jobs').insert([{
        job_number: jobNumber,
        title: translatedTitle,
        customer_id: jobData.customerId,
        description: translatedDescription,
        value: jobData.value,
        stage: jobData.stage,
        status: jobData.status,
        po_number: jobData.poNumber,
        so_number: jobData.soNumber,
        created_by: session?.user?.id,
        history: jobData.history || []
      }]).select();
      if (error) throw error;
      await refreshData();
      return data;
    } catch (error) {
      console.error('Error adding job:', error);
      throw error;
    }
  };

  const updateJob = async (id: string, jobData: any) => {
    try {
      const updatePayload: any = {};
      if (jobData.title !== undefined) updatePayload.title = await createTranslatedRecord(jobData.title);
      if (jobData.customerId !== undefined) updatePayload.customer_id = jobData.customerId;
      if (jobData.description !== undefined) updatePayload.description = await createTranslatedRecord(jobData.description);
      if (jobData.value !== undefined) updatePayload.value = jobData.value;
      if (jobData.stage !== undefined) {
        updatePayload.stage = jobData.stage;
        if (jobData.stage === 'Revision') {
           updatePayload.status = 'Revision Requested';
        } else if (jobData.stage === 'Closed Won') {
           updatePayload.status = 'Won';
        }
      }
      if (jobData.status !== undefined) updatePayload.status = jobData.status;
      if (jobData.poNumber !== undefined) updatePayload.po_number = jobData.poNumber;
      if (jobData.soNumber !== undefined) updatePayload.so_number = jobData.soNumber;
      if (jobData.history !== undefined) updatePayload.history = jobData.history;

      if (jobData.poFile) {
        const fileExt = jobData.poFile.name.split('.').pop();
        const fileName = `${id}-${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('job-attachments').upload(fileName, jobData.poFile);
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('job-attachments').getPublicUrl(uploadData.path);
          updatePayload.po_attachment_url = urlData.publicUrl;
        } else {
          console.error('Error uploading PO file:', uploadError);
        }
      }

      const { data, error } = await supabase.from('jobs').update(updatePayload).eq('id', id).select();
      if (error) throw error;
      
      const updatedJob = data[0];

      // AUTO-SYNC WITH QUOTATIONS
      if (jobData.stage !== undefined && updatedJob) {
        const newStage = jobData.stage;
        const { data: relatedQuotes } = await supabase.from('quotations').select('id, status, history, revision_count').eq('job_id', id);
        
        if (relatedQuotes && relatedQuotes.length > 0) {
          for (const q of relatedQuotes) {
            let newQuoteStatus = null;
            if (newStage === 'Revision') {
              newQuoteStatus = 'Revision Requested';
            } else if (newStage === 'Closed Won') {
              newQuoteStatus = 'Won';
            } else if (newStage === 'Closed Lost' || newStage === 'Cancel') {
              newQuoteStatus = newStage === 'Cancel' ? 'Canceled' : 'Lost';
            } else if (newStage === 'QT Approve') {
              newQuoteStatus = 'Approved';
            }
            
            if (newQuoteStatus && newQuoteStatus !== q.status) {
              let syncNote = `Status changed to ${newQuoteStatus} because Job stage moved to ${newStage}`;
              if (newStage === 'Revision' && updatedJob && updatedJob.history) {
                // Find the latest history entry that looks like a revision note
                const revEntry = updatedJob.history.find((h: any) => h.action.includes('Revision') && h.note && !h.note.includes('Stage updated manually'));
                if (revEntry && revEntry.note) {
                  syncNote = revEntry.note;
                } else if (jobData.history && jobData.history.length > 0) {
                  syncNote = jobData.history[0].note;
                }
              }

              const newHistory = [{
                date: new Date().toLocaleString(),
                action: `Auto-synced from Job`,
                user: 'System',
                note: syncNote
              }, ...(q.history || [])];
              
              const quoteUpdatePayload: any = { status: newQuoteStatus, history: newHistory };
              if (newQuoteStatus === 'Won' && jobData.soNumber) {
                quoteUpdatePayload.so_number = jobData.soNumber;
              }
              if (newQuoteStatus === 'Revision Requested') {
                quoteUpdatePayload.quotation_pdf_url = null;
                quoteUpdatePayload.revision_count = (q.revision_count || 0) + 1;
              }
              
              await supabase.from('quotations').update(quoteUpdatePayload).eq('id', q.id);

              // Auto-sync with Approvals: if quote was pending and now cancelled/lost/revision, reject the approval
              if (q.status === 'Pending Approval' && ['Revision Requested', 'Lost', 'Canceled'].includes(newQuoteStatus)) {
                await supabase.from('approvals')
                  .update({ status: 'Rejected' })
                  .eq('type', 'Quotation')
                  .eq('reference', q.id)
                  .eq('status', 'Pending');
              }
            }
          }
        }
      }

      await refreshData();
      return data;
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  };

  const deleteJob = async (id: string) => {
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  };

  const addQuotation = async (quotationData: any, items: any[]) => {
    try {
      const quotationNumber = await generateDocumentNumber('quotation');
      // 1. Insert Quotation
      const { data: quoteData, error: quoteError } = await supabase.from('quotations').insert([{
        quotation_number: quotationNumber,
        job_id: quotationData.jobId,
        customer_id: quotationData.customerId,
        total_amount: quotationData.totalAmount,
        status: quotationData.status,
        valid_until: quotationData.validUntil,
        po_number: quotationData.poNumber,
        so_number: quotationData.soNumber,
        details: quotationData.details,
        created_by: session?.user?.id,
        history: quotationData.history || [{
          date: new Date().toLocaleString(),
          action: 'Quotation Created',
          user: session?.user?.email || 'System',
          userId: session?.user?.id || null,
          note: ''
        }]
      }]).select();
      
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("Failed to create quotation");
      
      const newQuoteId = quoteData[0].id;

      // 2. Insert Items (if provided)
      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          quotation_id: newQuoteId,
          product_id: item.itemId || null,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.quantity * item.price
        }));
        
        const { error: itemsError } = await supabase.from('quotation_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      await refreshData();
      return quoteData;
    } catch (error) {
      console.error('Error adding quotation:', error);
      throw error;
    }
  };

  const updateQuotation = async (id: string, quotationData: any) => {
    try {
      const updatePayload: any = {};
      if (quotationData.jobId !== undefined) updatePayload.job_id = quotationData.jobId;
      if (quotationData.customerId !== undefined) updatePayload.customer_id = quotationData.customerId;
      if (quotationData.totalAmount !== undefined) updatePayload.total_amount = quotationData.totalAmount;
      if (quotationData.status !== undefined) updatePayload.status = quotationData.status;
      if (quotationData.poNumber !== undefined) updatePayload.po_number = quotationData.poNumber;
      if (quotationData.soNumber !== undefined) updatePayload.so_number = quotationData.soNumber;
      if (quotationData.details !== undefined) updatePayload.details = quotationData.details;
      if (quotationData.history !== undefined) updatePayload.history = quotationData.history;
      if (quotationData.revisionCount !== undefined) updatePayload.revision_count = quotationData.revisionCount;
      if (quotationData.quotationPdfLink !== undefined) updatePayload.quotation_pdf_url = quotationData.quotationPdfLink;
      if (quotationData.poPdfLink !== undefined) updatePayload.po_pdf_url = quotationData.poPdfLink;
      if (quotationData.approved_by !== undefined) updatePayload.approved_by = quotationData.approved_by;

      if (quotationData.quotationPdfBlob && quotationData.quotationPdfFilename) {
        const fileExt = quotationData.quotationPdfFilename.split('.').pop() || 'pdf';
        const fileName = `${id}-${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('quotation-documents').upload(fileName, quotationData.quotationPdfBlob);
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('quotation-documents').getPublicUrl(uploadData.path);
          updatePayload.quotation_pdf_url = urlData.publicUrl;
        } else {
          console.error('Error uploading Quotation PDF:', uploadError);
        }
      }

      const { data, error } = await supabase.from('quotations').update(updatePayload).eq('id', id).select();
      if (error) throw error;
      
      const updatedQuote = data[0];
      
      // AUTO-SYNC WITH JOB
      if (quotationData.status !== undefined && updatedQuote && updatedQuote.job_id) {
        const jobId = updatedQuote.job_id;
        let newJobStage = null;
        let newJobStatus = null;
        const jobUpdatePayload: any = {};
        
        const qStatus = quotationData.status;
        if (qStatus === 'Pending Approval') {
           newJobStatus = 'Pending Approval';
        } else if (qStatus === 'Approved') {
           newJobStage = 'QT Approve';
           newJobStatus = 'Approved';
        } else if (qStatus === 'Won') {
           newJobStage = 'Closed Won';
           newJobStatus = 'Won';
        } else if (qStatus === 'Order Pending') {
           newJobStatus = 'Order Pending';
           if (quotationData.soNumber) jobUpdatePayload.so_number = quotationData.soNumber;
           if (quotationData.estimatedCompletionDate) jobUpdatePayload.estimated_completion_date = quotationData.estimatedCompletionDate;
        } else if (['In Process', 'FG', 'Delivery'].includes(qStatus)) {
           newJobStatus = qStatus;
        } else if (qStatus === 'Rejected') {
           newJobStatus = 'Rejected';
        } else if (qStatus === 'Revision Requested') {
           newJobStage = 'Revision';
           newJobStatus = 'Revision Requested';
        } else if (qStatus === 'Canceled' || qStatus === 'Lost') {
           newJobStage = qStatus === 'Canceled' ? 'Cancel' : 'Closed Lost';
           newJobStatus = 'Lost';
        }

        if (newJobStage) jobUpdatePayload.stage = newJobStage;
        if (newJobStatus) jobUpdatePayload.status = newJobStatus;
        
        if (Object.keys(jobUpdatePayload).length > 0) {
           // Fetch existing job history to append to
           const { data: existingJobData } = await supabase.from('jobs').select('history').eq('id', jobId).single();
           const existingHistory = existingJobData?.history || [];
           
           jobUpdatePayload.history = [{
             date: new Date().toLocaleString(),
             action: `Auto-synced from Quotation`,
             user: 'System',
             note: `Status changed to ${newJobStatus || 'unchanged'}, Stage changed to ${newJobStage || 'unchanged'}`
           }, ...existingHistory];

           await supabase.from('jobs').update(jobUpdatePayload).eq('id', jobId);
        }
      }

      // AUTO-SYNC WITH APPROVALS
      if (quotationData.status !== undefined && updatedQuote) {
        const qStatus = quotationData.status;
        
        if (qStatus === 'Pending Approval') {
          // Auto-create approval if it doesn't exist, or recycle rejected
          const { data: existingApprovals } = await supabase.from('approvals')
            .select('id, status')
            .eq('type', 'Quotation')
            .in('reference', [id, updatedQuote.quotation_number].filter(Boolean));
            
          const pendingApproval = existingApprovals?.find(a => a.status === 'Pending');
          const oldApprovals = existingApprovals?.filter(a => a.status !== 'Pending') || [];
            
          if (!pendingApproval) {
            // Remove ALL old approvals (Approved, Rejected, etc.) for this QT so they don't clutter the UI
            if (oldApprovals.length > 0) {
              for (const r of oldApprovals) {
                await supabase.from('approvals').delete().eq('id', r.id);
              }
            }

            // Create a fresh pending approval
            let customerName = 'Unknown Customer';
            if (updatedQuote.customer_id) {
              const { data: custData } = await supabase.from('customers').select('name').eq('id', updatedQuote.customer_id).single();
              if (custData) customerName = custData.name;
            }
            
            await supabase.from('approvals').insert([{
              type: 'Quotation',
              reference: id,
              customer: customerName,
              requester: session?.user?.email || 'System',
              amount: updatedQuote.total_amount || 0,
              status: 'Pending',
              details: `Quotation No: ${updatedQuote.quotation_number || '-'} | PO: ${updatedQuote.po_number || '-'} | SO: ${updatedQuote.so_number || '-'}`
            }]);
          }
        } else if (qStatus === 'Approved' || qStatus === 'Rejected') {
          // Auto-update pending approvals to match
          await supabase.from('approvals')
            .update({ status: qStatus })
            .eq('type', 'Quotation')
            .in('reference', [id, updatedQuote.quotation_number].filter(Boolean))
            .eq('status', 'Pending');
        }
      }

      await refreshData();
      return data;
    } catch (error) {
      console.error('Error updating quotation:', error);
      throw error;
    }
  };

  const deleteQuotation = async (id: string) => {
    try {
      // Deleting quotation should cascade to quotation_items based on our schema
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error deleting quotation:', error);
      throw error;
    }
  };

  const updateSalesTarget = async (salesRepId: string, month: string, targetAmount: number) => {
    try {
      const { error } = await supabase.from('sales_targets').upsert(
        { sales_rep_id: salesRepId, month, target: targetAmount },
        { onConflict: 'sales_rep_id,month' }
      );
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error updating sales target:', error);
      throw error;
    }
  };

  const addProduct = async (productData: any) => {
    try {
      const { error } = await supabase.from('products').insert([{
        sku: productData.sku,
        name: productData.name,
        category: productData.category,
        current_price: productData.currentPrice,
        status: productData.status,
        effective_date: productData.effectiveDate,
        history: productData.history
      }]);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, productData: any) => {
    try {
      const { error } = await supabase.from('products').update({
        sku: productData.sku,
        name: productData.name,
        category: productData.category,
        current_price: productData.currentPrice,
        status: productData.status,
        effective_date: productData.effectiveDate,
        history: productData.history
      }).eq('id', id);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const addApproval = async (approvalData: any) => {
    try {
      const { error } = await supabase.from('approvals').insert([{
        type: approvalData.type,
        reference: approvalData.reference,
        customer: approvalData.customer,
        requester: approvalData.requester,
        amount: approvalData.amount,
        status: approvalData.status || 'Pending',
        details: approvalData.details
      }]);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error adding approval:', error);
      throw error;
    }
  };

  const updateApprovalStatus = async (id: string, status: string, reason?: string) => {
    try {
      const { error } = await supabase.from('approvals').update({ 
        status,
        approved_by: session?.user?.id,
        comments: reason || null
      }).eq('id', id);
      if (error) throw error;
      
      // Auto-sync with Quotations or Jobs if applicable
      const approval = approvals.find(a => a.id === id);
      if (approval) {
        if (approval.type === 'Quotation') {
          // reference is likely the quotation_number (e.g. QT-2024-001)
          const quote = quotations.find(q => q.quotation_number === approval.reference || q.id === approval.reference);
          if (quote) {
            // Update quotation status in database with history
            const newHistory = [{
              date: new Date().toLocaleString(),
              action: `Approval ${status}`,
              user: session?.user?.email || 'System',
              userId: session?.user?.id || null,
              note: reason || `Quotation was ${status.toLowerCase()} via Approvals.`
            }, ...(quote.history || [])];

            await updateQuotation(quote.id, { 
              status: status, 
              history: newHistory,
              approved_by: session?.user?.id
            });
          }
        }
      }
      
      await refreshData();
    } catch (error) {
      console.error('Error updating approval:', error);
      throw error;
    }
  };

  const addCheckIn = async (checkInData: any) => {
    try {
      let photoUrl = null;

      // Upload photo if it exists
      if (checkInData.photo) {
        const fileExt = checkInData.photo.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('checkin_photos')
          .upload(filePath, checkInData.photo);

        if (uploadError) {
          console.error("Error uploading photo:", uploadError);
          throw new Error("Failed to upload photo");
        }

        const { data: publicUrlData } = supabase.storage
          .from('checkin_photos')
          .getPublicUrl(filePath);
          
        photoUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('check_ins').insert([{
        customer_id: checkInData.customerId,
        notes: checkInData.notes,
        gps_location: checkInData.gps,
        photo_url: photoUrl,
        sales_rep_id: session?.user?.id
      }]);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error adding check-in:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (session?.user) {
      refreshData();
    } else {
      setJobs([]);
      setQuotations([]);
      setCustomers([]);
      setUsers([]);
      setProducts([]);
      setApprovals([]);
      setSalesTargets([]);
      setCheckIns([]);
      setIsLoadingData(false);
    }
  }, [session, language]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!session?.user) return;
    
    let debounceTimer: NodeJS.Timeout;
    
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime change received!', payload);
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            refreshData();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(debounceTimer);
    };
  }, [session]);

  const notifications = useMemo(() => {
    const notifs: any[] = [];
    const isSupport = profile?.role === 'Support';
    const isSales = profile?.role === 'Sales';
    const isManager = profile?.role === 'Manager' || profile?.role === 'Admin';

    if (isManager) {
      approvals.filter(a => a.status === 'Pending').forEach(a => {
        notifs.push({
          id: `app-${a.id}`,
          title: 'Approval Required',
          message: `${a.type} ${a.reference} needs your approval.`,
          time: a.date,
          isRead: false,
          link: '/approvals'
        });
      });
      
      jobs.filter(j => j.stage === 'Closed Won').slice(0, 5).forEach(j => {
        notifs.push({
          id: `mgr-job-won-${j.id}`,
          title: 'Deal Closed',
          message: `Job ${j.title} has been won!`,
          time: new Date(j.created_at).toLocaleDateString(),
          isRead: true,
          link: '/jobs'
        });
      });
    }

    if (isSales) {
      quotations.filter(q => ['Revision Requested', 'Rejected', 'Approved'].includes(q.status)).forEach(q => {
        let title = 'Quotation Update';
        let msg = `Quotation for ${q.customer} was updated.`;
        if (q.status === 'Revision Requested') {
          title = 'Revision Requested';
          msg = `Quotation for ${q.customer} needs revision.`;
        } else if (q.status === 'Rejected') {
          title = 'Quotation Rejected';
          msg = `Quotation for ${q.customer} was rejected.`;
        } else if (q.status === 'Approved') {
          title = 'Quotation Approved';
          msg = `Quotation for ${q.customer} has been approved.`;
        }
        notifs.push({
          id: `qt-${q.status}-${q.id}`,
          title,
          message: msg,
          time: new Date(q.created_at).toLocaleDateString(),
          isRead: q.status === 'Approved',
          link: '/quotations'
        });
      });

      jobs.filter(j => ['Closed Won', 'Closed Lost'].includes(j.stage)).forEach(j => {
        notifs.push({
          id: `job-${j.stage}-${j.id}`,
          title: j.stage === 'Closed Won' ? 'Deal Closed Won' : 'Deal Lost',
          message: `Job ${j.title} was ${j.stage === 'Closed Won' ? 'won!' : 'lost.'}`,
          time: new Date(j.created_at).toLocaleDateString(),
          isRead: true,
          link: '/jobs'
        });
      });
    }

    if (isSupport) {
      // Support creates quotations for 'Assigned'/'Revision' and fulfills 'Closed Won'
      jobs.filter(j => ['Assigned', 'Revision', 'Closed Won'].includes(j.stage)).forEach(j => {
        let title = '';
        let msg = '';
        if (j.stage === 'Assigned') {
          title = 'New Quotation Request';
          msg = `Job ${j.title} requires a new quotation.`;
        } else if (j.stage === 'Revision') {
          title = 'Revision Requested';
          msg = `Sales requested a revision for Job ${j.title}.`;
        } else if (j.stage === 'Closed Won') {
          title = 'New Fulfillment';
          msg = `Job ${j.title} is Closed Won. Fulfillment required.`;
        }
        notifs.push({
          id: `sup-job-${j.stage}-${j.id}`,
          title,
          message: msg,
          time: new Date(j.created_at).toLocaleDateString(),
          isRead: false,
          link: '/quotations'
        });
      });
    }

    return notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
  }, [approvals, quotations, jobs, profile]);

  return (
    <DataContext.Provider value={{ 
      jobs, setJobs, 
      quotations, setQuotations, 
      customers, 
      salesReps, 
      salesTargets, setSalesTargets,
      products, setProducts,
      approvals, setApprovals,
      users, setUsers,
      pdfSettings, companySettings, updateCompanySettings,
      addUser, updateUser, deleteUser, updateProfile,
      isLoadingData,
      refreshData,
      addCustomer,
      updateCustomer,
      addJob,
      updateJob,
      deleteJob,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      updateSalesTarget,
      addProduct,
      updateProduct,
      addApproval,
      updateApprovalStatus,
      checkIns, setCheckIns,
      addCheckIn,
      formatCurrency,
      formatDate,
      notifications
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
