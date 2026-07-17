import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCookieWaarde, COOKIE_NAAM } from "@/lib/onboarding/auth";
import { stuurTodoGedaanEmail } from "@/lib/onboarding/email";

export async function POST(request: NextRequest, { params }: { params: { "todo-id": string } }) {
  const admin = createAdminClient();

  const { data: todo, error: todoError } = await admin
    .from("onboarding_todos")
    .select("*, onboarding_klanten(naam, onboarding_logins(link_token))")
    .eq("id", params["todo-id"])
    .single();

  if (todoError || !todo) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const klant = (todo as any).onboarding_klanten;
  const token = klant?.onboarding_logins?.link_token;

  const cookieWaarde = request.cookies.get(COOKIE_NAAM)?.value;
  if (!cookieWaarde || !verifyCookieWaarde(cookieWaarde, token)) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const { data: bijgewerkt, error } = await admin
    .from("onboarding_todos")
    .update({ gedaan: true, gedaan_op: new Date().toISOString() })
    .eq("id", params["todo-id"])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await stuurTodoGedaanEmail(klant.naam, todo.tekst).catch(() => {});

  return NextResponse.json({ todo: bijgewerkt });
}
