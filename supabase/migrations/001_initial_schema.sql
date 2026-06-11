-- =====================================================================
-- CERCANÍA - Esquema completo de base de datos
-- App de localización familiar en tiempo real
-- =====================================================================
-- Ejecutar en Supabase SQL Editor en orden.
-- Requiere las extensiones: uuid-ossp, pgcrypto, postgis (opcional)
-- =====================================================================

-- =====================================================================
-- EXTENSIONES
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- PostGIS opcional para geofencing avanzado; con lat/lng básico no es obligatorio.
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================================
-- TIPOS ENUMERADOS
-- =====================================================================
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'child', 'elder');
CREATE TYPE recovery_status AS ENUM ('pending', 'approved', 'cancelled', 'completed', 'expired');
CREATE TYPE sos_status AS ENUM ('active', 'resolved', 'false_alarm');
CREATE TYPE invisible_reason AS ENUM ('manual', 'scheduled', 'recovery_lock');
CREATE TYPE history_retention AS ENUM ('1_day', '7_days', '30_days', 'never_save');
CREATE TYPE geofence_event_type AS ENUM ('enter', 'exit');

-- =====================================================================
-- TABLA: profiles
-- Extiende auth.users de Supabase con datos públicos del usuario.
-- NOTA: is_minor es columna normal actualizada por trigger.
--       CURRENT_DATE no es IMMUTABLE y no puede usarse en GENERATED columns.
-- =====================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 50),
  avatar_url TEXT,
  phone TEXT,
  backup_email TEXT,
  backup_phone TEXT,
  date_of_birth DATE,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;

-- =====================================================================
-- TABLA: user_settings
-- =====================================================================
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Seguridad
  biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  keep_session_days INTEGER NOT NULL DEFAULT 30 CHECK (keep_session_days IN (0, 7, 30)),
  -- Privacidad
  history_retention history_retention NOT NULL DEFAULT '7_days',
  allow_invisible_mode BOOLEAN NOT NULL DEFAULT TRUE,
  -- Tracking
  tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  battery_saver_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  -- Notificaciones
  notify_low_battery BOOLEAN NOT NULL DEFAULT TRUE,
  notify_arrivals BOOLEAN NOT NULL DEFAULT TRUE,
  notify_sos BOOLEAN NOT NULL DEFAULT TRUE,
  push_token TEXT,
  -- Sistema
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLA: groups
-- =====================================================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  emoji TEXT DEFAULT '👨‍👩‍👧‍👦',
  color TEXT DEFAULT '#F59E0B',
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_owner ON groups(owner_id);

-- =====================================================================
-- TABLA: group_members
-- =====================================================================
CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  nickname TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON group_members(user_id);

-- =====================================================================
-- TABLA: group_invitations
-- =====================================================================
CREATE TABLE group_invitations (
  code TEXT PRIMARY KEY CHECK (char_length(code) = 6),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_uses INTEGER DEFAULT 1 CHECK (max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_group ON group_invitations(group_id);

-- =====================================================================
-- TABLA: locations
-- =====================================================================
CREATE TABLE locations (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  battery_level SMALLINT CHECK (battery_level BETWEEN 0 AND 100),
  is_charging BOOLEAN,
  is_moving BOOLEAN NOT NULL DEFAULT FALSE,
  activity TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- TABLA: location_history
-- =====================================================================
CREATE TABLE location_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user_time ON location_history(user_id, recorded_at DESC);

-- =====================================================================
-- TABLA: invisible_mode
-- =====================================================================
CREATE TABLE invisible_mode (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  reason invisible_reason NOT NULL DEFAULT 'manual',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- =====================================================================
-- TABLA: location_views_log
-- =====================================================================
CREATE TABLE location_views_log (
  id BIGSERIAL PRIMARY KEY,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_views_viewed ON location_views_log(viewed_id, viewed_at DESC);

-- =====================================================================
-- TABLA: geofences
-- =====================================================================
CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  emoji TEXT DEFAULT '📍',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 150 CHECK (radius_meters BETWEEN 50 AND 2000),
  notify_on_enter BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_exit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofences_group ON geofences(group_id);

-- =====================================================================
-- TABLA: geofence_events
-- =====================================================================
CREATE TABLE geofence_events (
  id BIGSERIAL PRIMARY KEY,
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type geofence_event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofence_events_recent ON geofence_events(user_id, geofence_id, occurred_at DESC);

-- =====================================================================
-- TABLA: sos_alerts
-- =====================================================================
CREATE TABLE sos_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  audio_url TEXT,
  photo_url TEXT,
  message TEXT,
  status sos_status NOT NULL DEFAULT 'active',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_sos_user_active ON sos_alerts(user_id) WHERE status = 'active';

-- =====================================================================
-- TABLA: trusted_contacts
-- =====================================================================
CREATE TABLE trusted_contacts (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, contact_id),
  CHECK (user_id <> contact_id)
);

CREATE INDEX idx_trusted_contact ON trusted_contacts(contact_id);

-- =====================================================================
-- TABLA: recovery_requests
-- =====================================================================
CREATE TABLE recovery_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executable_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  required_approvals INTEGER NOT NULL DEFAULT 3,
  current_approvals INTEGER NOT NULL DEFAULT 0,
  status recovery_status NOT NULL DEFAULT 'pending',
  cancelled_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  reset_token TEXT,
  device_fingerprint TEXT,
  ip_address INET
);

CREATE INDEX idx_recovery_user ON recovery_requests(user_id);

-- =====================================================================
-- TABLA: recovery_approvals
-- =====================================================================
CREATE TABLE recovery_approvals (
  request_id UUID NOT NULL REFERENCES recovery_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  biometric_verified BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (request_id, approver_id)
);

-- =====================================================================
-- TABLA: account_panic_locks
-- =====================================================================
CREATE TABLE account_panic_locks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- =====================================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================================

CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION users_share_group(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM group_members ga
    INNER JOIN group_members gb ON ga.group_id = gb.group_id
    WHERE ga.user_id = user_a AND gb.user_id = user_b
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_group_member(grp UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = grp AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_group_admin(grp UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = grp AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION haversine_meters(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r CONSTANT DOUBLE PRECISION := 6371000;
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  RETURN r * 2 * atan2(sqrt(a), sqrt(1 - a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  DELETE FROM location_history lh
  USING user_settings us
  WHERE lh.user_id = us.user_id
    AND (
      (us.history_retention = '1_day'   AND lh.recorded_at < NOW() - INTERVAL '1 day')  OR
      (us.history_retention = '7_days'  AND lh.recorded_at < NOW() - INTERVAL '7 days') OR
      (us.history_retention = '30_days' AND lh.recorded_at < NOW() - INTERVAL '30 days')
    );

  DELETE FROM group_invitations WHERE expires_at < NOW();
  DELETE FROM geofence_events WHERE occurred_at < NOW() - INTERVAL '30 days';
  DELETE FROM location_views_log WHERE viewed_at < NOW() - INTERVAL '90 days';

  UPDATE recovery_requests SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  DELETE FROM account_panic_locks WHERE locked_until < NOW();
  DELETE FROM invisible_mode WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Programar con pg_cron (Database > Extensions):
-- SELECT cron.schedule('cleanup-cercania', '0 3 * * *', 'SELECT cleanup_old_data()');

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Crea automáticamente profile y user_settings al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Mantiene updated_at al día
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Actualiza is_minor en INSERT y UPDATE (reemplaza la columna GENERATED)
CREATE OR REPLACE FUNCTION update_is_minor()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_minor := NEW.date_of_birth IS NOT NULL
    AND NEW.date_of_birth > (CURRENT_DATE - INTERVAL '18 years');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_is_minor
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_is_minor();

-- Límite de 5 contactos de confianza por usuario
CREATE OR REPLACE FUNCTION check_trusted_contacts_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM trusted_contacts WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Máximo 5 contactos de confianza por usuario';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trusted_contacts_limit
BEFORE INSERT ON trusted_contacts
FOR EACH ROW EXECUTE FUNCTION check_trusted_contacts_limit();

-- Activa invisible_mode al iniciar recuperación
CREATE OR REPLACE FUNCTION on_recovery_started()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO invisible_mode (user_id, reason, started_at, expires_at)
  VALUES (NEW.user_id, 'recovery_lock', NOW(), NEW.executable_at)
  ON CONFLICT (user_id) DO UPDATE
    SET reason = 'recovery_lock',
        started_at = NOW(),
        expires_at = NEW.executable_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recovery_pauses_location
AFTER INSERT ON recovery_requests
FOR EACH ROW EXECUTE FUNCTION on_recovery_started();

-- Auto-actualiza contador de aprobaciones
CREATE OR REPLACE FUNCTION update_approval_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE recovery_requests
  SET current_approvals = (
    SELECT COUNT(*) FROM recovery_approvals
    WHERE request_id = NEW.request_id AND biometric_verified = TRUE
  )
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER count_approvals
AFTER INSERT ON recovery_approvals
FOR EACH ROW EXECUTE FUNCTION update_approval_count();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invisible_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_views_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_panic_locks ENABLE ROW LEVEL SECURITY;

-- -------- PROFILES --------
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (auth.uid() = id OR users_share_group(auth.uid(), id));
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- -------- USER_SETTINGS --------
CREATE POLICY settings_select_own ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY settings_update_own ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY settings_insert_own ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -------- GROUPS --------
CREATE POLICY groups_select_member ON groups FOR SELECT USING (is_group_member(id));
CREATE POLICY groups_insert_authenticated ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY groups_update_admin ON groups FOR UPDATE USING (is_group_admin(id));
CREATE POLICY groups_delete_owner ON groups FOR DELETE USING (owner_id = auth.uid());

-- -------- GROUP_MEMBERS --------
CREATE POLICY members_select_same_group ON group_members FOR SELECT
  USING (is_group_member(group_id));
CREATE POLICY members_insert_self_or_admin ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_group_admin(group_id));
CREATE POLICY members_update_admin ON group_members FOR UPDATE
  USING (is_group_admin(group_id));
CREATE POLICY members_delete_self_or_admin ON group_members FOR DELETE
  USING (user_id = auth.uid() OR is_group_admin(group_id));

-- -------- GROUP_INVITATIONS --------
CREATE POLICY invites_select_member ON group_invitations FOR SELECT
  USING (is_group_member(group_id));
CREATE POLICY invites_create_admin ON group_invitations FOR INSERT
  WITH CHECK (is_group_admin(group_id) AND created_by = auth.uid());
CREATE POLICY invites_delete_admin ON group_invitations FOR DELETE
  USING (is_group_admin(group_id));

-- -------- LOCATIONS --------
CREATE POLICY locations_select_shared ON locations FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      users_share_group(auth.uid(), user_id)
      AND NOT EXISTS (SELECT 1 FROM invisible_mode WHERE user_id = locations.user_id)
    )
  );
CREATE POLICY locations_upsert_own ON locations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY locations_update_own ON locations FOR UPDATE USING (user_id = auth.uid());

-- -------- LOCATION_HISTORY --------
CREATE POLICY history_all_own ON location_history FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- -------- INVISIBLE_MODE --------
CREATE POLICY invisible_select_shared ON invisible_mode FOR SELECT
  USING (user_id = auth.uid() OR users_share_group(auth.uid(), user_id));
CREATE POLICY invisible_manage_own ON invisible_mode FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- -------- LOCATION_VIEWS_LOG --------
CREATE POLICY views_select_involved ON location_views_log FOR SELECT
  USING (viewer_id = auth.uid() OR viewed_id = auth.uid());
CREATE POLICY views_insert_self ON location_views_log FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- -------- GEOFENCES --------
CREATE POLICY geofences_select_group ON geofences FOR SELECT
  USING (is_group_member(group_id));
CREATE POLICY geofences_insert_member ON geofences FOR INSERT
  WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());
CREATE POLICY geofences_update_creator_or_admin ON geofences FOR UPDATE
  USING (created_by = auth.uid() OR is_group_admin(group_id));
CREATE POLICY geofences_delete_creator_or_admin ON geofences FOR DELETE
  USING (created_by = auth.uid() OR is_group_admin(group_id));

-- -------- GEOFENCE_EVENTS --------
CREATE POLICY geofence_events_select_group ON geofence_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM geofences g
    WHERE g.id = geofence_id AND is_group_member(g.group_id)
  ));
CREATE POLICY geofence_events_insert_own ON geofence_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- -------- SOS_ALERTS --------
CREATE POLICY sos_select_trusted_or_group ON sos_alerts FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM trusted_contacts WHERE user_id = sos_alerts.user_id AND contact_id = auth.uid())
    OR users_share_group(auth.uid(), user_id)
  );
CREATE POLICY sos_insert_own ON sos_alerts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY sos_update_own_or_trusted ON sos_alerts FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM trusted_contacts WHERE user_id = sos_alerts.user_id AND contact_id = auth.uid())
  );

-- -------- TRUSTED_CONTACTS --------
CREATE POLICY trusted_select_involved ON trusted_contacts FOR SELECT
  USING (user_id = auth.uid() OR contact_id = auth.uid());
CREATE POLICY trusted_manage_own ON trusted_contacts FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- -------- RECOVERY_REQUESTS --------
CREATE POLICY recovery_select_involved ON recovery_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM trusted_contacts WHERE user_id = recovery_requests.user_id AND contact_id = auth.uid())
  );
CREATE POLICY recovery_insert_via_function ON recovery_requests FOR INSERT WITH CHECK (FALSE);
CREATE POLICY recovery_update_panic ON recovery_requests FOR UPDATE
  USING (user_id = auth.uid());

-- -------- RECOVERY_APPROVALS --------
CREATE POLICY approvals_select_involved ON recovery_approvals FOR SELECT
  USING (
    approver_id = auth.uid()
    OR EXISTS (SELECT 1 FROM recovery_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
  );
CREATE POLICY approvals_insert_trusted ON recovery_approvals FOR INSERT
  WITH CHECK (
    approver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM recovery_requests r
      INNER JOIN trusted_contacts tc ON tc.user_id = r.user_id
      WHERE r.id = request_id AND tc.contact_id = auth.uid()
    )
  );

-- -------- ACCOUNT_PANIC_LOCKS --------
CREATE POLICY panic_select_own ON account_panic_locks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY panic_insert_own ON account_panic_locks FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- REALTIME
-- =====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
ALTER PUBLICATION supabase_realtime ADD TABLE invisible_mode;
ALTER PUBLICATION supabase_realtime ADD TABLE sos_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE geofence_events;
ALTER PUBLICATION supabase_realtime ADD TABLE recovery_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE recovery_approvals;

-- =====================================================================
-- JOB DE LIMPIEZA (auto-borrado del historial según preferencia)
-- =====================================================================
-- PASO 1: Habilitar pg_cron desde Dashboard > Database > Extensions
-- PASO 2: Ejecutar esta línea por separado una vez que pg_cron esté activo:
SELECT cron.schedule('cleanup-cercania', '0 3 * * *', 'SELECT cleanup_old_data()');
-- Corre todos los días a las 3:00 AM UTC.
-- Para verificar que quedó programado:
-- SELECT * FROM cron.job;
-- Para eliminar el job si necesitas:
-- SELECT cron.unschedule('cleanup-cercania');

-- =====================================================================
-- FIN
-- =====================================================================
