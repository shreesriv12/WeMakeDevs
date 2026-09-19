import { describe, expect, it } from "vitest";
import { predictIntents, trainIntentModel, tuneIntentThresholds } from "../lib/intent-model";

describe("intent model", () => {
  const examples = [{ id:"1", query:"make a quiz", labels:["assessment"] }, { id:"2", query:"show lecture notes", labels:["knowledge_retrieval"] }, { id:"3", query:"create test questions", labels:["assessment"] }, { id:"4", query:"open syllabus notes", labels:["knowledge_retrieval"] }];
  it("learns a multi-label prediction model without inspecting test inputs", () => {
    const model = tuneIntentThresholds(trainIntentModel(examples), examples);
    expect(predictIntents(model, "quiz questions")).toContain("assessment");
    expect(predictIntents(model, "lecture notes")).toContain("knowledge_retrieval");
  });
});
