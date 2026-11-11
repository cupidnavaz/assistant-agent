/*
# Admin full lead control and team permissions on leads

## Plain English
Admins can now add, edit and delete leads, not only read them and change their status. Active team members can see, edit or delete leads only if an admin has granted that permission. Every check runs on the server, so the interface cannot bypass it.

## New function: has_lead_permission(permission)
- Returns true for admins, and for active team members who hold the named permission.
- Callable only by signed-in users.

## Modified table: leads
- Signed-in users receive SELECT, INSERT, UPDATE and DELETE grants. Each action is still limited by its policy below.
- Read: admins and team members with leads:view.
- Create: admins only.
- Update: admins, and team members with leads:edit.
- Delete: admins, and team members with leads:delete.
- The earlier admin-only read and status-only update policies are replaced by these.

## Security
- Row level security remains enabled on leads.
- Team members cannot see or change leads without the matching permission.
- Anonymous visitors have no access to leads. Chat submissions continue to be written by the chat server.

## Important notes
1. Permission names: leads:view, leads:edit, leads:delete.
2. Permissions only take effect while the team member is active.
*/

CREATE OR REPLACE FUNCTION public.has_lead_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
SELECT public.is_lead_admin() OR EXISTS (
  SELECT 1
  FROM public.team_members m
  WHERE m.user_id = auth.uid()
    AND m.status = 'active'
    AND p_permission = ANY (m.permissions)
);
$function$;

REVOKE EXECUTE ON FUNCTION public.has_lead_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_lead_permission(text) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

DROP POLICY IF EXISTS "admin_select_leads" ON public.leads;
DROP POLICY IF EXISTS "admin_update_lead_status" ON public.leads;

DROP POLICY IF EXISTS "select_leads_with_permission" ON public.leads;
CREATE POLICY "select_leads_with_permission" ON public.leads FOR SELECT
  TO authenticated USING (public.has_lead_permission('leads:view'));

DROP POLICY IF EXISTS "insert_leads_as_admin" ON public.leads;
CREATE POLICY "insert_leads_as_admin" ON public.leads FOR INSERT
  TO authenticated WITH CHECK (public.is_lead_admin());

DROP POLICY IF EXISTS "update_leads_with_permission" ON public.leads;
CREATE POLICY "update_leads_with_permission" ON public.leads FOR UPDATE
  TO authenticated
  USING (public.has_lead_permission('leads:edit'))
  WITH CHECK (public.has_lead_permission('leads:edit'));

DROP POLICY IF EXISTS "delete_leads_with_permission" ON public.leads;
CREATE POLICY "delete_leads_with_permission" ON public.leads FOR DELETE
  TO authenticated USING (public.has_lead_permission('leads:delete'));
