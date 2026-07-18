# Link-Up credentials & staff access

Link-Up does **not** use shared passwords. Every login is:

**real phone number → Briq SMS OTP**

## Production staff (protected)

### 1. Set real phones in env (local or Vercel — do not commit)

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
node --env-file=.env.local scripts/bootstrap-staff.mjs
```

This creates/updates admin and lender profiles with those phones. Roles cannot be self-assigned via register (register always creates `borrower`).

### 3. Log in

1. Open `/auth/login`
2. Enter the **admin phone**
3. Enter the **SMS code** from Briq

Same for lender → `/lender`.

### 4. Grant more staff later

Signed-in admins use **Admin → Users → Grant staff access** with another real phone.

## What is blocked in production

| Thing | Behavior |
| --- | --- |
| `+255711111111` / `722` / `733` demo phones | Rejected for OTP |
| `ALLOW_TEST_OTP=true` | Ignored when `NODE_ENV=production` |
| Fixed OTP `123456` | Local-only with `ALLOW_TEST_OTP` |
| Public registration as admin | Impossible — role is always `borrower` |

## Local demo only (never production)

`seed.sql` / `seed-db.js` create fake `+255711…` accounts for UI testing when `ALLOW_TEST_OTP=true`.

Before client go-live, either:

- Do not run seed on production Supabase, or
- Demote/delete demo rows:

```sql
UPDATE public.profiles
SET role = 'borrower'
WHERE phone IN ('+255711111111', '+255722222222', '+255733333333');
```

## Secrets checklist

Keep these only in Vercel / `.env.local`, never in git:

- `SESSION_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BRIQ_API_KEY`
- `TEMBO_SECRET_KEY` / `TEMBO_WEBHOOK_SECRET`
- `BOOTSTRAP_*` phones (ops only; not required at runtime after bootstrap)
