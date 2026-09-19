"use client";
import Link from "next/link";
import { useAuthSession } from "@/components/auth-session";
export function AppNav() {
  const { idToken, role } = useAuthSession(); if (!idToken) return null;
  const teacher = role === "teacher" || role === "admin";
  return <nav className="app-nav" aria-label="ShikshaMesh features"><Link className="brand" href="/">ShikshaMesh</Link><div className="nav-links"><Link href="/">Tutor</Link><Link href="/quizzes">Quizzes</Link><Link href="/interview">AI Interview</Link><Link href="/canvas">Canvas</Link><Link href="/live">Live class</Link><Link href="/offline">Offline</Link>{teacher && <Link href="/teacher">Teacher</Link>}{teacher && <Link href="/teacher/interventions">Interventions</Link>}<Link href="/account">Account</Link></div></nav>;
}
