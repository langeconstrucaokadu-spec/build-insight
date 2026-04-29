DROP POLICY IF EXISTS "Admins can upload private media files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update private media files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete private media files" ON storage.objects;

CREATE POLICY "Admins can upload private media files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-media'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (storage.foldername(name))[1] IS NOT NULL
);

CREATE POLICY "Admins can update private media files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-media'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'project-media'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete private media files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-media'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);