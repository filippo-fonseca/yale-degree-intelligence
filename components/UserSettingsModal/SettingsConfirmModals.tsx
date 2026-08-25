"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiTrash2 } from "react-icons/fi";

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
      {/* Disable Friends Confirmation Modal */}
      <AnimatePresence>
        {showDisableFriendsConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-settings-confirm="true"
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isTogglingFriends) {
                setShowDisableFriendsConfirm(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 border border-gray-200 dark:border-white/[0.1] rounded-2xl p-4 max-w-xs w-full shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl border border-red-500/20">
                  <FiTrash2 className="text-red-400" size={16} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Disable Friends?
                </h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">
                This will{" "}
                <strong className="text-red-400">remove all friends</strong> and
                hide your courses.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDisableFriendsConfirm(false)}
                  disabled={isTogglingFriends}
                  className="di-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmDisableFriends}
                  disabled={isTogglingFriends}
                  className="di-btn-danger"
                >
                  {isTogglingFriends ? (
                    <>
                      <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ...
                    </>
                  ) : (
                    "Disable"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsaved changes / Delete Account Confirmation Modals */}
      <AnimatePresence>
        {showUnsavedConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-settings-confirm="true"
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSaving) {
                setShowUnsavedConfirm(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 border border-gray-200 dark:border-white/[0.1] rounded-2xl p-4 max-w-xs w-full shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            >
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Save your changes?
              </h3>
              <p className="mb-3 font-sf text-xs text-gray-500 dark:text-gray-400">
                Your majors, certificates, or graduation year have been edited
                and not saved yet. Everything else in Settings saves on its own.
              </p>
              {!canSave && (
                <p className="mb-3 font-sf text-xs text-red-500 dark:text-red-400">
                  Remove the duplicate major or certificate first, or leave
                  without saving.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnsavedConfirm(false)}
                  disabled={isSaving}
                  className="di-btn-secondary"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={onSaveAndClose}
                  disabled={isSaving || !canSave}
                  className="di-btn-primary"
                >
                  {isSaving ? (
                    <>
                      <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    "Save and close"
                  )}
                </button>
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
            </motion.div>
          </motion.div>
        )}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-settings-confirm="true"
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) {
                setShowDeleteConfirm(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 border border-gray-200 dark:border-white/[0.1] rounded-2xl p-4 max-w-xs w-full shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl border border-red-500/20">
                  <FiTrash2 className="text-red-400" size={16} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Delete Account
                </h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">
                Permanently remove all data including courses, friends, and
                conversations. Cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="di-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDeleteAccount}
                  disabled={isDeleting}
                  className="di-btn-danger"
                >
                  {isDeleting ? (
                    <>
                      <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
