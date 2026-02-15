"use client";

import { createContext, useContext } from "react";

// Simplified theme context - always dark mode
interface ThemeContextType {
  theme: "dark";
  resolvedTheme: "dark";
  setTheme: (theme: "dark") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always dark mode - no-op for setTheme
  const value: ThemeContextType = {
    theme: "dark",
    resolvedTheme: "dark",
    setTheme: () => {},
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
