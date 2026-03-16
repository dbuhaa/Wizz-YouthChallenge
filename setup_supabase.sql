-- 1. Ensure table exists with correct ID type
-- Note: If you have an old table, you might need to run: DROP TABLE public.leaderboard; 
-- or manually change the 'id' column to UUID in the Supabase Dashboard.
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  ip text, 
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 3. Clean up and Define Policies
DROP POLICY IF EXISTS "Public can view leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.leaderboard;
DROP POLICY IF EXISTS "Users can update their own record" ON public.leaderboard;

-- Allow anyone to read the leaderboard
CREATE POLICY "Public can view leaderboard" 
ON public.leaderboard FOR SELECT 
USING (true);

-- Allow both anon and authenticated users to insert/update IF the ID matches their Auth UID
CREATE POLICY "Users can insert their own record" 
ON public.leaderboard FOR INSERT 
TO anon, authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own record" 
ON public.leaderboard FOR UPDATE 
TO anon, authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Grant basic permissions
GRANT SELECT ON TABLE public.leaderboard TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.leaderboard TO anon, authenticated;
