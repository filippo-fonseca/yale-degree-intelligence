"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
          variant === "default" &&
            "neu-control text-gray-900 dark:text-white hover:-translate-y-0.5",
          variant === "outline" &&
            "neu-control text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white",
          variant === "ghost" && "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
