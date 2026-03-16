-- 1. Table schema
-- IMPORTANT: If your table was created before, run this command manually in Supabase FIRST:
-- DROP TABLE public.leaderboard;
-- This ensures the 'id' column is a clean UUID type without any old defaults.

CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  ip text, 
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Security
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 3. Purely Secure Policies
DROP POLICY IF EXISTS "Public can view leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.leaderboard;
DROP POLICY IF EXISTS "Users can update their own record" ON public.leaderboard;

-- SELECT is public
CREATE POLICY "Public can view leaderboard" 
ON public.leaderboard FOR SELECT 
USING (true);

-- INSERT: Check that the record's ID matches the authenticated user's ID
CREATE POLICY "Users can insert their own record" 
ON public.leaderboard FOR INSERT 
TO anon, authenticated
WITH CHECK ( (auth.uid())::uuid = (id)::uuid );

-- UPDATE: Check that the record's ID matches the authenticated user's ID
CREATE POLICY "Users can update their own record" 
ON public.leaderboard FOR UPDATE 
TO anon, authenticated
USING ( (auth.uid())::uuid = (id)::uuid )
WITH CHECK ( (auth.uid())::uuid = (id)::uuid );

-- 4. Permissions
GRANT ALL ON TABLE public.leaderboard TO anon;
GRANT ALL ON TABLE public.leaderboard TO authenticated;
GRANT ALL ON TABLE public.leaderboard TO service_role;
