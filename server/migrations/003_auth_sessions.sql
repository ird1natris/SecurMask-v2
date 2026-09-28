ALTER TABLE users ADD COLUMN session_version integer NOT NULL DEFAULT 0;
-- Pending verification codes belong to the old verification scheme.
DELETE FROM mfa_otps;
DELETE FROM password_resets;
ALTER TABLE mfa_otps ADD COLUMN challenge_id uuid NOT NULL;
ALTER TABLE mfa_otps ADD COLUMN attempts integer NOT NULL DEFAULT 0;
ALTER TABLE password_resets ADD COLUMN attempts integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX mfa_otps_user_unique ON mfa_otps(user_id);
CREATE UNIQUE INDEX password_resets_email_unique ON password_resets(lower(email));
