/*
# Create team members table

## Plain English
Admins can add team members. Each member has a name, an email address and a set of permissions chosen by the admin. Team members cannot register themselves. They activate their account through an approval step: an admin approves the request and shares a one-time code, and the member uses that code to choose their own password.

## New table: team_members
1. id - unique identifier
2. email - sign-in email, stored in lowercase and unique
3. name - display name shown to the admin and in the team dashboard
4. permissions - list of granted permissions (leads:view, leads:edit, leads:delete)
5. status - invited, awaiting_approval, approved (code issued) or active
6. user_id - links the record to the sign-in account once activated
7. activation_code_hash, activation_code_expires_at, activation_attempts - internal activation data; the code itself is never stored
8. created_at, created_by, activated_at - audit fields

## Security
- Row level security is enabled.
- Admins can read, add, edit and remove team members.
- A team member can read only their own record.
- Browsers cannot read the activation code hash, and cannot change status, the account link or activation fields. Those are changed only by the team-access server function.

## Important notes
1. Removing a team member deletes their team record. Their sign-in account is kept but gains no access.
2. Permissions are checked on the server by policies on other tables, not only in the interface.
*/

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254),
  name text NOT NULL DEFAULT '' CHECK (char_length(name) <= 80),
  permissions text[] NOT NULL DEFAULT '{}' CHECK (permissions <@ ARRAY['leads:view', 'leads:edit', 'leads:delete']::text[]),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'awaiting_approval', 'approved', 'active')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activation_code_hash text,
  activation_code_expires_at timestamptz,
  activation_attempts integer NOT NULL DEFAULT 0 CHECK (activation_attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at timestamptz
);

CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members (user_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.team_members FROM anon, authenticated;

GRANT SELECT (id, email, name, permissions, status, user_id, created_at, activated_at, activation_code_expires_at)
  ON public.team_members TO authenticated;
GRANT INSERT (email, name, permissions) ON public.team_members TO authenticated;
GRANT UPDATE (name, permissions) ON public.team_members TO authenticated;
GRANT DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO service_role;

DROP POLICY IF EXISTS "admin_select_team_members" ON public.team_members;
CREATE POLICY "admin_select_team_members" ON public.team_members FOR SELECT
  TO authenticated USING (public.is_lead_admin());

DROP POLICY IF EXISTS "admin_insert_team_members" ON public.team_members;
CREATE POLICY "admin_insert_team_members" ON public.team_members FOR INSERT
  TO authenticated WITH CHECK (public.is_lead_admin());

DROP POLICY IF EXISTS "admin_update_team_members" ON public.team_members;
CREATE POLICY "admin_update_team_members" ON public.team_members FOR UPDATE
  TO authenticated USING (public.is_lead_admin()) WITH CHECK (public.is_lead_admin());

DROP POLICY IF EXISTS "admin_delete_team_members" ON public.team_members;
CREATE POLICY "admin_delete_team_members" ON public.team_members FOR DELETE
  TO authenticated USING (public.is_lead_admin());

DROP POLICY IF EXISTS "member_select_own_record" ON public.team_members;
CREATE POLICY "member_select_own_record" ON public.team_members FOR SELECT
  TO authenticated USING (user_id = auth.uid());
