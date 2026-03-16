-- 1. Create table (id is uuid, maps to Supabase Auth UID)
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid PRIMARY KEY, -- No default gen_random_uuid(), we'll use Auth UID
  username text UNIQUE NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  ip text, 
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 3. Define Policies

-- Allow anyone to read the leaderboard
CREATE POLICY "Public can view leaderboard" 
ON public.leaderboard FOR SELECT 
USING (true);

-- Allow authenticated users to insert their own record
CREATE POLICY "Users can insert their own record" 
ON public.leaderboard FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own score
CREATE POLICY "Users can update their own record" 
ON public.leaderboard FOR UPDATE 
USING (auth.uid() = id);

-- 4. Grant basic permissions (RLS still filters these)
GRANT SELECT ON TABLE public.leaderboard TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.leaderboard TO authenticated;
