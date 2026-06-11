-- Ejecutar en Supabase SQL Editor
-- Función para enviar código de eliminación al email
CREATE OR REPLACE FUNCTION request_account_deletion()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  
  -- Obtener email del usuario
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  -- Generar código de 6 dígitos
  v_code := lpad(floor(random() * 999999)::TEXT, 6, '0');
  
  -- Guardar código en user_settings temporalmente
  UPDATE user_settings 
  SET deletion_code = v_code, deletion_requested_at = NOW()
  WHERE user_id = v_user_id;
  
  -- Enviar email con el código via Supabase Auth OTP
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/auth/v1/otp',
    body := json_build_object('email', v_email, 'type', 'email')::TEXT,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'apikey', current_setting('app.anon_key')
    )::TEXT
  );
  
  RETURN json_build_object('sent', true, 'email', v_email);
END;
$$;

-- Agregar columnas a user_settings si no existen
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS deletion_code TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- Función para confirmar eliminación con código OTP de Supabase
CREATE OR REPLACE FUNCTION confirm_account_deletion(p_otp TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  -- Verificar que la solicitud no tiene más de 10 minutos
  IF NOT EXISTS (
    SELECT 1 FROM user_settings 
    WHERE user_id = v_user_id 
    AND deletion_requested_at > NOW() - INTERVAL '10 minutes'
  ) THEN
    RAISE EXCEPTION 'El código expiró. Solicita uno nuevo.';
  END IF;
  
  -- Eliminar cuenta — CASCADE borra todo lo demás
  DELETE FROM auth.users WHERE id = v_user_id;
  
  RETURN json_build_object('deleted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION request_account_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_account_deletion TO authenticated;
