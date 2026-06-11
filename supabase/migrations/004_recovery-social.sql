-- =====================================================================
-- 004_recovery_social.sql
-- Ejecutar en Supabase SQL Editor
-- Sistema de recuperación social completo
-- =====================================================================

-- Tabla: contactos de confianza
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_user_id)
);

-- Tabla: solicitudes de recuperación
CREATE TABLE IF NOT EXISTS recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  new_email TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, cancelled, completed
  approvals_needed INT DEFAULT 3,
  approvals_count INT DEFAULT 0,
  panic_cancelled BOOLEAN DEFAULT FALSE,
  executable_from TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabla: aprobaciones individuales
CREATE TABLE IF NOT EXISTS recovery_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES recovery_requests(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, approver_id)
);

-- Tabla: modo invisible
CREATE TABLE IF NOT EXISTS invisible_mode (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS trusted_contacts
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tc_select" ON trusted_contacts;
CREATE POLICY "tc_select" ON trusted_contacts FOR SELECT USING (user_id = auth.uid() OR contact_user_id = auth.uid());
DROP POLICY IF EXISTS "tc_insert" ON trusted_contacts;
CREATE POLICY "tc_insert" ON trusted_contacts FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "tc_update" ON trusted_contacts;
CREATE POLICY "tc_update" ON trusted_contacts FOR UPDATE USING (contact_user_id = auth.uid());
DROP POLICY IF EXISTS "tc_delete" ON trusted_contacts;
CREATE POLICY "tc_delete" ON trusted_contacts FOR DELETE USING (user_id = auth.uid() OR contact_user_id = auth.uid());

-- RLS recovery_requests
ALTER TABLE recovery_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rr_select" ON recovery_requests;
CREATE POLICY "rr_select" ON recovery_requests FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM trusted_contacts WHERE user_id = recovery_requests.user_id AND contact_user_id = auth.uid() AND status = 'accepted')
);
DROP POLICY IF EXISTS "rr_insert" ON recovery_requests;
CREATE POLICY "rr_insert" ON recovery_requests FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "rr_update" ON recovery_requests;
CREATE POLICY "rr_update" ON recovery_requests FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM trusted_contacts WHERE user_id = recovery_requests.user_id AND contact_user_id = auth.uid() AND status = 'accepted'
));

-- RLS recovery_approvals
ALTER TABLE recovery_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ra_select" ON recovery_approvals;
CREATE POLICY "ra_select" ON recovery_approvals FOR SELECT USING (approver_id = auth.uid() OR EXISTS (
  SELECT 1 FROM recovery_requests WHERE id = recovery_approvals.request_id AND user_id = auth.uid()
));
DROP POLICY IF EXISTS "ra_insert" ON recovery_approvals;
CREATE POLICY "ra_insert" ON recovery_approvals FOR INSERT WITH CHECK (approver_id = auth.uid());

-- RLS invisible_mode
ALTER TABLE invisible_mode ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "im_select" ON invisible_mode;
CREATE POLICY "im_select" ON invisible_mode FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "im_insert" ON invisible_mode;
CREATE POLICY "im_insert" ON invisible_mode FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "im_delete" ON invisible_mode;
CREATE POLICY "im_delete" ON invisible_mode FOR DELETE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "im_update" ON invisible_mode;
CREATE POLICY "im_update" ON invisible_mode FOR UPDATE USING (user_id = auth.uid());

-- Función: invitar contacto de confianza
CREATE OR REPLACE FUNCTION invite_trusted_contact(p_contact_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF v_user_id = p_contact_user_id THEN RAISE EXCEPTION 'No puedes agregarte a ti mismo'; END IF;
  SELECT COUNT(*) INTO v_count FROM trusted_contacts WHERE user_id = v_user_id AND status = 'accepted';
  IF v_count >= 5 THEN RAISE EXCEPTION 'Máximo 5 contactos de confianza'; END IF;
  INSERT INTO trusted_contacts (user_id, contact_user_id) VALUES (v_user_id, p_contact_user_id)
  ON CONFLICT (user_id, contact_user_id) DO NOTHING;
  RETURN json_build_object('invited', true);
END;
$$;

-- Función: responder invitación
CREATE OR REPLACE FUNCTION respond_trusted_contact(p_request_id UUID, p_accept BOOLEAN)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE trusted_contacts
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END
  WHERE id = p_request_id AND contact_user_id = auth.uid();
  RETURN json_build_object('accepted', p_accept);
END;
$$;

-- Función: crear solicitud de recuperación
CREATE OR REPLACE FUNCTION create_recovery_request(p_email TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_req_id UUID;
  v_contacts_count INT;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No se encontró ninguna cuenta con ese correo'; END IF;
  SELECT COUNT(*) INTO v_contacts_count FROM trusted_contacts WHERE user_id = v_user_id AND status = 'accepted';
  IF v_contacts_count < 3 THEN RAISE EXCEPTION 'Esta cuenta no tiene suficientes contactos de confianza configurados'; END IF;
  -- Cancelar solicitudes previas pendientes
  UPDATE recovery_requests SET status = 'cancelled' WHERE user_id = v_user_id AND status = 'pending';
  INSERT INTO recovery_requests (user_id, new_email, approvals_needed, executable_from)
  VALUES (v_user_id, p_email, LEAST(v_contacts_count, 3), NOW() + INTERVAL '48 hours')
  RETURNING id INTO v_req_id;
  RETURN json_build_object('request_id', v_req_id);
END;
$$;

-- Función: aprobar recuperación
CREATE OR REPLACE FUNCTION approve_recovery_request(p_request_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_approver_id UUID := auth.uid();
  v_req recovery_requests%ROWTYPE;
  v_new_count INT;
BEGIN
  SELECT * INTO v_req FROM recovery_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada o ya procesada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM trusted_contacts WHERE user_id = v_req.user_id AND contact_user_id = v_approver_id AND status = 'accepted') THEN
    RAISE EXCEPTION 'No eres contacto de confianza de este usuario';
  END IF;
  INSERT INTO recovery_approvals (request_id, approver_id) VALUES (p_request_id, v_approver_id)
  ON CONFLICT DO NOTHING;
  SELECT COUNT(*) INTO v_new_count FROM recovery_approvals WHERE request_id = p_request_id;
  UPDATE recovery_requests SET approvals_count = v_new_count WHERE id = p_request_id;
  IF v_new_count >= v_req.approvals_needed THEN
    UPDATE recovery_requests SET status = 'approved' WHERE id = p_request_id;
  END IF;
  RETURN json_build_object('approvals_count', v_new_count, 'needed', v_req.approvals_needed);
END;
$$;

-- Función: modo pánico (cancelar recuperación fraudulenta)
CREATE OR REPLACE FUNCTION panic_cancel_recovery(p_email TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Cuenta no encontrada'; END IF;
  UPDATE recovery_requests SET status = 'cancelled', panic_cancelled = TRUE
  WHERE user_id = v_user_id AND status IN ('pending', 'approved');
  RETURN json_build_object('cancelled', true);
END;
$$;

-- Función: activar modo invisible
CREATE OR REPLACE FUNCTION set_invisible_mode(p_hours INT DEFAULT 1)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_expires TIMESTAMPTZ := NOW() + (p_hours || ' hours')::INTERVAL;
BEGIN
  INSERT INTO invisible_mode (user_id, expires_at) VALUES (v_user_id, v_expires)
  ON CONFLICT (user_id) DO UPDATE SET expires_at = v_expires, created_at = NOW();
  RETURN json_build_object('invisible_until', v_expires);
END;
$$;

-- Función: desactivar modo invisible
CREATE OR REPLACE FUNCTION disable_invisible_mode()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM invisible_mode WHERE user_id = auth.uid();
  RETURN json_build_object('visible', true);
END;
$$;

GRANT EXECUTE ON FUNCTION invite_trusted_contact TO authenticated;
GRANT EXECUTE ON FUNCTION respond_trusted_contact TO authenticated;
GRANT EXECUTE ON FUNCTION create_recovery_request TO authenticated;
GRANT EXECUTE ON FUNCTION approve_recovery_request TO authenticated;
GRANT EXECUTE ON FUNCTION panic_cancel_recovery TO authenticated;
GRANT EXECUTE ON FUNCTION set_invisible_mode TO authenticated;
GRANT EXECUTE ON FUNCTION disable_invisible_mode TO authenticated;
