-- 1. Create the leaderboard table
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Turn off Row Level Security (RLS) entirely so the public game can read/write to it freely
ALTER TABLE public.leaderboard DISABLE ROW LEVEL SECURITY;

-- 3. (Optional but good practice) Explicitly grant permissions to the anon role 
GRANT ALL ON TABLE public.leaderboard TO anon;
GRANT ALL ON TABLE public.leaderboard TO authenticated;
