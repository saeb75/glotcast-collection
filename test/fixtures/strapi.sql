-- The legacy Strapi v5 + glotcast-vocab tables (schema public), as `migrate-strapi` and the legacy claim read them.
--
-- Tables and rows were produced by the real glotcast-panel (Strapi 5.33.1): a copy of the project was booted once
-- against an empty local Postgres (which created these tables), then content was written through Strapi's own
-- Document Service (create / update / publish), so draft and published rows, link tables (`*_lnk`, `*_ord`) and
-- component rows (`episodes_cmps`, `components_shared_levels`) are exactly what Strapi stores. Timestamps were moved
-- to 2026-09-01. Only the tables the API reads are kept (no FKs, indexes or sequences).
--
-- Documents:
--   podcasts  wcjzu12yhhr7w2ea6oewhemm "Around the World" (published row 2, later edited as a draft: row 1)
--             gllrbi1ptagsovmj3m6d9kws "Café Science" (published row 4; cover = an uploaded file, relative URL)
--             i6vyw60qtmw5mjtndjb21co3 "Unreleased Show" (draft only)
--   episodes  ehfirmmax1jcmu6ix7w5o5fe "Lisbon Mornings"  levels "BG," "IN," "AD" (the AD transcript in ms)
--             lor0ghjo4ij52pku6jtcxuj6 "Porto Nights (edited)" (published, edited, republished: rows 3 + 5)
--             kbhvv3efuk9wx8oxzruvd9na "Quantum Coffee" levels AD, "IN," without audio, + hand-added below
--             wshbdxsbblvk5tc6ofw57f0d "Draft Episode" (draft only)
--   lists     editors-picks, short-listens; project-config: slider, home lists, explore lists
--   up_users  1 Ayse@Example.com (featureAccess, 2 subscriptions — linked to both draft and published podcast rows)
-- TABLES

CREATE TABLE IF NOT EXISTS public.categories (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    slug character varying(255),
    description text,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

CREATE TABLE IF NOT EXISTS public.components_shared_levels (
    id integer NOT NULL,
    level character varying(255),
    url character varying(255),
    transcript jsonb,
    description character varying(255)
);

CREATE TABLE IF NOT EXISTS public.episodes (
    id integer NOT NULL,
    document_id character varying(255),
    title character varying(255),
    description character varying(255),
    "time" character varying(255),
    "create" timestamp(6) without time zone,
    image character varying(255),
    episode_number integer,
    is_pro boolean,
    banner_url character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

CREATE TABLE IF NOT EXISTS public.episodes_cmps (
    id integer NOT NULL,
    entity_id integer,
    cmp_id integer,
    component_type character varying(255),
    field character varying(255),
    "order" double precision
);

CREATE TABLE IF NOT EXISTS public.episodes_podcast_lnk (
    id integer NOT NULL,
    episode_id integer,
    podcast_id integer
);

CREATE TABLE IF NOT EXISTS public.files (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    alternative_text text,
    caption text,
    width integer,
    height integer,
    formats jsonb,
    hash character varying(255),
    ext character varying(255),
    mime character varying(255),
    size numeric(10,2),
    url text,
    preview_url text,
    provider character varying(255),
    provider_metadata jsonb,
    folder_path character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

CREATE TABLE IF NOT EXISTS public.files_related_mph (
    id integer NOT NULL,
    file_id integer,
    related_id integer,
    related_type character varying(255),
    field character varying(255),
    "order" double precision
);

CREATE TABLE IF NOT EXISTS public.lists (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    description character varying(255),
    slug character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

CREATE TABLE IF NOT EXISTS public.lists_episodes_lnk (
    id integer NOT NULL,
    list_id integer,
    episode_id integer,
    episode_ord double precision
);

CREATE TABLE IF NOT EXISTS public.podcasts (
    id integer NOT NULL,
    document_id character varying(255),
    name character varying(255),
    description text,
    image_url character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

CREATE TABLE IF NOT EXISTS public.podcasts_categories_lnk (
    id integer NOT NULL,
    podcast_id integer,
    category_id integer,
    category_ord double precision,
    podcast_ord double precision
);

CREATE TABLE IF NOT EXISTS public.project_configs (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

CREATE TABLE IF NOT EXISTS public.project_configs_explore_lists_lnk (
    id integer NOT NULL,
    project_config_id integer,
    list_id integer,
    list_ord double precision
);

CREATE TABLE IF NOT EXISTS public.project_configs_home_lists_lnk (
    id integer NOT NULL,
    project_config_id integer,
    list_id integer,
    list_ord double precision
);

CREATE TABLE IF NOT EXISTS public.project_configs_slider_lnk (
    id integer NOT NULL,
    project_config_id integer,
    episode_id integer,
    episode_ord double precision
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id integer NOT NULL,
    document_id character varying(255),
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

CREATE TABLE IF NOT EXISTS public.subscriptions_podcast_lnk (
    id integer NOT NULL,
    subscription_id integer,
    podcast_id integer
);

CREATE TABLE IF NOT EXISTS public.subscriptions_user_lnk (
    id integer NOT NULL,
    subscription_id integer,
    user_id integer
);

CREATE TABLE IF NOT EXISTS public.up_users (
    id integer NOT NULL,
    document_id character varying(255),
    username character varying(255),
    email character varying(255),
    provider character varying(255),
    password character varying(255),
    reset_password_token character varying(255),
    confirmation_token character varying(255),
    confirmed boolean,
    blocked boolean,
    is_pro boolean,
    feature_access boolean,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    published_at timestamp(6) without time zone,
    created_by_id integer,
    updated_by_id integer,
    locale character varying(255)
);

-- PRIMARY KEYS

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.components_shared_levels
    ADD CONSTRAINT components_shared_levels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.episodes_cmps
    ADD CONSTRAINT episodes_cmps_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.episodes
    ADD CONSTRAINT episodes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.episodes_podcast_lnk
    ADD CONSTRAINT episodes_podcast_lnk_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.files_related_mph
    ADD CONSTRAINT files_related_mph_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lists_episodes_lnk
    ADD CONSTRAINT lists_episodes_lnk_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.podcasts_categories_lnk
    ADD CONSTRAINT podcasts_categories_lnk_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.podcasts
    ADD CONSTRAINT podcasts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_configs_explore_lists_lnk
    ADD CONSTRAINT project_configs_explore_lists_lnk_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_configs_home_lists_lnk
    ADD CONSTRAINT project_configs_home_lists_lnk_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_configs
    ADD CONSTRAINT project_configs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_configs_slider_lnk
    ADD CONSTRAINT project_configs_slider_lnk_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscriptions_podcast_lnk
    ADD CONSTRAINT subscriptions_podcast_lnk_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscriptions_user_lnk
    ADD CONSTRAINT subscriptions_user_lnk_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.up_users
    ADD CONSTRAINT up_users_pkey PRIMARY KEY (id);

-- ROWS

INSERT INTO public.categories VALUES
	(1, 'wp1wpckpnf04o9bpy5s0l797', 'Travel', 'travel', 'Trips', '2026-09-01 18:47:20.804', '2026-09-01 18:47:20.804', '2026-09-01 18:47:20.801', NULL, NULL, NULL),
	(2, 'nnwq71m74rhawhv4hirmpp07', 'Science', 'science', NULL, '2026-09-01 18:47:20.808', '2026-09-01 18:47:20.808', '2026-09-01 18:47:20.806', NULL, NULL, NULL);

INSERT INTO public.components_shared_levels VALUES
	(1, 'BG,', 'https://cdn.example.com/e1-bg.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'BG, description'),
	(2, 'IN,', 'https://cdn.example.com/e1-in.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'IN, description'),
	(3, 'AD', 'https://cdn.example.com/e1-ad.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2500]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2500, 61250]}]}', 'AD description'),
	(4, 'BG,', 'https://cdn.example.com/e1-bg.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'BG, description'),
	(5, 'IN,', 'https://cdn.example.com/e1-in.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'IN, description'),
	(6, 'AD', 'https://cdn.example.com/e1-ad.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2500]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2500, 61250]}]}', 'AD description'),
	(7, 'BG,', 'https://cdn.example.com/e2-bg.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'BG, description'),
	(9, 'BG,', 'https://cdn.example.com/e2-bg.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'BG, description'),
	(10, 'AD', 'https://cdn.example.com/e3-ad.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'AD description'),
	(11, 'IN,', '', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'IN, description'),
	(12, 'AD', 'https://cdn.example.com/e3-ad.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'AD description'),
	(13, 'IN,', '', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'IN, description'),
	(14, 'BG,', 'https://cdn.example.com/d.mp3', '{"text": "Hello there. Welcome back.", "chunks": [{"text": " Hello there.", "speaker": "A", "timestamp": [0, 2.5]}, {"text": "Welcome back.", "speaker": "B", "timestamp": [2.5, 61.25]}]}', 'BG, description');

INSERT INTO public.episodes VALUES
	(1, 'ehfirmmax1jcmu6ix7w5o5fe', 'Lisbon Mornings', 'A walk', NULL, '2026-01-10 11:00:00', 'https://cdn.example.com/e1.png', 1, false, 'https://cdn.example.com/e1-banner.png', '2026-09-01 18:47:20.855', '2026-09-01 18:47:20.855', NULL, NULL, NULL, NULL),
	(2, 'ehfirmmax1jcmu6ix7w5o5fe', 'Lisbon Mornings', 'A walk', NULL, '2026-01-10 11:00:00', 'https://cdn.example.com/e1.png', 1, false, 'https://cdn.example.com/e1-banner.png', '2026-09-01 18:47:20.855', '2026-09-01 18:47:20.855', '2026-09-01 18:47:20.862', NULL, NULL, NULL),
	(3, 'lor0ghjo4ij52pku6jtcxuj6', 'Porto Nights (edited)', 'Evening', NULL, NULL, 'https://cdn.example.com/e2.png', 2, true, NULL, '2026-09-01 18:47:20.87', '2026-09-01 18:47:20.88', NULL, NULL, NULL, NULL),
	(5, 'lor0ghjo4ij52pku6jtcxuj6', 'Porto Nights (edited)', 'Evening', NULL, NULL, 'https://cdn.example.com/e2.png', 2, true, NULL, '2026-09-01 18:47:20.87', '2026-09-01 18:47:20.88', '2026-09-01 18:47:20.884', NULL, NULL, NULL),
	(6, 'kbhvv3efuk9wx8oxzruvd9na', 'Quantum Coffee', NULL, NULL, NULL, NULL, 1, true, NULL, '2026-09-01 18:47:20.891', '2026-09-01 18:47:20.891', NULL, NULL, NULL, NULL),
	(7, 'kbhvv3efuk9wx8oxzruvd9na', 'Quantum Coffee', NULL, NULL, NULL, NULL, 1, true, NULL, '2026-09-01 18:47:20.891', '2026-09-01 18:47:20.891', '2026-09-01 18:47:20.894', NULL, NULL, NULL),
	(8, 'wshbdxsbblvk5tc6ofw57f0d', 'Draft Episode', NULL, NULL, NULL, NULL, NULL, true, NULL, '2026-09-01 18:47:20.902', '2026-09-01 18:47:20.902', NULL, NULL, NULL, NULL);

INSERT INTO public.episodes_cmps VALUES
	(1, 1, 1, 'shared.level', 'Levels', 1),
	(2, 1, 2, 'shared.level', 'Levels', 2),
	(3, 1, 3, 'shared.level', 'Levels', 3),
	(4, 2, 4, 'shared.level', 'Levels', 1),
	(5, 2, 5, 'shared.level', 'Levels', 2),
	(6, 2, 6, 'shared.level', 'Levels', 3),
	(7, 3, 7, 'shared.level', 'Levels', 1),
	(9, 5, 9, 'shared.level', 'Levels', 1),
	(10, 6, 10, 'shared.level', 'Levels', 1),
	(11, 6, 11, 'shared.level', 'Levels', 2),
	(12, 7, 12, 'shared.level', 'Levels', 1),
	(13, 7, 13, 'shared.level', 'Levels', 2),
	(14, 8, 14, 'shared.level', 'Levels', 1);

INSERT INTO public.episodes_podcast_lnk VALUES
	(1, 1, 1),
	(2, 2, 2),
	(3, 3, 1),
	(5, 5, 2),
	(6, 6, 3),
	(7, 7, 4),
	(8, 8, 1);

INSERT INTO public.lists VALUES
	(1, 'dbxv3fapq0qticvs5cwwghte', 'Editor''s Picks', 'Our favourites', 'editors-picks', '2026-09-01 18:47:20.905', '2026-09-01 18:47:20.905', NULL, NULL, NULL, NULL),
	(2, 'dbxv3fapq0qticvs5cwwghte', 'Editor''s Picks', 'Our favourites', 'editors-picks', '2026-09-01 18:47:20.905', '2026-09-01 18:47:20.905', '2026-09-01 18:47:20.908', NULL, NULL, NULL),
	(3, 'kogdqlr9px5mx7xc0j5zkwwt', 'Short Listens', NULL, 'short-listens', '2026-09-01 18:47:20.913', '2026-09-01 18:47:20.913', NULL, NULL, NULL, NULL),
	(4, 'kogdqlr9px5mx7xc0j5zkwwt', 'Short Listens', NULL, 'short-listens', '2026-09-01 18:47:20.913', '2026-09-01 18:47:20.913', '2026-09-01 18:47:20.915', NULL, NULL, NULL);

INSERT INTO public.lists_episodes_lnk VALUES
	(1, 1, 6, 1),
	(2, 1, 1, 2),
	(3, 2, 7, 1),
	(4, 2, 2, 2),
	(5, 3, 3, 1),
	(6, 4, 5, 1);

INSERT INTO public.podcasts VALUES
	(2, 'wcjzu12yhhr7w2ea6oewhemm', 'Around the World', 'Travel stories', 'https://cdn.example.com/atw.png', '2026-09-01 18:47:20.812', '2026-09-01 18:47:20.812', '2026-09-01 18:47:20.818', NULL, NULL, NULL),
	(1, 'wcjzu12yhhr7w2ea6oewhemm', 'Around the World (draft edit)', 'Travel stories', 'https://cdn.example.com/atw.png', '2026-09-01 18:47:20.812', '2026-09-01 18:47:20.825', NULL, NULL, NULL, NULL),
	(3, 'gllrbi1ptagsovmj3m6d9kws', 'Café Science', 'Señor science', NULL, '2026-09-01 18:47:20.831', '2026-09-01 18:47:20.831', NULL, NULL, NULL, NULL),
	(4, 'gllrbi1ptagsovmj3m6d9kws', 'Café Science', 'Señor science', NULL, '2026-09-01 18:47:20.831', '2026-09-01 18:47:20.831', '2026-09-01 18:47:20.836', NULL, NULL, NULL),
	(5, 'i6vyw60qtmw5mjtndjb21co3', 'Unreleased Show', NULL, NULL, '2026-09-01 18:47:20.849', '2026-09-01 18:47:20.849', NULL, NULL, NULL, NULL);

INSERT INTO public.podcasts_categories_lnk VALUES
	(1, 1, 1, 1, 1),
	(2, 2, 1, 1, 2),
	(3, 3, 2, 1, 1),
	(4, 3, 1, 2, 3),
	(5, 4, 2, 1, 2),
	(6, 4, 1, 2, 4);

INSERT INTO public.project_configs VALUES
	(1, 'dz3al8yjb0y29hqcismy4r9c', '2026-09-01 18:47:20.921', '2026-09-01 18:47:20.921', NULL, NULL, NULL, NULL),
	(2, 'dz3al8yjb0y29hqcismy4r9c', '2026-09-01 18:47:20.921', '2026-09-01 18:47:20.921', '2026-09-01 18:47:20.925', NULL, NULL, NULL);

INSERT INTO public.project_configs_explore_lists_lnk VALUES
	(1, 1, 3, 1),
	(2, 2, 4, 1);

INSERT INTO public.project_configs_home_lists_lnk VALUES
	(1, 1, 1, 1),
	(2, 1, 3, 2),
	(3, 2, 2, 1),
	(4, 2, 4, 2);

INSERT INTO public.project_configs_slider_lnk VALUES
	(1, 1, 3, 1),
	(2, 1, 1, 2),
	(3, 2, 5, 1),
	(4, 2, 2, 2);

INSERT INTO public.subscriptions VALUES
	(1, 'pp2vvpqqxykyoda5gxmr0kkb', '2026-09-01 18:47:20.933', '2026-09-01 18:47:20.933', '2026-09-01 18:47:20.931', NULL, NULL, NULL),
	(2, 's2jqw79ngyz8ovefjhtec0hu', '2026-09-01 18:47:20.936', '2026-09-01 18:47:20.936', '2026-09-01 18:47:20.935', NULL, NULL, NULL);

INSERT INTO public.subscriptions_podcast_lnk VALUES
	(1, 1, 1),
	(2, 1, 2),
	(3, 2, 3),
	(4, 2, 4);

INSERT INTO public.subscriptions_user_lnk VALUES
	(1, 1, 1),
	(2, 2, 1);

INSERT INTO public.up_users VALUES
	(1, 'v3kik54jmpheo5prw7e51kde', 'legacy_ayse', 'Ayse@Example.com', 'google', NULL, NULL, NULL, true, false, NULL, true, '2026-09-01 18:47:20.929', '2026-09-01 18:47:20.929', '2026-09-01 18:47:20.929', NULL, NULL, NULL);

-- Hand-added edge cases (not producible through the Document Service, whose enum validation refuses them):
-- an old-style "Beginner," value with a transcript whose last chunk has no end, and a duplicate AD level.
INSERT INTO public.components_shared_levels VALUES
  (15, 'Beginner,', 'https://cdn.example.com/e3-bg.mp3',
   '{"chunks": [{"text": "Coffee first.", "speaker": null, "timestamp": [0.5, 3]}, {"text": "  Then quantum.  ", "timestamp": [3, null]}]}',
   NULL),
  (16, 'AD', 'https://cdn.example.com/e3-ad-duplicate.mp3', '{"chunks": []}', 'duplicate');
INSERT INTO public.episodes_cmps VALUES
  (15, 7, 15, 'shared.level', 'Levels', 3),
  (16, 7, 16, 'shared.level', 'Levels', 4);

-- Café Science's cover: an upload (local provider: relative URL), linked to its published row.
INSERT INTO public.files (id, document_id, name, hash, ext, mime, size, url, provider, created_at, updated_at, published_at)
VALUES (1, 'filedoc0000000000000001', 'cafe.png', 'cafe_science_abc', '.png', 'image/png', 12.5,
        '/uploads/cafe_science_abc.png', 'local', '2026-09-01 18:47:20', '2026-09-01 18:47:20', '2026-09-01 18:47:20');
INSERT INTO public.files_related_mph (id, file_id, related_id, related_type, field, "order")
VALUES (1, 1, 4, 'api::podcast.podcast', 'image', 1);

-- A second legacy account without data.
INSERT INTO public.up_users (id, document_id, username, email, provider, confirmed, blocked, is_pro, feature_access,
                             created_at, updated_at, published_at)
VALUES (2, 'userdoc0000000000000002', 'legacy_mehmet', 'mehmet@example.com', 'apple', true, false, NULL, false,
        '2026-09-01 10:00:00', '2026-09-01 10:00:00', '2026-09-01 10:00:00');

-- glotcast-vocab (Express service on the same database), keyed by the Strapi user id. Columns as its SQL uses them.
CREATE TABLE IF NOT EXISTS public.vocab_words (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  word text NOT NULL,
  meaning text,
  audio_url text,
  detail jsonb,
  language text DEFAULT 'tr',
  phonetic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word)
);
CREATE TABLE IF NOT EXISTS public.vocab_user_words (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  word_id integer NOT NULL REFERENCES public.vocab_words (id) ON DELETE CASCADE,
  box_number integer NOT NULL DEFAULT 1,
  next_review_date timestamptz,
  last_reviewed_at timestamptz,
  correct_count integer NOT NULL DEFAULT 0,
  incorrect_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);
INSERT INTO public.vocab_words (id, user_id, word, meaning, audio_url, detail, language, phonetic, created_at) VALUES
  (1, 1, 'serendipity', 'tesadüf', 'https://audio.example.com/serendipity.mp3',
   '[{"pos": "noun", "definitions": ["finding good things by chance"]}]', 'tr', '/ˌserənˈdɪpəti/', '2026-08-01 09:00:00+00'),
  (2, 1, 'run', 'koşmak', '', '[]', 'tr', '/rʌn/', '2026-08-02 09:00:00+00'),
  (3, 1, 'brave', 'cesur', NULL, NULL, 'tr', NULL, '2026-08-03 09:00:00+00'),
  (4, 2, 'other', 'diğer', NULL, NULL, 'tr', NULL, '2026-08-03 09:00:00+00');
INSERT INTO public.vocab_user_words (user_id, word_id, box_number, next_review_date, last_reviewed_at, correct_count, incorrect_count) VALUES
  (1, 1, 3, '2026-08-10 09:00:00+00', '2026-08-06 09:00:00+00', 2, 1),
  (1, 2, 1, '2026-08-03 09:00:00+00', NULL, 0, 0);
-- word 3 ("brave") has no Leitner row: it arrives in box 1, due now.
