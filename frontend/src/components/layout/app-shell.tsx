import { Outlet } from "react-router-dom";

import { Navigation } from "./navigation";

export function AppShell() {
  return (
    <div className="min-h-screen bg-(--bg-page)">
      <Navigation />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
