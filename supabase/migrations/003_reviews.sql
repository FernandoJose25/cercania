-- =====================================================================
-- CERCANÍA - Reseñas de usuarios
-- =====================================================================

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT CHECK (char_length(comment) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)  -- un solo review por usuario
);

CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer las reseñas (para mostrarlas en la landing)
CREATE POLICY reviews_select_public ON reviews FOR SELECT USING (true);

-- Solo el propio usuario puede insertar/actualizar su reseña
CREATE POLICY reviews_insert_own ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY reviews_update_own ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY reviews_delete_own ON reviews FOR DELETE USING (auth.uid() = user_id);
