import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userId, conversationId, language = 'th' } = await req.json();
    console.log(`Received message: "${message}" from user ${userId} in ${language}`);

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing message or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Initialize Service Role Client for bypassing RLS
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Context (CRM Data) using service role because anon key cannot bypass RLS
    const { data: profile, error: userError } = await supabaseService.from('users').select('*').eq('id', userId).single();
    if (userError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid userId' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 1. Fetch ALL Data from ALL Tables (All Columns)
    const { data: allUsers } = await supabaseService.from('users').select('*');
    const { data: allCustomers } = await supabaseService.from('customers').select('*').order('created_at', { ascending: false }).limit(100);
    const { data: allJobs } = await supabaseService.from('jobs').select('*').order('created_at', { ascending: false }).limit(100);
    const { data: allQuotations } = await supabaseService.from('quotations').select('*').order('created_at', { ascending: false }).limit(100);
    const { data: allProducts } = await supabaseService.from('products').select('*');
    const { data: allCheckins } = await supabaseService.from('check_ins').select('*').order('created_at', { ascending: false }).limit(100);
    const { data: allApprovals } = await supabaseService.from('approvals').select('*').order('created_at', { ascending: false }).limit(100);
    const { data: allSalesTargets } = await supabaseService.from('sales_targets').select('*');
    const { data: companySettings } = await supabaseService.from('company_settings').select('*').single();

    const contextData = {
      user_name: profile?.first_name || 'User',
      role: profile?.role,
      system_data: {
        company_info: companySettings || {},
        users: allUsers || [],
        customers: allCustomers || [],
        jobs: allJobs || [],
        quotations: allQuotations || [],
        products: allProducts || [],
        check_ins: allCheckins || [],
        approvals: allApprovals || [],
        sales_targets: allSalesTargets || []
      }
    };

    // Construct System Prompt
    const systemPrompt = `You are an expert AI CRM Assistant for "InfoUnion". 
You have COMPLETE access to the CRM database. Use the following data to answer questions accurately.

DATABASE CONTEXT (ALL TABLES):
- COMPANY SETTINGS: ${JSON.stringify(contextData.system_data.company_info)}
- SYSTEM USERS: ${JSON.stringify(contextData.system_data.users)}
- CUSTOMERS: ${JSON.stringify(contextData.system_data.customers)}
- JOBS: ${JSON.stringify(contextData.system_data.jobs)}
- QUOTATIONS: ${JSON.stringify(contextData.system_data.quotations)}
- PRODUCTS: ${JSON.stringify(contextData.system_data.products)}
- CHECK-INS: ${JSON.stringify(contextData.system_data.check_ins)}
- APPROVALS: ${JSON.stringify(contextData.system_data.approvals)}
- SALES TARGETS: ${JSON.stringify(contextData.system_data.sales_targets)}

BEHAVIOR RULES:
1. You have the full database context. Answer ANY question related to the data above.
2. If asked about users, use the "SYSTEM USERS" data.
3. Respond in the user's preferred language: ${language === 'en' ? 'English' : 'Thai'}.
4. If asked something completely unrelated to the system, politely decline in ${language === 'en' ? 'English' : 'Thai'}.
5. Be professional and concise.`;

    // 2. Fetch AI Providers Fallback Logic
    const { data: providers, error: provError } = await supabaseService
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (provError || !providers || providers.length === 0) {
      throw new Error('No active AI providers found.');
    }

    let aiResponse = null;
    let successfulProvider = null;
    let providerErrors: string[] = [];

    // Loop through providers until success
    for (const provider of providers) {
      try {
        // 1. Monthly Reset & Quota Logic
        const now = new Date();
        let currentUsage = provider.usage_count || 0;
        
        if (provider.last_used_at) {
          const lastUsed = new Date(provider.last_used_at);
          // If the last used date is from a previous month/year, reset usage locally
          if (lastUsed.getMonth() !== now.getMonth() || lastUsed.getFullYear() !== now.getFullYear()) {
            currentUsage = 0;
            // Optionally, update the DB to reflect the reset immediately
            // But we will update it below upon success anyway.
          }
        }

        if (provider.monthly_quota !== null && currentUsage >= provider.monthly_quota) {
           providerErrors.push(`Provider ${provider.name} exceeded monthly quota (${provider.monthly_quota}).`);
           continue;
        }

        const nameLower = provider.name.toLowerCase();

        if (nameLower.includes('openai') || nameLower.includes('gpt')) {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${provider.api_key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
              ]
            }),
          });
          
          if (!res.ok) {
             const errData = await res.text();
             throw new Error(`OpenAI API error: ${res.status} - ${errData}`);
          }
          const data = await res.json();
          aiResponse = data.choices[0].message.content;
          successfulProvider = provider.name;
          break; // Success!
        } 
        else if (nameLower.includes('anthropic') || nameLower.includes('claude')) {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': provider.api_key,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1024,
              system: systemPrompt,
              messages: [{ role: 'user', content: message }]
            }),
          });
          
          if (!res.ok) {
             const errData = await res.text();
             throw new Error(`Anthropic API error: ${res.status} - ${errData}`);
          }
          const data = await res.json();
          aiResponse = data.content[0].text;
          successfulProvider = provider.name;
          break; // Success!
        }
        else if (nameLower.includes('gemini') || nameLower.includes('germini') || nameLower.includes('google')) {
          // Use Gemini's OpenAI-compatible endpoint
          const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${provider.api_key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
              ]
            }),
          });
          
          if (!res.ok) {
             const errData = await res.text();
             throw new Error(`Gemini API error: ${res.status} - ${errData}`);
          }
          const data = await res.json();
          aiResponse = data.choices[0].message.content;
          if (!aiResponse) throw new Error('Invalid Gemini response format');
          successfulProvider = provider.name;
          break; // Success!
        }
        else {
           throw new Error(`Unsupported provider: ${provider.name}`);
        }
      } catch (e: any) {
        console.error(`Provider ${provider.name} failed:`, e);
        providerErrors.push(`${provider.name} failed: ${e.message || e}`);
        // Continue to the next provider
      }
    }

    if (!aiResponse || !successfulProvider) {
      throw new Error('All AI providers failed: ' + providerErrors.join(' | '));
    }

    // 3. Increment Usage Counter
    const providerToUpdate = providers.find(p => p.name === successfulProvider);
    if (providerToUpdate) {
       const now = new Date();
       let newUsage = (providerToUpdate.usage_count || 0) + 1;
       
       if (providerToUpdate.last_used_at) {
          const lastUsed = new Date(providerToUpdate.last_used_at);
          if (lastUsed.getMonth() !== now.getMonth() || lastUsed.getFullYear() !== now.getFullYear()) {
             newUsage = 1; // Reset to 1 for the new month
          }
       }

       await supabaseService.from('ai_providers')
          .update({ 
             usage_count: newUsage,
             last_used_at: now.toISOString()
          })
          .eq('id', providerToUpdate.id);
    }

    // 4. Insert AI response into messages table (only if conversationId is provided)
    if (conversationId) {
      const { data: aiUser } = await supabaseService
        .from('users')
        .select('id')
        .eq('email', 'ai@crm.local')
        .single();
        
      if (aiUser?.id) {
         await supabaseService.from('messages').insert({
            conversation_id: conversationId,
            sender_id: aiUser.id,
            content: aiResponse,
            type: 'text'
         });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        response: aiResponse, 
        provider: successfulProvider 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
