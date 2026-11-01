"use server";

import { redirect } from "next/navigation";

// Development bypass: real credentials and sessions arrive before delivery.
export async function login() {
  redirect("/home");
}

export async function logout() {
  redirect("/login");
}
