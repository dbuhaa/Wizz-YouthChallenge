CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  ip text, -- Added for IP-based account recovery
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration for users who already have the table:
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leaderboard' AND column_name='ip') THEN
    ALTER TABLE public.leaderboard ADD COLUMN ip text;
  END IF;
END $$;

-- 2. Turn off Row Level Security (RLS) entirely so the public game can read/write to it freely
ALTER TABLE public.leaderboard DISABLE ROW LEVEL SECURITY;

-- 3. (Optional but good practice) Explicitly grant permissions to the anon role 
GRANT ALL ON TABLE public.leaderboard TO anon;
GRANT ALL ON TABLE public.leaderboard TO authenticated;
