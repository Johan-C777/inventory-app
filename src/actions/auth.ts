"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession } from "@/lib/auth";

export type LoginState = { error: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!process.env.ADMIN_PASSWORD || !process.env.AUTH_SECRET) {
    return { error: "Faltan ADMIN_PASSWORD y AUTH_SECRET en las variables de entorno." };
  }
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 700)); // frena la fuerza bruta
    return { error: "Contraseña incorrecta." };
  }

  await createSession();
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
