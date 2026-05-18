import { Link } from "wouter";
import { ShieldCheck, Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    // Upgrade: Added backdrop blur and transparency for a modern glassmorphic feel
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 justify-between max-w-7xl">
        
        {/* Left Side: Logo (Left exactly as you styled it) */}
        <div className="flex items-center">
          <Link href="/tickets" className="flex items-center gap-2 group" data-testid="link-home">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 bg-clip-text text-transparent transition-transform duration-200 group-hover:scale-[1.02]">
              OPEX MANAGER
            </h1>
          </Link>
        </div>

        {/* Right Side: Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Upgrade: Styled the Admin link to look like a subtle dashboard badge/pill instead of a generic button */}
          <Link href="/admin" data-testid="link-admin">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-2 border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200 text-xs sm:text-sm font-medium px-3 rounded-full"
            >
              <ShieldCheck className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              <span>Admin <span className="hidden sm:inline-block opacity-70">(read only)</span></span>
            </Button>
          </Link>
          
          {/* Upgrade: Added interactive hover background rotation to the theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-200"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            data-testid="button-theme-toggle"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
            </div>
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>

      </div>
    </nav>
  );
}
