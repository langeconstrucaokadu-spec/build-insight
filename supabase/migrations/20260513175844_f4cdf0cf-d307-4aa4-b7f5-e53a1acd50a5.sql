
CREATE POLICY "Permitted users can upload project media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.has_project_permission(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    'photo'
  )
);
