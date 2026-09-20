"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth-session";

export function AppNav(){
  const pathname = usePathname();
  const {idToken,role,signOut}=useAuthSession(); if(!idToken)return null;
  const teacher=role==="teacher"||role==="admin";
  const links=teacher?[["Dashboard","/teacher"],["Official resources","/resources"],["Live lessons","/teacher/live"],["Diagram templates","/teacher/diagram-templates"],["Misconceptions","/teacher/misconceptions"],["Attendance","/teacher/attendance"],["Interventions","/teacher/interventions"],["Account","/account"]]:[["Tutor","/"],["Smart Notes","/notes"],["Official resources","/resources"],["Quizzes","/quizzes"],["AI Interview","/interview"],["Concept X-Ray","/concept-xray"],["Canvas","/canvas"],["Diagrams","/diagrams"],["Live class","/live"],["Offline","/offline"],["Account","/account"]];
  const activeHref = [["Library demo", "/demo"], ...links]
    .map(([, href]) => href)
    .filter(href => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
  return <nav className={`app-nav ${teacher?"teacher-nav":"student-nav"}`} aria-label={teacher?"Teacher workspace":"ShikshaMesh features"}><Link className="brand" href={teacher?"/teacher":"/"}>ShikshaMesh<span>{teacher?"Teacher":""}</span></Link><div className="nav-links"><Link href="/demo" aria-current={activeHref === "/demo" ? "page" : undefined}>Library demo</Link>{links.map(([label,href],index)=><Link key={`${label}-${index}`} href={href} aria-current={activeHref === href ? "page" : undefined}>{label}</Link>)}<button type="button" className="nav-logout" onClick={signOut}>Log out</button></div></nav>;
}
