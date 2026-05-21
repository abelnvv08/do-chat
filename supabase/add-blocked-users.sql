CREATE TABLE IF NOT EXISTS demo_blocked_users (
  user_id        UUID NOT NULL,
  blocked_user_id UUID NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, blocked_user_id)
);
CREATE INDEX IF NOT EXISTS demo_blocked_users_user_id_idx ON demo_blocked_users(user_id);
