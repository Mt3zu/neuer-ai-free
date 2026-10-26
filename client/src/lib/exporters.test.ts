import { describe, expect, it } from "vitest";
import { parseBackup, safeConversation } from "./exporters";
import type { Conversation } from "./types";

const sample: Conversation = {
  id: "chat_1",
  title: "اختبار",
  createdAt: 1,
  updatedAt: 2,
  messages: [{ id: "m1", role: "user", content: "مرحبا", createdAt: 1 }],
};

describe("conversation exports", () => {
  it("removes nothing sensitive because provider keys are not part of messages", () => {
    expect(safeConversation(sample)).toEqual(sample);
    expect(JSON.stringify(safeConversation(sample))).not.toContain("apiKey");
  });

  it("accepts a valid backup and rejects an invalid structure", async () => {
    const file = new File([JSON.stringify(sample)], "backup.json", { type: "application/json" });
    await expect(parseBackup(file)).resolves.toMatchObject({ title: "اختبار", messages: sample.messages });
    const invalid = new File([JSON.stringify({ title: "x", messages: [{ role: "user" }] })], "bad.json");
    await expect(parseBackup(invalid)).rejects.toThrow("رسائل غير صالحة");
  });
});
