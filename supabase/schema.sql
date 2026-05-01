-- ============================================
-- do-chat: Schema de base de datos
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extiende auth.users de Supabase)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATION MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'file', 'ai', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update conversation updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Profiles: cualquiera puede leer, solo tú puedes editar el tuyo
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Conversations: solo miembros pueden leer
CREATE POLICY "conversations_read" ON conversations
  FOR SELECT USING (
    id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (created_by = auth.uid());

-- Members: miembros pueden leer, admin puede insertar
CREATE POLICY "members_read" ON conversation_members
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "members_insert" ON conversation_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "members_delete" ON conversation_members
  FOR DELETE USING (user_id = auth.uid());

-- Messages: solo miembros pueden leer y escribir
CREATE POLICY "messages_read" ON messages
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  );

-- Tasks: miembros del chat
CREATE POLICY "tasks_read" ON tasks
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (
    conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  );

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_conversation_id ON tasks(conversation_id);
