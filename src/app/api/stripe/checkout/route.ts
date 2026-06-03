import { maakCheckoutSessie } from "@/lib/stripe";
import { PAKKETTEN } from "@/types/rapport";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pakketId, naam, email } = body;

    if (!pakketId || !naam || !email) {
      return NextResponse.json(
        { error: "pakketId, naam en email zijn verplicht" },
        { status: 400 }
      );
    }

    const pakket = PAKKETTEN.find((p) => p.id === pakketId);
    if (!pakket) {
      return NextResponse.json({ error: "Pakket niet gevonden" }, { status: 404 });
    }

    const checkoutUrl = await maakCheckoutSessie({
      pakketId: pakket.id,
      naam,
      email,
      introPrijs: pakket.introPrijs,
      normaalPrijs: pakket.normaalPrijs,
      advertenties: pakket.advertenties,
      pakketNaam: pakket.naam,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Stripe checkout fout:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het aanmaken van de betaalsessie" },
      { status: 500 }
    );
  }
}
