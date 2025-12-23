"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LockKeyhole } from "lucide-react";

export default function PermissionsPagePlaceholder() {
  const t = useTranslations("common");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("navigation.permissions")}
        </h1>
        <p className="text-muted-foreground">
          Permission management is under construction. We will expose the full
          role and policy editor once ready.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <LockKeyhole className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Until release, permissions can be managed via admin tools directly
            on the backend. Contact your administrator if you need a change.
          </p>
          <p className="text-sm text-muted-foreground">
            Navigation now resolves without 404 so users stay in the app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
