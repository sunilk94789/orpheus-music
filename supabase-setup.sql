-- ════════════════════════════════════════════════════════════
--  ORPHEUS — Supabase Database Setup
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ════════════════════════════════════════════════════════════

-- ── 1. Profiles table (linked to Supabase Auth) ──────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  fname       TEXT,
  lname       TEXT,
  dob         DATE,
  gender      TEXT,
  country     TEXT,
  lang        TEXT DEFAULT 'en',
  genres      TEXT[] DEFAULT '{}',
  avatar      TEXT,
  provider    TEXT DEFAULT 'email',   -- 'email', 'google', or 'both'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Songs table (single source of truth for all songs) ────
--  Store each song ONCE. Assign genre, album, artist as metadata.
--  Upload audio + cover files to a single "media" Storage bucket,
--  then paste their public URLs into audio_url and cover_url.
CREATE TABLE IF NOT EXISTS songs (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  artist       TEXT NOT NULL,
  album        TEXT,
  genre        TEXT,
  cover_url    TEXT,          -- public URL from Supabase Storage (media bucket)
  audio_url    TEXT NOT NULL, -- public URL from Supabase Storage (media bucket)
  duration_sec INT,           -- duration in seconds (optional, filled by player)
  track_number INT,           -- position within the album
  release_year INT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Liked songs table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS liked_songs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id     BIGINT REFERENCES songs(id) ON DELETE CASCADE,
  -- Fallback fields for Spotify-sourced likes (no songs row)
  track_id    TEXT,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  album       TEXT,
  cover_url   TEXT,
  preview_url TEXT,
  spotify_url TEXT,
  liked_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id),
  UNIQUE(user_id, track_id)
);

-- ── 4. Listening history table ───────────────────────────────
CREATE TABLE IF NOT EXISTS play_history (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id     BIGINT REFERENCES songs(id) ON DELETE CASCADE,
  track_id    TEXT,           -- for Spotify-sourced tracks
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  played_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Genre icons table ─────────────────────────────────────
--  Maps a genre name to an icon image URL stored in the media bucket.
CREATE TABLE IF NOT EXISTS genre_icons (
  id         BIGSERIAL PRIMARY KEY,
  genre      TEXT UNIQUE NOT NULL,
  icon_url   TEXT NOT NULL
);

-- ── 6. Row Level Security (RLS) ──────────────────────────────
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_songs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_icons  ENABLE ROW LEVEL SECURITY;

-- Profiles: user can read/write their own row
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- Profiles: allow unauthenticated lookup of username + email only
-- (needed so the login page can resolve a username → email before signInWithPassword)
CREATE POLICY "Public can look up username and email for login"
  ON profiles FOR SELECT
  USING (true)
  WITH CHECK (false); -- read-only: no insert/update via this policy
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE USING (auth.uid() = id);

-- Songs: public read (anyone can browse), only service role can insert
CREATE POLICY "Public can read songs"
  ON songs FOR SELECT USING (true);

-- Genre icons: public read
CREATE POLICY "Public can read genre icons"
  ON genre_icons FOR SELECT USING (true);

-- Liked songs: user manages their own
CREATE POLICY "Users manage own liked songs"
  ON liked_songs FOR ALL USING (auth.uid() = user_id);

-- Play history: user manages their own
CREATE POLICY "Users manage own play history"
  ON play_history FOR ALL USING (auth.uid() = user_id);

-- ── 7. Helpful indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_songs_genre  ON songs(genre);
CREATE INDEX IF NOT EXISTS idx_songs_album  ON songs(album);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);

-- ── 8. Auto-create profile on signup ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta JSONB := NEW.raw_user_meta_data;
  _provider TEXT := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
BEGIN
  INSERT INTO public.profiles (
    id, email, username,
    fname, lname, dob, gender, country, lang, genres, avatar, provider
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'username', split_part(NEW.email, '@', 1)),
    meta->>'fname',
    meta->>'lname',
    NULLIF(meta->>'dob', '')::DATE,
    meta->>'gender',
    meta->>'country',
    COALESCE(meta->>'lang', 'en'),
    CASE
      WHEN meta->'genres' IS NOT NULL
      THEN ARRAY(SELECT jsonb_array_elements_text(meta->'genres'))
      ELSE '{}'::TEXT[]
    END,
    meta->>'avatar',
    _provider
  )
  ON CONFLICT (id) DO UPDATE SET
    fname    = COALESCE(EXCLUDED.fname,    profiles.fname),
    lname    = COALESCE(EXCLUDED.lname,    profiles.lname),
    dob      = COALESCE(EXCLUDED.dob,      profiles.dob),
    gender   = COALESCE(EXCLUDED.gender,   profiles.gender),
    country  = COALESCE(EXCLUDED.country,  profiles.country),
    lang     = COALESCE(EXCLUDED.lang,     profiles.lang),
    genres   = CASE WHEN array_length(EXCLUDED.genres, 1) > 0 THEN EXCLUDED.genres ELSE profiles.genres END,
    avatar   = COALESCE(EXCLUDED.avatar,   profiles.avatar),
    provider = COALESCE(EXCLUDED.provider, profiles.provider);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ════════════════════════════════════════════════════════════
--  HOW TO ADD SONGS
--  1. Upload your audio + cover files to the "media" Storage bucket
--     (create it in Supabase Dashboard → Storage → New Bucket → public)
--  2. Copy the public URLs (right-click file → Get URL)
--  3. Insert rows like:
--
--  INSERT INTO songs (title, artist, album, genre, cover_url, audio_url, track_number)
--  VALUES
--    ('Blinding Lights', 'The Weeknd', 'After Hours', 'Pop',
--     'https://zsnefaffxvktxbibmqaf.supabase.co/storage/v1/object/public/media/covers/blinding-lights.jpg',
--     'https://zsnefaffxvktxbibmqaf.supabase.co/storage/v1/object/public/media/audio/blinding-lights.mp3',
--     1),
--    ('Save Your Tears', 'The Weeknd', 'After Hours', 'Pop',
--     'https://...cover.jpg', 'https://...audio.mp3', 2);
--
--  To add genre icons:
--  INSERT INTO genre_icons (genre, icon_url) VALUES
--    ('Pop',   'https://...pop-icon.png'),
--    ('Hip-Hop', 'https://...hiphop-icon.png');
-- ════════════════════════════════════════════════════════════

