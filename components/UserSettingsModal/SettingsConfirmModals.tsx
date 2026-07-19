"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiTrash2 } from "react-icons/fi";

interface SettingsConfirmModalsProps {
  showDisableFriendsConfirm: boolean;
  setShowDisableFriendsConfirm: (value: boolean) => void;
  isTogglingFriends: boolean;
  onConfirmDisableFriends: () => Promise<void>;
  showDiscardConfirm: boolean;
  setShowDiscardConfirm: (value: boolean) => void;
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
  showDiscardConfirm,
  setShowDiscardConfirm,
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
                  onClick={() => setShowDisableFriendsConfirm(false)}
                  disabled={isTogglingFriends}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] text-gray-700 dark:text-gray-300 text-xs disabled:opacity-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmDisableFriends}
                  disabled={isTogglingFriends}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs disabled:opacity-50 flex items-center gap-1.5 transition-all duration-200"
                >
                  {isTogglingFriends ? (
                    <>
                      <span className="animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full" />
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

      {/* Discard / Delete Account Confirmation Modals */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDiscardConfirm(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 border border-gray-200 dark:border-white/[0.1] rounded-2xl p-4 max-w-xs w-full shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Discard unsaved changes?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">
                You have unsaved changes to your majors or graduation year.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-300 text-xs transition-all duration-200"
                >
                  Keep editing
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs transition-all duration-200"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] text-gray-700 dark:text-gray-300 text-xs disabled:opacity-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={onDeleteAccount}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs disabled:opacity-50 flex items-center gap-1.5 transition-all duration-200"
                >
                  {isDeleting ? (
                    <>
                      <span className="animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full" />
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
