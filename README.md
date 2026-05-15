# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Friend requests + notifications (Supabase)

The Users screen (browse accounts, send/accept requests, and see acceptance notifications) expects these tables in Supabase:

```sql
-- Friend requests between users
create table if not exists public.friend_requests (
   id uuid primary key default gen_random_uuid(),
   from_user uuid not null references public.users(id) on delete cascade,
   to_user uuid not null references public.users(id) on delete cascade,
   status text not null default 'pending' check (status in ('pending', 'accepted')),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   constraint friend_requests_not_self check (from_user <> to_user)
);

create unique index if not exists friend_requests_from_to_unique
   on public.friend_requests (from_user, to_user);

create index if not exists friend_requests_to_user_status_idx
   on public.friend_requests (to_user, status);


-- In-app notifications (used for "request received" + "your request was accepted")
create table if not exists public.notifications (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null references public.users(id) on delete cascade,
   actor_user_id uuid references public.users(id) on delete set null,
   type text not null,
   is_read boolean not null default false,
   created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
   on public.notifications (user_id, created_at desc);


-- RLS (required if you enabled RLS on these tables)
alter table public.friend_requests enable row level security;
alter table public.notifications enable row level security;

-- friend_requests: sender can insert, both parties can read, receiver can accept.
create policy "friend_requests_insert_own" on public.friend_requests
   for insert
   with check (from_user = auth.uid());

create policy "friend_requests_select_party" on public.friend_requests
   for select
   using (from_user = auth.uid() or to_user = auth.uid());

create policy "friend_requests_accept_as_receiver" on public.friend_requests
   for update
   using (to_user = auth.uid())
   with check (to_user = auth.uid());

-- notifications: actor inserts (e.g. receiver inserts notification for sender), recipient reads & marks read.
-- types used by the app: 'friend_request_received', 'friend_request_accepted'
create policy "notifications_insert_by_actor" on public.notifications
   for insert
   with check (actor_user_id = auth.uid());

create policy "notifications_select_own" on public.notifications
   for select
   using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
   for update
   using (user_id = auth.uid())
   with check (user_id = auth.uid());
```

If you want to allow rejecting requests, add `rejected` to the status check and handle it in the app.

## Direct messages (Supabase)

The Messages screens (1:1 conversations + realtime chat) expect these tables in Supabase:

```sql
-- 1:1 conversations between users
create table if not exists public.dm_conversations (
   id uuid primary key default gen_random_uuid(),
   created_at timestamptz not null default now(),
   user1 uuid not null references public.users(id) on delete cascade,
   user2 uuid not null references public.users(id) on delete cascade,
   last_message_at timestamptz,
   last_message_text text,
   last_message_sender_id uuid references public.users(id) on delete set null,
   constraint dm_conversations_not_self check (user1 <> user2)
);

-- If you created the table before adding `last_message_sender_id`, run:
-- alter table public.dm_conversations add column if not exists last_message_sender_id uuid references public.users(id) on delete set null;

-- Prevent duplicate conversations for the same user pair
create unique index if not exists dm_conversations_user_pair_unique
   on public.dm_conversations (least(user1, user2), greatest(user1, user2));

create index if not exists dm_conversations_last_message_at_idx
   on public.dm_conversations (last_message_at desc);


-- Messages inside a conversation
create table if not exists public.dm_messages (
   id uuid primary key default gen_random_uuid(),
   conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
   sender_id uuid not null references public.users(id) on delete cascade,
   body text not null,
   created_at timestamptz not null default now()
);

create index if not exists dm_messages_conversation_created_at_idx
   on public.dm_messages (conversation_id, created_at asc);


-- Per-user read tracking (used for the Messages unread badge)
create table if not exists public.dm_reads (
   conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
   user_id uuid not null references public.users(id) on delete cascade,
   last_read_at timestamptz not null default now(),
   primary key (conversation_id, user_id)
);


-- RLS (required if you enabled RLS on these tables)
alter table public.dm_conversations enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_reads enable row level security;

-- dm_conversations: participants can read/insert/update.
create policy "dm_conversations_select_participant" on public.dm_conversations
   for select
   using (user1 = auth.uid() or user2 = auth.uid());

create policy "dm_conversations_insert_participant" on public.dm_conversations
   for insert
   with check (user1 = auth.uid() or user2 = auth.uid());

create policy "dm_conversations_update_participant" on public.dm_conversations
   for update
   using (user1 = auth.uid() or user2 = auth.uid())
   with check (user1 = auth.uid() or user2 = auth.uid());

-- dm_messages: participants can read, participants can insert as themselves.
create policy "dm_messages_select_participant" on public.dm_messages
   for select
   using (
      exists (
         select 1
         from public.dm_conversations c
         where c.id = dm_messages.conversation_id
           and (c.user1 = auth.uid() or c.user2 = auth.uid())
      )
   );

create policy "dm_messages_insert_as_sender" on public.dm_messages
   for insert
   with check (
      sender_id = auth.uid()
      and exists (
         select 1
         from public.dm_conversations c
         where c.id = dm_messages.conversation_id
           and (c.user1 = auth.uid() or c.user2 = auth.uid())
      )
   );

-- dm_reads: participants can read their own read-state; participants can upsert their own row.
create policy "dm_reads_select_own" on public.dm_reads
   for select
   using (
      user_id = auth.uid()
      and exists (
         select 1
         from public.dm_conversations c
         where c.id = dm_reads.conversation_id
           and (c.user1 = auth.uid() or c.user2 = auth.uid())
      )
   );

create policy "dm_reads_insert_own" on public.dm_reads
   for insert
   with check (
      user_id = auth.uid()
      and exists (
         select 1
         from public.dm_conversations c
         where c.id = dm_reads.conversation_id
           and (c.user1 = auth.uid() or c.user2 = auth.uid())
      )
   );

create policy "dm_reads_update_own" on public.dm_reads
   for update
   using (user_id = auth.uid())
   with check (
      user_id = auth.uid()
      and exists (
         select 1
         from public.dm_conversations c
         where c.id = dm_reads.conversation_id
           and (c.user1 = auth.uid() or c.user2 = auth.uid())
      )
   );
```

Notes:
- The app updates `dm_conversations.last_message_at/last_message_text` from the client after sending.
- The Messages unread badge uses `dm_reads` (updated when opening a chat).
- Realtime requires enabling replication for `dm_messages` and `dm_reads` in Supabase (Database → Replication → add the tables).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
