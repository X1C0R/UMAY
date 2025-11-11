import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://pyubngdxtievmlwlbebg.supabase.co"
const supabasePublishableKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dWJuZ2R4dGlldm1sd2xiZWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NTQ5MjcsImV4cCI6MjA3ODQzMDkyN30.5LMcQZFdqm8k5i7FbB0vqBQP3FEaYghrVwtFzVtUWh8"
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})