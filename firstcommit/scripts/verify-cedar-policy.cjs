const fs = require("node:fs");
const cedar = require("@cedar-policy/cedar-wasm/nodejs");
const policies = fs.readFileSync("policies/shikshamesh.cedar", "utf8");

function decision({ role, actorId, subjectStudentId, actorClassIds, resourceClassId, action }) {
  const result = cedar.isAuthorized({
    principal: { type: "User", id: actorId }, action: { type: "Action", id: action }, resource: { type: "LearnerRecord", id: subjectStudentId ?? "resource" }, context: {}, policies: { staticPolicies: policies },
    entities: [
      { uid: { type: "User", id: actorId }, attrs: { id: actorId, role, classIds: actorClassIds }, parents: [] },
      { uid: { type: "LearnerRecord", id: subjectStudentId ?? "resource" }, attrs: { ownerId: subjectStudentId ?? "", classId: resourceClassId ?? "" }, parents: [] }
    ]
  });
  if (result.type !== "success") throw new Error(result.errors.map(error => error.message).join("; "));
  return result.response.decision === "allow";
}

const cases = [
  ["student can read own marks", { role: "student", actorId: "s1", subjectStudentId: "s1", actorClassIds: [], action: "read_marks" }, true],
  ["student cannot read another learner", { role: "student", actorId: "s1", subjectStudentId: "s2", actorClassIds: [], action: "read_marks" }, false],
  ["teacher can read assigned class", { role: "teacher", actorId: "t1", subjectStudentId: "s1", actorClassIds: ["cn-b"], resourceClassId: "cn-b", action: "read_marks" }, true],
  ["teacher cannot read unassigned class", { role: "teacher", actorId: "t1", subjectStudentId: "s1", actorClassIds: ["cn-b"], resourceClassId: "other", action: "read_marks" }, false],
  ["research action is allowed for governed gateway", { role: "student", actorId: "s1", actorClassIds: [], action: "search_web" }, true]
];
for (const [label, input, expected] of cases) { const actual = decision(input); if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
console.log(JSON.stringify({ evaluator: "cedar-wasm", version: cedar.getCedarVersion(), cases: cases.length, result: "passed" }));
