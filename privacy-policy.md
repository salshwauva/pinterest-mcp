# Privacy Policy for Claude MCP

**Effective Date:** May 19, 2026
**Last Updated:** May 19, 2026

## 1. Introduction

This Privacy Policy describes how Claude MCP (the "Application") handles information when accessing the Pinterest API. The Application is a personal, locally-run integration developed and operated solely by Sophia for personal use. It is not offered as a service to other users and does not host, transmit, or store data on any public server.

By authorizing the Application to access your Pinterest account, you agree to the practices described in this policy.

## 2. Information We Access

The Application accesses the following information from your Pinterest account via the Pinterest API v5, subject to the OAuth scopes you grant:

- **Account information** (`user_accounts:read`): username, display name, account type, and profile metadata.
- **Boards** (`boards:read`, optionally `boards:read_secret`): board names, descriptions, cover images, and associated metadata.
- **Pins** (`pins:read`, optionally `pins:read_secret`): pin titles, descriptions, links, images, and associated board references.

The Application also stores **OAuth credentials** (access token, refresh token, and client identifiers) locally on the operator's machine in order to authenticate API requests.

The Application does **not** collect passwords, payment information, contacts, browsing history, biometric data, or location data.

## 3. How Information Is Used

Information accessed via the Pinterest API is used exclusively to:

- Surface Pinterest account, board, and pin data inside the operator's local Claude environment via the Model Context Protocol (MCP).
- Enable read-only queries (e.g., listing boards, retrieving pins, searching the operator's own pins) initiated by the operator.

The Application does not use Pinterest data for advertising, analytics, profiling, machine learning training, resale, or any commercial purpose.

## 4. Third-Party Services

When the operator invokes the Application through Claude, Pinterest data retrieved by the Application is included in the conversation context sent to **Anthropic, PBC** (the provider of Claude). This is necessary for Claude to read and respond to the data the operator has requested.

- Anthropic's handling of this data is governed by Anthropic's own [Privacy Policy](https://www.anthropic.com/legal/privacy) and [Usage Policy](https://www.anthropic.com/legal/aup).
- No Pinterest data is transmitted to any other third party by the Application.

Pinterest's own handling of your data is governed by [Pinterest's Privacy Policy](https://policy.pinterest.com/en/privacy-policy).

## 5. Data Storage and Security

- All Pinterest data accessed by the Application is processed in memory or stored locally on the operator's personal device.
- OAuth tokens are stored in a local environment file or local configuration store on the operator's device and are not transmitted to any third party other than Pinterest (for API authentication).
- The Application does not maintain any remote database, cloud storage, or backup system.
- Reasonable steps are taken to protect locally stored credentials, but no method of storage is completely secure.

## 6. Data Sharing

The Application does not sell, rent, lease, share, or otherwise disclose Pinterest data to any party other than:

1. **Pinterest**, as required to make authenticated API requests, and
2. **Anthropic**, as described in Section 4, when the operator invokes the Application through Claude.

## 7. Data Retention

- Pinterest data is not persisted by the Application beyond the duration of an active session, except as cached locally by the operator's operating system or by Claude's conversation history.
- OAuth tokens are retained locally until the operator deletes them or revokes access through Pinterest.

## 8. Your Rights and Controls

As the sole authorized user of the Application, you may at any time:

- Revoke the Application's access to your Pinterest account via your Pinterest account settings (Settings → Security → Apps).
- Delete locally stored OAuth tokens by removing the corresponding configuration files on your device.
- Stop running the Application, which immediately ends all data access.

Because the Application is operated locally and does not maintain user accounts or remote storage, there is no separate account deletion process.

## 9. Children's Privacy

The Application is not directed to, and does not knowingly collect information from, individuals under 13 years of age (or the minimum age required by applicable law in your jurisdiction). Pinterest's own terms restrict use of the service to users who meet Pinterest's minimum age requirements.

## 10. Changes to This Policy

This policy may be updated as the Application's scope or behavior changes. Updates will be reflected by changing the "Last Updated" date at the top of this document. Continued use of the Application after such updates constitutes acceptance of the revised policy.

## 11. Contact

For questions about this Privacy Policy or the Application's data practices, contact:

- **Operator:** Sophia
- **Email:** sophieisonline01@gmail.com

---

*This Privacy Policy applies only to Claude MCP and not to Pinterest, Anthropic, or any other service the operator may use.*
