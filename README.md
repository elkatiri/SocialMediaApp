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
