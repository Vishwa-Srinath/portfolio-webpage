-- Seed Data for Portfolio Database
-- Purpose: Initial data to populate the database after all migrations are applied.
--          Run this AFTER `python run_migrations.py` succeeds.
--
-- Usage: Paste into Supabase Dashboard > SQL Editor, or run via psql:
--   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -f seed_data.sql
--
-- IMPORTANT: Replace all placeholder values (URLs, names, etc.) before running.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILE (singleton — insert exactly one row)
-- ─────────────────────────────────────────────────────────────────────────────
-- The unique index on _singleton prevents a second row from being inserted.
-- To UPDATE after initial seed: UPDATE public.profile SET full_name = '...' WHERE true;

insert into public.profile (
    full_name,
    role_line,
    bio_short,
    bio_long,
    headshot_url,
    resume_url,
    location,
    email_public,
    education,
    skills,
    timeline
) values (
    'Vishwa Srinath',
    'CS&E Undergraduate at University of Moratuwa · Builder · Writer',
    'I build things at the intersection of software, algorithms, and curiosity. Currently studying Computer Science at Moratuwa and sharing what I learn along the way.',
    'I''m a Computer Science & Engineering undergraduate at the University of Moratuwa, Sri Lanka. I spend most of my time building software projects, writing about algorithms and systems, and exploring how technology shapes the world around us.

When I''m not coding, you''ll find me writing long-form technical posts, experimenting with hardware, or contributing to open-source communities.',
    null,   -- Replace with your headshot URL after uploading to Supabase Storage
    null,   -- Replace with your resume PDF URL
    'Colombo, Sri Lanka',
    null,   -- Replace with your public contact email if desired
    '[
        {
            "institution": "University of Moratuwa",
            "degree": "B.Sc. in Computer Science & Engineering",
            "batch": "2023",
            "start_date": "2023-01-01",
            "end_date": null,
            "coursework": ["Data Structures & Algorithms", "Operating Systems", "Computer Networks", "Database Systems", "Software Engineering"]
        }
    ]'::jsonb,
    '{
        "core": ["Python", "TypeScript", "FastAPI", "Next.js", "PostgreSQL"],
        "comfortable": ["React", "Docker", "Git", "Linux", "Supabase"],
        "exploring": ["Rust", "VHDL", "Machine Learning", "Pydantic AI"]
    }'::jsonb,
    '[
        {"year": "2023", "title": "Started CS&E at University of Moratuwa", "description": "Began the undergraduate journey in Computer Science & Engineering."},
        {"year": "2024", "title": "Launched Behind the Bit", "description": "Started a community and content brand focused on demystifying CS concepts."},
        {"year": "2025", "title": "Built Portfolio + API", "description": "Designed and developed this portfolio with a FastAPI backend and Supabase database."}
    ]'::jsonb
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. EXTERNAL LINKS (social, video, google, professional, community, resource)
-- ─────────────────────────────────────────────────────────────────────────────
-- Replace all placeholder URLs and handles with real ones.
-- Add/remove rows freely — no code change required.

insert into public.external_links (category, platform, label, url, icon, description, display_order) values
    -- Social
    ('social', 'github',   'GitHub',   'https://github.com/YOUR_HANDLE',   'Github',   'View my open-source projects and contributions', 1),
    ('social', 'linkedin', 'LinkedIn', 'https://linkedin.com/in/YOUR_HANDLE', 'Linkedin', 'Connect with me professionally',              2),
    ('social', 'twitter',  'X / Twitter', 'https://x.com/YOUR_HANDLE',    'Twitter',  'Follow for tech thoughts and updates',          3),

    -- Video
    ('video', 'youtube', 'YouTube', 'https://youtube.com/@YOUR_HANDLE', 'Youtube', 'DSA walkthroughs, project demos, and CS explainers', 10),

    -- Google properties
    ('google', 'google_scholar', 'Google Scholar',
        'https://scholar.google.com/citations?user=YOUR_ID',
        'GraduationCap', 'Academic publications and citations', 20),
    ('google', 'google_drive', 'Resource Folder',
        'https://drive.google.com/drive/folders/YOUR_FOLDER_ID',
        'FolderOpen', 'Public resources, notes, and study materials', 21),

    -- Professional
    ('professional', 'resume', 'Resume / CV',
        'https://YOUR_RESUME_URL',
        'FileText', 'Download my latest resume', 30),

    -- Community
    ('community', 'facebook', 'Behind the Bit',
        'https://facebook.com/BEHIND_THE_BIT_PAGE',
        'Facebook', 'CS education community — algorithms, systems, and beyond', 40);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TAGS (shared vocabulary — add more as you write content)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.tags (name, slug) values
    ('FastAPI',     'fastapi'),
    ('Python',      'python'),
    ('TypeScript',  'typescript'),
    ('Next.js',     'nextjs'),
    ('Supabase',    'supabase'),
    ('PostgreSQL',  'postgresql'),
    ('Algorithms',  'algorithms'),
    ('Data Structures', 'data-structures'),
    ('React',       'react'),
    ('Docker',      'docker'),
    ('Linux',       'linux'),
    ('VHDL',        'vhdl'),
    ('Machine Learning', 'machine-learning'),
    ('Open Source', 'open-source'),
    ('System Design', 'system-design'),
    ('Web Dev',     'web-dev');


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TECH RADAR ENTRIES (sample — replace/extend with your actual radar)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.tech_radar_entries (entry_date, title, category, status, summary, link) values
    ('2025-07-01', 'FastAPI',    'framework', 'adopted',  'My go-to Python web framework. Async-first, Pydantic-native, excellent DX. Using it for this portfolio API.',        'https://fastapi.tiangolo.com'),
    ('2025-07-01', 'Next.js 15', 'framework', 'adopted',  'App Router + Server Components are now stable. The portfolio frontend runs on Next.js 15 with Turbopack.',          'https://nextjs.org'),
    ('2025-07-01', 'Supabase',   'database',  'adopted',  'Postgres + Auth + Storage + RLS in one hosted service. Significantly faster than standing up separate infrastructure.', 'https://supabase.com'),
    ('2025-06-01', 'Pydantic AI','framework', 'trying',   'Structured agent framework from the Pydantic team. Evaluating for a future "ask my portfolio" RAG feature.',        'https://ai.pydantic.dev'),
    ('2025-05-01', 'Rust',       'language',  'watching', 'Tracking for systems-level work. Haven''t committed to a project yet but the ownership model is compelling.',        'https://www.rust-lang.org'),
    ('2025-04-01', 'n8n',        'tool',      'trying',   'Self-hostable workflow automation. Evaluating for the YouTube sync pipeline that feeds the youtube_videos table.',   'https://n8n.io'),
    ('2025-03-01', 'Docker',     'infra',     'adopted',  'Container-first for all local dev and deployments. The portfolio API runs in a Docker container.',                   'https://www.docker.com'),
    ('2024-12-01', 'Gatsby',     'framework', 'dropped',  'Evaluated for the portfolio but the plugin ecosystem complexity outweighed the benefits vs Next.js App Router.',     'https://www.gatsbyjs.com');


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- Run these after seeding to confirm the data landed correctly.
-- ─────────────────────────────────────────────────────────────────────────────

-- select count(*) from public.profile;             -- Should be 1
-- select count(*) from public.external_links;      -- Should match rows above
-- select count(*) from public.tags;                -- Should match rows above
-- select count(*) from public.tech_radar_entries;  -- Should match rows above
-- select full_name, role_line from public.profile limit 1;
-- select category, platform, label from public.external_links order by display_order;
