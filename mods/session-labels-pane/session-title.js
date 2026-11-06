// Session Labels: interpret agent terminal titles without changing saved names.
// Codex already publishes this through the terminal title (OSC 0/2).
// The final component is the working folder, not the conversation name.
export function isCodex(agent) {
  return agent?.app === "codex" || agent?.program?.key === "codex";
}

export function codexSessionName(title) {
  const parts = String(title ?? "").replace(/^[\u2800-\u28ff]\s+/u, "").split(" | ");
  if (parts.length < 2) return null;
  parts.pop();
  // Only complete status components, never a user's "[!] Fix login" name.
  if (parts.length > 1 && /^\[\s*(?:!|>|✓|✔)\s*\]\s+(?:Action Required|Working|Done)$/.test(parts[0])) parts.shift();
  const name = parts.join(" | ").trim();
  return name && !/^(?:OpenAI )?Codex(?:\s+v?[\d.]+)?$/i.test(name) ? name : null;
}

export function codexLabel(agent) {
  return codexSessionName(agent?.title) || `Codex · ${agent?.address || agent?.terminal || agent?.pane || "new"}`;
}

export function isSessionAgent(agent) {
  return isCodex(agent) || isClaude(agent) || agent?.app === "openclaw" || agent?.program?.key === "openclaw";
}

export function isClaude(agent) {
  return ["claude", "claude-code"].includes(agent?.app) || ["claude", "claude-code"].includes(agent?.program?.key);
}

export function sessionAgentLabel(agent) {
  if (isCodex(agent)) return codexLabel(agent);
  const title = String(agent?.title ?? "");
  if (isClaude(agent)) {
    // Observed OSC 0 prefixes from Claude Code 2.1.319 (idle / activity).
    const name = title.replace(/^[✳◐]\uFE0F?\s+/u, "").trim();
    return name && !/^(?:Claude(?: Code)?|Anthropic)$/i.test(name)
      ? name : `Claude · ${agent?.address || agent?.terminal || agent?.pane || "new"}`;
  }
  const name = title.startsWith("OpenClaw | ") ? title.slice(11).trim() : "";
  return name || `OpenClaw · ${agent?.address || agent?.terminal || agent?.pane || "new"}`;
}
