import type { Metadata } from "next";
import "./styles.css";
import { OfflineSync } from "@/components/offline-sync";
import { AuthSessionProvider } from "@/components/auth-session";
import { AppNav } from "@/components/app-nav";
import { LiveVideoRail } from "@/components/live-video-rail";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "ShikshaMesh | Orchestrator",
  description: "Multi-agent intelligence orchestration for education",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={cn("font-sans", geist.variable)}><body><AuthSessionProvider><AppNav /><LiveVideoRail /><OfflineSync />{children}</AuthSessionProvider></body></html>;
}
