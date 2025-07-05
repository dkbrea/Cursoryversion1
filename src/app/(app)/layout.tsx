import { AppLayout } from "@/components/layout/app-layout";
import { AccountProvider } from "@/contexts/account-context";
import type { ReactNode } from "react";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AccountProvider>
      <AppLayout>{children}</AppLayout>
    </AccountProvider>
  );
}
