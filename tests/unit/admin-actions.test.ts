// Admin deletions must remove photo files, not just rows: storage has no foreign key, and a
// leftover file of a reported child photo is exactly what deletion is for (GDPR-15).
import { beforeEach, describe, expect, it, vi } from "vitest";

const PATHS = [{ storage_path: "u1/pg1/0-a.jpg" }, { storage_path: "u1/pg1/1-b.jpg" }];

const selectIn = vi.fn();
const deleteEq = vi.fn();
const deleteIn = vi.fn();
const remove = vi.fn();
const update = vi.fn();
const updateEq = vi.fn();
const from = vi.fn((table: string) => ({
  table,
  select: () => ({ in: selectIn }),
  delete: () => ({ eq: deleteEq, in: deleteIn }),
  update: (values: Record<string, unknown>) => {
    update(table, values);
    return { eq: updateEq };
  },
}));
const admin = { from, storage: { from: () => ({ remove }) } };

vi.mock("@/lib/admin", () => ({ getAdminActionContext: async () => ({ admin }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), unstable_cache: <T,>(fn: T) => fn }));

const {
  deleteFlaggedAction,
  deletePlaygroundAction,
  bulkDeletePlaygroundsAction,
  setPlaygroundStatusAction,
  updatePlaygroundAction,
} = await import("@/app/[locale]/admin/actions");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  selectIn.mockResolvedValue({ data: PATHS, error: null });
  deleteEq.mockResolvedValue({ error: null });
  deleteIn.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
  updateEq.mockResolvedValue({ error: null });
});

describe("admin deletions remove photo files", () => {
  it("[GDPR-15] deleting a flagged photo removes its file after the row", async () => {
    await deleteFlaggedAction(form({ target: "photo", id: "ph1", locale: "sl" }));
    expect(selectIn).toHaveBeenCalledWith("id", ["ph1"]);
    expect(from).toHaveBeenCalledWith("photos");
    expect(remove).toHaveBeenCalledWith(PATHS.map((p) => p.storage_path));
    expect(deleteEq.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
  });

  it("[GDPR-15] deleting a flagged playground removes all its photo files", async () => {
    await deleteFlaggedAction(form({ target: "playground", id: "pg1", locale: "sl" }));
    expect(selectIn).toHaveBeenCalledWith("playground_id", ["pg1"]);
    expect(remove).toHaveBeenCalledWith(PATHS.map((p) => p.storage_path));
  });

  it("[GDPR-15] deleting a review touches no files", async () => {
    await deleteFlaggedAction(form({ target: "review", id: "r1", locale: "sl" }));
    expect(remove).not.toHaveBeenCalled();
  });

  it("[GDPR-15] deleting playgrounds from the table (one or in bulk) removes their photo files", async () => {
    await deletePlaygroundAction(form({ id: "pg1", locale: "sl" }));
    expect(selectIn).toHaveBeenLastCalledWith("playground_id", ["pg1"]);
    expect(remove).toHaveBeenCalledTimes(1);

    await bulkDeletePlaygroundsAction(["pg1", "pg2"], "sl");
    expect(selectIn).toHaveBeenLastCalledWith("playground_id", ["pg1", "pg2"]);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("[GDPR-15] keeps the files when deleting the row fails", async () => {
    deleteEq.mockResolvedValue({ error: { message: "boom" } });
    await deleteFlaggedAction(form({ target: "photo", id: "ph1", locale: "sl" }));
    expect(remove).not.toHaveBeenCalled();
  });
});

// The review queue (ADR-0003): admins publish or reject, and an edit there doesn't invent "Brez …".
describe("the review queue", () => {
  it("[FR-ADM-07] publishing and rejecting set the status, and nothing else", async () => {
    await setPlaygroundStatusAction(form({ id: "pg1", status: "published", locale: "sl" }));
    expect(update).toHaveBeenLastCalledWith("playgrounds", { status: "published" });
    expect(updateEq).toHaveBeenLastCalledWith("id", "pg1");

    await setPlaygroundStatusAction(form({ id: "pg1", status: "rejected", locale: "sl" }));
    expect(update).toHaveBeenLastCalledWith("playgrounds", { status: "rejected" });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("[FR-ADM-07] no other status, and no playground without an id", async () => {
    await setPlaygroundStatusAction(form({ id: "pg1", status: "pending", locale: "sl" }));
    await setPlaygroundStatusAction(form({ id: "pg1", status: "hidden", locale: "sl" }));
    await setPlaygroundStatusAction(form({ status: "published", locale: "sl" }));
    expect(update).not.toHaveBeenCalled();
  });

  it("[FR-ADM-07] [FR-PG-01] an edit in the queue leaves unticked features unknown", async () => {
    await updatePlaygroundAction(
      form({ id: "pg1", name: "Rožna dolina", locale: "sl", has_shade: "on", unticked_features: "unknown" }),
    );
    const [, values] = update.mock.lastCall!;
    expect(values).toMatchObject({ name: "Rožna dolina", has_shade: true, has_water: null, has_toilets: null });
  });

  it("[FR-ADM-03] the playgrounds table's editor still answers every feature", async () => {
    await updatePlaygroundAction(form({ id: "pg1", name: "Tivoli", locale: "sl", has_shade: "on" }));
    const [, values] = update.mock.lastCall!;
    expect(values).toMatchObject({ has_shade: true, has_water: false, has_toilets: false });
  });
});
