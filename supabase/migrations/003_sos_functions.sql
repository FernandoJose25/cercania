-- =====================================================================
-- 003_sos_functions.sql
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- Función: crear alerta SOS
CREATE OR REPLACE FUNCTION create_sos_alert(
  p_group_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_alert_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Verificar que el usuario es miembro del grupo
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'No eres miembro de este grupo';
  END IF;

  -- Cancelar alertas SOS previas activas del mismo usuario en el mismo grupo
  UPDATE sos_alerts
  SET resolved_at = NOW(), status = 'cancelled'
  WHERE user_id = v_user_id AND group_id = p_group_id AND resolved_at IS NULL;

  -- Crear nueva alerta
  INSERT INTO sos_alerts (user_id, group_id, latitude, longitude, message)
  VALUES (v_user_id, p_group_id, p_lat, p_lng, p_message)
  RETURNING id INTO v_alert_id;

  RETURN json_build_object('alert_id', v_alert_id);
END;
$$;

-- Función: cancelar alerta SOS
CREATE OR REPLACE FUNCTION cancel_sos_alert(
  p_alert_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE sos_alerts
  SET resolved_at = NOW(), status = 'cancelled'
  WHERE id = p_alert_id AND user_id = v_user_id AND resolved_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alerta no encontrada o ya resuelta';
  END IF;

  RETURN json_build_object('cancelled', true);
END;
$$;

-- Función: resolver alerta SOS (otro miembro la atiende)
CREATE OR REPLACE FUNCTION resolve_sos_alert(
  p_alert_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE sos_alerts
  SET resolved_at = NOW(), status = 'resolved', resolved_by = auth.uid()
  WHERE id = p_alert_id AND resolved_at IS NULL;

  RETURN json_build_object('resolved', true);
END;
$$;

-- Agregar columnas si no existen
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

-- RLS para sos_alerts
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sos_select" ON sos_alerts;
CREATE POLICY "sos_select" ON sos_alerts FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = sos_alerts.group_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sos_insert" ON sos_alerts;
CREATE POLICY "sos_insert" ON sos_alerts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sos_update" ON sos_alerts;
CREATE POLICY "sos_update" ON sos_alerts FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = sos_alerts.group_id AND user_id = auth.uid()
  ));

GRANT EXECUTE ON FUNCTION create_sos_alert TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_sos_alert TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_sos_alert TO authenticated;
