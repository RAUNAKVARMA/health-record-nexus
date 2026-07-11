import { prisma } from "@/lib/prisma";

export function generateHealthId(
  name: string,
  phoneNumber: string,
  gender: "male" | "female" | "other"
): string {
  const nameHash = name
    .toLowerCase()
    .split("")
    .reduce((a, b) => a + b.charCodeAt(0), 0);
  const phoneHash = phoneNumber
    .split("")
    .reduce((a, b) => a + b.charCodeAt(0), 0);
  const genderCode = gender === "male" ? "1" : gender === "female" ? "2" : "3";
  const uniqueId = (nameHash + phoneHash).toString().padStart(5, "0").slice(0, 5);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  const today = new Date();
  const year = today.getFullYear().toString();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  return `${year}${month}${uniqueId}${genderCode}${random}`;
}

export async function ensureUniqueHealthId(
  name: string,
  phoneNumber: string,
  gender: "male" | "female" | "other"
): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: {
      type: "patient",
      name: { equals: name },
      phoneNumber,
    },
  });
  if (existing?.healthId) {
    return existing.healthId;
  }

  let healthId = generateHealthId(name, phoneNumber, gender);
  let attempts = 0;
  while (await prisma.user.findUnique({ where: { healthId } })) {
    healthId = generateHealthId(name, phoneNumber, gender);
    attempts += 1;
    if (attempts > 20) {
      throw new Error("Could not generate a unique Health ID");
    }
  }
  return healthId;
}
