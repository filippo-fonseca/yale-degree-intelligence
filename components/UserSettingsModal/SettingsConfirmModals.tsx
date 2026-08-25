"use client";

import { ModalShell } from "../ui/ModalShell";
import { ShinyButton } from "../ui/shiny-button";
import { GhostButton } from "../ui/ghost-button";

interface SettingsConfirmModalsProps {
  showDisableFriendsConfirm: boolean;
  setShowDisableFriendsConfirm: (value: boolean) => void;
  isTogglingFriends: boolean;
  onConfirmDisableFriends: () => Promise<void>;
  showUnsavedConfirm: boolean;
  setShowUnsavedConfirm: (value: boolean) => void;
  onSaveAndClose: () => Promise<void>;
  isSaving: boolean;
  /** False while duplicate majors or certificates block a save. */
  canSave: boolean;
  onClose: () => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (value: boolean) => void;
  isDeleting: boolean;
  onDeleteAccount: () => Promise<void>;
}

/** The destructive answer, in the shape v3 gives every other button. */
function DangerButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2 font-sf text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

/** Body copy for a confirmation, in the interface typeface. */
function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[1.15rem]/[1.3] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
      {children}
    </h2>
  );
}

/**
 * The three questions Settings can ask, on the app's one modal window.
 *
 * They sit above Settings, hence the raised z: the shell's default would put
 * them behind it.
 */
export function SettingsConfirmModals({
  showDisableFriendsConfirm,
  setShowDisableFriendsConfirm,
  isTogglingFriends,
  onConfirmDisableFriends,
  showUnsavedConfirm,
  setShowUnsavedConfirm,
  onSaveAndClose,
  isSaving,
  canSave,
  onClose,
  showDeleteConfirm,
  setShowDeleteConfirm,
  isDeleting,
  onDeleteAccount,
}: SettingsConfirmModalsProps) {
  return (
    <>
      <ModalShell
        open={showDisableFriendsConfirm}
        onClose={() => setShowDisableFriendsConfirm(false)}
        label="disable friends"
        maxWidth="max-w-sm"
        dismissable={!isTogglingFriends}
        z="z-[9999]"
      >
        <div className="p-5">
          <Title>Turn Friends off?</Title>
          <Body>
            This removes every friend you have and hides your courses from
            anyone who had you. Turning it back on starts from an empty list.
          </Body>
          <div className="mt-5 flex justify-end gap-2 font-sf">
            <GhostButton onClick={() => setShowDisableFriendsConfirm(false)}>
              Cancel
            </GhostButton>
            <DangerButton
              onClick={() => void onConfirmDisableFriends()}
              disabled={isTogglingFriends}
            >
              {isTogglingFriends ? (
                <>
                  <Spinner />
                  Turning off...
                </>
              ) : (
                "Turn off"
              )}
            </DangerButton>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={showUnsavedConfirm}
        onClose={() => setShowUnsavedConfirm(false)}
        label="unsaved changes"
        maxWidth="max-w-sm"
        dismissable={!isSaving}
        z="z-[9999]"
      >
        <div className="p-5">
          <Title>Save your changes?</Title>
          <Body>
            Your majors, certificates, or graduation year have been edited and
            not saved yet. Everything else in Settings saves on its own.
          </Body>
          {!canSave && (
            <p className="mt-3 font-sf text-xs text-red-500 dark:text-red-400">
              Remove the duplicate major or certificate first, or leave without
              saving.
            </p>
          )}
          <div className="mt-5 flex items-center justify-end gap-2 font-sf">
            <GhostButton onClick={() => setShowUnsavedConfirm(false)}>
              Keep editing
            </GhostButton>
            <ShinyButton
              size="sm"
              onClick={() => void onSaveAndClose()}
              pending={isSaving}
              disabled={!canSave}
            >
              {isSaving ? "Saving..." : "Save and close"}
            </ShinyButton>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowUnsavedConfirm(false);
              onClose();
            }}
            disabled={isSaving}
            className="mt-3 w-full font-sf text-[11px] text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-red-400"
          >
            Leave without saving
          </button>
        </div>
      </ModalShell>

      <ModalShell
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        label="delete account"
        maxWidth="max-w-sm"
        dismissable={!isDeleting}
        z="z-[9999]"
      >
        <div className="p-5">
          <Title>Delete your account?</Title>
          <Body>
            This permanently removes your courses, your profile, and your
            friends. It cannot be undone.
          </Body>
          <div className="mt-5 flex justify-end gap-2 font-sf">
            <GhostButton onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </GhostButton>
            <DangerButton
              onClick={() => void onDeleteAccount()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner />
                  Deleting...
                </>
              ) : (
                "Delete account"
              )}
            </DangerButton>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
