import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";

type ConceptAggregate = { concept:string; learnersAttempted:number; strugglingLearners:number; struggleRate:number; action:string };

const demoAnalytics: Record<string, ConceptAggregate[]> = {
  "cn-b": [
    { concept:"TCP retransmission", learnersAttempted:42, strugglingLearners:21, struggleRate:0.50, action:"Revisit acknowledgements and timeout examples." },
    { concept:"Sliding-window flow control", learnersAttempted:42, strugglingLearners:18, struggleRate:0.43, action:"Use a visual sender/receiver walkthrough." },
    { concept:"IP routing", learnersAttempted:42, strugglingLearners:9, struggleRate:0.21, action:"Keep as independent practice." }
  ]
};

function fallback(classId: string, threshold: number) {
  return (demoAnalytics[classId] ?? []).filter((concept) => concept.struggleRate > threshold);
}

export async function classWeakConcepts(actor: Actor, classId: string, threshold = 0.4) {
  if (actor.role !== "admin" && (actor.role !== "teacher" || !actor.classIds.includes(classId))) throw new Error("Not authorized to view analytics for this class");
  let concepts = fallback(classId, threshold);
  let provider: "demo" | "postgres" = "demo";
  if (postgresEnabled()) {
    try {
      const result = await database().query<{ topic: string; learners_attempted: string; struggling_learners: string }>(
        `WITH learner_topic AS (
          SELECT topic, student_id, AVG(score)::float AS average_score
          FROM assessment_attempts
          WHERE institution_id = $1 AND class_id = $2
          GROUP BY topic, student_id
        )
        SELECT topic, COUNT(*)::text AS learners_attempted,
          COUNT(*) FILTER (WHERE average_score < $3)::text AS struggling_learners
        FROM learner_topic
        GROUP BY topic`,
        [actor.institutionId, classId, threshold * 100]
      );
      concepts = result.rows.map((row) => {
        const learnersAttempted = Number(row.learners_attempted); const strugglingLearners = Number(row.struggling_learners);
        return { concept: row.topic.replaceAll("_", " "), learnersAttempted, strugglingLearners, struggleRate: learnersAttempted ? strugglingLearners / learnersAttempted : 0, action: "Review this concept using targeted examples and a short formative quiz." };
      }).filter((concept) => concept.struggleRate > threshold);
      provider = "postgres";
    } catch { /* Development fallback keeps analytics available without local Docker. */ }
  }
  return { classId, threshold, concepts, provider, privacy:"Aggregated class-level results only; individual learner scores are not returned." };
}
