/*
# Tighten table access for chat agent tables

1. Changes
- Removes the broad default privileges that Supabase gave the anonymous and signed-in roles on the four chat agent tables.
- Re-grants signed-in admins only what the leads dashboard needs.

2. Security
- anon: no direct table access at all. Website visitors reach data only through the chat function.
- authenticated: can read leads and change a lead's status. Row level security still limits this to listed admins.
- chat_sessions, chat_rate_limits and admin_emails are not reachable by signed-in users.
- service_role keeps its existing access, which the chat function needs.

3. Important notes
- Safe to re-run.
*/

REVOKE ALL ON public.leads FROM anon, authenticated;
REVOKE ALL ON public.chat_sessions FROM anon, authenticated;
REVOKE ALL ON public.chat_rate_limits FROM anon, authenticated;
REVOKE ALL ON public.admin_emails FROM anon, authenticated;

GRANT SELECT ON public.leads TO authenticated;
GRANT UPDATE (status) ON public.leads TO authenticated;
