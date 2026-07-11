import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/session";

const accessSchema = z.object({
  healthId: z.string().min(1),
});

const updateSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});

export async function GET() {
  const session = await requireRole("patient");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.consentRequest.findMany({
    where: {
      patientId: session.user.id,
      status: "pending",
    },
    include: {
      hospital: { select: { id: true, name: true } },
      record: {
        select: {
          id: true,
          recordType: true,
          notes: true,
          fileName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await requireRole("hospital");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { healthId } = accessSchema.parse(await request.json());
    const patient = await prisma.user.findFirst({
      where: { type: "patient", healthId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const existing = await prisma.consentRequest.findFirst({
      where: {
        hospitalId: session.user.id,
        patientId: patient.id,
        type: "access",
        status: { in: ["pending", "approved"] },
      },
    });

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        status: existing.status,
        alreadyExists: true,
      });
    }

    const consent = await prisma.consentRequest.create({
      data: {
        type: "access",
        patientId: patient.id,
        hospitalId: session.user.id,
        status: "pending",
      },
    });

    return NextResponse.json({
      id: consent.id,
      status: consent.status,
      patientName: patient.name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Access request error:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireRole("patient");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { requestId, status } = updateSchema.parse(await request.json());
    const consent = await prisma.consentRequest.findUnique({
      where: { id: requestId },
    });

    if (!consent || consent.patientId !== session.user.id) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (consent.status !== "pending") {
      return NextResponse.json({ error: "Request already resolved" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.consentRequest.update({
        where: { id: requestId },
        data: { status },
      });

      if (
        status === "approved" &&
        consent.type === "upload" &&
        consent.recordId
      ) {
        await tx.medicalRecord.update({
          where: { id: consent.recordId },
          data: { isApproved: true },
        });
      }

      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Consent update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
