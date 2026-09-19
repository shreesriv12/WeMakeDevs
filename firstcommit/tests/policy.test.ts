import { describe, expect, it } from "vitest";
import { authorize } from "../lib/policy";

describe("deterministic authorization", () => {
  it("allows a student to read only their own record", () => {
    expect(authorize({ role:"student", actorId:"s1", subjectStudentId:"s1", actorClassIds:[], action:"read_marks" }).allowed).toBe(true);
    expect(authorize({ role:"student", actorId:"s1", subjectStudentId:"s2", actorClassIds:[], action:"read_marks" }).allowed).toBe(false);
  });
  it("allows a teacher only in assigned classes", () => {
    expect(authorize({ role:"teacher", actorId:"t1", actorClassIds:["a"], resourceClassId:"a", action:"read_marks" }).allowed).toBe(true);
    expect(authorize({ role:"teacher", actorId:"t1", actorClassIds:["a"], resourceClassId:"b", action:"read_marks" }).allowed).toBe(false);
  });
});
