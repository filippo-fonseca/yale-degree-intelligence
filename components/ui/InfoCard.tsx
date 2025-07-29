import { FiInfo } from "react-icons/fi";
import React from "react";

interface InfoCardProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function InfoCard({
  children,
  icon = <FiInfo className="w-4 h-4 mt-0.5 flex-shrink-0" />,
  className = "",
}: InfoCardProps) {
  return (
    <div
      className={`flex items-start gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-sm text-gray-300 ${className}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}
