"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldQuestion } from "lucide-react";

export default function UsersPagePlaceholder() {
  const t = useTranslations("common");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("navigation.users")}
        </h1>
        <p className="text-muted-foreground">
          User management screen is not available yet. Please use existing
          modules while this page is being completed.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <ShieldQuestion className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We are finishing access control flows. If you expect this feature in
            production, please contact an administrator to confirm the release
            plan.
          </p>
          <p className="text-sm text-muted-foreground">
            In the meantime, you can continue working with Documents and
            Departments modules.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

