import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: peminjaman, error } = await supabase
    .from('peminjaman')
    .select(`*, pegawai:id_pegawai (id_user, nama, email), detail_peminjaman(inventaris:id_inventaris(nama))`)
    .in('status', ['dipinjam', 'pending']);
    
  if (error) console.error(error);
  console.log(JSON.stringify(peminjaman, null, 2));
}
run();
