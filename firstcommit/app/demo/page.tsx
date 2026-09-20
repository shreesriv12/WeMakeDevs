import Link from "next/link";
import { DEMO_TOPIC, DEMO_PROMPT, DEMO_MISCONCEPTION, DEMO_RECOVERY } from "@/lib/demo-content";

const steps = [
  ["1 · Upload the report", "/teacher", "Teacher", "Upload Library_Management_System_Report.pdf into your existing class. Wait for the indexed status and keep the returned document ID for the quiz workflow."],
  ["2 · Ask the tutor", "/", "Student", DEMO_PROMPT],
  ["3 · Smart notes", "/notes", "Student", "Generate English visual revision notes for Library Management System. Show the architecture, common mistakes, and flip a flashcard."],
  ["4 · Diagram Studio", "/diagrams", "Either role", "Start with the prepared library issue flow. Switch to Library database, class, sequence, and state templates. These are editable teaching templates; Generate uses uploaded notes."],
  ["5 · Concept X-Ray", "/concept-xray", "Student", DEMO_MISCONCEPTION],
  ["6 · Project viva", "/interview", "Student", "Start an interview about Library Management System. Explain why Books and BookCopies are separate, then discuss transactions, reservations, and fines in your own words."],
  ["7 · Learning Canvas", "/canvas", "Either role", "Draw Book → BookCopy → Issue → Member, or open Code for the prepared overdue-fine function. Ask the assistant to explain the calculation using the report."],
  ["8 · Practice questions", "/", "Student", "After the tutor response, start adaptive practice. The library question bank covers copies, issue validation, transactions, renewal, and fines. Submit answers to show actual scoring."],
  ["9 · Teacher tools", "/teacher/live", "Teacher", "Use the prefilled Library Management System Lab title and agenda to schedule a lesson. Save a library diagram template and inspect actual attendance and misconceptions after using the student tools."],
  ["10 · Supporting resources", "/resources", "Either role", "Search for library database design references. These external results supplement the report and depend on the configured search service."],
] as const;

export default function LibraryDemoPage() {
  return <main><section className="hero"><span className="eyebrow">RECORDING GUIDE</span><h1>{DEMO_TOPIC}</h1><p>Your feature inputs are prepared around the report. Upload the PDF first, then follow these steps for your recording. AI responses and scores are produced when you use each feature.</p><p>Use teacher and student accounts in the same institution and class. Existing records are retained; scheduling, live video, and external services still require their configured backends.</p></section><section className="topic-tool-grid">{steps.map(([title, href, role, text]) => <article className="result" key={title}><span className="eyebrow">{role}</span><h2>{title}</h2><p>{text}</p><Link className="secondary-link" href={href}>Open feature →</Link></article>)}</section><section className="result"><h2>Explain-it-back sample</h2><p>This is a prepared practice answer, not an assessment result. Concept X-Ray has a button to load it.</p><blockquote>{DEMO_RECOVERY}</blockquote><h2>Closing narration</h2><p>“One Library Management System report becomes a tutor conversation, revision notes, diagrams, misconception practice, a project viva, and a collaborative lesson.”</p></section></main>;
}
