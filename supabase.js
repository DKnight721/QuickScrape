// supabase.js

const SUPABASE_URL = "https://ihvsbgsclyozusgcqixn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodnNiZ3NjbHlvenVzZ2NxaXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1OTE3NjcsImV4cCI6MjA0MjE2Nzc2N30.7Z5xVVCx98Udao0-fZLc2GmmzbP7uEkSVKoUS14t36o";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
