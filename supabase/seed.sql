-- Datos de prueba para Hostelería Asistencia
-- IMPORTANTE: Primero crea los usuarios en Supabase Auth (ver README)
-- Luego sustituye los UUIDs de abajo por los reales de auth.users

-- Ejemplo de UUIDs (cámbialos tras crear usuarios en Authentication > Users):
-- admin@test.com       → reemplaza ADMIN_UUID
-- resp1@test.com       → reemplaza RESP1_UUID
-- resp2@test.com       → reemplaza RESP2_UUID

-- Desactiva temporalmente el trigger si insertas perfiles manualmente:
-- Los perfiles se crean automáticamente al registrar usuarios vía Auth.
-- Este seed asume que ya existen en auth.users y actualiza sus perfiles.

-- === PASO 1: Actualizar perfiles (ejecutar tras crear usuarios en Auth) ===
-- UPDATE public.profiles SET full_name = 'Admin Principal', role = 'admin' WHERE id = 'ADMIN_UUID';
-- UPDATE public.profiles SET full_name = 'María García', role = 'responsible' WHERE id = 'RESP1_UUID';
-- UPDATE public.profiles SET full_name = 'Carlos López', role = 'responsible' WHERE id = 'RESP2_UUID';

-- === PASO 2: Centros de prueba ===
INSERT INTO public.centers (id, name, address, active) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Restaurante La Plaza', 'Calle Mayor 15, Madrid', true),
  ('a0000000-0000-4000-8000-000000000002', 'Hotel Costa Azul', 'Av. del Mar 42, Valencia', true)
ON CONFLICT (id) DO NOTHING;

-- === PASO 3: Asignar responsables a centros ===
-- Sustituye RESP1_UUID y RESP2_UUID por los UUIDs reales
-- INSERT INTO public.responsible_centers (responsible_id, center_id) VALUES
--   ('RESP1_UUID', 'a0000000-0000-4000-8000-000000000001'),
--   ('RESP1_UUID', 'a0000000-0000-4000-8000-000000000002'),
--   ('RESP2_UUID', 'a0000000-0000-4000-8000-000000000001');

-- === PASO 4: Empleados de prueba ===
INSERT INTO public.employees (center_id, full_name, dni_nie, phone, position, start_date, active) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Ana Martínez', '12345678A', '600111222', 'Camarera', '2024-01-15', true),
  ('a0000000-0000-4000-8000-000000000001', 'Pedro Sánchez', '87654321B', '600333444', 'Cocinero', '2023-06-01', true),
  ('a0000000-0000-4000-8000-000000000001', 'Laura Ruiz', '11223344C', '600555666', 'Jefe de sala', '2022-03-10', true),
  ('a0000000-0000-4000-8000-000000000002', 'Miguel Torres', '55667788D', '600777888', 'Recepcionista', '2024-02-01', true),
  ('a0000000-0000-4000-8000-000000000002', 'Sofía Díaz', '99887766E', '600999000', 'Limpieza', '2023-11-20', true),
  ('a0000000-0000-4000-8000-000000000002', 'Jorge Navarro', '44332211F', '601111222', 'Botones', '2024-05-15', true)
ON CONFLICT DO NOTHING;
