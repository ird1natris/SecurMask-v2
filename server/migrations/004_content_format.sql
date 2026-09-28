ALTER TABLE user_files ADD COLUMN content_format text NOT NULL DEFAULT 'legacy-cipher' CHECK (content_format IN ('legacy-cipher', 'raw_csv'));
