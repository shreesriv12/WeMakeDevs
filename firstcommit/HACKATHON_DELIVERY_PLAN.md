# ShikshaMesh Hackathon Delivery Plan

## Demo spine

Teacher uploads a document → student receives a grounded adaptive quiz → mastery changes after submission → the visible orchestrator replans → a teacher approves a remedial intervention.

## Build order

1. Quiz lifecycle and concept-level mastery (in progress)
2. Dynamic orchestration and verification-confidence panel
3. Hindi/Hinglish plus voice interview v2
4. Teacher intervention approval and workflow delivery
5. Offline course-pack and reconciliation demo
6. Learning Canvas: drawing, geometry, code block, and Ask ShikshaMesh on selection
7. Live classroom: authenticated rooms, chat, presence, object references, and teacher announcements
8. ML/DL evaluation and deployment gates
9. AWS production deployment and observability

## Scope guardrails

- Teacher approval is required before student-facing intervention delivery.
- Canvas code never runs in the Next.js server process.
- Realtime rooms enforce Cognito institution/class scope on connection.
- Synthetic ML data is pipeline-only, never presented as production accuracy.
