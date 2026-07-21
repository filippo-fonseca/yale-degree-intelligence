"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  CERTIFICATES,
  CERTIFICATE_LIST,
  CERTIFICATE_CATEGORY_LABELS,
  certificateRequirements,
} from "@/lib/certificates";

interface CertificateDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabledOptions?: string[];
  className?: string;
  /** Allow clearing selection (shows empty option) */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Open the menu (and focus search) on mount / when flipped true */
  defaultOpen?: boolean;
}

type MenuPos = { top: number; left: number; width: number; openUp: boolean };

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (style.overflowY === "auto" || style.overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}

const CATEGORY_ORDER = [
  "interdisciplinary",
  "skills_based",
  "advanced_language",
];

export function CertificateDropdown({
  value,
  onChange,
  disabledOptions = [],
  className = "",
  allowEmpty = false,
  emptyLabel = "Select a certificate",
  defaultOpen = false,
}: CertificateDropdownProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchTerm, setSearchTerm] = useState("");
  const [pos, setPos] = useState<MenuPos | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Re-open when parent requests it (e.g. "+ Add certificate")
  useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, [defaultOpen]);

  const selectedName = value ? CERTIFICATES[value] || "" : emptyLabel;

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return CERTIFICATE_LIST.filter((c) => {
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q) ||
        (CERTIFICATE_CATEGORY_LABELS[c.category] || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [searchTerm]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const cat = c.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    const keys = [
      ...CATEGORY_ORDER.filter((k) => map.has(k)),
      ...Array.from(map.keys()).filter((k) => !CATEGORY_ORDER.includes(k)),
    ];
    return keys.map((k) => ({
      key: k,
      label: CERTIFICATE_CATEGORY_LABELS[k] || k,
      items: map.get(k) || [],
    }));
  }, [filtered]);

  const computePos = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const menuH = menuRef.current?.offsetHeight ?? 300;
    const spaceBelow = viewportH - rect.bottom;
    const openUp = spaceBelow < Math.min(menuH, 300) + 8;
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
    if (ancestor) ancestor.addEventListener("scroll", onMove, { passive: true });
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
      if (ancestor) ancestor.removeEventListener("scroll", onMove);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        dropdownRef.current?.contains(t) ||
        menuRef.current?.contains(t) ||
        (t as HTMLElement).closest('[data-certificate-dropdown-portal="true"]')
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

  useEffect(() => {
    if (!isOpen) return;
    // Wait a tick so the portaled menu mounts before focusing search
    const t = setTimeout(() => searchInputRef.current?.focus(), 30);
    setSearchTerm("");
    return () => clearTimeout(t);
  }, [isOpen]);

  const category = value
    ? certificateRequirements[value]?.category
    : undefined;

  return (
    <div ref={dropdownRef} className={`relative ${className} w-full`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full text-left px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70 flex justify-between items-center"
      >
        <div className="flex items-center min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 mr-2 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
              {value || emptyLabel}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
              {value
                ? `${selectedName}${
                    category
                      ? ` · ${CERTIFICATE_CATEGORY_LABELS[category] || category}`
                      : ""
                  }`
                : "Optional — add any Yale College certificates"}
            </div>
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

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            data-certificate-dropdown-portal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-[9999]"
            style={{
              top: pos ? pos.top : 0,
              left: pos?.left ?? 0,
              width: Math.max(pos?.width ?? 280, 280),
              transform: pos?.openUp ? "translateY(-6px)" : "translateY(6px)",
            }}
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              <div className="p-1.5 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search certificates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 text-[11px] text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 px-2.5 py-1.5 pl-7 rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
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

              <div className="max-h-64 overflow-y-auto">
                {allowEmpty && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-xs text-gray-500"
                  >
                    {emptyLabel}
                  </button>
                )}
                {grouped.length > 0 ? (
                  grouped.map((group) => (
                    <div key={group.key}>
                      <div className="sticky top-0 z-[1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300 bg-teal-50/90 dark:bg-teal-950/60 backdrop-blur-sm border-b border-teal-100/60 dark:border-teal-900/40">
                        {group.label}
                      </div>
                      {group.items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onChange(c.id);
                            setIsOpen(false);
                          }}
                          disabled={disabledOptions.includes(c.id)}
                          className={`w-full text-left px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
                            value === c.id ? "bg-teal-900/20" : ""
                          } ${
                            disabledOptions.includes(c.id)
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <div className="flex items-center">
                            {value === c.id && (
                              <div className="w-2 h-2 rounded-full bg-teal-500 mr-2 flex-shrink-0" />
                            )}
                            <div className={value !== c.id ? "ml-4" : ""}>
                              <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                {c.name}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {c.id}
                                {c.requiresApplication ? " · application" : ""}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="px-2.5 py-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
                    No certificates found
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
