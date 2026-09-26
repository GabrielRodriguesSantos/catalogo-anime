import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdultContentToggle from "@/components/adult-content-toggle";
import ProfileForm from "@/components/profile-form";
import { getProfileData, requireUser } from "@/lib/dal";
import { parsePreferences } from "@/lib/preferences";

export const metadata: Metadata = {
  title: "Editar perfil",
};

export default async function EditProfilePage() {
  const user = await requireUser();
  const profileData = await getProfileData(user.id);

  if (!profileData) redirect("/profile");

  const preferences = parsePreferences(profileData.settings?.data);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="flex flex-col gap-6">
        <ProfileForm
          initial={{
            bio: profileData.profile?.bio ?? "",
            avatarUrl: profileData.profile?.avatarUrl ?? null,
            theme: preferences.theme,
            accent: preferences.accent,
            favoriteCategories: preferences.favoriteCategories,
          }}
        />
        <AdultContentToggle
          verified={profileData.profile?.adultVerified === true}
        />
      </div>
    </div>
  );
}