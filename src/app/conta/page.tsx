import type { Metadata } from "next";
import { AccountClient } from "./account-client";

export const metadata: Metadata = {
  title: "Conta e sincronização em nuvem — VagaMatch",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
