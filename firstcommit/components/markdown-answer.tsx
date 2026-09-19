import type { ReactNode } from "react";
function inline(text: string): ReactNode[] { return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => part.startsWith("`") && part.endsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part); }
export function MarkdownAnswer({ text }: { text: string }) {
  const nodes: ReactNode[] = []; let code: string[] = []; let list: string[] = []; let inCode = false;
  const flushCode = () => { if (code.length) nodes.push(<pre key={`code-${nodes.length}`}><code>{code.join("\n")}</code></pre>); code = []; };
  const flushList = () => { if (list.length) nodes.push(<ul key={`list-${nodes.length}`}>{list.map((item, index) => <li key={index}>{inline(item)}</li>)}</ul>); list = []; };
  for (const raw of text.replace(/\r/g, "").split("\n")) { const line = raw.trim(); if (line.startsWith("```")) { if (inCode) flushCode(); else flushList(); inCode = !inCode; continue; } if (inCode) { code.push(raw); continue; } if (!line) { flushList(); continue; } const heading = line.match(/^(#{1,3})\s+(.+)$/); if (heading) { flushList(); const content = inline(heading[2]); nodes.push(heading[1].length === 1 ? <h2 key={`h-${nodes.length}`}>{content}</h2> : <h3 key={`h-${nodes.length}`}>{content}</h3>); continue; } if (/^[-*]\s+/.test(line)) { list.push(line.replace(/^[-*]\s+/, "")); continue; } flushList(); if (/^\|.*\|$/.test(line) || /^\|?[- :|]+\|$/.test(line)) continue; nodes.push(<p key={`p-${nodes.length}`}>{inline(line)}</p>); }
  if (inCode) flushCode(); flushList(); return <div className="markdown-answer">{nodes}</div>;
}
