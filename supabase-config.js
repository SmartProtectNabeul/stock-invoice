// Supabase Configuration
// Replace these with your actual Supabase credentials from https://app.supabase.com

const SUPABASE_URL = 'https://zcxuzukzmqkywdxttgld.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeHV6dWt6bXFreXdkeHR0Z2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzU4OTQsImV4cCI6MjA5MjExMTg5NH0.rPr1vngXSG8mZqfoFOK_H-xt_OIq9GjCxbvEtiIJXqE';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.supabaseClient = supabaseClient;
