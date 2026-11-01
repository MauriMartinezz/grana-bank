import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col px-6 pt-20 pb-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="" width={72} height={72} unoptimized />
        <h1 className="mt-3 text-[40px] leading-tight font-bold text-garnet">
          GranaBank
        </h1>
        <p className="mt-1 text-sm text-muted">
          Con cada compra, sumás orgullo granate
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
