import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { storeFile } from "@/lib/storage";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
];

export async function POST(request: Request) {
  const session = await requireRole("hospital");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const healthId = String(form.get("healthId") || "");
    const recordType = String(form.get("recordType") || "");
    const notes = String(form.get("notes") || "");
    const file = form.get("file");

    if (!healthId || !recordType || !(file instanceof File)) {
      return NextResponse.json(
        { error: "healthId, recordType, and file are required" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, JPG, PNG, WEBP, GIF, or TXT." },
        { status: 400 }
      );
    }

    const patient = await prisma.user.findFirst({
      where: { type: "patient", healthId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedPath = await storeFile(file.name, buffer, mime);

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        hospitalId: session.user.id,
        recordType,
        fileName: file.name,
        fileMime: mime,
        filePath: storedPath,
        notes: notes || null,
        isApproved: false,
      },
    });

    const consent = await prisma.consentRequest.create({
      data: {
        type: "upload",
        patientId: patient.id,
        hospitalId: session.user.id,
        status: "pending",
        recordId: record.id,
      },
    });

    return NextResponse.json({
      recordId: record.id,
      consentId: consent.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Upload record error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await requireSessionOrFail();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const healthId = searchParams.get("healthId");

  if (session.user.role === "patient") {
    const records = await prisma.medicalRecord.findMany({
      where: {
        patientId: session.user.id,
        isApproved: true,
      },
      include: {
        hospital: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  }

  // hospital
  if (!healthId) {
    return NextResponse.json({ error: "healthId is required" }, { status: 400 });
  }

  const patient = await prisma.user.findFirst({
    where: { type: "patient", healthId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const hasAccess = await prisma.consentRequest.findFirst({
    where: {
      hospitalId: session.user.id,
      patientId: patient.id,
      type: "access",
      status: "approved",
    },
  });

  const records = await prisma.medicalRecord.findMany({
    where: {
      patientId: patient.id,
      isApproved: true,
      OR: hasAccess
        ? undefined
        : [{ hospitalId: session.user.id }],
    },
    include: {
      hospital: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // If no access grant, only own uploads; if access grant, all approved
  const filtered = hasAccess
    ? records
    : records.filter((r) => r.hospitalId === session.user.id);

  return NextResponse.json(filtered);
}

async function requireSessionOrFail() {
  const { requireSession } = await import("@/lib/session");
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}
