"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, Pencil, Trash2, FlagOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useToast } from "@/components/Toast/ToastProvider";
import { EditPlaygroundForm } from "./EditPlaygroundForm";
import { DeletePlaygroundButton } from "./DeletePlaygroundButton";
import {
  bulkDeletePlaygroundsAction,
  bulkSetFlaggedPlaygroundsAction,
} from "@/app/[locale]/admin/actions";
import type { SurfaceType } from "@/lib/playground-types";

export type AdminPlaygroundRow = {
  id: string;
  name: string;
  description: string | null;
  surface_type: SurfaceType | null;
  is_fenced: boolean;
  has_shade: boolean;
  has_water: boolean;
  has_toilets: boolean;
  has_parking: boolean;
  flagged: boolean;
  review_count: number;
  created_at: string;
};

type SortKey = "name" | "reviews" | "created";
type Filter = "all" | "flagged" | "noReviews";
const PAGE_SIZE = 25;

export function AdminPlaygroundsTable({
  rows,
  locale,
}: {
  rows: AdminPlaygroundRow[];
  locale: string;
}) {
  const t = useTranslations("admin.playgrounds");
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );

  const filtered = useMemo(() => {
    let r = rows;
    const needle = q.trim().toLowerCase();
    if (needle) r = r.filter((x) => x.name.toLowerCase().includes(needle));
    if (filter === "flagged") r = r.filter((x) => x.flagged);
    if (filter === "noReviews") r = r.filter((x) => x.review_count === 0);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "reviews") return (a.review_count - b.review_count) * dir;
      return (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) * dir;
    });
  }, [rows, q, filter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filteredIds));
  }

  function runBulk(fn: () => Promise<{ ok: boolean; count: number }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        showToast(t("bulkError"), "error");
      }
    });
  }

  function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(t("bulkDeleteConfirm", { count: ids.length }))) return;
    runBulk(() => bulkDeletePlaygroundsAction(ids, locale));
  }

  function bulkUnflag() {
    const ids = [...selected];
    if (ids.length === 0) return;
    runBulk(() => bulkSetFlaggedPlaygroundsAction(ids, false, locale));
  }

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-primary"
      >
        {label}
        {sortKey === k &&
          (sortDir === "asc" ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          ))}
      </button>
    </th>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder={t("search")}
          className="input input-bordered input-sm w-full max-w-xs"
        />
        <div className="join">
          {(["all", "flagged", "noReviews"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setPage(0);
              }}
              className={`btn join-item btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
            >
              {t(`filter${f === "all" ? "All" : f === "flagged" ? "Flagged" : "NoReviews"}`)}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-base-content/60">
          {t("selectedCount", { count: filtered.length })}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-box border border-primary/30 bg-primary/5 p-2">
          <span className="px-2 text-sm font-medium">
            {t("selectedCount", { count: selected.size })}
          </span>
          <button
            type="button"
            onClick={bulkUnflag}
            disabled={pending}
            className="btn btn-sm gap-1"
          >
            <FlagOff className="size-4" aria-hidden />
            {t("bulkUnflag")}
          </button>
          <button
            type="button"
            onClick={bulkDelete}
            disabled={pending}
            className="btn btn-error btn-sm gap-1"
          >
            <Trash2 className="size-4" aria-hidden />
            {t("bulkDelete")}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-base-content/60">{t("noResults")}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="w-0">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={t("selectAll")}
                      className="checkbox checkbox-sm"
                    />
                  </th>
                  <SortHeader k="name" label={t("name")} />
                  <th>{t("surface")}</th>
                  <SortHeader k="reviews" label={t("reviews")} />
                  <SortHeader k="created" label={t("created")} />
                  <th>{t("flagged")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((pg) => (
                  <tr key={pg.id} className={selected.has(pg.id) ? "bg-primary/5" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(pg.id)}
                        onChange={() => toggleOne(pg.id)}
                        aria-label={pg.name}
                        className="checkbox checkbox-sm"
                      />
                    </td>
                    <td>
                      <Link href={`/playground/${pg.id}`} className="link link-hover font-medium">
                        {pg.name}
                      </Link>
                    </td>
                    <td className="text-sm">{pg.surface_type ?? "—"}</td>
                    <td className="text-sm tabular-nums">{pg.review_count}</td>
                    <td className="text-sm whitespace-nowrap">
                      {dateFmt.format(new Date(pg.created_at))}
                    </td>
                    <td>{pg.flagged ? "⚠️" : ""}</td>
                    <td>
                      <div className="flex gap-1">
                        <EditPlaygroundForm
                          playground={{
                            id: pg.id,
                            name: pg.name,
                            description: pg.description,
                            surface_type: pg.surface_type,
                            is_fenced: pg.is_fenced,
                            has_shade: pg.has_shade,
                            has_water: pg.has_water,
                            has_toilets: pg.has_toilets,
                            has_parking: pg.has_parking,
                          }}
                          locale={locale}
                          trigger={
                            <span className="btn btn-ghost btn-xs gap-1">
                              <Pencil className="size-3" aria-hidden />
                              {t("edit")}
                            </span>
                          }
                        />
                        <DeletePlaygroundButton id={pg.id} locale={locale} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="btn btn-ghost btn-sm"
              >
                {t("prev")}
              </button>
              <span className="text-sm tabular-nums">
                {t("pageInfo", { page: safePage + 1, total: pageCount })}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="btn btn-ghost btn-sm"
              >
                {t("next")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
