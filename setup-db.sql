-- ViewViet Database Schema Setup
-- Run this against Supabase PostgreSQL

-- Drop existing tables if any (clean slate)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS lawyers CASCADE;
DROP TABLE IF EXISTS travel_guides CASCADE;
DROP TABLE IF EXISTS legal_documents CASCADE;
DROP TABLE IF EXISTS legal_articles CASCADE;
DROP TABLE IF EXISTS complex_sentences CASCADE;
DROP TABLE IF EXISTS scene_sentences CASCADE;
DROP TABLE IF EXISTS words CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Create enum
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Users table
CREATE TABLE users (
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

-- Words table
CREATE TABLE words (
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
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scene sentences table
CREATE TABLE scene_sentences (
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
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Complex sentences table
CREATE TABLE complex_sentences (
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
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legal articles table
CREATE TABLE legal_articles (
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
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legal documents table
CREATE TABLE legal_documents (
  id SERIAL PRIMARY KEY,
  title_zh TEXT NOT NULL,
  title_en TEXT,
  title_local TEXT,
  slug TEXT NOT NULL UNIQUE,
  document_number TEXT,
  document_type TEXT,
  country TEXT NOT NULL,
  category TEXT,
  content_zh TEXT,
  content_en TEXT,
  content_local TEXT,
  issue_date TIMESTAMPTZ,
  effective_date TIMESTAMPTZ,
  issuing_body TEXT,
  tags TEXT[],
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Travel guides table
CREATE TABLE travel_guides (
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
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lawyers table
CREATE TABLE lawyers (
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
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
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
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site settings table
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL DEFAULT '',
  description TEXT,
  field_type TEXT NOT NULL DEFAULT 'text',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create default admin user (password: admin123)
-- bcrypt hash for 'admin123'
INSERT INTO users (username, email, password_hash, role, display_name)
VALUES ('admin', 'admin@viewviet.com', '$2b$10$rQZ8JFHG3YI7fJKHB0f3AeQwE7x5X5Z5X5Z5X5Z5X5Z5X5Z5X5Z5u', 'admin', 'Administrator')
ON CONFLICT (username) DO NOTHING;
