-- ============================================================================
-- Slack-flavored read API over the canonical public.* tables.
--
-- This lets the BACKEND query Neon as if it were the Slack Web API — list
-- channels/users, pull a channel's messages, walk a thread — without writing
-- joins. It exposes ONLY Slack data (users, channels, DMs, messages, threads,
-- reactions). Analysis (who-routes-whom, scoring) is the backend's job and
-- deliberately lives nowhere in here.
--
-- Two flavors:
--   • FUNCTIONS returning Slack-Web-API-shaped JSON envelopes (SDK feel)
--   • VIEWS returning plain rows (ergonomic for psycopg / pandas)
--
-- Everything lives in the `slack` schema, separate from the raw `public` tables.
-- Apply:  pnpm db:api      (re-runnable; everything is CREATE OR REPLACE)
-- ============================================================================

create schema if not exists slack;

-- Drop any analysis-flavored objects a previous version of this file created —
-- building the routing graph is the BACKEND's responsibility, not this layer's.
drop view if exists slack.routing_feed;
drop view if exists slack.message_mentions;

-- Drop the previous conversations_list signature so the new (p_types, …) one
-- isn't left ambiguous against the old (boolean) overload.
drop function if exists slack.conversations_list(boolean);

-- ---------------------------------------------------------------------------
-- helper: reactions for a message, Slack-shaped [{name,count,users[]}]
-- ---------------------------------------------------------------------------
create or replace function slack._reactions_for(p_message text)
returns jsonb language sql stable as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('name', emoji, 'count', cnt, 'users', users) order by cnt desc),
    '[]'::jsonb)
  from (
    select emoji, count(*)::int as cnt, jsonb_agg(user_id) as users
    from public.reactions
    where message_id = p_message
    group by emoji
  ) r;
$$;

-- ===========================================================================
-- VIEWS (row-oriented) — plain Slack data
-- ===========================================================================

-- Message feed with thread flags + reply counts (mirrors Slack message fields).
create or replace view slack.messages as
select
  m.id,
  m.channel_id,
  m.user_id                                          as "user",
  m.text,
  m.thread_ts,
  (m.thread_ts is not null and m.thread_ts <> m.id)  as is_reply,
  m.ts,
  (select count(*) from public.messages r where r.thread_ts = m.id)::int as reply_count
from public.messages m;

-- Channel membership with user metadata (mirrors conversations.members).
create or replace view slack.channel_members as
select cm.channel_id, cm.user_id, u.real_name, u.title, u.department
from public.channel_members cm
join public.users u on u.id = cm.user_id;

-- ===========================================================================
-- FUNCTIONS (Slack Web API-shaped JSON envelopes)
-- ===========================================================================

-- https://api.slack.com/methods/users.list
create or replace function slack.users_list()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'ok', true,
    'members', coalesce(jsonb_agg(member order by sort_name), '[]'::jsonb)
  )
  from (
    select
      jsonb_build_object(
        'id', u.id,
        'name', u.name,
        'real_name', u.real_name,
        'is_bot', u.is_bot,
        'tz', u.timezone,
        'profile', jsonb_build_object(
          'real_name', u.real_name,
          'display_name', u.name,
          'email', u.email,
          'title', u.title,
          'status_emoji', u.status_emoji,
          'status_text', u.status_text,
          'department', u.department,
          'avatar_color', u.avatar_color
        )
      ) as member,
      u.real_name as sort_name
    from public.users u
  ) t;
$$;

-- https://api.slack.com/methods/users.info
create or replace function slack.users_info(p_user text)
returns jsonb language sql stable as $$
  select jsonb_build_object('ok', u.id is not null, 'user',
    case when u.id is null then null else jsonb_build_object(
      'id', u.id, 'name', u.name, 'real_name', u.real_name, 'is_bot', u.is_bot,
      'tz', u.timezone,
      'profile', jsonb_build_object(
        'real_name', u.real_name, 'display_name', u.name, 'email', u.email,
        'title', u.title, 'status_emoji', u.status_emoji,
        'status_text', u.status_text, 'department', u.department,
        'avatar_color', u.avatar_color)
    ) end)
  from (select * from public.users where id = p_user) u
  right join (select 1) _ on true;
$$;

-- https://api.slack.com/methods/conversations.list  (channels + DMs)
-- p_types filters by kind, e.g. array['public_channel','private_channel'] or
-- array['im','mpim']; null = everything. (Slack's `types` param, made easy.)
create or replace function slack.conversations_list(
  p_types text[] default null,
  include_archived boolean default true
)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'ok', true,
    'channels', coalesce(jsonb_agg(payload order by sort_name), '[]'::jsonb)
  )
  from (
    select
      jsonb_build_object(
        'id', ch.id,
        'name', ch.name,
        'is_channel', ch.kind in ('public_channel','private_channel'),
        'is_private', ch.kind = 'private_channel',
        'is_im', ch.kind = 'im',
        'is_mpim', ch.kind = 'mpim',
        'is_archived', ch.is_archived,
        'topic', jsonb_build_object('value', coalesce(ch.topic, '')),
        'num_members', (select count(*) from public.channel_members m where m.channel_id = ch.id),
        'members', (select coalesce(jsonb_agg(m.user_id), '[]'::jsonb)
                      from public.channel_members m where m.channel_id = ch.id)
      ) as payload,
      ch.name as sort_name
    from public.channels ch
    where (include_archived or not ch.is_archived)
      and (p_types is null or ch.kind = any(p_types))
  ) t;
$$;

-- Just the channels (public + private), no DMs.
create or replace function slack.channels_list(include_archived boolean default true)
returns jsonb language sql stable as $$
  select slack.conversations_list(array['public_channel','private_channel'], include_archived);
$$;

-- Just the DMs (1:1 `im` + group `mpim`). DMs have no name in Slack, so we
-- resolve one from the participants. Pass p_user to get only that user's DMs.
create or replace function slack.dms_list(p_user text default null)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'ok', true,
    'dms', coalesce(jsonb_agg(payload order by sort_name), '[]'::jsonb)
  )
  from (
    select
      jsonb_build_object(
        'id', ch.id,
        'is_im', ch.kind = 'im',
        'is_mpim', ch.kind = 'mpim',
        'members', (select coalesce(jsonb_agg(m.user_id order by m.user_id), '[]'::jsonb)
                      from public.channel_members m where m.channel_id = ch.id),
        -- resolved display name: the participants, joined (Slack shows the
        -- other person's name; we give all members so it works DM or group DM)
        'name', (select string_agg(u.real_name, ', ' order by u.real_name)
                   from public.channel_members m join public.users u on u.id = m.user_id
                   where m.channel_id = ch.id),
        'member_names', (select coalesce(jsonb_agg(u.real_name order by u.real_name), '[]'::jsonb)
                           from public.channel_members m join public.users u on u.id = m.user_id
                           where m.channel_id = ch.id)
      ) as payload,
      ch.name as sort_name
    from public.channels ch
    where ch.kind in ('im', 'mpim')
      and (p_user is null
           or exists (select 1 from public.channel_members m
                        where m.channel_id = ch.id and m.user_id = p_user))
  ) t;
$$;

-- https://api.slack.com/methods/conversations.history  (top-level messages)
-- Pass p_oldest := current_date for "today's messages".
create or replace function slack.conversations_history(
  p_channel text,
  p_oldest timestamptz default null,
  p_latest timestamptz default null,
  p_limit int default 1000
) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'ok', true,
    'messages', coalesce((
      select jsonb_agg(msg order by ts_sort)
      from (
        select
          jsonb_build_object(
            'type', 'message',
            'id', m.id,
            'ts', m.ts,
            'user', m.user_id,
            'text', m.text,
            'reply_count', (select count(*) from public.messages r where r.thread_ts = m.id)::int,
            'reactions', slack._reactions_for(m.id)
          ) as msg,
          m.ts as ts_sort
        from public.messages m
        where m.channel_id = p_channel
          and (m.thread_ts is null or m.thread_ts = m.id)
          and (p_oldest is null or m.ts >= p_oldest)
          and (p_latest is null or m.ts <= p_latest)
        order by m.ts
        limit p_limit
      ) t
    ), '[]'::jsonb),
    'has_more', false
  );
$$;

-- https://api.slack.com/methods/conversations.replies  (a full thread)
create or replace function slack.conversations_replies(p_channel text, p_ts text)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'ok', true,
    'messages', coalesce((
      select jsonb_agg(msg order by ts_sort)
      from (
        select
          jsonb_build_object(
            'type', 'message', 'id', m.id, 'ts', m.ts, 'user', m.user_id,
            'text', m.text, 'thread_ts', m.thread_ts,
            'reactions', slack._reactions_for(m.id)
          ) as msg,
          m.ts as ts_sort
        from public.messages m
        where m.channel_id = p_channel and (m.id = p_ts or m.thread_ts = p_ts)
        order by m.ts
      ) t
    ), '[]'::jsonb),
    'has_more', false
  );
$$;

-- ===========================================================================
-- Backend cookbook — the Slack API, as SQL
-- ===========================================================================
-- All users:                 select slack.users_list();
-- One user:                  select slack.users_info('U_BOB');
-- All conversations:         select slack.conversations_list();
-- Channels only:             select slack.channels_list();
-- DMs only:                  select slack.dms_list();
-- A user's DMs:              select slack.dms_list('U_ALICE');
-- Messages in a channel:     select slack.conversations_history('C_ENGINEERING');
--   ...today only:           select slack.conversations_history('C_ENGINEERING', current_date);
-- Messages in a DM:          select slack.conversations_history('D_ALICE_BOB');
-- A whole thread:            select slack.conversations_replies('C_INCIDENTS', 'M_I15');
--
-- Prefer rows over JSON envelopes:
-- select * from slack.messages where channel_id = 'C_OPS' and is_reply = false;
-- select * from slack.channel_members where channel_id = 'C_ENGINEERING';
