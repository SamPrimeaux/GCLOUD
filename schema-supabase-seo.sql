-- Supabase / Postgres SEO Meta Table
-- Run this in Supabase SQL editor for full-featured SEO management

-- Enable UUID + vector support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";    -- for embeddings (optional)

-- Core SEO / Meta table
CREATE TABLE IF NOT EXISTS public.seo_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Canonical identifier for the thing (page, route, app, etc.)
  url              text NOT NULL UNIQUE,       -- e.g. 'https://meauxbility.org/'
  title            text,                       -- <title> or h1
  description      text,                       -- meta description
  meta_robots      text,                       -- e.g. 'index,follow'
  canonical_url    text,                       -- if different from url

  -- Rich metadata blobs
  open_graph       jsonb,                      -- og:title, og:image, etc.
  twitter_card     jsonb,                      -- twitter:card, twitter:title, etc.
  structured_data  jsonb,                      -- schema.org JSON-LD

  -- Classification
  language     text,                           -- 'en', etc.
  locale       text,                           -- 'en-US', etc.
  tags         text[],                         -- ['nonprofit','sci','trauma','meauxbility']
  source       text,                           -- 'meauxos', 'cms', 'manual', 'import'
  notes        text,                           -- human notes

  -- Publishing state
  publish_date timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  seo_score    numeric,                        -- optional scoring field

  -- Optional embedding column for RAG / semantic search
  embedding    vector(1536)                    -- comment out if not using pgvector
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_seo_meta_url
  ON public.seo_meta (url);

CREATE INDEX IF NOT EXISTS idx_seo_meta_is_published
  ON public.seo_meta (is_published, publish_date);

CREATE INDEX IF NOT EXISTS idx_seo_meta_tags
  ON public.seo_meta USING gin (tags);

CREATE INDEX IF NOT EXISTS idx_seo_meta_structured_data
  ON public.seo_meta USING gin (structured_data);

-- Keep updated_at fresh automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seo_meta_set_updated_at
  ON public.seo_meta;

CREATE TRIGGER trg_seo_meta_set_updated_at
BEFORE UPDATE ON public.seo_meta
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Example row for Meauxbility.org homepage
INSERT INTO public.seo_meta (
  url,
  title,
  description,
  meta_robots,
  canonical_url,
  language,
  locale,
  tags,
  source,
  is_published,
  publish_date,
  open_graph,
  twitter_card,
  structured_data
) VALUES (
  'https://meauxbility.org/',
  'Meauxbility – More Options. More Access. More Life.',
  'Meauxbility is a survivor-led nonprofit helping people with spinal cord injuries access treatments, equipment, and community support.',
  'index,follow',
  'https://meauxbility.org/',
  'en',
  'en-US',
  ARRAY['nonprofit','spinal-cord-injury','trauma','recovery','meauxbility'],
  'meauxos',
  true,
  now(),
  jsonb_build_object(
    'og:title', 'Meauxbility – More Options. More Access. More Life.',
    'og:description', 'Survivor-led nonprofit helping people with spinal cord injuries.',
    'og:type', 'website',
    'og:url', 'https://meauxbility.org/',
    'og:image', 'https://meauxbility.org/og-image.jpg'
  ),
  jsonb_build_object(
    'twitter:card', 'summary_large_image',
    'twitter:title', 'Meauxbility – More Options. More Access. More Life.',
    'twitter:description', 'Survivor-led nonprofit helping people with spinal cord injuries.',
    'twitter:image', 'https://meauxbility.org/twitter-card.jpg'
  ),
  jsonb_build_object(
    '@context', 'https://schema.org',
    '@type', 'Organization',
    'name', 'Meauxbility',
    'url', 'https://meauxbility.org/',
    'logo', 'https://meauxbility.org/logo.png',
    'description', 'Survivor-led nonprofit helping people with spinal cord injuries access treatments, equipment, and community support.',
    'sameAs', jsonb_build_array(
      'https://twitter.com/meauxbility',
      'https://facebook.com/meauxbility'
    )
  )
)
ON CONFLICT (url) DO NOTHING;
