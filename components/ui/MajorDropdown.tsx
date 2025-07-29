"use client";

import { useState } from "react";
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

  const selectedMajorName = MAJORS[value] || "";

  return (
    <div className={`relative ${className} w-full`}>
      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-3 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-800/50 flex justify-between items-center"
      >
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-blue-500 mr-3 flex-shrink-0" />
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
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {Object.entries(MAJORS).map(([code, name]) => (
            <button
              key={code}
              onClick={() => {
                onChange(code);
                setIsOpen(false);
              }}
              disabled={disabledOptions.includes(code)}
              className={`w-full text-left p-3 hover:bg-gray-700/50 ${
                value === code ? "bg-blue-900/20" : ""
              } ${
                disabledOptions.includes(code)
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <div className="flex items-center">
                {value === code && (
                  <div className="w-4 h-4 rounded-full bg-blue-500 mr-3 flex-shrink-0" />
                )}
                <div>
                  <div className="font-medium">{code}</div>
                  <div className="text-sm text-gray-400">{name}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
