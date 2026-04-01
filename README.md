# calendar-app-with-booking

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_LcSOXxnMNAHPaJqpry2FVNAbUvw0)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Authentication, Chat, and Notes Setup

This app now uses:

- Clerk for staff authentication at `/admin/login`
- Stream Chat for whole-team chat, direct messages, and custom group rooms
- MongoDB-backed notes with folders, pinning, favorites, tags, and checklists

Before running locally, copy `.env.example` into `.env` and add:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/login`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin`
- `NEXT_PUBLIC_STREAM_CHAT_API_KEY`
- `STREAM_CHAT_API_SECRET`

Clerk role behavior:

- The user matching `ADMIN_EMAIL` is automatically treated as `super_admin` on first sync.
- Team management creates Clerk users and mirrors them into Mongo so existing task and appointment logic keeps working.
- Role changes in the admin team screen update both Mongo and Clerk metadata.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/netcreek143/calendar-app-with-booking" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
