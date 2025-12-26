"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function AccessDenied() {
  const t = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldX className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{t("accessDenied.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {t("accessDenied.description")}
          </p>
          <div className="flex justify-center">
            <Button
              onClick={() => router.push(`/${locale}/dashboard`)}
              variant="default"
            >
              {t("accessDenied.backToDashboard")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
