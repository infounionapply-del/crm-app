import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase URL or Key in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Calling chat-ai edge function about users...");
  const { data: user } = await supabase.from('users').select('id').limit(1).single();
  const userId = user ? user.id : "b212f7a9-51ab-40a2-a0ce-5ab6cd4e2a8c";
  
  const { data, error } = await supabase.functions.invoke('chat-ai', {
    body: {
      message: "Who are the system users?",
      userId: userId
    }
  });

  if (error) {
    console.error("Error from Edge Function:", error.message || error);
    if (error.context) {
        const text = await error.context.text();
        console.error("Error Response Body:", text);
    }
  } else {
    console.log("Success:", data);
  }
}

test();
