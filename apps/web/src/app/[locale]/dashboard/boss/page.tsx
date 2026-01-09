"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useBossNavigation } from "@/components/boss/use-boss-navigation";
import { Breadcrumb } from "@/components/boss/breadcrumb";
import { DepartmentGrid } from "@/components/boss/department-grid";
import { ViewSelector } from "@/components/boss/view-selector";
import { KpiList } from "@/components/boss/kpi-list";
import { MaintenanceList } from "@/components/boss/maintenance-list";
import { DocumentsList } from "@/components/boss/documents-list";
import { KpiDetail } from "@/components/boss/kpi-detail";
import { MaintenanceDetail } from "@/components/boss/maintenance-detail";
import { DocumentDetail } from "@/components/boss/document-detail";
import { departmentApi, type Department } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-handler";

export default function BossPage() {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const navigation = useBossNavigation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has boss role
  useEffect(() => {
    if (!isLoading && user) {
      const isBoss = user.roles?.includes("boss");
      if (!isBoss) {
        router.push(`/${locale}/dashboard`);
      }
    }
  }, [user, isLoading, router, locale]);

  // Load departments
  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await departmentApi.getAll();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to load departments:", err);
      setError(getErrorMessage(err, (key: string) => tCommon(key)));
    } finally {
      setLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    if (user?.roles?.includes("boss")) {
      loadDepartments();
    }
  }, [user, loadDepartments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen cyber-bg cyber-grid">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/30 border-t-cyan-500" />
          <div
            className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-2 border-transparent border-r-magenta-500/30 border-t-magenta-500"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isBoss = user.roles?.includes("boss");
  if (!isBoss) {
    return null;
  }

  const handleNavigate = (step: "home" | "department" | "view") => {
    if (step === "home") {
      navigation.reset();
    } else if (step === "department") {
      navigation.selectView(null);
      navigation.selectItem(null);
    } else if (step === "view") {
      navigation.selectItem(null);
    }
  };

  const handleSelectDepartment = (department: Department) => {
    navigation.selectDepartment(department);
  };

  const handleSelectView = (
    viewType: "kpi" | "maintenance" | "documents" | null
  ) => {
    navigation.selectView(viewType);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Show department grid if no department selected
  if (!navigation.state.selectedDepartment) {
    return (
      <div className="min-h-[calc(100vh-4rem)] cyber-bg cyber-grid cyber-scanline">
        <div className="space-y-8 p-6">
          <div className="relative">
            <h1 className="text-5xl font-bold cyber-neon-cyan mb-2 font-cyber tracking-wider">
              {t("title")}
            </h1>
            <div className="absolute -bottom-1 left-0 h-1 w-32 bg-gradient-to-r from-cyan-400 to-transparent"></div>
            <p className="text-cyan-300/90 mt-4 text-lg font-cyber">
              {t("description")}
            </p>
          </div>

          <DepartmentGrid
            departments={departments}
            onSelectDepartment={handleSelectDepartment}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    );
  }

  // Show view selector if department selected but no view type
  if (!navigation.state.viewType) {
    return (
      <div className="min-h-[calc(100vh-4rem)] cyber-bg cyber-grid cyber-scanline">
        <div className="space-y-8 p-6">
          <div className="relative">
            <h1 className="text-5xl font-bold cyber-neon-cyan mb-2 font-cyber tracking-wider">
              {t("title")}
            </h1>
            <div className="absolute -bottom-1 left-0 h-1 w-32 bg-gradient-to-r from-cyan-400 to-transparent"></div>
            <p className="text-cyan-300/90 mt-4 text-lg font-cyber">
              {t("description")}
            </p>
          </div>

          <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />

          <ViewSelector
            department={navigation.state.selectedDepartment}
            onSelectView={handleSelectView}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  // Show detail views if item is selected
  if (navigation.state.selectedItemId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] cyber-bg cyber-grid cyber-scanline">
        <div className="space-y-8 p-6">
          <div className="relative">
            <h1 className="text-5xl font-bold cyber-neon-cyan mb-2 font-cyber tracking-wider">
              {t("title")}
            </h1>
            <div className="absolute -bottom-1 left-0 h-1 w-32 bg-gradient-to-r from-cyan-400 to-transparent"></div>
            <p className="text-cyan-300/90 mt-4 text-lg font-cyber">
              {t("description")}
            </p>
          </div>

          <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />

          {navigation.state.viewType === "kpi" && (
            <KpiDetail
              kpiId={navigation.state.selectedItemId}
              onBack={handleBack}
            />
          )}

          {navigation.state.viewType === "maintenance" && (
            <MaintenanceDetail
              maintenanceId={navigation.state.selectedItemId}
              onBack={handleBack}
            />
          )}

          {navigation.state.viewType === "documents" && (
            <DocumentDetail
              documentId={navigation.state.selectedItemId}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    );
  }

  // Show list views based on viewType
  const department = navigation.state.selectedDepartment;
  if (!department) return null;

  const handleSelectItem = (itemId: string) => {
    navigation.selectItem(itemId);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] cyber-bg cyber-grid cyber-scanline">
      <div className="space-y-8 p-6">
        <div className="relative">
          <h1 className="text-5xl font-bold cyber-neon-cyan mb-2 font-mono tracking-wider">
            {t("title")}
          </h1>
          <div className="absolute -bottom-1 left-0 h-1 w-32 bg-gradient-to-r from-cyan-500 to-transparent"></div>
          <p className="text-cyan-400/80 mt-4 text-lg font-mono">
            {t("description")}
          </p>
        </div>

        <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />

        {navigation.state.viewType === "kpi" && (
          <KpiList
            departmentId={department.id}
            onSelectKpi={handleSelectItem}
            onBack={handleBack}
          />
        )}

        {navigation.state.viewType === "maintenance" && (
          <MaintenanceList
            departmentId={department.id}
            onSelectMaintenance={handleSelectItem}
            onBack={handleBack}
          />
        )}

        {navigation.state.viewType === "documents" && (
          <DocumentsList
            departmentId={department.id}
            departmentName={department.name}
            onSelectDocument={handleSelectItem}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
