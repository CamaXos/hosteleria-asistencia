-- Horarios de responsables por centro y día de la semana
-- day_of_week: 1=Lunes ... 7=Domingo (ISO)

CREATE TABLE public.responsible_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsible_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (responsible_id, center_id, day_of_week)
);

CREATE INDEX idx_responsible_schedules_responsible ON public.responsible_schedules(responsible_id);
CREATE INDEX idx_responsible_schedules_center ON public.responsible_schedules(center_id);

ALTER TABLE public.responsible_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_admin_all" ON public.responsible_schedules
  FOR ALL USING (public.is_admin());

CREATE POLICY "schedules_responsible_select" ON public.responsible_schedules
  FOR SELECT USING (responsible_id = auth.uid());

-- Responsables: ver informes propios de los últimos 30 días (estadísticas)
DROP POLICY IF EXISTS "reports_responsible_select" ON public.attendance_reports;
CREATE POLICY "reports_responsible_select" ON public.attendance_reports
  FOR SELECT USING (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
    AND (
      report_date = CURRENT_DATE
      OR (submitted_by = auth.uid() AND report_date >= CURRENT_DATE - INTERVAL '30 days')
    )
  );

DROP POLICY IF EXISTS "entries_responsible_select" ON public.attendance_entries;
CREATE POLICY "entries_responsible_select" ON public.attendance_entries
  FOR SELECT USING (
    public.is_responsible()
    AND EXISTS (
      SELECT 1 FROM public.attendance_reports r
      WHERE r.id = report_id
        AND public.responsible_has_center(r.center_id)
        AND (
          r.report_date = CURRENT_DATE
          OR (r.submitted_by = auth.uid() AND r.report_date >= CURRENT_DATE - INTERVAL '30 days')
        )
    )
  );
