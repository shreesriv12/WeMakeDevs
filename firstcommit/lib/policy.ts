export type Role = "student" | "teacher" | "admin";
export type AccessRequest = { role: Role; actorId: string; subjectStudentId?: string; actorClassIds: string[]; resourceClassId?: string; action: "read_profile" | "read_marks" | "search_web" };

export function authorize(request: AccessRequest): { allowed: boolean; reason: string } {
  if (request.role === "admin") return { allowed: true, reason: "institution administrator" };
  if (request.action === "search_web") return { allowed: true, reason: "external research allowed by role; gateway policy still applies" };
  if (request.role === "student") return request.actorId === request.subjectStudentId
    ? { allowed: true, reason: "student may access their own record" }
    : { allowed: false, reason: "students cannot access another learner record" };
  return request.resourceClassId && request.actorClassIds.includes(request.resourceClassId)
    ? { allowed: true, reason: "teacher is assigned to this class" }
    : { allowed: false, reason: "teacher is not assigned to this class" };
}
