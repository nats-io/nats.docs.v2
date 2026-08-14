---
title: Find Release Information
sidebar_label: Overview
description: Where NATS server release information lives — upgrade guides, the full changelog, and announcement posts — plus which versions are supported.
---

# Find release information

Release information for the NATS server lives in three places, each with its own job:

- **[GitHub releases](https://github.com/nats-io/nats-server/releases)** carry the full changelog for every release, including patches. Each entry links the pull requests and design documents (ADRs) behind a change. This is the place to check what changed in the exact build you're deploying.
- **Upgrade guides** (this section) tell you what to do when moving between minor versions: breaking changes, new operational behavior, and downgrade steps. One guide per minor release.
- **[The NATS blog](https://nats.io/blog/)** announces each minor release and explains the motivation behind the headline features.

## Supported versions

A new minor version ships roughly every six months. Two release lines get patches in parallel: the latest minor and the one before it. When a new minor ships, the oldest line stops receiving patches.

| Version | Released | Status | Notes |
|---|---|---|---|
| 2.14 | 2026-04-30 | Latest | |
| 2.13 | — | Skipped | Never released |
| 2.12 | 2025-09-22 | Maintained | |
| 2.11 | 2025-03-19 | End of life | Final release [v2.11.17](https://github.com/nats-io/nats-server/releases/tag/v2.11.17), 2026-04-27 |

## Releases

| Version | Upgrade guide | Changelog | Announcement |
|---|---|---|---|
| 2.14 | [Upgrade to 2.14](/release-notes/upgrade-to-2.14) | [GitHub](https://github.com/nats-io/nats-server/releases/tag/v2.14.0) | [Blog post](https://nats.io/blog/nats-server-2.14-release/) |
| 2.12 | [Upgrade to 2.12](/release-notes/upgrade-to-2.12) | [GitHub](https://github.com/nats-io/nats-server/releases/tag/v2.12.0) | [Blog post](https://nats.io/blog/nats-server-2.12-release/) |
| 2.11 | [Guide in the nats.docs archive](https://github.com/nats-io/nats.docs/blob/master/release_notes/whats_new_211.md) | [GitHub](https://github.com/nats-io/nats-server/releases/tag/v2.11.0) | [Blog post](https://nats.io/blog/nats-server-2.11-release/) |

Patch releases don't get upgrade guides. For patch-level detail, read the [release notes on GitHub](https://github.com/nats-io/nats-server/releases).
