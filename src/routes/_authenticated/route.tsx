import { createFileRoute, Outlet } from "@tanstack/react-router";

// Admin panel is intentionally public (single-owner site). If you want to
// restrict it later, add a check here or move routes out of _authenticated/.
export const Route = createFileRoute("/_authenticated")({
  component: () => <Outlet />,
});
