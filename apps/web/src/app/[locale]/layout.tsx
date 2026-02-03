import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../../i18n/routing";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Providing all messages to the client
  // Pass locale explicitly to ensure correct messages are loaded
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider
      messages={messages}
      locale={locale}
      key={locale} // Force re-render when locale changes
    >
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
