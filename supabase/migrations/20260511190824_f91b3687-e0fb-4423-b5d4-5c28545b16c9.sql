-- Permitir mídia sem relatório associado
ALTER TABLE public.report_media ALTER COLUMN report_id DROP NOT NULL;

-- Atualizar política de SELECT para cobrir mídias sem report_id (via project_id)
DROP POLICY IF EXISTS "Project members can view report media" ON public.report_media;
CREATE POLICY "Project members can view report media"
ON public.report_media
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.project_reports r
      JOIN public.construction_projects p ON p.id = r.project_id
      WHERE r.id = report_media.report_id AND p.client_id = auth.uid()
    )
  )
  OR (
    report_id IS NULL AND project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.construction_projects p
      WHERE p.id = report_media.project_id AND p.client_id = auth.uid()
    )
  )
);

-- Tornar bucket public para exibição via URL
UPDATE storage.buckets SET public = true WHERE id = 'project-media';

-- Políticas de storage para o bucket project-media
DROP POLICY IF EXISTS "project-media public read" ON storage.objects;
CREATE POLICY "project-media public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'project-media');

DROP POLICY IF EXISTS "project-media admin insert" ON storage.objects;
CREATE POLICY "project-media admin insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-media' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "project-media admin update" ON storage.objects;
CREATE POLICY "project-media admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-media' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "project-media admin delete" ON storage.objects;
CREATE POLICY "project-media admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-media' AND has_role(auth.uid(), 'admin'::app_role));