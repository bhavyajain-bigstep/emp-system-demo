import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, ChevronDown, Sun, Moon } from "lucide-react";

import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const now = new Date();
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)] backdrop-blur-lg px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="size-5" />
        </button>
        <p className="hidden text-sm text-[var(--text-muted)] sm:block">{today}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--bg-hover)]"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {initials(user?.name)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{user?.employeeCode}</p>
            </div>
            <ChevronDown className="size-4 text-[var(--text-muted)]" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-2 shadow-xl">
              <div className="border-b border-[var(--border-primary)] px-3 py-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
                <div className="mt-2">
                  <Badge tone={user?.role === "ADMIN" ? "primary" : user?.role === "HR" ? "violet" : user?.role === "MANAGER" ? "sky" : "slate"}>
                    {user?.role}
                  </Badge>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/30"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}