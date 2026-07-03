import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAdminGateStatus } from "@/lib/gate.functions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { unlocked } = await getAdminGateStatus();
    if (!unlocked) {
      throw redirect({
        to: "/admin-login",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});
