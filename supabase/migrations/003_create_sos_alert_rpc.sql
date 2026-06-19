-- RPC: create_sos_alert
-- Crea una alerta SOS para el usuario autenticado en el grupo indicado.
-- SECURITY DEFINER para poder insertar sin RLS directo desde el cliente.

CREATE OR REPLACE FUNCTION public.create_sos_alert(
    p_group_id UUID,
    p_lat      DOUBLE PRECISION,
    p_lng      DOUBLE PRECISION,
    p_message  TEXT DEFAULT '¡Necesito ayuda!'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_alert_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    -- Verificar que el usuario pertenece al grupo
    IF NOT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'not_group_member';
    END IF;

    -- Cancelar cualquier SOS activo previo del mismo usuario en el grupo
    UPDATE sos_alerts
    SET status = 'resolved', resolved_at = NOW(), resolved_by = v_user_id
    WHERE user_id = v_user_id
      AND group_id = p_group_id
      AND status = 'active';

    -- Crear la nueva alerta
    INSERT INTO sos_alerts (user_id, group_id, latitude, longitude, message, status)
    VALUES (v_user_id, p_group_id, p_lat, p_lng, p_message, 'active')
    RETURNING id INTO v_alert_id;

    RETURN json_build_object('alert_id', v_alert_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sos_alert(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;
