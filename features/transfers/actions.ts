"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/current-user";
import { setFavorite } from "./contacts";

export async function toggleFavorite(formData: FormData) {
  const user = await getCurrentUser();
  const contactUserId = String(formData.get("contactUserId") ?? "");
  const favorite = formData.get("favorite") === "true";

  await setFavorite(user.id, contactUserId, favorite);
  revalidatePath("/transfers");
}
