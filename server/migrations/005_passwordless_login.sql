-- Existing accounts and file ownership remain intact. New accounts need no password.
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
DELETE FROM mfa_otps;
DELETE FROM password_resets;
CREATE TABLE login_codes (
    email varchar(255) PRIMARY KEY,
    otp varchar(64) NOT NULL,
    challenge_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz NOT NULL,
    attempts integer NOT NULL DEFAULT 0
);
