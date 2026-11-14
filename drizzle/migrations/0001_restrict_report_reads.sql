DROP POLICY IF EXISTS "votes readable" ON public.report_verifications;
CREATE POLICY "own vote select" ON public.report_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "reports readable by signed in" ON public.community_reports;
CREATE POLICY "own reports select" ON public.community_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);