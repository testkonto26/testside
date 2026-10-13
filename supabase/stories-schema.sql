-- SYNQ Stories backend for Supabase (PostgreSQL)
-- Run in the Supabase SQL editor as the project owner.
-- IMPORTANT: Never use the service_role key in GitHub Pages.
-- All user-facing database access goes through SECURITY DEFINER RPC functions.
-- Pending stories and anonymous visitor identifiers are never returned publicly.

create table if not exists public.synq_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 6 and 90),
  story_text text not null check (char_length(story_text) between 80 and 2500),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  terms_version text not null default '2026-10-14'
);

create table if not exists public.synq_story_likes (
  story_id uuid not null references public.synq_stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table if not exists public.synq_story_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create index if not exists synq_stories_status_date_idx
  on public.synq_stories(status, published_at desc);
create index if not exists synq_stories_created_by_idx
  on public.synq_stories(created_by, submitted_at desc);
create index if not exists synq_likes_story_idx
  on public.synq_story_likes(story_id);

alter table public.synq_stories enable row level security;
alter table public.synq_story_likes enable row level security;
alter table public.synq_story_admins enable row level security;

-- No direct table access from browsers, not even SELECT of pending stories.
revoke all on public.synq_stories from public, anon, authenticated;
revoke all on public.synq_story_likes from public, anon, authenticated;
revoke all on public.synq_story_admins from public, anon, authenticated;

create or replace function public.is_synq_story_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.synq_story_admins a where a.user_id = (select auth.uid())
  );
$$;

-- Contact details are rejected automatically; personal names and identifying
-- circumstances MUST ALSO be checked manually by the admin before approval.
create or replace function public.synq_contains_contact_info(p_text text)
returns boolean
language sql immutable security definer set search_path = ''
as $$
  select
    p_text ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    or p_text ~* '(https?://|www\.)[^[:space:]]+'
    or p_text ~ '(^|[[:space:]])@[A-Za-z0-9_.]{2,}'
    or p_text ~ '[+]?[0-9][0-9[:space:]().+-]{6,}[0-9]';
$$;

create or replace function public.submit_synq_story(
  p_title text, p_story text, p_rights_ok boolean, p_privacy_ok boolean
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := btrim(p_title);
  v_story text := btrim(p_story);
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '22023';
  end if;
  if p_rights_ok is distinct from true or p_privacy_ok is distinct from true then
    raise exception 'agreement_required' using errcode = '22023';
  end if;
  if char_length(v_title) not between 6 and 90
     or char_length(v_story) not between 80 and 2500 then
    raise exception 'invalid_length' using errcode = '22023';
  end if;
  if public.synq_contains_contact_info(v_title || E'\n' || v_story) then
    raise exception 'personal_data' using errcode = '22023';
  end if;
  if (select count(*) from public.synq_stories
      where created_by = v_uid and submitted_at > now() - interval '24 hours') >= 3 then
    raise exception 'rate_limit' using errcode = '22023';
  end if;
  insert into public.synq_stories(title, story_text, created_by)
    values (v_title, v_story, v_uid) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.list_synq_stories(
  p_sort text default 'new', p_limit integer default 20, p_offset integer default 0
)
returns table(
  id uuid, title text, story_text text, published_at timestamptz,
  like_count bigint, liked_by_me boolean
)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.title, s.story_text, s.published_at,
    (select count(*) from public.synq_story_likes l where l.story_id = s.id) as like_count,
    exists(select 1 from public.synq_story_likes l
      where l.story_id = s.id and l.user_id = (select auth.uid())) as liked_by_me
  from public.synq_stories s
  where s.status = 'approved'
  order by
    case when p_sort = 'popular'
      then (select count(*) from public.synq_story_likes l where l.story_id = s.id)
      else null end desc nulls last,
    s.published_at desc, s.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset least(greatest(coalesce(p_offset, 0), 0), 1000);
$$;

create or replace function public.toggle_synq_like(p_story_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '22023';
  end if;
  if not exists(select 1 from public.synq_stories
      where id = p_story_id and status = 'approved') then
    raise exception 'story_not_found' using errcode = '22023';
  end if;
  delete from public.synq_story_likes
    where story_id = p_story_id and user_id = v_uid;
  if found then
    return false;
  end if;
  insert into public.synq_story_likes(story_id, user_id)
    values(p_story_id, v_uid);
  return true;
end;
$$;

create or replace function public.admin_list_synq_stories(p_status text default 'pending')
returns table(
  id uuid, title text, story_text text, status text,
  submitted_at timestamptz, published_at timestamptz, like_count bigint
)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_synq_story_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'approved') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  return query
    select s.id, s.title, s.story_text, s.status,
      s.submitted_at, s.published_at,
      (select count(*) from public.synq_story_likes l where l.story_id = s.id)
    from public.synq_stories s
    where s.status = p_status
    order by case when p_status = 'pending' then s.submitted_at
      else s.published_at end desc
    limit 100;
end;
$$;

create or replace function public.admin_review_synq_story(p_id uuid, p_action text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_story public.synq_stories%rowtype;
begin
  if not public.is_synq_story_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'delete') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  select * into v_story from public.synq_stories where id = p_id for update;
  if not found then return false; end if;
  if p_action = 'delete' then
    delete from public.synq_stories where id = p_id;
    return true;
  end if;
  if public.synq_contains_contact_info(v_story.title || E'\n' || v_story.story_text) then
    raise exception 'personal_data' using errcode = '22023';
  end if;
  update public.synq_stories
    set status = 'approved', published_at = coalesce(published_at, now())
    where id = p_id and status = 'pending';
  return found;
end;
$$;

-- Explicit RPC access only; security checks are inside each function.
revoke all on function public.is_synq_story_admin() from public;
revoke all on function public.synq_contains_contact_info(text) from public;
revoke all on function public.submit_synq_story(text,text,boolean,boolean) from public;
revoke all on function public.list_synq_stories(text,integer,integer) from public;
revoke all on function public.toggle_synq_like(uuid) from public;
revoke all on function public.admin_list_synq_stories(text) from public;
revoke all on function public.admin_review_synq_story(uuid,text) from public;

grant execute on function public.submit_synq_story(text,text,boolean,boolean) to authenticated;
grant execute on function public.list_synq_stories(text,integer,integer) to anon, authenticated;
grant execute on function public.toggle_synq_like(uuid) to authenticated;
grant execute on function public.is_synq_story_admin() to authenticated;
grant execute on function public.admin_list_synq_stories(text) to authenticated;
grant execute on function public.admin_review_synq_story(uuid,text) to authenticated;

-- AFTER creating an email/password admin in Supabase Authentication > Users,
-- replace the placeholder UUID and run this ONE line separately:
-- insert into public.synq_story_admins(user_id) values ('ADMIN_AUTH_USER_UUID');
