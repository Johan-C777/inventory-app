import { Logo } from "@/components/shell/Sidebar";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="hud w-full max-w-sm p-8">
        <Logo className="size-10" />
        <h1 className="mt-5 text-2xl">Inventario Pro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escribe la contraseña del taller para entrar.</p>
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
