"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deletePlaygroundAction } from "@/app/[locale]/admin/actions";

export function DeletePlaygroundButton({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("admin.playgrounds");

  return (
    <form
      action={(fd) => {
        if (!confirm(t("deleteConfirm"))) return;
        fd.set("id", id);
        fd.set("locale", locale);
        return deletePlaygroundAction(fd);
      }}
    >
      <button type="submit" className="btn btn-ghost btn-xs text-error gap-1">
        <Trash2 className="size-3" aria-hidden />
        {t("delete")}
      </button>
    </form>
  );
}
