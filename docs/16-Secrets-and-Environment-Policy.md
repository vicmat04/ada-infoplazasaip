# Secrets and Environment Policy

## Absolute Rules

- Never commit real Supabase keys.
- Never place the service role key in browser-accessible code.
- Never paste production secrets into generated documentation.
- Use `.env.local` for local development.
- Use the hosting provider's encrypted environment variables for production.
- Rotate any service role key that has been pasted into chats, tickets, screenshots, or documents.

## Supabase Key Usage

| Key | Where it can be used |
|---|---|
| Anon key | Frontend, through environment variables |
| Service role key | Server-only code, jobs, API routes, Edge Functions |

## Required `.gitignore`

The repository must ignore:

```gitignore
.env
.env.*
!.env.example
```

## Development Workflow

1. Codex creates or updates `.env.example`, never `.env.local`.
2. The developer manually creates `.env.local`.
3. Any code requiring service role access must be isolated in server-only modules.
4. Pull requests must be checked for leaked secrets before merge.
