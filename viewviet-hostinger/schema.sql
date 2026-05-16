-- ViewViet Database Schema
-- Run once against your PostgreSQL database before starting the app

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  display_name TEXT,
  avatar_url TEXT,
  preferred_lang TEXT DEFAULT 'zh',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS words (
  id SERIAL PRIMARY KEY,
  language_code TEXT NOT NULL,
  word TEXT NOT NULL,
  pronunciation TEXT,
  meaning_zh TEXT,
  meaning_en TEXT,
  meaning_vi TEXT,
  category TEXT,
  scene_tag TEXT,
  audio_url TEXT,
  image_url TEXT,
  example_sentence TEXT,
  example_translation TEXT,
  difficulty INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scene_sentences (
  id SERIAL PRIMARY KEY,
  language_code TEXT NOT NULL,
  scene_name TEXT NOT NULL,
  sentence TEXT NOT NULL,
  pronunciation TEXT,
  translation_zh TEXT,
  translation_en TEXT,
  translation_vi TEXT,
  audio_url TEXT,
  video_url TEXT,
  difficulty INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complex_sentences (
  id SERIAL PRIMARY KEY,
  language_code TEXT NOT NULL,
  sentence TEXT NOT NULL,
  pronunciation TEXT,
  translation_zh TEXT,
  translation_en TEXT,
  translation_vi TEXT,
  grammar_notes TEXT,
  context TEXT,
  audio_url TEXT,
  video_url TEXT,
  difficulty INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_guides (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  title_local TEXT,
  title_en TEXT,
  country TEXT,
  city TEXT,
  category TEXT,
  content TEXT,
  cover_image TEXT,
  budget_range TEXT,
  map_embed TEXT,
  summary TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  title_vn TEXT,
  title_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  summary TEXT,
  category TEXT,
  country TEXT,
  tags TEXT[],
  cover_image TEXT,
  video_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lawyers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  name_vi TEXT,
  title TEXT,
  law_firm TEXT,
  country TEXT,
  city TEXT,
  photo TEXT,
  bio TEXT,
  bio_en TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  wechat TEXT,
  specialties TEXT[],
  languages TEXT[],
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  location TEXT,
  map_link TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  max_participants INTEGER,
  current_participants INTEGER NOT NULL DEFAULT 0,
  organizer_name TEXT,
  organizer_contact TEXT,
  cover_image TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
