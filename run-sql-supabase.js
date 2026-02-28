const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or another Supabase key) before running this script.'
  );
  process.exit(1);
}

const sqlFiles = ['./scripts/schema.sql'];

async function runSqlFiles() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Starting SQL execution...\n');

  for (const sqlFile of sqlFiles) {
    const filePath = path.join(__dirname, sqlFile);

    console.log(`Executing: ${sqlFile}`);

    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}\n`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      const { error } = await supabase.rpc('exec_sql', { sql }).catch((err) => {
        return { error: err, data: null };
      });

      if (error) {
        console.log(`Could not run ${sqlFile} via RPC; run it in Supabase SQL Editor.`);
      } else {
        console.log(`${sqlFile} executed successfully\n`);
      }
    } catch (err) {
      console.error(`Error executing ${sqlFile}:`);
      console.error(err.message);
      console.error('');
    }
  }

  console.log('\nRun manually in Supabase dashboard if RPC is unavailable.');
}

runSqlFiles();
