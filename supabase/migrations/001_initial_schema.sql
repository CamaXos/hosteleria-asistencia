-- Hostelería Asistencia - Esquema inicial
-- Ejecutar en Supabase SQL Editor o con supabase db push

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipos enumerados
CREATE TYPE public.user_role AS ENUM ('admin', 'responsible');
CREATE TYPE public.attendance_status AS ENUM (
  'worked', 'day_off', 'vacation', 'absence', 'sick', 'inactive', 'other'
);
CREATE TYPE public.report_status AS ENUM ('submitted');
CREATE TYPE public.employee_action AS ENUM ('created', 'activated', 'deactivated', 'updated');

-- Perfiles vinculados a auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'responsible',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Centros de trabajo
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asignación responsables ↔ centros
CREATE TABLE public.responsible_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsible_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (responsible_id, center_id)
);

-- Empleados
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dni_nie TEXT,
  phone TEXT,
  position TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Informes diarios de asistencia
CREATE TABLE public.attendance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.report_status NOT NULL DEFAULT 'submitted',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (center_id, report_date)
);

-- Entradas de asistencia por empleado
CREATE TABLE public.attendance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.attendance_reports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, employee_id)
);

-- Historial de cambios de estado de empleados
CREATE TABLE public.employee_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  action public.employee_action NOT NULL,
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoría de correcciones admin
CREATE TABLE public.attendance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_responsible_centers_responsible ON public.responsible_centers(responsible_id);
CREATE INDEX idx_responsible_centers_center ON public.responsible_centers(center_id);
CREATE INDEX idx_employees_center ON public.employees(center_id);
CREATE INDEX idx_employees_active ON public.employees(active);
CREATE INDEX idx_attendance_reports_center_date ON public.attendance_reports(center_id, report_date);
CREATE INDEX idx_attendance_entries_report ON public.attendance_entries(report_id);
CREATE INDEX idx_attendance_entries_employee ON public.attendance_entries(employee_id);

-- Funciones auxiliares para RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_responsible()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'responsible' AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.responsible_has_center(p_center_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responsible_centers
    WHERE responsible_id = auth.uid() AND center_id = p_center_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND active = true;
$$;

-- Trigger: crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuario'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'responsible')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC: enviar informe de asistencia (atómico)
CREATE OR REPLACE FUNCTION public.submit_attendance_report(
  p_center_id UUID,
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

  IF NOT public.is_responsible() THEN
    RAISE EXCEPTION 'Solo los responsables pueden enviar informes';
  END IF;

  IF NOT public.responsible_has_center(p_center_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este centro';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance_reports
    WHERE center_id = p_center_id AND report_date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Ya existe un informe para este centro hoy';
  END IF;

  INSERT INTO public.attendance_reports (center_id, report_date, submitted_by, notes)
  VALUES (p_center_id, CURRENT_DATE, auth.uid(), p_notes)
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

-- RPC: corrección admin con auditoría
CREATE OR REPLACE FUNCTION public.admin_correct_attendance_entry(
  p_entry_id UUID,
  p_new_status public.attendance_status,
  p_new_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_old_notes TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden corregir registros';
  END IF;

  SELECT status::TEXT, notes INTO v_old_status, v_old_notes
  FROM public.attendance_entries WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada no encontrada';
  END IF;

  IF v_old_status IS DISTINCT FROM p_new_status::TEXT THEN
    INSERT INTO public.attendance_audit_logs (table_name, record_id, field_changed, old_value, new_value, changed_by)
    VALUES ('attendance_entries', p_entry_id, 'status', v_old_status, p_new_status::TEXT, auth.uid());
  END IF;

  IF v_old_notes IS DISTINCT FROM p_new_notes THEN
    INSERT INTO public.attendance_audit_logs (table_name, record_id, field_changed, old_value, new_value, changed_by)
    VALUES ('attendance_entries', p_entry_id, 'notes', v_old_notes, p_new_notes, auth.uid());
  END IF;

  UPDATE public.attendance_entries
  SET status = p_new_status, notes = p_new_notes
  WHERE id = p_entry_id;
END;
$$;

-- RPC: crear empleado (responsable o admin)
CREATE OR REPLACE FUNCTION public.create_employee(
  p_center_id UUID,
  p_full_name TEXT,
  p_dni_nie TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_position TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF public.is_admin() THEN
    NULL;
  ELSIF public.is_responsible() AND public.responsible_has_center(p_center_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Sin permisos para crear empleados en este centro';
  END IF;

  INSERT INTO public.employees (center_id, full_name, dni_nie, phone, position, start_date, created_by)
  VALUES (p_center_id, p_full_name, p_dni_nie, p_phone, p_position, p_start_date, auth.uid())
  RETURNING id INTO v_employee_id;

  INSERT INTO public.employee_status_logs (employee_id, action, performed_by, notes)
  VALUES (v_employee_id, 'created', auth.uid(), 'Alta de empleado');

  RETURN v_employee_id;
END;
$$;

-- RPC: desactivar empleado
CREATE OR REPLACE FUNCTION public.deactivate_employee(
  p_employee_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_center_id UUID;
BEGIN
  SELECT center_id INTO v_center_id FROM public.employees WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empleado no encontrado';
  END IF;

  IF public.is_admin() THEN
    NULL;
  ELSIF public.is_responsible() AND public.responsible_has_center(v_center_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Sin permisos';
  END IF;

  UPDATE public.employees
  SET active = false, end_date = CURRENT_DATE
  WHERE id = p_employee_id;

  INSERT INTO public.employee_status_logs (employee_id, action, performed_by, notes)
  VALUES (p_employee_id, 'deactivated', auth.uid(), COALESCE(p_notes, 'Baja de empleado'));
END;
$$;

-- RPC: contar responsables por centro
CREATE OR REPLACE FUNCTION public.count_responsibles_for_center(p_center_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.responsible_centers rc
  JOIN public.profiles p ON p.id = rc.responsible_id
  WHERE rc.center_id = p_center_id AND p.active = true;
$$;

GRANT EXECUTE ON FUNCTION public.count_responsibles_for_center TO authenticated;

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsible_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_select_admin_all" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());

-- RLS: centers
CREATE POLICY "centers_admin_all" ON public.centers
  FOR ALL USING (public.is_admin());

CREATE POLICY "centers_responsible_select" ON public.centers
  FOR SELECT USING (
    public.is_responsible() AND public.responsible_has_center(id)
  );

-- RLS: responsible_centers
CREATE POLICY "responsible_centers_admin_all" ON public.responsible_centers
  FOR ALL USING (public.is_admin());

CREATE POLICY "responsible_centers_own_select" ON public.responsible_centers
  FOR SELECT USING (responsible_id = auth.uid());

-- RLS: employees
CREATE POLICY "employees_admin_all" ON public.employees
  FOR ALL USING (public.is_admin());

CREATE POLICY "employees_responsible_select" ON public.employees
  FOR SELECT USING (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
  );

CREATE POLICY "employees_responsible_insert" ON public.employees
  FOR INSERT WITH CHECK (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
  );

CREATE POLICY "employees_responsible_update" ON public.employees
  FOR UPDATE USING (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
  );

-- RLS: attendance_reports
CREATE POLICY "reports_admin_all" ON public.attendance_reports
  FOR ALL USING (public.is_admin());

CREATE POLICY "reports_responsible_select" ON public.attendance_reports
  FOR SELECT USING (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
    AND report_date = CURRENT_DATE
  );

CREATE POLICY "reports_responsible_insert" ON public.attendance_reports
  FOR INSERT WITH CHECK (
    public.is_responsible()
    AND public.responsible_has_center(center_id)
    AND submitted_by = auth.uid()
    AND report_date = CURRENT_DATE
  );

-- RLS: attendance_entries
CREATE POLICY "entries_admin_all" ON public.attendance_entries
  FOR ALL USING (public.is_admin());

CREATE POLICY "entries_responsible_select" ON public.attendance_entries
  FOR SELECT USING (
    public.is_responsible()
    AND EXISTS (
      SELECT 1 FROM public.attendance_reports r
      WHERE r.id = report_id
        AND public.responsible_has_center(r.center_id)
        AND r.report_date = CURRENT_DATE
    )
  );

CREATE POLICY "entries_responsible_insert" ON public.attendance_entries
  FOR INSERT WITH CHECK (
    public.is_responsible()
    AND EXISTS (
      SELECT 1 FROM public.attendance_reports r
      WHERE r.id = report_id
        AND r.submitted_by = auth.uid()
        AND r.report_date = CURRENT_DATE
        AND public.responsible_has_center(r.center_id)
    )
  );

-- RLS: employee_status_logs
CREATE POLICY "status_logs_admin_all" ON public.employee_status_logs
  FOR ALL USING (public.is_admin());

CREATE POLICY "status_logs_responsible_select" ON public.employee_status_logs
  FOR SELECT USING (
    public.is_responsible()
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
        AND public.responsible_has_center(e.center_id)
    )
  );

CREATE POLICY "status_logs_responsible_insert" ON public.employee_status_logs
  FOR INSERT WITH CHECK (performed_by = auth.uid());

-- RLS: attendance_audit_logs
CREATE POLICY "audit_logs_admin_all" ON public.attendance_audit_logs
  FOR ALL USING (public.is_admin());

-- Permisos para funciones RPC
GRANT EXECUTE ON FUNCTION public.submit_attendance_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_correct_attendance_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_employee TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_employee TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_responsible TO authenticated;
GRANT EXECUTE ON FUNCTION public.responsible_has_center TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role TO authenticated;
