import type { Metadata } from "next";
import "./styles.css";
import { OfflineSync } from "@/components/offline-sync";
import { AuthSessionProvider } from "@/components/auth-session";

export const metadata: Metadata = {
  title: "ShikshaMesh | Orchestrator",
  description: "Multi-agent intelligence orchestration for education",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthSessionProvider><OfflineSync />{children}</AuthSessionProvider></body></html>;
}
