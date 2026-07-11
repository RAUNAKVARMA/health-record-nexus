import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureUniqueHealthId } from "@/lib/health-id";

const hospitalSchema = z.object({
  type: z.literal("hospital"),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const patientSchema = z.object({
  type: z.literal("patient"),
  name: z.string().min(2),
  phoneNumber: z.string().min(6),
  gender: z.enum(["male", "female", "other"]),
  password: z.string().min(6),
  healthId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = body?.type;

    if (type === "hospital") {
      const data = hospitalSchema.parse(body);
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A hospital with this email already exists" },
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: {
          type: "hospital",
          name: data.name,
          email: data.email,
          passwordHash,
        },
      });

      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
      });
    }

    if (type === "patient") {
      const data = patientSchema.parse(body);
      const healthId =
        data.healthId ||
        (await ensureUniqueHealthId(data.name, data.phoneNumber, data.gender));

      const existing = await prisma.user.findUnique({ where: { healthId } });
      if (existing) {
        return NextResponse.json(
          { error: "A patient with this Health ID already exists" },
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: {
          type: "patient",
          name: data.name,
          phoneNumber: data.phoneNumber,
          gender: data.gender,
          healthId,
          passwordHash,
        },
      });

      return NextResponse.json({
        id: user.id,
        name: user.name,
        healthId: user.healthId,
        type: user.type,
      });
    }

    return NextResponse.json({ error: "Invalid registration type" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
