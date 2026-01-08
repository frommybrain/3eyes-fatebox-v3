// lib/supabase.js
// Supabase client configuration for DegenBox platform

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUB_KEY || process.env.SUPABASE_PUB_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables. Check .env.local file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false, // We're using wallet signatures, not Supabase auth
    },
    realtime: {
        params: {
            eventsPerSecond: 10, // Rate limit realtime updates
        }
    }
});

// Helper: Check Supabase connection
export async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('super_admin_config')
            .select('network, is_production')
            .single();

        if (error) throw error;

        console.log('✅ Supabase connected:', data);
        return { connected: true, data };
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
        return { connected: false, error: error.message };
    }
}
