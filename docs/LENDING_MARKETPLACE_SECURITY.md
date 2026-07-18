# Link-Up lending marketplace security strategy

## Operating model

Link-Up is a consent-based loan marketplace. It does not act as every lender and it
does not give providers unrestricted access to customers. A regulated bank, telecom,
microfinance institution, SACCO, or fintech owns its products, underwrites assigned
applications, makes offers, and confirms disbursement.

Before production onboarding, each provider must supply current licensing and
contract information. Provider status must remain `pending` until Link-Up verifies it.

## Role model

| Actor | Allowed access |
| --- | --- |
| Borrower | Own profile, transactions, statements, applications, consents and offers |
| Provider viewer | Assigned application metadata and consented disclosures |
| Provider underwriter | Viewer access plus offers and decisions |
| Provider organization admin | Membership, products, offers and decisions for one organization |
| Provider auditor | Read-only audit history for one organization |
| Platform admin | Provider verification and platform oversight; no routine underwriting |

Provider access is based on an active `provider_members` row. A `profiles.role =
'lender'` value alone is not sufficient.

## Customer data-sharing rules

Each application creates one provider-specific consent grant. A provider can only
read scopes listed in the active grant:

- `identity.summary`: name, region and verification statuses; never full NIDA
- `business.profile`: business attributes and declared income
- `trust_score.summary`: score and risk band
- `trust_score.breakdown`: scoring factors
- `cashflow.aggregates`: counts, income, expense and net cash flow
- `cashflow.transactions`: normalized statement rows, explicitly optional
- `wallet.summary`: Link-Up wallet balance, explicitly optional
- `loan_history`: prior facility amount, state and repayment progress
- `assets.summary`: asset metadata, explicitly optional

Full NIDA, bank-account numbers, mobile-money identifiers, credentials, and KYC
document files are excluded from normal lender disclosures.

Every lender disclosure creates a `data_access_audit` row. Consent expires after 90
days by default and can be revoked before an offer is accepted.

## Financial transaction access

Tanzania does not currently provide one universal open-banking API. Link-Up therefore
supports two controlled modes:

1. **Statement upload** — customer exports a CSV from a bank or mobile-money provider.
   Link-Up parses, deduplicates and stores normalized rows.
2. **Contracted provider API** — add only after a bank/MNO contract supplies an
   authorized API, credentials, webhook verification, retention rules and customer
   consent requirements.

Do not scrape customer SMS, contacts, call logs, device files, or mobile apps. Do not
request a mobile-money PIN. Link-Up should participate in the Bank of Tanzania
regulatory process/sandbox and comply with the Personal Data Protection Act.

## Loan lifecycle

1. Platform verifies provider and activates products.
2. Borrower verifies phone and NIDA and builds a Trust Score.
3. Borrower selects a product and grants explicit scopes.
4. Only members of that provider can review the assigned application.
5. Underwriter makes an offer or rejects with a reason.
6. Borrower accepts one offer; competing offers are closed.
7. Provider performs final checks and disburses through a contracted payout API.
8. Link-Up marks the facility funded only after an authenticated provider callback.
9. Repayments and CRB reporting are handled by the licensed provider.

## Production requirements

- Run `migrations/003_lender_marketplace.sql`.
- Replace seeded provider organizations with contracted, licensed providers.
- Require OTP for every login; test OTP is disabled unless `ALLOW_TEST_OTP=true` in
  non-production.
- Rotate session tokens after eight hours and resolve privileged roles from the DB.
- Configure `TEMBO_WEBHOOK_SECRET` and a public HTTPS callback URL.
- Move wallet credits/disbursements into an atomic PostgreSQL function before real
  money scale.
- Integrate a licensed Credit Reference Bureau only with written borrower consent.
- Add retention/deletion jobs for expired consents and imported transactions.
- Register required data processing with the relevant Tanzanian authorities and have
  legal counsel review provider and borrower agreements.
