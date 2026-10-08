import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { loanState } from "@/lib/stock";

// Vercel Cron (vercel.json) llama a esta ruta una vez al día con Authorization: Bearer CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const today = dayKey(new Date());
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
  const loans = await prisma.loan.findMany({
    where: {
      status: "PRESTADO",
      expected_return_date: { not: null },
      OR: [{ reminded_at: null }, { reminded_at: { lt: threeDaysAgo } }], // máximo un aviso cada 3 días
    },
    include: { component: { select: { name: true, unit: true } } },
  });
  const overdue = loans.map((l) => ({ ...l, ...loanState(l, today) })).filter((l) => l.state === "overdue");
  if (!overdue.length) return NextResponse.json({ sent: 0 });

  const lines = overdue.map(
    (l) => `• ${l.person}: ${l.quantity} ${l.component.unit} de ${l.component.name} (hace ${l.days} ${l.days === 1 ? "día" : "días"})`,
  );
  const content = `Préstamos vencidos (${overdue.length})\n${lines.join("\n")}`;

  const webhook = process.env.NOTIFY_WEBHOOK_URL;
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, text: content }), // Discord lee "content"; Slack/Telegram-bridge leen "text"
    });
    if (!res.ok) return NextResponse.json({ error: `Webhook respondió ${res.status}` }, { status: 502 });
  }

  await prisma.loan.updateMany({ where: { id: { in: overdue.map((l) => l.id) } }, data: { reminded_at: new Date() } });
  return NextResponse.json({ sent: overdue.length, delivered: Boolean(webhook) });
}
