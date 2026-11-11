/*
# Profile avatars for admins and team members

1. Modified Tables
- `admin_emails`: new `avatar_url` column, the photo shown for an admin.
- `team_members`: new `avatar_url` column, the photo shown for a team member.

2. Storage
- New public bucket `avatars` for profile photos. Accepts PNG, JPEG and WebP up to 2 MB.
- Files are stored in a folder named after the signed-in user's id.

3. Security
- Only signed-in admins and active team members can upload or replace an avatar, and only into their own folder.
- Admins can change only their own avatar. Team members can change only their own avatar on their own row.
- Avatar photos are readable publicly so they can be shown in the dashboards.

4. Important notes
- Safe to re-run.
*/

ALTER TABLE public.admin_emails
  ADD COLUMN IF NOT EXISTS avatar_url text
  CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 500);

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS avatar_url text
  CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 500);

GRANT UPDATE (avatar_url) ON public.admin_emails TO authenticated;
GRANT UPDATE (avatar_url) ON public.team_members TO authenticated;

DROP POLICY IF EXISTS "team_update_own_avatar" ON public.team_members;
CREATE POLICY "team_update_own_avatar" ON public.team_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'active')
  WITH CHECK (user_id = auth.uid() AND status = 'active');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "insert_own_avatar_file" ON storage.objects;
CREATE POLICY "insert_own_avatar_file" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      public.is_lead_admin()
      OR EXISTS (SELECT 1 FROM public.team_members t WHERE t.user_id = auth.uid() AND t.status = 'active')
    )
  );

DROP POLICY IF EXISTS "update_own_avatar_file" ON storage.objects;
CREATE POLICY "update_own_avatar_file" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      public.is_lead_admin()
      OR EXISTS (SELECT 1 FROM public.team_members t WHERE t.user_id = auth.uid() AND t.status = 'active')
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "delete_own_avatar_file" ON storage.objects;
CREATE POLICY "delete_own_avatar_file" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
