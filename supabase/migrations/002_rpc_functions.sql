-- =====================================================================
-- CERCANÍA - Funciones RPC (operaciones complejas)
-- Ejecutar después de 001_initial_schema.sql
-- =====================================================================
-- Estas funciones encapsulan lógica que combina varias tablas y se
-- exponen al cliente vía supabase.rpc('nombre_funcion', { ... })
-- Todas usan SECURITY DEFINER + chequeos explícitos de auth.uid()
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_group_with_invite: crea grupo, agrega owner, devuelve código
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_group_with_invite(
  p_name TEXT,
  p_emoji TEXT DEFAULT '👨‍👩‍👧‍👦',
  p_color TEXT DEFAULT '#F59E0B'
) RETURNS JSON AS $$
DECLARE
  v_user UUID := auth.uid();
  v_group_id UUID;
  v_code TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  INSERT INTO groups (name, emoji, color, owner_id)
  VALUES (p_name, p_emoji, p_color, v_user)
  RETURNING id INTO v_group_id;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user, 'owner');

  LOOP
    v_code := generate_invitation_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM group_invitations WHERE code = v_code);
  END LOOP;

  INSERT INTO group_invitations (code, group_id, created_by, max_uses)
  VALUES (v_code, v_group_id, v_user, 10);

  RETURN json_build_object(
    'group_id', v_group_id,
    'invite_code', v_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- join_group_with_code: une al usuario actual a un grupo
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION join_group_with_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_user UUID := auth.uid();
  v_invite group_invitations%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT * INTO v_invite FROM group_invitations WHERE code = upper(p_code);

  IF NOT FOUND THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF v_invite.expires_at < NOW() THEN RAISE EXCEPTION 'Código expirado'; END IF;
  IF v_invite.uses_count >= v_invite.max_uses THEN RAISE EXCEPTION 'Código agotado'; END IF;

  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = v_invite.group_id AND user_id = v_user) THEN
    RAISE EXCEPTION 'Ya eres miembro de este grupo';
  END IF;

  INSERT INTO group_members (group_id, user_id, role) VALUES (v_invite.group_id, v_user, 'member');
  UPDATE group_invitations SET uses_count = uses_count + 1 WHERE code = p_code;

  RETURN json_build_object('group_id', v_invite.group_id, 'joined', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- create_group_invite: genera un nuevo código para un grupo existente
-- Solo puede usarlo el owner/admin del grupo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_group_invite(p_group_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user UUID := auth.uid();
  v_code TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Solo el administrador puede generar códigos';
  END IF;

  LOOP
    v_code := generate_invitation_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM group_invitations WHERE code = v_code);
  END LOOP;

  INSERT INTO group_invitations (code, group_id, created_by, max_uses)
  VALUES (v_code, p_group_id, v_user, 50);

  RETURN json_build_object('code', v_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- toggle_invisible_mode: activar/desactivar invisibilidad
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION toggle_invisible_mode(p_duration_minutes INT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_user UUID := auth.uid();
  v_settings user_settings%ROWTYPE;
  v_now_invisible BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT * INTO v_settings FROM user_settings WHERE user_id = v_user;
  IF NOT v_settings.allow_invisible_mode THEN
    RAISE EXCEPTION 'Modo invisible deshabilitado para esta cuenta';
  END IF;

  IF EXISTS (SELECT 1 FROM invisible_mode WHERE user_id = v_user) THEN
    DELETE FROM invisible_mode WHERE user_id = v_user;
    v_now_invisible := FALSE;
  ELSE
    INSERT INTO invisible_mode (user_id, reason, expires_at)
    VALUES (
      v_user, 'manual',
      CASE WHEN p_duration_minutes IS NULL THEN NULL
           ELSE NOW() + (p_duration_minutes || ' minutes')::INTERVAL END
    );
    v_now_invisible := TRUE;
  END IF;

  RETURN json_build_object('invisible', v_now_invisible);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- update_location: endpoint principal del tracker
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_location(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION DEFAULT NULL,
  p_speed DOUBLE PRECISION DEFAULT NULL,
  p_heading DOUBLE PRECISION DEFAULT NULL,
  p_altitude DOUBLE PRECISION DEFAULT NULL,
  p_battery_level SMALLINT DEFAULT NULL,
  p_is_charging BOOLEAN DEFAULT NULL,
  p_is_moving BOOLEAN DEFAULT FALSE,
  p_activity TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid();
  v_settings user_settings%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT * INTO v_settings FROM user_settings WHERE user_id = v_user;
  IF NOT v_settings.tracking_enabled THEN RETURN; END IF;

  INSERT INTO locations (user_id, latitude, longitude, accuracy, speed, heading, altitude,
                         battery_level, is_charging, is_moving, activity)
  VALUES (v_user, p_lat, p_lng, p_accuracy, p_speed, p_heading, p_altitude,
          p_battery_level, p_is_charging, p_is_moving, p_activity)
  ON CONFLICT (user_id) DO UPDATE SET
    latitude      = EXCLUDED.latitude,
    longitude     = EXCLUDED.longitude,
    accuracy      = EXCLUDED.accuracy,
    speed         = EXCLUDED.speed,
    heading       = EXCLUDED.heading,
    altitude      = EXCLUDED.altitude,
    battery_level = EXCLUDED.battery_level,
    is_charging   = EXCLUDED.is_charging,
    is_moving     = EXCLUDED.is_moving,
    activity      = EXCLUDED.activity,
    updated_at    = NOW();

  IF v_settings.history_retention <> 'never_save' THEN
    INSERT INTO location_history (user_id, latitude, longitude, accuracy)
    VALUES (v_user, p_lat, p_lng, p_accuracy);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- check_geofence_crossings: detecta entrada/salida de geofences
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_geofence_crossings(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS TABLE(geofence_id UUID, name TEXT, event geofence_event_type, group_id UUID) AS $$
DECLARE
  v_user UUID := auth.uid();
  r RECORD;
  v_distance DOUBLE PRECISION;
  v_inside BOOLEAN;
  v_last_event geofence_event_type;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  FOR r IN
    SELECT g.* FROM geofences g
    INNER JOIN group_members gm ON gm.group_id = g.group_id
    WHERE gm.user_id = v_user
  LOOP
    v_distance := haversine_meters(p_lat, p_lng, r.latitude, r.longitude);
    v_inside := v_distance <= r.radius_meters;

    SELECT event_type INTO v_last_event
    FROM geofence_events
    WHERE geofence_events.geofence_id = r.id AND user_id = v_user
    ORDER BY occurred_at DESC LIMIT 1;

    IF v_inside AND (v_last_event IS NULL OR v_last_event = 'exit') AND r.notify_on_enter THEN
      INSERT INTO geofence_events (geofence_id, user_id, event_type) VALUES (r.id, v_user, 'enter');
      geofence_id := r.id; name := r.name; event := 'enter'; group_id := r.group_id;
      RETURN NEXT;
    ELSIF NOT v_inside AND v_last_event = 'enter' AND r.notify_on_exit THEN
      INSERT INTO geofence_events (geofence_id, user_id, event_type) VALUES (r.id, v_user, 'exit');
      geofence_id := r.id; name := r.name; event := 'exit'; group_id := r.group_id;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- start_recovery_request: inicia recuperación social (sin estar logueado)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION start_recovery_request(
  p_email TEXT,
  p_device_fingerprint TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user UUID;
  v_request_id UUID;
  v_trusted_count INT;
  v_required INT;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE email = lower(p_email);
  IF v_user IS NULL THEN
    RETURN json_build_object('status', 'sent_if_exists');
  END IF;

  IF EXISTS (SELECT 1 FROM account_panic_locks WHERE user_id = v_user AND locked_until > NOW()) THEN
    RETURN json_build_object('status', 'locked', 'message', 'Cuenta bloqueada por seguridad');
  END IF;

  SELECT COUNT(*) INTO v_trusted_count FROM trusted_contacts WHERE user_id = v_user;
  IF v_trusted_count < 3 THEN
    RETURN json_build_object('status', 'not_enough_contacts',
      'message', 'Esta cuenta no tiene suficientes contactos de confianza');
  END IF;

  v_required := LEAST(3, v_trusted_count);

  SELECT id INTO v_request_id FROM recovery_requests
  WHERE user_id = v_user AND status = 'pending' AND expires_at > NOW();

  IF v_request_id IS NULL THEN
    INSERT INTO recovery_requests (user_id, required_approvals, device_fingerprint)
    VALUES (v_user, v_required, p_device_fingerprint)
    RETURNING id INTO v_request_id;
  END IF;

  RETURN json_build_object(
    'status', 'pending',
    'request_id', v_request_id,
    'required_approvals', v_required,
    'executable_in_hours', 48
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- panic_cancel_recovery: el usuario real cancela un intento de recuperación
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION panic_cancel_recovery() RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  UPDATE recovery_requests
  SET status = 'cancelled', cancelled_by_user = TRUE
  WHERE user_id = v_user AND status = 'pending';

  INSERT INTO account_panic_locks (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO UPDATE
    SET locked_at = NOW(), locked_until = NOW() + INTERVAL '30 days';

  DELETE FROM invisible_mode WHERE user_id = v_user AND reason = 'recovery_lock';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- approve_recovery: contacto de confianza aprueba un request
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_recovery(
  p_request_id UUID,
  p_biometric_verified BOOLEAN
) RETURNS JSON AS $$
DECLARE
  v_user UUID := auth.uid();
  v_request recovery_requests%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT p_biometric_verified THEN RAISE EXCEPTION 'Aprobación requiere biometría'; END IF;

  SELECT * INTO v_request FROM recovery_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Solicitud no válida o ya procesada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM trusted_contacts
    WHERE user_id = v_request.user_id AND contact_id = v_user
  ) THEN
    RAISE EXCEPTION 'No eres contacto de confianza de este usuario';
  END IF;

  INSERT INTO recovery_approvals (request_id, approver_id, biometric_verified)
  VALUES (p_request_id, v_user, TRUE)
  ON CONFLICT (request_id, approver_id) DO NOTHING;

  RETURN json_build_object('approved', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- get_group_live: snapshot completo del grupo para la pantalla del mapa
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_group_live(p_group_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT is_group_member(p_group_id) THEN RAISE EXCEPTION 'No perteneces al grupo'; END IF;

  RETURN (
    SELECT json_build_object(
      'group', (SELECT row_to_json(g) FROM groups g WHERE id = p_group_id),
      'members', (
        SELECT json_agg(json_build_object(
          'user_id',     gm.user_id,
          'role',        gm.role,
          'nickname',    gm.nickname,
          'profile',     (SELECT row_to_json(p) FROM profiles p WHERE p.id = gm.user_id),
          'location',    (SELECT row_to_json(l) FROM locations l WHERE l.user_id = gm.user_id),
          'is_invisible', EXISTS(SELECT 1 FROM invisible_mode WHERE user_id = gm.user_id),
          'active_sos',  (SELECT row_to_json(s) FROM sos_alerts s
                          WHERE s.user_id = gm.user_id AND s.status = 'active' LIMIT 1)
        )) FROM group_members gm WHERE gm.group_id = p_group_id
      ),
      'geofences', (SELECT json_agg(row_to_json(g)) FROM geofences g WHERE g.group_id = p_group_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
