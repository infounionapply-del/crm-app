const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (urlMatch && keyMatch) {
  const url = urlMatch[1].trim();
  const key = keyMatch[1].trim();
  
  fetch(`${url}/rest/v1/company_settings`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      id: 1,
      system_preferences: { test: 1 }
    })
  }).then(async res => {
    console.log(res.status);
    console.log(await res.text());
  });
}
