# Security policy

## Supported versions

Security fixes land on the `main` branch and in the latest published tag. Older tags are not
maintained.

| Version | Supported |
| ------- | --------- |
| 0.7.x   | Yes       |
| < 0.7   | No        |

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
flow (**Security → Report a vulnerability** on the repository). Do not open a public issue,
pull request or discussion for a suspected vulnerability.

A useful report includes:

- the affected endpoint, component or dependency and its version;
- the steps needed to reproduce the issue;
- the impact you believe it has (for example, privilege escalation, data exposure, denial of
  service);
- any proof-of-concept request, payload or patch you are comfortable sharing.

## Scope

Areas worth testing include the JWT auth flow, the role-based `CUSTOMER` / `ADMIN` guards,
the Zod validation layer, checkout totals, the Socket.IO chat channel, and the Docker
images. The seeded demo accounts (`admin@aurora.com` / `customer@aurora.com`, password
`aurora123`) are development fixtures, not production credentials.

## Handling secrets

Do not include real credentials, tokens or customer data in a report. The API refuses to
start in production with the default `JWT_SECRET`, and `.env` files are git-ignored; treat
any committed secret as a vulnerability and rotate it before reporting.
