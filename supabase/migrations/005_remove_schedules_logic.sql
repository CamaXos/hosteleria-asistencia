-- Limit responsible stats/history to 2 days (was 30)
DROP POLICY IF EXISTS "reports_responsible_select" ON public.attendance_reports;
CREATE POLICY "reports_responsible_select" ON public.attendance_reports
  FOR SELECT USING (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
    AND (
      report_date = CURRENT_DATE
      OR (submitted_by = auth.uid() AND report_date >= CURRENT_DATE - INTERVAL '2 days')
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
          OR (r.submitted_by = auth.uid() AND r.report_date >= CURRENT_DATE - INTERVAL '2 days')
        )
    )
  );

-- Admin can submit attendance reports for any center and date
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

  IF p_report_date > CURRENT_DATE THEN
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

GRANT EXECUTE ON FUNCTION public.admin_submit_attendance_report TO authenticated;
