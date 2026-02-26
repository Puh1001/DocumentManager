"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useBossNavigation } from "@/components/boss/use-boss-navigation";
import { Breadcrumb } from "@/components/boss/breadcrumb";
import { DepartmentGrid } from "@/components/boss/department-grid";
import { DepartmentKpiStatus } from "@/components/boss/department-kpi-status";
import { BossIsoOverviewTab } from "@/components/boss/boss-iso-overview-tab";
import { BossClientTab } from "@/components/boss/boss-client-tab";
import { ViewSelector } from "@/components/boss/view-selector";
import { KpiList } from "@/components/boss/kpi-list";
import { MaintenanceList } from "@/components/boss/maintenance-list";
import { DocumentsList } from "@/components/boss/documents-list";
import { KpiDetail } from "@/components/boss/kpi-detail";
import { MaintenanceDetail } from "@/components/boss/maintenance-detail";
import { DocumentDetail } from "@/components/boss/document-detail";
import { departmentApi, type Department } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-handler";

type HomeTab = "departments" | "kpiStatus" | "isoOverview" | "client";

export default function BossPage() {
  const t = useTranslations("boss");
  const tCommon = useTranslations("common");
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const navigation = useBossNavigation();
  const searchParams = useSearchParams();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<HomeTab>("departments");
  const [isoOverviewDocumentId, setIsoOverviewDocumentId] = useState<
    string | null
  >(null);

  // Open tab from URL when redirect from /boss/iso-documents
  useEffect(() => {
    if (!navigation.state.selectedDepartment && searchParams) {
      const tab = searchParams.get("tab");
      if (
        tab === "isoOverview" ||
        tab === "kpiStatus" ||
        tab === "departments" ||
        tab === "client"
      ) {
        setHomeTab(tab);
      }
    }
  }, [navigation.state.selectedDepartment, searchParams]);

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

  // No filtering needed here - DepartmentKpiStatus component already filters
  // departments with totalKpis > 0, and deactivated departments are not returned by API
  const visibleDepartments = useMemo(() => {
    return departments;
  }, [departments]);

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
        <div className="space-y-8">
          <div className="relative opacity-0 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold cyber-neon-cyan mb-2 font-cyber tracking-tight">
              {t("title")}
            </h1>
            <div className="absolute -bottom-1 left-0 h-0.5 w-24 bg-gradient-to-r from-cyan-400 to-transparent rounded-full" />
            <p className="text-cyan-300/90 mt-3 text-base font-cyber">
              {t("description")}
            </p>
          </div>

          {/* Tabs: minimal segment bar, transition 200ms */}
          <nav
            className="boss-home-tabs flex flex-wrap items-center gap-1 p-1 rounded-lg bg-cyan-500/5 border border-cyan-500/20 w-fit opacity-0 animate-slide-up transition-colors duration-200"
            style={{ animationDelay: "80ms" }}
            aria-label="Main tabs: Department list, KPI Status, ISO Overview, Client Files"
          >
            {(
              [
                ["departments", t("viewType.departments")],
                ["kpiStatus", t("viewType.kpiStatus")],
                ["isoOverview", t("viewType.isoOverview")],
                ["client", t("viewType.client")],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setHomeTab(tab)}
                aria-current={homeTab === tab ? "true" : undefined}
                className={`
                  px-4 py-2 text-sm font-cyber rounded-md transition-colors duration-200 cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]
                  ${
                    homeTab === tab
                      ? "bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 shadow-sm"
                      : "border border-transparent text-cyan-400/70 hover:bg-cyan-500/15 hover:text-cyan-300/90"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </nav>

          {homeTab === "kpiStatus" && (
            <div className="opacity-0 animate-slide-up" style={{ animationDelay: "120ms" }}>
              <DepartmentKpiStatus
                departments={visibleDepartments}
                onSelectDepartment={handleSelectDepartment}
              />
            </div>
          )}
          {homeTab === "departments" && (
            <div className="opacity-0 animate-slide-up" style={{ animationDelay: "120ms" }}>
              <DepartmentGrid
                departments={visibleDepartments}
                onSelectDepartment={handleSelectDepartment}
                loading={loading}
                error={error}
              />
            </div>
          )}
          {homeTab === "isoOverview" && isoOverviewDocumentId ? (
            <DocumentDetail
              documentId={isoOverviewDocumentId}
              onBack={() => setIsoOverviewDocumentId(null)}
            />
          ) : homeTab === "isoOverview" ? (
            <div className="opacity-0 animate-slide-up" style={{ animationDelay: "120ms" }}>
              <BossIsoOverviewTab
                departments={visibleDepartments}
                locale={locale}
                onSelectDocument={setIsoOverviewDocumentId}
              />
            </div>
          ) : homeTab === "client" ? (
            <div className="opacity-0 animate-slide-up" style={{ animationDelay: "120ms" }}>
              <BossClientTab />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Show view selector if department selected but no view type
  if (!navigation.state.viewType) {
    return (
      <div className="min-h-[calc(100vh-4rem)] cyber-bg cyber-grid cyber-scanline">
        <div className="space-y-8">
          <div className="relative opacity-0 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold cyber-neon-cyan mb-2 font-cyber tracking-tight">
              {t("title")}
            </h1>
            <div className="absolute -bottom-1 left-0 h-0.5 w-24 bg-gradient-to-r from-cyan-400 to-transparent rounded-full" />
            <p className="text-cyan-300/90 mt-3 text-base font-cyber">
              {t("description")}
            </p>
          </div>

          <div className="opacity-0 animate-slide-up" style={{ animationDelay: "60ms" }}>
            <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />
          </div>

          <div className="opacity-0 animate-slide-up" style={{ animationDelay: "120ms" }}>
            <ViewSelector
            department={navigation.state.selectedDepartment}
            onSelectView={handleSelectView}
            onBack={handleBack}
          />
          </div>
        </div>
      </div>
    );
  }

  // Show detail views if item is selected
  if (navigation.state.selectedItemId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] cyber-bg cyber-grid cyber-scanline">
        <div className="space-y-8">
          <div className="relative opacity-0 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold cyber-neon-cyan mb-2 font-cyber tracking-tight">
              {t("title")}
            </h1>
            <div className="absolute -bottom-1 left-0 h-0.5 w-24 bg-gradient-to-r from-cyan-400 to-transparent rounded-full" />
            <p className="text-cyan-300/90 mt-3 text-base font-cyber">
              {t("description")}
            </p>
          </div>

          <div className="opacity-0 animate-slide-up" style={{ animationDelay: "60ms" }}>
            <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />
          </div>

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
      <div className="space-y-8">
        <div className="relative opacity-0 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold cyber-neon-cyan mb-2 font-cyber tracking-tight">
            {t("title")}
          </h1>
          <div className="absolute -bottom-1 left-0 h-0.5 w-24 bg-gradient-to-r from-cyan-500 to-transparent rounded-full" />
          <p className="text-cyan-400/80 mt-3 text-base font-cyber">
            {t("description")}
          </p>
        </div>

        <div className="opacity-0 animate-slide-up" style={{ animationDelay: "60ms" }}>
          <Breadcrumb state={navigation.state} onNavigate={handleNavigate} />
        </div>

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
