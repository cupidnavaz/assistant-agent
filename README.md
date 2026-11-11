# CupidCreativeX website

## Environment and secrets

### `ALLOWED_ORIGINS` (chat-agent edge function)

Comma-separated list of browser origins allowed to call the `chat-agent` function. Set it as a Supabase Edge Function secret, not in `.env`.

- Default when unset: `https://cupidcreativex.com`, `https://www.cupidcreativex.com`, `http://localhost:5173`.
- Exact entries are matched exactly, for example `https://cupidcreativex.com`.
- Vercel preview deployments use one wildcard form: `https://<project>-*-<team>.vercel.app`, where `*` matches the preview hash.
- Any other origin is rejected. Invalid entries are logged and ignored.

Example:

```
ALLOWED_ORIGINS=https://cupidcreativex.com,https://www.cupidcreativex.com,http://localhost:5173,https://<project>-*-<team>.vercel.app
```
