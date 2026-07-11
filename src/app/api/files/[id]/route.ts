import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.medicalRecord.findUnique({
    where: { id },
  });

  if (!record || !record.isApproved) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const isPatientOwner =
    session.user.role === "patient" && record.patientId === session.user.id;
  const isHospitalOwner =
    session.user.role === "hospital" && record.hospitalId === session.user.id;

  let hospitalHasAccess = isHospitalOwner;
  if (session.user.role === "hospital" && !isHospitalOwner) {
    const access = await prisma.consentRequest.findFirst({
      where: {
        hospitalId: session.user.id,
        patientId: record.patientId,
        type: "access",
        status: "approved",
      },
    });
    hospitalHasAccess = !!access;
  }

  if (!isPatientOwner && !hospitalHasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { buffer, exists } = await readStoredFile(record.filePath);
  if (!exists) {
    return NextResponse.json({ error: "File missing on server" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": record.fileMime,
      "Content-Disposition": `attachment; filename="${record.fileName.replace(/"/g, "")}"`,
    },
  });
}
