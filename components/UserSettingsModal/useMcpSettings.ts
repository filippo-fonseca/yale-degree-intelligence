import { useEffect, useState } from "react";
import {
  getMcpStatus,
  generateMcpToken,
  revokeMcpToken,
  type McpTokenStatus,
} from "@/lib/mcp/client";

export function useMcpSettings() {
  const [mcpStatus, setMcpStatus] = useState<McpTokenStatus>({
    connected: false,
  });
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [isMcpGenerating, setIsMcpGenerating] = useState(false);
  const [isMcpRevoking, setIsMcpRevoking] = useState(false);
  const [mcpCopiedField, setMcpCopiedField] = useState<string | null>(null);
  const [showMcpInstructions, setShowMcpInstructions] = useState(false);

  const mcpEndpoint =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/mcp`
      : "/api/mcp";

  useEffect(() => {
    getMcpStatus().then(setMcpStatus).catch(() => {});
  }, []);

  const handleMcpGenerate = async () => {
    setIsMcpGenerating(true);
    try {
      const token = await generateMcpToken();
      setMcpToken(token);
      setShowMcpInstructions(true);
      setMcpStatus(await getMcpStatus());
    } catch (e) {
      console.error("Failed to generate MCP token:", e);
    } finally {
      setIsMcpGenerating(false);
    }
  };

  const handleMcpRevoke = async () => {
    setIsMcpRevoking(true);
    try {
      await revokeMcpToken();
      setMcpToken(null);
      setShowMcpInstructions(false);
      setMcpStatus({ connected: false });
    } finally {
      setIsMcpRevoking(false);
    }
  };

  const copyMcp = (field: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setMcpCopiedField(field);
    setTimeout(() => setMcpCopiedField(null), 1500);
  };

  return {
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
  };
}
