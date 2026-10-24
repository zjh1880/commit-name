# Security policy

English | [中文](./SECURITY.zh.md)

## Supported versions

`commit-name` is a local command-line tool with no runtime dependencies. Security fixes land on the latest published minor release.

| Version | Supported |
|---|---|
| 1.1.x | Yes |
| < 1.1 | No |

## Reporting a vulnerability

Please do not open a public issue for a security problem.

1. Open a private security advisory from the repository's **Security** tab ("Report a vulnerability").
2. Include the affected version, a minimal reproduction, and the impact you expect.

You can expect an initial response within seven days. Once a fix is available, we will credit you in the release notes unless you ask us not to.

## Scope

The CLI only reads diffs and prints text, so the most relevant reports involve:

- unexpected command execution;
- malformed patch input that crashes the process or makes it hang.

`commit-name` never sends diff content over the network.
