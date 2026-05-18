import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "light",
  setTheme: () => null,
});

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;
  return fallback;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "opex-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStoredTheme(storageKey, defaultTheme)
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  const setTheme = (next: Theme) => {
    try { window.localStorage.setItem(storageKey, next); } catch {}
    setThemeState(next);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeProviderContext);
