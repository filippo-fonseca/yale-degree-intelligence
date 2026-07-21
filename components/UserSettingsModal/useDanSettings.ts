import { useEffect, useState } from "react";
import {
  getDanKeyStatus,
  saveDanKey,
  deleteDanKey,
  type DanKeyStatus,
} from "@/lib/dan/client";
import type { UserProfile } from "./settingsTypes";

export function useDanSettings(
  userProfile: UserProfile | null,
  onSave: (updatedProfile: Partial<UserProfile>) => Promise<void>,
) {
  const [danKeyStatus, setDanKeyStatus] = useState<DanKeyStatus>({
    connected: false,
  });
  const [danKeyInput, setDanKeyInput] = useState("");
  const [isDanConnecting, setIsDanConnecting] = useState(false);
  const [danConnectError, setDanConnectError] = useState<string | null>(null);
  const [danJustConnected, setDanJustConnected] = useState(false);
  const [isDanRemoving, setIsDanRemoving] = useState(false);

  const [danWriteActions, setDanWriteActions] = useState(
    userProfile?.danWriteActionsEnabled ?? false,
  );
  const [isTogglingDanWrite, setIsTogglingDanWrite] = useState(false);

  useEffect(() => {
    getDanKeyStatus().then(setDanKeyStatus).catch(() => {});
  }, []);

  const handleDanConnect = async () => {
    const trimmed = danKeyInput.trim();
    if (!trimmed) return;
    setIsDanConnecting(true);
    setDanConnectError(null);
    try {
      const result = await saveDanKey(trimmed);
      if (result.ok) {
        setDanKeyInput("");
        setDanJustConnected(true);
        setTimeout(() => setDanJustConnected(false), 2000);
        const status = await getDanKeyStatus();
        setDanKeyStatus(status);
      } else {
        setDanConnectError(result.error);
      }
    } finally {
      setIsDanConnecting(false);
    }
  };

  const handleDanRemove = async () => {
    setIsDanRemoving(true);
    try {
      await deleteDanKey();
      const status = await getDanKeyStatus();
      setDanKeyStatus(status);
    } finally {
      setIsDanRemoving(false);
    }
  };

  const handleToggleDanWrite = async () => {
    const next = !danWriteActions;
    setDanWriteActions(next);
    setIsTogglingDanWrite(true);
    try {
      await onSave({ danWriteActionsEnabled: next });
    } finally {
      setIsTogglingDanWrite(false);
    }
  };

  return {
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
  };
}
