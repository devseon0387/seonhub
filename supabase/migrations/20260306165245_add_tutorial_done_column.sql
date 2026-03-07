ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS tutorial_done jsonb DEFAULT '{}'::jsonb;
