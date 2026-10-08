import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as xlsx from "xlsx";
import { hasSession } from "@/lib/auth";

export async function GET() {
  // Antes era público: cualquiera con la URL descargaba la base completa.
  if (!(await hasSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const components = await prisma.component.findMany();
    const projects = await prisma.project.findMany();
    const projectComponents = await prisma.projectComponent.findMany();
    const wishlist = await prisma.wishlistItem.findMany();
    const loans = await prisma.loan.findMany();
    const movements = await prisma.movement.findMany();
    const people = await prisma.person.findMany();
    const boards = await prisma.board.findMany();
    const prints = await prisma.printPart.findMany();

    const wb = xlsx.utils.book_new();

    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(components), "Componentes");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(projects), "Proyectos");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(projectComponents), "ProjectComponents");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(wishlist), "Wishlist");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(loans), "Prestamos");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(movements), "Movimientos");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(people), "Personas");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(boards), "Placas");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(prints), "PiezasImpresas");

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="inventario_backup_${new Date().getTime()}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al exportar" }, { status: 500 });
  }
}
