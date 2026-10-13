# SYNQ Stories — backend setup

This repository contains a complete SYNQ Stories interface and a Supabase SQL backend, but **the public submission and likes features are intentionally disabled until a Supabase project is connected**. No example stories or likes are presented as real.

## Setup (owner only)

1. Create a Supabase project in an EU region, preferably Stockholm/Frankfurt.
2. Open **SQL Editor** and run the contents of `supabase/stories-schema.sql`.
3. In **Authentication > Providers**, enable **Anonymous Sign-Ins**. This allows visitors to submit and like without supplying a name, email or password. Supabase still handles technical session information; this is NOT a guarantee of complete anonymity.
4. In **Authentication > Users**, create a regular email/password user for the owner. Copy its Auth User UUID.
5. In SQL Editor, run:
   ```sql
   insert into public.synq_story_admins (user_id)
   values ('REPLACE_WITH_ADMIN_AUTH_USER_UUID');
   ```
6. In Supabase **Project Settings > API**, copy the project URL and **publishable / anon key** (never the `service_role` key). Edit `assets/stories-config.js` in GitHub:
   ```js
   window.SYNQ_STORIES_CONFIG = Object.freeze({
     url: "https://YOUR-PROJECT.supabase.co",
     anonKey: "YOUR_PUBLISHABLE_OR_ANON_KEY"
   });
   ```
7. Wait for GitHub Pages to deploy. Test an anonymous submission at `/stoet-synq/`, then sign in to the moderation dashboard at `/stoet-synq/admin/`, approve a test story, and test likes.

## Safety and moderation

- The two required checkboxes cover the contributor's license to inspire/adapt into songs and their confirmation that no identifying data is included. A separate confirmation dialog appears before sending.
- Every story starts with status `pending`. Public visitors can see **only** stories approved by an administrator.
- The private admin dashboard requires a Supabase email/password login **and** membership in `synq_story_admins`. Hiding the URL is not the security mechanism.
- Admins can approve, or **delete permanently** (both pending and published stories). Deleting a story also deletes its likes.
- Basic patterns for email addresses, phone numbers, URLs and social handles are blocked in the browser and database. **Names, sensitive details and indirect identifiers cannot be reliably detected automatically. Every story must be reviewed manually before approval.**
- Anonymous Auth gives each browser session a distinct user identifier. One like per account per story is enforced in the database. This does not prevent determined users from creating new anonymous sessions or gaming likes. For a public launch, add verified CAPTCHA (e.g. Turnstile), backend rate limits and abuse monitoring; the included 3-per-day limit is per anonymous account, not per IP.
- The SQL file revokes direct table access from public roles and only exposes controlled functions. Pending stories and submitter UUIDs are never returned to the public feed.
- Do not commit a service-role key, admin password, private user IDs, raw story exports, or Supabase database backups to this repository.

## Legal/privacy launch checklist

Before accepting real user stories, arrange a contact address and an appropriate privacy notice, including data controller, purposes, service providers, retention, data-subject rights and how to request removal. Review the two checkbox texts and song-adaptation permissions with a qualified Danish legal/privacy adviser. An anonymous *display* does not mean the service is technically anonymous: Supabase, GitHub Pages and network providers may process IP addresses and other technical data.

The contributor's original story is not automatically transferred to SYNQ. The form instead gives permission to use and adapt it as inspiration, and clarifies that SYNQ controls the new songs and lyrics it creates to the extent allowed by law. Danish copyright and moral rights cannot be overridden by a blanket checkbox.

## Data retention

The database stores submissions pending moderation and approved stories until the owner deletes them. Decide and document a retention period before launch, and schedule periodic deletion of old pending/rejected submissions. The dashboard offers permanent deletion for inappropriate or identifying stories.

## Links

- Public stories: `https://testkonto26.github.io/testside/stoet-synq/`
- Private moderation: `https://testkonto26.github.io/testside/stoet-synq/admin/`
