"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MaintenanceNotice,
  useMaintenanceNotices,
} from "@/hooks/use-maintenance-notices";

interface FormState {
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

const initialForm: FormState = {
  title: "",
  startDate: "",
  endDate: "",
  description: "",
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function MaintenancePage() {
  const t = useTranslations("maintenance");
  const commonT = useTranslations("common");
  const { notices, addNotice, loading } = useMaintenanceNotices();
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const sortedNotices = useMemo(
    () => [...notices].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [notices]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.title || !form.startDate || !form.endDate) {
      setFormError(t("form.validationRequired"));
      return;
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      setFormError(t("form.validationDate"));
      return;
    }

    const payload: Omit<MaintenanceNotice, "id" | "createdAt"> = {
      title: form.title,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
    };

    addNotice(payload);
    setForm(initialForm);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground">{t("pageDescription")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t("form.sectionTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("form.helper")}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="title">{t("form.titleLabel")}</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder={t("form.titleLabel")}
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t("form.startLabel")}</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t("form.endLabel")}</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("form.detailsLabel")}</Label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder={t("form.detailsLabel")}
                />
              </div>

              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {t("form.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-full bg-slate-100 p-2 text-slate-700">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{t("list.sectionTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("pageDescription")}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                {commonT("status.loading")}
              </p>
            ) : sortedNotices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("list.empty")}</p>
            ) : (
              sortedNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{notice.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("list.windowLabel")}: {formatDate(notice.startDate)}{" "}
                        - {formatDate(notice.endDate)}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {notice.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {notice.description}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
