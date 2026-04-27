const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  supabase.from('approvals').select('*').then(res => {
    console.log(JSON.stringify(res.data, null, 2));
  }).catch(e => console.error(e));
} else {
  console.log('No supabase config found');
}
