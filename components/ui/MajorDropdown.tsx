"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { MAJORS } from "@/lib/majors";

interface MajorDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabledOptions?: string[];
  className?: string;
}

type MenuPos = { top: number; left: number; width: number; openUp: boolean };

// Find first scrollable ancestor
function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}

export function MajorDropdown({
  value,
  onChange,
  disabledOptions = [],
  className = "",
}: MajorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pos, setPos] = useState<MenuPos | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedMajorName = MAJORS[value] || "";

  const filteredMajors = useMemo(
    () =>
      Object.entries(MAJORS)
        .filter(([code, name]) => {
          const q = searchTerm.toLowerCase();
          return (
            code.toLowerCase().includes(q) || name.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => a[1].localeCompare(b[1])),
    [searchTerm]
  );

  const computePos = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const menuH = menuRef.current?.offsetHeight ?? 260;
    const spaceBelow = viewportH - rect.bottom;
    const openUp = spaceBelow < Math.min(menuH, 260) + 8;

    setPos({
      top: openUp ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePos();

    const onMove = () => computePos();
    window.addEventListener("resize", onMove, { passive: true });
    window.addEventListener("scroll", onMove, { passive: true });

    const ancestor = findScrollableAncestor(dropdownRef.current);
    if (ancestor)
      ancestor.addEventListener("scroll", onMove, { passive: true });

    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
      if (ancestor) ancestor.removeEventListener("scroll", onMove);
    };
  }, [isOpen]);

  // Close on outside click / Esc
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        dropdownRef.current?.contains(t) ||
        menuRef.current?.contains(t) ||
        (t as HTMLElement).closest('[data-major-dropdown-portal="true"]')
      )
        return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 0);
    setSearchTerm("");
    return () => clearTimeout(t);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative ${className} w-full`}>
      {/* Trigger */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((v) => !v)}
        className="w-full font-sf text-left px-3 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors flex justify-between items-center"
      >
        <div className="flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-500 mr-2 flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{value}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{selectedMajorName}</div>
          </div>
        </div>
        <svg
          className={`h-3.5 w-3.5 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Portaled dropdown */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            data-major-dropdown-portal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-[9999]"
            style={{
              top: pos ? pos.top : 0,
              left: pos?.left ?? 0,
              width: pos?.width ?? 280,
              transform: pos?.openUp ? "translateY(-6px)" : "translateY(6px)",
            }}
          >
            <div className="font-sf bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] rounded-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
              {/* Search bar */}
              <div className="p-1.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search majors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-white/[0.04] text-[11px] text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 px-2.5 py-1.5 pl-7 rounded-lg border border-black/[0.08] dark:border-white/[0.1] focus:outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors"
                  />
                  <svg
                    className="absolute left-2 top-2 h-3 w-3 text-gray-400 dark:text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Majors list */}
              <div className="max-h-48 overflow-y-auto">
                {filteredMajors.length > 0 ? (
                  filteredMajors.map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => {
                        onChange(code);
                        setIsOpen(false);
                      }}
                      disabled={disabledOptions.includes(code)}
                      className={`w-full text-left px-2.5 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${
                        value === code ? "bg-pink-900/20" : ""
                      } ${
                        disabledOptions.includes(code)
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <div className="flex items-center">
                        {value === code && (
                          <div className="w-2 h-2 rounded-full bg-pink-500 mr-2 flex-shrink-0" />
                        )}
                        <div className={value !== code ? "ml-4" : ""}>
                          <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{code}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">{name}</div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-2.5 py-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
                    No majors found
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
