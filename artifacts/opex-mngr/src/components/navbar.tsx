import { Link } from "wouter";
import { ShieldCheck, Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto flex h-14 items-center px-4 justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/tickets" className="flex items-center gap-2" data-testid="link-home">
            <span className="font-bold text-lg tracking-tight">opex-mngr</span>
          </Link>
          <div className="hidden md:flex gap-6">
            <Link href="/tickets" className="text-sm font-medium transition-colors hover:text-primary" data-testid="link-all-tickets">
              All Tickets
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/admin" data-testid="link-admin">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            data-testid="button-theme-toggle"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}