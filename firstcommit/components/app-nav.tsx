"use client";
import Link from "next/link";
import { useAuthSession } from "@/components/auth-session";

export function AppNav(){
  const {idToken,role,signOut}=useAuthSession(); if(!idToken)return null;
  const teacher=role==="teacher"||role==="admin";
  const links=teacher?[["Dashboard","/teacher"],["Live lessons","/teacher/live"],["Attendance","/teacher/attendance"],["Interventions","/teacher/interventions"],["Account","/account"]]:[["Tutor","/"],["Smart Notes","/notes"],["Quizzes","/quizzes"],["AI Interview","/interview"],["Concept X-Ray","/concept-xray"],["Canvas","/canvas"],["Diagrams","/diagrams"],["Live class","/live"],["Offline","/offline"],["Account","/account"]];
  return <nav className={`app-nav ${teacher?"teacher-nav":"student-nav"}`} aria-label={teacher?"Teacher workspace":"ShikshaMesh features"}><Link className="brand" href={teacher?"/teacher":"/"}>ShikshaMesh<span>{teacher?"Teacher":""}</span></Link><div className="nav-links">{links.map(([label,href],index)=><Link key={`${label}-${index}`} href={href}>{label}</Link>)}<button type="button" className="nav-logout" onClick={signOut}>Log out</button></div></nav>;
}
