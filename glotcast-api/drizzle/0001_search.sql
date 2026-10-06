-- Search (GET /v1/search): case- and accent-insensitive ILIKE over names, titles and descriptions, served by
-- trigram indexes. Supabase allows unaccent and pg_trgm and installs extensions in the `extensions` schema; a
-- local database has no such schema, so they go to the default one. Either way the objects below name the
-- schema the extension actually lives in, so they never depend on search_path.
DO $$
DECLARE
  target text := CASE WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN 'extensions' ELSE 'public' END;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
    EXECUTE format('CREATE EXTENSION unaccent WITH SCHEMA %I', target);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE format('CREATE EXTENSION pg_trgm WITH SCHEMA %I', target);
  END IF;
END $$;
--> statement-breakpoint
-- unaccent() is only STABLE (it reads a dictionary from search_path); the two-argument form with a schema-qualified
-- dictionary is safe to declare IMMUTABLE, which an index expression needs.
DO $$
DECLARE
  s text := (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'unaccent');
BEGIN
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION app.search_text(value text) RETURNS text
       LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
       AS $f$ SELECT lower(%1$I.unaccent(%2$L::regdictionary, value)) $f$',
    s, s || '.unaccent');
END $$;
--> statement-breakpoint
DO $$
DECLARE
  s text := (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm');
BEGIN
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS podcasts_search_idx ON app.podcasts
       USING gin (app.search_text(name || '' '' || coalesce(description, '''')) %I.gin_trgm_ops)', s);
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS episodes_search_idx ON app.episodes
       USING gin (app.search_text(title || '' '' || coalesce(description, '''')) %I.gin_trgm_ops)', s);
END $$;
