-- =====================================================================
-- 005_push_notifications.sql
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- Tabla para tokens de push
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios' | 'android'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pt_select" ON push_tokens;
CREATE POLICY "pt_select" ON push_tokens FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pt_insert" ON push_tokens;
CREATE POLICY "pt_insert" ON push_tokens FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pt_update" ON push_tokens;
CREATE POLICY "pt_update" ON push_tokens FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pt_delete" ON push_tokens;
CREATE POLICY "pt_delete" ON push_tokens FOR DELETE USING (user_id = auth.uid());

-- Función para guardar token
CREATE OR REPLACE FUNCTION save_push_token(p_token TEXT, p_platform TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO push_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, p_platform)
  ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW();
  RETURN json_build_object('saved', true);
END;
$$;

-- Función para obtener tokens de los miembros de un grupo
CREATE OR REPLACE FUNCTION get_group_push_tokens(p_group_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(pt.token)
    FROM push_tokens pt
    JOIN group_members gm ON gm.user_id = pt.user_id
    WHERE gm.group_id = p_group_id
    AND pt.user_id != auth.uid()
  );
END;
$$;

-- Función para obtener tokens de contactos de confianza
CREATE OR REPLACE FUNCTION get_trusted_contact_tokens(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(pt.token)
    FROM push_tokens pt
    JOIN trusted_contacts tc ON tc.contact_id = pt.user_id
    WHERE tc.user_id = p_user_id AND tc.status = 'accepted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION save_push_token TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_push_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION get_trusted_contact_tokens TO authenticated;
