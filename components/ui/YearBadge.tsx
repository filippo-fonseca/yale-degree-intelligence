"use client";

import React from "react";

interface YearBadgeProps {
  graduationYear: number;
  noPadding?: boolean; // ✅ new optional prop
}

const getYearStatus = (graduationYear: number): string => {
  // Direct mapping based on graduation year
  if (graduationYear >= 2031) return "High School";
  if (graduationYear === 2030) return "Freshman";
  if (graduationYear === 2029) return "Sophomore";
  if (graduationYear === 2028) return "Junior";
  if (graduationYear <= 2027) return "Senior";

  return "Unknown";
};

export const YearBadge: React.FC<YearBadgeProps> = ({
  graduationYear,
  noPadding = false,
}) => {
  const yearStatus = getYearStatus(graduationYear);

  const getDotColor = (status: string) => {
    switch (status) {
      case "Freshman":
        return "bg-green-400";
      case "Sophomore":
        return "bg-blue-400";
      case "Junior":
        return "bg-yellow-400";
      case "Senior":
        return "bg-purple-400";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex items-center">
      <span
        className={`text-[10px] font-medium rounded-full flex items-center ${
          noPadding ? "" : "px-2 py-0.5"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1 ${getDotColor(yearStatus)}`}
        ></span>
        <span className="text-gray-500 dark:text-gray-400">
          {yearStatus} • '{graduationYear.toString().slice(-2)}
        </span>
      </span>
    </div>
  );
};
