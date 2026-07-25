import { beforeEach, describe, expect, it } from "vitest";

import {
  loadProgress,
  resetProgress,
  saveProgress,
} from "@/src/simulator/persistence";

const deleteDatabase = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(
      "legacy-scoreboard-console-trainer",
    );
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

describe("local progress repository", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("saves, restores, copies, and clears app-owned progress", async () => {
    const completedScenarioIds = ["record-a-goal"];
    await saveProgress({
      version: 1,
      completedScenarioIds,
      assessmentResults: [
        { scenarioId: "record-a-goal", elapsedMs: 900, mistakes: 0 },
      ],
    });
    completedScenarioIds.push("mutated-outside");

    expect(await loadProgress()).toEqual({
      version: 1,
      completedScenarioIds: ["record-a-goal"],
      assessmentResults: [
        { scenarioId: "record-a-goal", elapsedMs: 900, mistakes: 0 },
      ],
    });

    await resetProgress();
    expect(await loadProgress()).toEqual({
      version: 1,
      completedScenarioIds: [],
      assessmentResults: [],
    });
  });

  it("falls back safely when the stored record has an unknown shape", async () => {
    await saveProgress({
      version: 1,
      completedScenarioIds: ["record-a-goal"],
      assessmentResults: [],
    });

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("legacy-scoreboard-console-trainer", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("progress", "readwrite");
      transaction
        .objectStore("progress")
        .put({ version: 99, completedScenarioIds: "bad" }, "local-profile");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();

    expect(await loadProgress()).toEqual({
      version: 1,
      completedScenarioIds: [],
      assessmentResults: [],
    });
  });

  it("rejects partially valid or unknown scenario identifiers", async () => {
    await expect(
      saveProgress({
        version: 1,
        completedScenarioIds: ["record-a-goal", "unknown"],
        assessmentResults: [],
      }),
    ).rejects.toThrow();
  });
});
