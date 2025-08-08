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
        className="w-full text-left p-3 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-800/50 flex justify-between items-center"
      >
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-pink-500 mr-3 flex-shrink-0" />
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-gray-400">{selectedMajorName}</div>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${
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
              width: pos?.width ?? 320,
              transform: pos?.openUp ? "translateY(-8px)" : "translateY(8px)",
            }}
          >
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {/* Search bar */}
              <div className="p-2 border-b border-gray-700">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search Yale majors & concentrations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 text-xs text-gray-200 px-3 py-2 pl-8 rounded-md border border-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                  <svg
                    className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"
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
              <div className="max-h-60 overflow-y-auto">
                {filteredMajors.length > 0 ? (
                  filteredMajors.map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => {
                        onChange(code);
                        setIsOpen(false);
                      }}
                      disabled={disabledOptions.includes(code)}
                      className={`w-full text-left p-3 hover:bg-gray-700/50 ${
                        value === code ? "bg-pink-900/20" : ""
                      } ${
                        disabledOptions.includes(code)
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <div className="flex items-center">
                        {value === code && (
                          <div className="w-4 h-4 rounded-full bg-pink-500 mr-3 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-medium">{code}</div>
                          <div className="text-sm text-gray-400">{name}</div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-400">
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
