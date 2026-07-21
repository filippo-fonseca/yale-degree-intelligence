"use client";

import type { Dispatch, SetStateAction } from "react";
import { FiCopy, FiCheck, FiRefreshCw } from "react-icons/fi";
import type { DanKeyStatus } from "@/lib/dan/client";
import type { McpTokenStatus } from "@/lib/mcp/client";

// Dan advisor settings hidden for the v3 launch (the section has nested JSX
// comments, so a guard flag stands in for commenting it out). Flip to true to
// restore the card. The MCP server card below it is unrelated and stays live.
const SHOW_DAN_ADVISOR_SETTINGS = false;

interface SettingsIntegrationsSectionProps {
  danKeyStatus: DanKeyStatus;
  danKeyInput: string;
  setDanKeyInput: (value: string) => void;
  isDanConnecting: boolean;
  danConnectError: string | null;
  setDanConnectError: (value: string | null) => void;
  danJustConnected: boolean;
  setDanJustConnected: (value: boolean) => void;
  isDanRemoving: boolean;
  danWriteActions: boolean;
  isTogglingDanWrite: boolean;
  handleDanConnect: () => Promise<void>;
  handleDanRemove: () => Promise<void>;
  handleToggleDanWrite: () => Promise<void>;
  mcpStatus: McpTokenStatus;
  mcpToken: string | null;
  isMcpGenerating: boolean;
  isMcpRevoking: boolean;
  mcpCopiedField: string | null;
  showMcpInstructions: boolean;
  setShowMcpInstructions: Dispatch<SetStateAction<boolean>>;
  mcpEndpoint: string;
  handleMcpGenerate: () => Promise<void>;
  handleMcpRevoke: () => Promise<void>;
  copyMcp: (field: string, text: string) => void;
}

export function SettingsIntegrationsSection({
  danKeyStatus,
  danKeyInput,
  setDanKeyInput,
  isDanConnecting,
  danConnectError,
  setDanConnectError,
  danJustConnected,
  setDanJustConnected,
  isDanRemoving,
  danWriteActions,
  isTogglingDanWrite,
  handleDanConnect,
  handleDanRemove,
  handleToggleDanWrite,
  mcpStatus,
  mcpToken,
  isMcpGenerating,
  isMcpRevoking,
  mcpCopiedField,
  showMcpInstructions,
  setShowMcpInstructions,
  mcpEndpoint,
  handleMcpGenerate,
  handleMcpRevoke,
  copyMcp,
}: SettingsIntegrationsSectionProps) {
  return (
    <>
      {/* Dan AI Advisor (spans full width) — hidden for v3 via the
          SHOW_DAN_ADVISOR_SETTINGS flag. The MCP card below is unrelated and
          stays live. */}
      {SHOW_DAN_ADVISOR_SETTINGS && (
      <div className="lg:col-span-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
            Dan AI advisor
          </span>
        </div>

        {/* API key connection */}
        <div className="px-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
          {danKeyStatus.connected ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] text-gray-700 dark:text-gray-300">
                  Connected &bull; key ending ••••{danKeyStatus.last4}
                </span>
              </div>
              <button
                onClick={handleDanRemove}
                disabled={isDanRemoving}
                className="px-2 py-1 text-[11px] rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-red-400/50 hover:bg-red-500/[0.06] text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-all duration-200"
              >
                {isDanRemoving ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin h-2.5 w-2.5 border-2 border-current/30 border-t-current rounded-full" />
                    Removing…
                  </span>
                ) : (
                  "Remove"
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="password"
                  value={danKeyInput}
                  onChange={(e) => {
                    setDanKeyInput(e.target.value);
                    if (danConnectError) setDanConnectError(null);
                    if (danJustConnected) setDanJustConnected(false);
                  }}
                  placeholder="sk-ant-..."
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500/40 focus:border-pink-500/50 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs transition-all duration-200"
                />
                <button
                  onClick={handleDanConnect}
                  disabled={isDanConnecting || !danKeyInput.trim()}
                  className={`px-2.5 py-1.5 text-[11px] rounded-lg text-white disabled:opacity-50 flex items-center gap-1 transition-all duration-200 ${
                    danJustConnected
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                      : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  }`}
                >
                  {isDanConnecting ? (
                    <>
                      <span className="animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full" />
                      Connecting…
                    </>
                  ) : danJustConnected ? (
                    "Connected"
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>
              {danConnectError && (
                <p className="text-[10px] text-red-400">{danConnectError}</p>
              )}
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                Dan runs on your own Anthropic key. Get one at{" "}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  console.anthropic.com
                </a>
                .
              </p>
            </div>
          )}
        </div>

        {/* Write-actions toggle */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex-1 mr-2">
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              Let Dan make changes
            </span>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Off by default. When on, Dan can add or remove courses, and will
              always ask before each change.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={danWriteActions}
              disabled={isTogglingDanWrite}
              onChange={handleToggleDanWrite}
              className="sr-only peer"
            />
            <div className="w-11 h-6 rounded-full peer transition-colors bg-gray-300 dark:bg-gray-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.22)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] peer-focus:ring-2 peer-focus:ring-pink-500/40 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600 peer-disabled:opacity-50 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,0.45)] after:transition-transform peer-checked:after:translate-x-5"></div>
          </label>
        </div>
      </div>

      )}

      {/* MCP server (spans full width) */}
      <div className="lg:col-span-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
            MCP server
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-pink-500/15 to-purple-600/15 text-purple-600 dark:text-purple-300 border border-purple-500/20">
            Beta
          </span>
        </div>

        <div className="px-3 py-2.5 space-y-2.5">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
            Connect Claude (or any MCP client) to your DegreeIntelligence
            account. Generate a token, add it to your client, and Claude can read
            your majors, courses, requirement progress, and the catalog to plan
            with you. Read-only and scoped to your account.
          </p>

          {/* Status row */}
          {mcpStatus.connected ? (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] text-gray-700 dark:text-gray-300">
                  Token active{" "}
                  {mcpStatus.last4 && (
                    <span className="text-gray-400 dark:text-gray-500">
                      (••••{mcpStatus.last4})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleMcpGenerate}
                  disabled={isMcpGenerating}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 disabled:opacity-50 transition-all duration-200"
                >
                  <FiRefreshCw
                    size={11}
                    className={isMcpGenerating ? "animate-spin" : ""}
                  />
                  {isMcpGenerating ? "Rotating…" : "Rotate"}
                </button>
                <button
                  onClick={handleMcpRevoke}
                  disabled={isMcpRevoking}
                  className="px-2 py-1 text-[11px] rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-red-400/50 hover:bg-red-500/[0.06] text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-all duration-200"
                >
                  {isMcpRevoking ? "Revoking…" : "Revoke"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleMcpGenerate}
              disabled={isMcpGenerating}
              className="px-2.5 py-1.5 text-[11px] rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 flex items-center gap-1 transition-all duration-200"
            >
              {isMcpGenerating ? (
                <>
                  <span className="animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full" />
                  Generating…
                </>
              ) : (
                "Generate token"
              )}
            </button>
          )}

          {/* One-time token reveal */}
          {mcpToken && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-2 space-y-1.5">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                Copy this token now. For your security it won't be shown again.
                You can rotate it anytime.
              </p>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 min-w-0 truncate text-[10px] font-mono bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200">
                  {mcpToken}
                </code>
                <button
                  onClick={() => copyMcp("token", mcpToken)}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-all duration-200"
                >
                  {mcpCopiedField === "token" ? (
                    <FiCheck size={11} className="text-emerald-500" />
                  ) : (
                    <FiCopy size={11} />
                  )}
                  {mcpCopiedField === "token" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Connection instructions */}
          {mcpStatus.connected && (
            <div>
              <button
                onClick={() => setShowMcpInstructions((v) => !v)}
                className="text-[10px] text-pink-500 hover:text-pink-400 dark:text-pink-400 dark:hover:text-pink-300 transition-colors"
              >
                {showMcpInstructions ? "Hide" : "Show"} connection instructions
              </button>

              {showMcpInstructions && (
                <div className="mt-2 space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                      Endpoint
                    </span>
                    <div className="flex items-center gap-1.5">
                      <code className="flex-1 min-w-0 truncate text-[10px] font-mono bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200">
                        {mcpEndpoint}
                      </code>
                      <button
                        onClick={() => copyMcp("endpoint", mcpEndpoint)}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-all duration-200"
                      >
                        {mcpCopiedField === "endpoint" ? (
                          <FiCheck size={11} className="text-emerald-500" />
                        ) : (
                          <FiCopy size={11} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                      Claude Code (CLI)
                    </span>
                    <div className="flex items-start gap-1.5">
                      <code className="flex-1 min-w-0 text-[10px] font-mono whitespace-pre-wrap break-all bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200">
                        {`claude mcp add --transport http degree-intelligence ${mcpEndpoint} --header "Authorization: Bearer YOUR_TOKEN"`}
                      </code>
                      <button
                        onClick={() =>
                          copyMcp(
                            "cli",
                            `claude mcp add --transport http degree-intelligence ${mcpEndpoint} --header "Authorization: Bearer YOUR_TOKEN"`,
                          )
                        }
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-all duration-200"
                      >
                        {mcpCopiedField === "cli" ? (
                          <FiCheck size={11} className="text-emerald-500" />
                        ) : (
                          <FiCopy size={11} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                      Claude Desktop (config)
                    </span>
                    <div className="flex items-start gap-1.5">
                      <code className="flex-1 min-w-0 text-[10px] font-mono whitespace-pre-wrap break-all bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200">
                        {`{
  "mcpServers": {
    "degree-intelligence": {
      "command": "npx",
      "args": ["mcp-remote", "${mcpEndpoint}", "--header", "Authorization: Bearer YOUR_TOKEN"]
    }
  }
}`}
                      </code>
                      <button
                        onClick={() =>
                          copyMcp(
                            "desktop",
                            `{\n  "mcpServers": {\n    "degree-intelligence": {\n      "command": "npx",\n      "args": ["mcp-remote", "${mcpEndpoint}", "--header", "Authorization: Bearer YOUR_TOKEN"]\n    }\n  }\n}`,
                          )
                        }
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-all duration-200"
                      >
                        {mcpCopiedField === "desktop" ? (
                          <FiCheck size={11} className="text-emerald-500" />
                        ) : (
                          <FiCopy size={11} />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">
                    Replace YOUR_TOKEN with the token above. Keep it secret:
                    anyone with it can read your degree data.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
