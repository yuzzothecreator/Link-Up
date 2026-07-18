# Link-Up credentials & staff access

Link-Up login is:

**phone number + password** (daily use)

SMS OTP is still used for:

- proving phone ownership at registration
- resetting a forgotten password

## Borrowers

1. Register with name, phone, password
2. Confirm SMS code once
3. Later logins: phone + password only

Forgot password → `/auth/reset-password` (SMS code + new password).

## Production staff (protected)

### 1. Set real phones in env (do not commit)

```env
BOOTSTRAP_ADMIN_PHONE=+2557XXXXXXXX
BOOTSTRAP_ADMIN_NAME=Your Real Name
BOOTSTRAP_LENDER_PHONE=+2557YYYYYYYY
BOOTSTRAP_LENDER_NAME=Provider Contact
BOOTSTRAP_LENDER_ORG=Link-Up Partner Bank
ALLOW_TEST_OTP=false
```

### 2. Bootstrap once

```bash
npm run bootstrap:staff
```

Then open `/auth/reset-password` for that phone to set a password (SMS OTP).

### 3. Grant more staff later

**Admin → Users → Grant staff access**, then that person sets a password via reset.

## Database

Run in Supabase SQL Editor:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
```

(Or run `migrations/005_password_auth.sql`.)

## Production blocks

| Thing | Behavior |
| --- | --- |
| Demo phones `+255711/722/733` | Rejected for OTP |
| `ALLOW_TEST_OTP=true` | Ignored in production |
| Register as admin | Impossible (always borrower) |

## Secrets (never commit)

`SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `BRIQ_API_KEY`, Tembo secrets, `BOOTSTRAP_*` phones.
