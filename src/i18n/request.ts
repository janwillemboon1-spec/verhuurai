import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "nl";
  const validLocales = ["nl", "en"];
  const safeLocale = validLocales.includes(locale) ? locale : "nl";

  return {
    locale: safeLocale,
    messages: (await import(`../../messages/${safeLocale}.json`)).default,
  };
});
