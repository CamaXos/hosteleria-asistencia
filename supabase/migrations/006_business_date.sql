-- Día laboral de asistencia: 05:00–05:00 Europe/Madrid

CREATE OR REPLACE FUNCTION public.get_business_date(p_ts TIMESTAMPTZ DEFAULT now())
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN EXTRACT(HOUR FROM p_ts AT TIME ZONE 'Europe/Madrid') >= 5
    THEN (p_ts AT TIME ZONE 'Europe/Madrid')::date
    ELSE ((p_ts AT TIME ZONE 'Europe/Madrid')::date - INTERVAL '1 day')::date
  END;
$$;

-- RPC responsable: acepta fecha laboral desde la app
CREATE OR REPLACE FUNCTION public.submit_attendance_report(
  p_center_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_entries JSONB DEFAULT '[]'::JSONB,
  p_report_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id UUID;
  v_entry JSONB;
  v_employee_id UUID;
  v_status public.attendance_status;
  v_entry_notes TEXT;
  v_report_date DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT public.is_responsible() THEN
    RAISE EXCEPTION 'Solo los responsables pueden enviar informes';
  END IF;

  IF NOT public.responsible_has_center(p_center_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este centro';
  END IF;

  v_report_date := COALESCE(p_report_date, public.get_business_date());

  IF v_report_date > public.get_business_date() THEN
    RAISE EXCEPTION 'No se puede enviar un informe para una fecha futura';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance_reports
    WHERE center_id = p_center_id AND report_date = v_report_date
  ) THEN
    RAISE EXCEPTION 'Ya existe un informe para este centro hoy';
  END IF;

  INSERT INTO public.attendance_reports (center_id, report_date, submitted_by, notes)
  VALUES (p_center_id, v_report_date, auth.uid(), p_notes)
  RETURNING id INTO v_report_id;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_employee_id := (v_entry->>'employee_id')::UUID;
    v_status := (v_entry->>'status')::public.attendance_status;
    v_entry_notes := v_entry->>'notes';

    IF NOT EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = v_employee_id AND e.center_id = p_center_id
    ) THEN
      RAISE EXCEPTION 'Empleado no pertenece a este centro';
    END IF;

    INSERT INTO public.attendance_entries (report_id, employee_id, status, notes)
    VALUES (v_report_id, v_employee_id, v_status, v_entry_notes);
  END LOOP;

  RETURN v_report_id;
END;
$$;

-- Admin: validar contra fecha laboral, no CURRENT_DATE
CREATE OR REPLACE FUNCTION public.admin_submit_attendance_report(
  p_center_id UUID,
  p_report_date DATE,
  p_notes TEXT DEFAULT NULL,
  p_entries JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id UUID;
  v_entry JSONB;
  v_employee_id UUID;
  v_status public.attendance_status;
  v_entry_notes TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden enviar informes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.centers WHERE id = p_center_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Centro no encontrado o inactivo';
  END IF;

  IF p_report_date > public.get_business_date() THEN
    RAISE EXCEPTION 'No se puede enviar un informe para una fecha futura';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance_reports
    WHERE center_id = p_center_id AND report_date = p_report_date
  ) THEN
    RAISE EXCEPTION 'Ya existe un informe para este centro en esta fecha';
  END IF;

  INSERT INTO public.attendance_reports (center_id, report_date, submitted_by, notes)
  VALUES (p_center_id, p_report_date, auth.uid(), p_notes)
  RETURNING id INTO v_report_id;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_employee_id := (v_entry->>'employee_id')::UUID;
    v_status := (v_entry->>'status')::public.attendance_status;
    v_entry_notes := v_entry->>'notes';

    IF NOT EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = v_employee_id AND center_id = p_center_id AND active = true
    ) THEN
      RAISE EXCEPTION 'Empleado no válido para este centro: %', v_employee_id;
    END IF;

    INSERT INTO public.attendance_entries (report_id, employee_id, status, notes)
    VALUES (v_report_id, v_employee_id, v_status, v_entry_notes);
  END LOOP;

  RETURN v_report_id;
END;
$$;

-- RLS: usar fecha laboral en lugar de CURRENT_DATE
DROP POLICY IF EXISTS "reports_responsible_select" ON public.attendance_reports;
CREATE POLICY "reports_responsible_select" ON public.attendance_reports
  FOR SELECT USING (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
    AND (
      report_date = public.get_business_date()
      OR (submitted_by = auth.uid() AND report_date >= public.get_business_date() - INTERVAL '2 days')
    )
  );

DROP POLICY IF EXISTS "reports_responsible_insert" ON public.attendance_reports;
CREATE POLICY "reports_responsible_insert" ON public.attendance_reports
  FOR INSERT WITH CHECK (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
    AND submitted_by = auth.uid()
    AND report_date = public.get_business_date()
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
          r.report_date = public.get_business_date()
          OR (r.submitted_by = auth.uid() AND r.report_date >= public.get_business_date() - INTERVAL '2 days')
        )
    )
  );

GRANT EXECUTE ON FUNCTION public.get_business_date TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_attendance_report TO authenticated;
