import { z } from "zod";

import { hockeyScenarioIds } from "./training";
import type { AssessmentResult } from "./types";

const DATABASE_NAME = "legacy-scoreboard-console-trainer";
const STORE_NAME = "progress";
const PROFILE_KEY = "local-profile";
const scenarioIdSet = new Set(hockeyScenarioIds);

export interface LocalProgress {
  completedScenarioIds: string[];
  assessmentResults: AssessmentResult[];
  version: 1;
}

const assessmentResultSchema = z.object({
  scenarioId: z.string().refine((id) => scenarioIdSet.has(id)),
  elapsedMs: z.number().nonnegative(),
  mistakes: z.number().int().nonnegative(),
});

const progressSchema = z
  .object({
    version: z.literal(1),
    completedScenarioIds: z
      .array(z.string().refine((id) => scenarioIdSet.has(id)))
      .refine((ids) => new Set(ids).size === ids.length),
    assessmentResults: z.array(assessmentResultSchema).optional().default([]),
  })
  .strict();

const emptyProgress = (): LocalProgress => ({
  completedScenarioIds: [],
  assessmentResults: [],
  version: 1,
});

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const loadProgress = async (): Promise<LocalProgress> => {
  try {
    const database = await openDatabase();
    const result = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(PROFILE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();

    const parsed = progressSchema.safeParse(result);
    if (parsed.success) {
      return {
        version: 1,
        completedScenarioIds: [...parsed.data.completedScenarioIds],
        assessmentResults: parsed.data.assessmentResults.map((entry) => ({
          ...entry,
        })),
      };
    }
  } catch {
    return emptyProgress();
  }

  return emptyProgress();
};

export const saveProgress = async (progress: LocalProgress): Promise<void> => {
  const parsed = progressSchema.parse(progress);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(
      {
        version: 1,
        completedScenarioIds: [...parsed.completedScenarioIds],
        assessmentResults: parsed.assessmentResults.map((entry) => ({
          ...entry,
        })),
      },
      PROFILE_KEY,
    );
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
};

export const resetProgress = async (): Promise<void> => {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(PROFILE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
};
