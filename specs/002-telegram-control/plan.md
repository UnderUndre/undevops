# Plan: 002-telegram-control

## Summary

Telegram as fourth control surface via MCP client; bind Telegram user ↔ undevops admin; reuse approval queue.

## Security (review fix)

- Allowlisted Telegram user IDs only after `/bind`
- No group-chat exec without explicit ACL
- Same MCP scopes as agents; write/exec always go through approval queue
- Shared authz module for MCP + Telegram + UI

## Milestones

1. Identity binding UI + encrypted mapping (2d)
2. Bot as MCP client + inline approve/reject (3d)
3. Read commands /status /logs (2d)
4. Mini App subset (3d)
5. Audit channel=telegram + tests (1d)
