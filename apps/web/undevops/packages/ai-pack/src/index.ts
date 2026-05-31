/**
 * @undevops/ai-pack — AI-native features
 *
 * Provides:
 * - MCP resource/tool logic (shared with apps/mcp-server)
 * - AI reviewer providers (Claude, Gemini, OpenAI, Codex, Custom)
 * - Gate evaluator (parallel verdict collection, strict-by-default policy)
 * - Change payload builder (diff extraction, env var change detection)
 *
 * NOTE: packages/core MUST build without this package present (FR-030, SC-005).
 */

export const AI_PACK_VERSION = "0.1.0";
