/*
# Restrict execute access on touch_agent_settings

Plain English: the trigger that stamps "last updated" fields on agent settings was callable by everyone, including anonymous visitors. This migration removes that access. Only signed-in admins and the server (service role) can run it, and the function itself rejects any other caller.

1. Modified Objects
- `public.touch_agent_settings()` (trigger function): body now rejects callers who are neither the service role nor a lead admin. Trigger behavior for admin updates is unchanged.

2. Security Changes
- REVOKE EXECUTE from PUBLIC and anon.
- GRANT EXECUTE to authenticated and service_role.
- Function remains SECURITY INVOKER with an empty search_path.

3. Important Notes
- No tables, columns, rows, or policies are changed.
- Triggers do not need EXECUTE privilege at fire time; the grants above restrict direct calls only.
- The migration is idempotent and safe to replay on an empty database.
*/

CREATE OR REPLACE FUNCTION public.touch_agent_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_lead_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.touch_agent_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_agent_settings() TO authenticated, service_role;
