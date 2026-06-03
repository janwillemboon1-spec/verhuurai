import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

declare global {
  var sessies: Map<string, any>;
}
if (!global.sessies) global.sessies = new Map();

export async function POST(request: Request) {
  const { naam, email } = await request.json();
  const sessieId = uuidv4();
  global.sessies.set(sessieId, {
    id: sessieId,
    email: email || "",
    naam: naam || "Tester",
    pakket: "test",
    credits: 999,
    gebruiktCredits: 0,
    aangemaakt: new Date().toISOString(),
  });
  return NextResponse.json({ sessieId });
}
