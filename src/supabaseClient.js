import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qjpavsatriftjtqwjlhu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGF2c2F0cmlmdGp0cXdqbGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg3NzYsImV4cCI6MjA4ODk5NDc3Nn0.kH2SHisWaTv-SkulxJ2CMSMgobs8qKz1T80ioK8Yy0Q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
