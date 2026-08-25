# Leadership & Involvement content

This folder supplies the homepage **Leadership & Involvement** showcase. Keep
one experience in each `.mdx` file so routine content updates do not require a
component change.

The public section intentionally stays hidden until at least one entry has both
`published: true` and `featured: true`. Do not add filler achievements merely
to make the section appear.

## Add an entry

1. Copy `EXPERIENCE_TEMPLATE.mdx.example` to a lowercase, hyphenated `.mdx`
   filename, for example `ieee-research-conference.mdx`.
2. Set `slug` to exactly the filename without `.mdx`.
3. Replace the template text with factual details. Describe your personal
   contribution rather than only describing the event.
4. Add any public photographs under
   `public/images/involvement/<slug>/`, then record their real dimensions and
   useful alt text in `images`.
5. Keep `published: false` while checking the entry. Change it to `true` only
   when the wording, dates, evidence, and image permissions are ready.
6. Use `featured: true` for the small homepage selection. A published but
   non-featured entry is retained for a future full involvement archive.
7. Run `npm run lint` and `npm run build` from `portfolio-frontend` before
   committing.

Files ending in `.example` are ignored. Every `.mdx` file is validated, even
when unpublished, so keep an incomplete draft as `.mdx.draft` or `.example`
until its required fields are filled.

## Categories

Use exactly one of these values:

| Value | Public label | Appropriate content |
| --- | --- | --- |
| `leadership` | Leadership & Service | Leadership, mentoring, team responsibility, and department service |
| `organizing` | Event Organizing | Committees, coordination, logistics, and special department events |
| `competition` | Competitions & Recognition | Competitions, awards, finalist placements, and verified winning moments |
| `learning` | Research & Learning | Research conferences, workshops, and educational events |

Attendance should not be described as leadership unless the role genuinely
included leadership responsibility.

## Fields

Required fields:

- `title`, `slug`, `category`, and quoted `date` (`YYYY-MM-DD`);
- `role` and `organization`;
- `summary` for the event context;
- `contribution` for your specific responsibility or work;
- boolean `featured` and `published` values.

Optional fields:

- `dateLabel`: human-readable date text; when omitted, it becomes `Month YYYY`;
- `location`: venue, city, or online setting;
- `outcome`: a verified result, recognition, impact, or useful learning;
- `order`: non-negative whole number used for manual priority (defaults to `0`);
- `images`: zero or more local website photographs;
- `links`: zero or more evidence or context links.

Homepage ordering is deterministic: lower `order` first, then newer date,
title, and slug. Use distinct order values such as `10`, `20`, and `30` when
you want an explicit sequence that is easy to rearrange later.

For a calm, stable homepage card, keep the writing concise: aim for a title
under 70 characters, a one-sentence summary under roughly 180 characters, a
contribution under roughly 220 characters, and an optional outcome under
roughly 140 characters. These are editorial guidelines, not enforced limits.

The MDX body below the frontmatter is reserved for a future full archive/detail
page and is not shown by the initial homepage showcase.

## Images

Images are optional, so a complete text-only entry is valid. When adding one:

```yaml
images:
  - src: "/images/involvement/ieee-research-conference/presentation.webp"
    alt: "Vishwa presenting the project findings to the conference panel"
    caption: "Optional context that is not already clear from the photograph."
    width: 1600
    height: 1000
```

- Use a local path under `/images/involvement/`; do not hotlink social-media or
  Google Drive images.
- Put the strongest photograph first. The homepage rotates through additional
  photographs within the same entry; two or three well-chosen images are
  usually enough.
- Prefer a well-compressed WebP or JPEG near 1600 px wide for a primary image.
- Use the photograph's real width and height to avoid layout shift.
- Write alt text for the meaningful moment, not labels such as “event image 1.”
- Confirm that you have permission to publish photographs of other people.
- Keep these files in the frontend/GitHub/Vercel path. Do not store them in AWS.

## Evidence links

Google Drive is suitable for an optional certificate, programme, report, or
other supporting document. Set sharing to the intended audience and test the
link in a private browser window before publishing it.

```yaml
links:
  - label: "View certificate"
    url: "https://drive.google.com/file/d/FILE_ID/view"
```

Links accept `http(s)` URLs or safe paths within this website. Remove an unused
field instead of leaving an empty string. Never publish private attendee lists,
IDs, email addresses, access tokens, or documents containing sensitive data.

## Validation

The loader rejects malformed YAML, unsupported or misspelled fields, invalid
categories and dates, mismatched filename/slug values, unsafe image paths,
missing image dimensions, and invalid links. Errors name the affected file and
field so a failed build points directly to the content that needs correction.
