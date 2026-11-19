Security Policy

Project: RADARSite
Organization: remRADAR
Website: https://radarcharts.net
Repository: https://github.com/remRADAR/RADARSite

1. Supported Versions

RADARSite is actively maintained. Security updates are prioritized for the latest stable release and actively maintained production branch.

Version	Supported
Latest stable release	Yes
Current production branch	Yes
Previous releases	Case-by-case
Unsupported or archived releases	No

Security fixes are generally applied to the latest maintained version. Users and deployment operators are encouraged to keep their installations and dependencies up to date.

2. Reporting a Vulnerability

RADARCharts by REM takes the security of its platforms, users, contributors, and infrastructure seriously.

If you discover a potential security vulnerability in RADARSite, please report it responsibly.

Preferred reporting channel:

* Use GitHub’s private vulnerability reporting feature through the RADARSite repository’s Security tab, if enabled.
* Alternatively, contact the project maintainers through an authorized private communication channel.

Please do not disclose vulnerabilities publicly before the maintainers have had a reasonable opportunity to investigate and address the issue.

2.1 What to Include

When submitting a report, please provide:

* A clear description of the vulnerability.
* The affected component, endpoint, feature, or dependency.
* Steps to reproduce the issue.
* Potential security impact.
* Relevant screenshots, logs, or proof-of-concept material, where safe.
* Any suggested mitigation or remediation.

Do not include real user credentials, private access tokens, API keys, or other sensitive information in vulnerability reports.

3. Response and Disclosure Timeline

The RADARSite maintainers aim to follow this responsible disclosure process:

Stage	Target timeframe
Initial acknowledgment	Within 72 hours
Initial assessment	Within 7 calendar days
Status updates	At least every 7 calendar days while active
Remediation	Based on severity and complexity
Public disclosure	After a fix or coordinated disclosure agreement

These are target response times rather than guaranteed service-level commitments.

3.1 Accepted Reports

When a vulnerability is accepted:

* The maintainers will assess its severity and potential impact.
* Appropriate remediation will be prioritized.
* A security patch or mitigation will be developed where necessary.
* Affected users or deployment operators may be notified.
* A security advisory may be published after remediation.

3.2 Declined Reports

If a report is determined not to represent a security vulnerability, the reporter will receive an explanation where reasonably possible.

Reports may be declined if they:

* Describe expected application behavior.
* Identify issues without a demonstrable security impact.
* Concern unsupported versions without affecting maintained infrastructure.
* Contain insufficient information to verify the reported issue.

4. Security Scope

The security policy covers RADARSite and its associated application components, including:

* Website application and frontend functionality.
* Backend services and application interfaces.
* Authentication and authorization mechanisms, where implemented.
* Data processing and storage integrations.
* Third-party packages and dependencies.
* Cloudflare Workers, Pages, R2, and related services used by the project.
* Build, deployment, and CI/CD configurations.
* Security-sensitive integrations and external service connections.

Third-party platforms and infrastructure providers remain subject to their respective security policies.

5. Security Expectations

Contributors and maintainers are expected to follow these principles:

* Never commit API keys, passwords, private tokens, or other credentials.
* Use environment variables and approved secret-management mechanisms for sensitive configuration.
* Apply least-privilege access to infrastructure, repositories, and integrations.
* Validate and sanitize untrusted input.
* Apply appropriate access controls to administrative and sensitive operations.
* Keep dependencies and build tools updated.
* Review changes affecting authentication, authorization, data access, and deployment security.
* Avoid exposing private user information, internal configuration, or sensitive operational data.
* Use HTTPS for production communication.
* Review security-sensitive changes before merging or deployment.

6. Responsible Disclosure

RADARCharts by REM supports coordinated vulnerability disclosure.

Security researchers are requested to:

* Avoid accessing, modifying, or deleting data belonging to other users.
* Avoid disrupting production services.
* Avoid conducting destructive tests or denial-of-service attacks.
* Avoid social engineering, phishing, or attacks against project contributors.
* Limit testing to the minimum necessary to demonstrate a vulnerability.
* Keep vulnerability details confidential until coordinated disclosure is agreed upon.

Researchers who follow this policy and report vulnerabilities responsibly are appreciated.

7. Security Updates

Security-related updates may be communicated through:

* GitHub Security Advisories.
* Repository release notes.
* Relevant project announcements.
* Direct communication with affected parties where appropriate.

Users are encouraged to monitor the repository for security updates and apply recommended fixes promptly.

8. Policy Maintenance

This policy may be revised as RADARSite’s architecture, infrastructure, and operational security requirements evolve.

The RADARSite maintainers reserve the right to update this policy to reflect changes in security practices and project requirements.

⸻

Maintained by: remRADAR
Project: RADARCharts by REM
Security Policy: SECURITY.md
