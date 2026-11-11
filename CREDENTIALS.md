# Credential classification

No auth source was changed. Alpha decided not to modify auth, migrate, rotate, or purge credentials, and not to change the existing security boundary. The earlier remediation steps in this file were wrong and are withdrawn.

## What the source contains

`functions/_lib/auth.js` stores OAuth client id and secret as these environment variable names:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`

Token requests read `env[cfg.id]` and `env[cfg.secret]`. Those four strings are not OAuth secrets. A commissioning fixture that replaced them with `REDACTED_*` placeholders was incorrect.

`functions/_lib/account-profile.js` contains `OWNER_EMAIL_HASH`. It is the 64-hex SHA-256 of `owner|` plus the owner email, and the code compares `sha256("owner|" + email)` to that value. It is an identity identifier, not a credential. The scanner does not print it.

## Scanner

- Those four environment names are not credential literals.
- `OWNER_EMAIL_HASH` is accepted only when the value is 64 hex characters and the same file compares it to `sha256("owner|" + email)`. A 64-hex value on `secret`, `client_secret`, `api_key`, `password`, or any other key is still refused. A 64-hex `OWNER_EMAIL_HASH` without that comparison is still refused.
- `REDACTED` placeholders are class `diagnostic` and `deploy` refuses them.
- Private-key blocks, `GOCSPX-` tokens, `AKIA` access-key ids, and other quoted credential literals refuse commissioning. The value is not printed.
- Private source must not be copied into the public upload. That rule is unchanged.

Unmodified source in this shape can be commissioned. Historical `36d85669` stays `validated 0`. A production-class publish test that substitutes a local command for `npx` does not prove a remote upload.
