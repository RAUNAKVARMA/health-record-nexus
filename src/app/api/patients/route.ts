import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ensureUniqueHealthId } from "@/lib/health-id";

const createPatientSchema = z.object({
  name: z.string().min(2),
  phoneNumber: z.string().min(6),
  gender: z.enum(["male", "female", "other"]),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const session = await requireRole("hospital");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createPatientSchema.parse(await request.json());
    const healthId = await ensureUniqueHealthId(
      body.name,
      body.phoneNumber,
      body.gender
    );

    const existingByPhone = await prisma.user.findFirst({
      where: {
        type: "patient",
        name: body.name,
        phoneNumber: body.phoneNumber,
      },
    });
    if (existingByPhone?.healthId) {
      return NextResponse.json({
        id: existingByPhone.id,
        name: existingByPhone.name,
        healthId: existingByPhone.healthId,
        alreadyExists: true,
      });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        type: "patient",
        name: body.name,
        phoneNumber: body.phoneNumber,
        gender: body.gender,
        healthId,
        passwordHash,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      healthId: user.healthId,
      gender: user.gender,
      phoneNumber: user.phoneNumber,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Create patient error:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await requireRole("hospital");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const healthId = searchParams.get("healthId");
  if (!healthId) {
    return NextResponse.json({ error: "healthId is required" }, { status: 400 });
  }

  const patient = await prisma.user.findFirst({
    where: { type: "patient", healthId },
    select: {
      id: true,
      name: true,
      healthId: true,
      gender: true,
      phoneNumber: true,
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(patient);
}
