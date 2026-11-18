import type { Metadata } from "next";
import { DashboardClient } from "../dashboard-client";

export const metadata: Metadata = {
  title: "Painel — VagaMatch",
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <DashboardClient />;
}
