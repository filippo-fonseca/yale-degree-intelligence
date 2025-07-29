"use client";

import { useState, useRef, useEffect } from "react";
import { MAJORS } from "@/lib/majors";

interface MajorDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabledOptions?: string[];
  className?: string;
}

export function MajorDropdown({
  value,
  onChange,
  disabledOptions = [],
  className = "",
}: MajorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedMajorName = MAJORS[value] || "";

  // Filter majors based on search term
  const filteredMajors = Object.entries(MAJORS).filter(([code, name]) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      code.toLowerCase().includes(searchLower) ||
      name.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setSearchTerm(""); // Reset search term when opening
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className} w-full`} ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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

      {/* Dropdown content */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {/* Search bar */}
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search majors at Yale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 text-gray-200 px-3 py-2 pl-8 rounded-md border border-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-500"
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
      )}
    </div>
  );
}
