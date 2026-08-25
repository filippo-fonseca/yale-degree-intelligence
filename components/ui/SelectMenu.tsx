"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export type SelectMenuOption<T extends string> = {
  value: T;
  label: string;
  /** Second line, for options whose label alone is not enough. */
  hint?: string;
};

type MenuPos = { top: number; left: number; width: number; openUp: boolean };

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let parent = el?.parentElement ?? null;
  while (parent) {
    const overflowY = getComputedStyle(parent).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}

/**
 * The app's dropdown, for the places a native `<select>` was doing the job.
 *
 * A native select paints its own menu, which means the operating system's
 * selection colour: on a dark page the highlighted row came back a saturated
 * system blue that appears nowhere else in v3, and the panel could not be
 * styled at all. This renders the menu itself, in the same idiom as the major
 * and certificate dropdowns: hairline trigger, a panel on #141417 with a real
 * drop shadow, SF throughout, and a check on the selected row.
 *
 * Portaled and positioned against the trigger, because these sit inside
 * scrolling panels that would otherwise clip the menu.
 */
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  label,
  leading,
  className = "",
  menuWidth,
}: {
  value: T;
  options: SelectMenuOption<T>[];
  onChange: (value: T) => void;
  /** Screen-reader name for the trigger. */
  label: string;
  /** Small element before the label, e.g. a status dot. */
  leading?: ReactNode;
  className?: string;
  /** Menu width when the trigger is narrower than the options need. */
  menuWidth?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const computePos = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? 240;
    const openUp = window.innerHeight - rect.bottom < Math.min(menuH, 240) + 8;
    const width = Math.max(rect.width, menuWidth ?? 0);
    // Keep the panel on screen when it is wider than the trigger.
    const left = Math.min(rect.left, window.innerWidth - width - 8);

    setPos({
      top: openUp ? rect.top : rect.bottom,
      left: Math.max(8, left),
      width,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePos();
    const onMove = () => computePos();
    window.addEventListener("resize", onMove, { passive: true });
    window.addEventListener("scroll", onMove, { passive: true });
    const ancestor = findScrollableAncestor(wrapRef.current);
    ancestor?.addEventListener("scroll", onMove, { passive: true });
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
      ancestor?.removeEventListener("scroll", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-black/[0.08] bg-white px-3 py-2 font-sf text-sm text-gray-700 transition-colors hover:border-black/[0.16] hover:text-gray-900 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-white/[0.18] dark:hover:text-white"
      >
        <span className="flex min-w-0 items-center gap-2">
          {leading}
          <span className="truncate">{selected?.label ?? label}</span>
        </span>
        <FiChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            data-select-menu-portal="true"
            className="fixed z-[9999]"
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: pos?.width ?? 200,
              transform: pos?.openUp
                ? "translateY(calc(-100% - 6px))"
                : "translateY(6px)",
            }}
          >
            <div
              role="listbox"
              className="max-h-60 overflow-y-auto rounded-xl border border-black/[0.08] bg-white py-1 font-sf shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] dark:border-white/[0.1] dark:bg-[#141417] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-xs ${
                          isSelected
                            ? "font-medium text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {option.label}
                      </span>
                      {option.hint && (
                        <span className="block truncate text-[10px] text-gray-400 dark:text-gray-500">
                          {option.hint}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <FiCheck className="h-3.5 w-3.5 shrink-0 text-pink-500 dark:text-pink-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default SelectMenu;
