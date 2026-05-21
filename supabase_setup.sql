-- =========================================================================
-- MEMORYFLIX - SUPABASE DATABASE SCHEMA INITIALIZATION SCRIPT
-- Run this script in the Supabase SQL Editor (https://supabase.com)
-- to create all necessary tables, constraints, indexes, and disable RLS.
-- =========================================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Create Seasons Table
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL
);

-- 4. Create Episodes Table
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    media_url TEXT NOT NULL,
    media_type VARCHAR(50) NOT NULL, -- "video" or "photo"
    episode_number INTEGER NOT NULL,
    memory_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Create My List (Bookmarks) Table
CREATE TABLE IF NOT EXISTS public.my_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT my_list_profile_season_unique UNIQUE (profile_id, season_id)
);

-- =========================================================================
-- OPTIMIZATION INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seasons_profile_id ON public.seasons(profile_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON public.episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_mylist_profile_id ON public.my_list(profile_id);
CREATE INDEX IF NOT EXISTS idx_mylist_season_id ON public.my_list(season_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
-- Disable RLS to allow direct CRUD operations from the application APIs
-- =========================================================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_list DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- RE-ENABLE REPLICATION / SCHEMA CACHE UPDATE
-- (In case PostgREST schema cache needs a nudge)
-- NOTIFY pgrst, 'reload schema';
-- =========================================================================
