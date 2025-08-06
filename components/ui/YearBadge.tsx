"use client";

import React from "react";

interface YearBadgeProps {
  graduationYear: number;
  noPadding?: boolean; // ✅ new optional prop
}

const getYearStatus = (graduationYear: number): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const academicYear = currentMonth >= 8 ? currentYear + 1 : currentYear;
  const yearsRemaining = graduationYear - academicYear;

  if (yearsRemaining > 4) return "High School";
  if (yearsRemaining === 4) return "Freshman";
  if (yearsRemaining === 3) return "Sophomore";
  if (yearsRemaining === 2) return "Junior";
  if (yearsRemaining === 1) return "Senior";
  if (yearsRemaining <= 0) return "Graduated";

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
        className={`text-xs font-medium rounded-full flex items-center ${
          noPadding ? "" : "px-2.5 py-0.5"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full mr-1.5 ${getDotColor(yearStatus)}`}
        ></span>
        <span className="text-gray-300">
          {yearStatus} • Class of {graduationYear}
        </span>
      </span>
    </div>
  );
};
