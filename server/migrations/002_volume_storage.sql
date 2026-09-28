-- Retain legacy blobs until files:migrate has safely moved each record.
ALTER TABLE user_files ADD COLUMN file_path text;
ALTER TABLE user_files ADD COLUMN masked_path text;
-- Deletions are recorded in the same transaction as metadata changes.
CREATE TABLE file_cleanup (
    path text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
