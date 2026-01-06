import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  // Load all message files for the locale
  const [
    common,
    auth,
    dashboard,
    documents,
    departments,
    errors,
    kpi,
    maintenance,
    boss,
    users,
    permissions,
    modules,
  ] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/auth.json`),
    import(`../messages/${locale}/dashboard.json`),
    import(`../messages/${locale}/documents.json`),
    import(`../messages/${locale}/departments.json`),
    import(`../messages/${locale}/errors.json`),
    import(`../messages/${locale}/kpi.json`),
    import(`../messages/${locale}/maintenance.json`),
    import(`../messages/${locale}/boss.json`),
    import(`../messages/${locale}/users.json`),
    import(`../messages/${locale}/permissions.json`),
    import(`../messages/${locale}/modules.json`),
  ]);

  return {
    locale,
    messages: {
      common: common.default,
      auth: auth.default,
      dashboard: dashboard.default,
      documents: documents.default,
      departments: departments.default,
      errors: errors.default,
      kpi: kpi.default,
      maintenance: maintenance.default,
      boss: boss.default,
      users: users.default,
      permissions: permissions.default,
      modules: modules.default,
    },
  };
});
