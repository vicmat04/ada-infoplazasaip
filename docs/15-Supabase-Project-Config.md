# Supabase Project Configuration

> Security note: this file intentionally does **not** store real API keys or service role keys.
> Keep secrets only in local environment files or secured deployment secret managers.

## Project Data

| Item | Value |
|---|---|
| Project ref | `jcozaaifpfukqlypfuqq` |
| Supabase URL | `https://jcozaaifpfukqlypfuqq.supabase.co` |
| Profile table | `profiles` |

## Frontend Environment

Use these variables in frontend/client code:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jcozaaifpfukqlypfuqq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon key locally>
```

## Backend Environment

Use these variables only in backend/server-only code, API routes, server actions, jobs, or Supabase Edge Functions:

```env
SUPABASE_URL=https://jcozaaifpfukqlypfuqq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste service role key locally>
```

## Supabase CLI

```bash
supabase link --project-ref jcozaaifpfukqlypfuqq
```

## Rules for Codex / AI Development

1. Never commit `.env`, `.env.local`, `.env.production`, or any file containing real keys.
2. Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
3. The anon key may be used by the frontend, but it must still be handled through environment variables.
4. All dashboard access must respect `profiles.role`, `profiles.status`, and `profiles.regional`.
5. The `profiles` table is the source of truth for system users.
6. Visitors are not system users.
