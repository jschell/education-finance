import { validatePlan, clone, SCHEMA } from "./domain.js?v=0.5.0";
const DB = "education-finance",
  KEY = "workspace";
function database() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        Error("Local storage unavailable. Export your plan to keep a backup."),
      );
      return;
    }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("plans");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(
        Error(
          "Storage is blocked by another tab. Close other planner tabs and retry.",
        ),
      );
  });
}
export async function savePlan(plan) {
  plan = validatePlan(plan);
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("plans", "readwrite");
      tx.objectStore("plans").put(clone(plan), KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("Save was interrupted."));
    });
  } finally {
    db.close();
  }
}
export async function loadPlan() {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("plans", "readonly"),
        req = tx.objectStore("plans").get(KEY);
      req.onsuccess = () => {
        try {
          resolve(req.result ? validatePlan(req.result) : null);
        } catch (e) {
          reject(e);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
export async function clearPlan() {
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("plans", "readwrite");
      tx.objectStore("plans").delete(KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("Delete was interrupted."));
    });
  } finally {
    db.close();
  }
}

const RECOVERY_KEY = "education-finance-recovery-v1";
// A synchronous recovery copy protects edits when mobile reload interrupts IndexedDB.
export function saveRecovery(
  plan,
  selection,
  storage = globalThis.localStorage,
) {
  if (!storage) throw Error("Recovery storage unavailable.");
  const record = {
    format: "education-finance-recovery-1",
    plan: clone(validatePlan(plan)),
    selection: { ...selection },
    pending: true,
  };
  const token = JSON.stringify(record);
  storage.setItem(RECOVERY_KEY, token);
  return token;
}
export function loadRecovery(storage = globalThis.localStorage) {
  if (!storage) return null;
  const text = storage.getItem(RECOVERY_KEY);
  if (!text) return null;
  const record = JSON.parse(text);
  if (
    record.format !== "education-finance-recovery-1" ||
    typeof record.pending !== "boolean"
  )
    throw Error("Unsupported recovery copy.");
  record.plan = validatePlan(record.plan);
  const student =
    record.plan.students.find((s) => s.id === record.selection?.studentId) ||
    record.plan.students[0];
  const scenario =
    student.scenarios.find((s) => s.id === record.selection?.scenarioId) ||
    student.scenarios[0];
  record.selection = { studentId: student.id, scenarioId: scenario.id };
  return record;
}
export function markRecoverySaved(token, storage = globalThis.localStorage) {
  if (storage?.getItem(RECOVERY_KEY) !== token) return;
  const record = JSON.parse(token);
  record.pending = false;
  storage.setItem(RECOVERY_KEY, JSON.stringify(record));
}
export function clearRecovery(storage = globalThis.localStorage) {
  storage?.removeItem(RECOVERY_KEY);
}

// One editor per origin/workspace. The browser releases the lock if the tab closes
// or crashes; a reader never writes recovery, drafts, IndexedDB, or deletion.
export async function acquireEditor(locks = globalThis.navigator?.locks) {
  if (!locks?.request)
    return {
      editable: false,
      reason:
        "This browser cannot coordinate safe editing between tabs. Use a current browser.",
    };
  return new Promise((resolve, reject) => {
    let release;
    locks
      .request(
        "education-finance-workspace-editor",
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            resolve({
              editable: false,
              reason:
                "Another tab is editing this plan. Close that tab, then reload here to edit.",
            });
            return;
          }
          const held = new Promise((r) => {
            release = r;
          });
          resolve({ editable: true, release: () => release() });
          await held;
        },
      )
      .catch(reject);
  });
}
const DRAFT_KEY = "education-finance-draft-v1";
export function saveDraft(
  plan,
  selection,
  fields,
  structure,
  storage = globalThis.localStorage,
) {
  if (!storage) throw Error("Draft storage unavailable.");
  storage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      format: "education-finance-draft-1",
      plan: clone(validatePlan(plan)),
      selection: { ...selection },
      fields: clone(fields),
      structure: clone(structure),
      updatedAt: new Date().toISOString(),
    }),
  );
}
export function loadDraft(storage = globalThis.localStorage) {
  const raw = storage?.getItem(DRAFT_KEY);
  if (!raw) return null;
  const draft = JSON.parse(raw);
  if (
    draft.format !== "education-finance-draft-1" ||
    !Array.isArray(draft.fields) ||
    draft.fields.length > 2000 ||
    draft.fields.some(
      (f) =>
        typeof f.key !== "string" ||
        typeof f.value !== "string" ||
        typeof f.checked !== "boolean",
    ) ||
    !Number.isInteger(draft.structure?.gifts) ||
    !Number.isInteger(draft.structure?.allocations) ||
    draft.structure.gifts < 0 ||
    draft.structure.gifts > 24 ||
    draft.structure.allocations < 0 ||
    draft.structure.allocations > 24
  )
    throw Error("Invalid unfinished draft.");
  draft.plan = validatePlan(draft.plan);
  if (
    !draft.plan.students.some(
      (s) =>
        s.id === draft.selection?.studentId &&
        s.scenarios.some((sc) => sc.id === draft.selection?.scenarioId),
    )
  )
    throw Error("Draft selection no longer exists.");
  return draft;
}
export function clearDraft(storage = globalThis.localStorage) {
  storage?.removeItem(DRAFT_KEY);
}

export const isLegacyPlan = (plan) =>
  Number.isInteger(plan?.schemaVersion) &&
  plan.schemaVersion > 0 &&
  plan.schemaVersion < SCHEMA;
// Explicit breaking release: old DB/recovery/draft copies are discarded together.
// Caller must own the workspace editor lock; no reconciliation or migration.
export async function resetIncompatibleStorage(
  storage = globalThis.localStorage,
) {
  const db = await database();
  let raw;
  try {
    raw = await new Promise((resolve, reject) => {
      const request = db
        .transaction("plans", "readonly")
        .objectStore("plans")
        .get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
  let reset = false;
  if (isLegacyPlan(raw)) {
    await clearPlan();
    reset = true;
  }
  return discardLegacyCopies(storage) || reset;
}
export function discardLegacyCopies(storage = globalThis.localStorage) {
  let discarded = false;
  for (const key of [RECOVERY_KEY, DRAFT_KEY]) {
    const value = storage?.getItem(key);
    if (value) {
      let record;
      try {
        record = JSON.parse(value);
      } catch {
        continue;
      }
      if (isLegacyPlan(record.plan)) {
        storage.removeItem(key);
        discarded = true;
      }
    }
  }
  return discarded;
}
