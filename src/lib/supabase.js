import { createClient } from '@supabase/supabase-js';

// Using the Supabase project keys
const supabaseUrl = 'https://qoaalurplzwxoksmnnxv.supabase.co';
const supabaseAnonKey = 'sb_publishable_dWJgcodhgImGq1gznJrz6A_U9Gkyg9S';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
