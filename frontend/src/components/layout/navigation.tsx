import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarClock,
  Plane,
  Scale,
  Users,
  Building2,
  Tags,
  CalendarDays,
  FileBarChart,
  ScrollText,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/types";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function buildNav(): NavGroup[] {
  return [
    {
      label: "Core",
      items: [
        { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
        { label: "Attendance", to: "/attendance", icon: CalendarClock },
        { label: "Time Off", to: "/leaves", icon: Plane },
      ],
    },
    {
      label: "Approvals",
      items: [
        { label: "Leave Requests", to: "/leaves/approvals", icon: Scale, roles: ["MANAGER", "HR", "ADMIN"] },
      ],
    },
    {
      label: "Balances & Calendar",
      items: [
        { label: "Leave Balances", to: "/leave-balances", icon: Scale },
        { label: "Holidays", to: "/holidays", icon: CalendarDays },
      ],
    },
    {
      label: "Administration",
      items: [
        { label: "People", to: "/employees", icon: Users, roles: ["HR", "ADMIN"] },
        { label: "Departments", to: "/departments", icon: Building2, roles: ["HR", "ADMIN"] },
        { label: "Leave Types", to: "/leave-types", icon: Tags, roles: ["HR", "ADMIN"] },
        { label: "Reports", to: "/reports", icon: FileBarChart, roles: ["MANAGER", "HR", "ADMIN"] },
        { label: "Audit Logs", to: "/audit-logs", icon: ScrollText, roles: ["HR", "ADMIN"] },
      ],
    },
  ];
}

export function Navigation() {
  const { user, logout, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset menus on route change
    setOpenMenu(null);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const groups = buildNav();

  const filteredGroups = groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || hasRole(...item.roles)),
  })).filter((group) => group.items.length > 0);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--navbar-border)] bg-[var(--navbar-bg)] backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6" aria-label="Main navigation">
        <div className="flex items-center gap-6">
          <NavLink to="/dashboard" className="flex items-center gap-2" aria-label="Go to dashboard">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              T
            </div>
            <span className="hidden font-semibold text-[var(--text-primary)] sm:block">TimeFlow</span>
          </NavLink>

          <div className="hidden md:flex md:items-center md:gap-1" role="menubar">
            {filteredGroups.map((group) => (
              <div key={group.label} className="relative" role="none">
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={openMenu === group.label}
                  onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    openMenu === group.label
                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {group.label}
                  <ChevronDown className={cn("size-4 transition-transform", openMenu === group.label && "rotate-180")} aria-hidden="true" />
                </button>

                {openMenu === group.label && (
                  <div className="dropdown-menu" role="menu">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                          )
                        }
                      >
                        <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--bg-hover)]"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-sm font-bold">
                {initials(user?.name)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{user?.employeeCode}</p>
              </div>
              <ChevronDown className={cn("size-4 text-[var(--text-muted)] transition-transform", userMenuOpen && "rotate-180")} aria-hidden="true" />
            </button>

            {userMenuOpen && (
              <div className="dropdown-menu" role="menu">
                <div className="border-b border-[var(--border-primary)] px-3 py-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
                  <div className="mt-2">
                    <Badge tone={user?.role === "ADMIN" ? "primary" : user?.role === "HR" ? "violet" : user?.role === "MANAGER" ? "sky" : "slate"}>
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                <NavLink
                  to="/dashboard"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <HelpCircle className="size-4" />
                  Help & Support
                </NavLink>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/30"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="md:hidden border-t border-[var(--navbar-border)] bg-[var(--navbar-bg)]">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4 w-full">
            {filteredGroups.map((group) => (
              <div key={group.label} className="relative flex-1 min-w-0">
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={openMenu === group.label}
                  onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
                  className={cn(
                    "flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    openMenu === group.label
                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {group.label}
                  <ChevronDown className={cn("size-4 transition-transform", openMenu === group.label && "rotate-180")} aria-hidden="true" />
                </button>

                {openMenu === group.label && (
                  <div className="dropdown-menu left-0 right-auto" role="menu">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                          )
                        }
                      >
                        <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}