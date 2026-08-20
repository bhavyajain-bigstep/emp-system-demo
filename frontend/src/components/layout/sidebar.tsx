import { NavLink } from "react-router-dom";
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
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
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
      label: "Overview",
      items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Workplace",
      items: [
        { label: "Attendance", to: "/attendance", icon: CalendarClock },
        { label: "My Leaves", to: "/leaves", icon: Plane },
        { label: "Leave Approvals", to: "/leaves/approvals", icon: Scale, roles: ["MANAGER", "HR", "ADMIN"] },
        { label: "Leave Balances", to: "/leave-balances", icon: Scale },
        { label: "Holidays", to: "/holidays", icon: CalendarDays },
      ],
    },
    {
      label: "Administration",
      items: [
        { label: "Employees", to: "/employees", icon: Users, roles: ["HR", "ADMIN"] },
        { label: "Departments", to: "/departments", icon: Building2, roles: ["HR", "ADMIN"] },
        { label: "Leave Types", to: "/leave-types", icon: Tags, roles: ["HR", "ADMIN"] },
        { label: "Reports", to: "/reports", icon: FileBarChart, roles: ["MANAGER", "HR", "ADMIN"] },
        { label: "Audit Logs", to: "/audit-logs", icon: ScrollText, roles: ["HR", "ADMIN"] },
      ],
    },
  ];
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hasRole } = useAuth();
  const groups = buildNav();

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 bg-surface-950/50 lg:hidden" onClick={onClose} />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-surface-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-surface-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-600 text-sm font-extrabold text-white">
              PH
            </div>
            <div>
              <p className="text-sm font-bold text-surface-900">PulseHR</p>
              <p className="text-[11px] text-surface-500">Leave & Attendance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-surface-400 hover:bg-surface-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items
                  .filter((item) => !item.roles || hasRole(...item.roles))
                  .map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                            isActive
                              ? "bg-primary-50 text-primary-700"
                              : "text-surface-600 hover:bg-surface-100 hover:text-surface-900"
                          )
                        }
                      >
                        <item.icon className="size-4.5" />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-surface-100 p-4">
          <p className="text-[11px] leading-relaxed text-surface-400">
            PulseHR v1.0 · Backend API on /api/v1
          </p>
        </div>
      </aside>
    </>
  );
}