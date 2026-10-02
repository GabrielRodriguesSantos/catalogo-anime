import { cookies } from "next/headers";

import AdminPanel from "@/components/admin-panel";
import { SESSION_COOKIE } from "@/lib/config";
import { requireUser } from "@/lib/dal";
import { getSiteSettings } from "@/lib/site-settings";
import { decrypt } from "@/lib/token";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  await requireUser();

  const store = await cookies();
  const adminToken = store.get(`${SESSION_COOKIE}-admin`)?.value;
  const verified = adminToken != null && (await decrypt(adminToken))?.role === "ADMIN";

  const settings = verified ? await getSiteSettings() : null;
  return <AdminPanel settings={settings} />;
}