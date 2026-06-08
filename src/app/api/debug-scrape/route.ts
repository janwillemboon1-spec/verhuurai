import { NextResponse } from "next/server";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Chromium";v="124","Google Chrome";v="124"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

function naarComUrl(url: string): string {
  return url.replace(/airbnb\.[a-z]{2,3}\//, "airbnb.com/");
}

// Geef de top-level sleutels + type + korte preview van een object
function samenvat(obj: any, diepte = 0): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === "string") return obj.length > 120 ? obj.slice(0, 120) + "…" : obj;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (Array.isArray(obj)) {
    return `[Array, ${obj.length} items, eerste: ${JSON.stringify(samenvat(obj[0], diepte + 1)).slice(0, 80)}]`;
  }
  if (typeof obj === "object") {
    if (diepte >= 2) return `{Object, keys: ${Object.keys(obj).slice(0, 10).join(", ")}}`;
    const result: Record<string, any> = {};
    for (const k of Object.keys(obj).slice(0, 30)) {
      result[k] = samenvat(obj[k], diepte + 1);
    }
    return result;
  }
  return obj;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !url.includes("airbnb")) {
    return NextResponse.json({ error: "Geef een ?url=https://www.airbnb.nl/rooms/... parameter mee" }, { status: 400 });
  }

  const comUrl = naarComUrl(url);
  const resultaat: Record<string, any> = { url: comUrl };

  try {
    const res = await fetch(comUrl, { headers: BROWSER_HEADERS });
    resultaat.httpStatus = res.status;
    resultaat.httpOk = res.ok;
    resultaat.contentType = res.headers.get("content-type");

    if (!res.ok) {
      return NextResponse.json(resultaat);
    }

    const html = await res.text();
    resultaat.htmlLengte = html.length;

    // Check __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch?.[1]) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        resultaat.nextData = {
          gevonden: true,
          grootte: nextDataMatch[1].length,
          topLevelSleutels: Object.keys(data),
          samenvatting: samenvat(data),
        };
      } catch (e: any) {
        resultaat.nextData = { gevonden: true, parseFout: e.message };
      }
    } else {
      resultaat.nextData = { gevonden: false };
    }

    // Check niobeMinimalClientData
    const niobeMatch = html.match(/niobeMinimalClientData\s*=\s*(\[[\s\S]*?\]);/);
    if (niobeMatch?.[1]) {
      try {
        const data = JSON.parse(niobeMatch[1]);
        resultaat.niobeData = {
          gevonden: true,
          grootte: niobeMatch[1].length,
          samenvatting: samenvat(data),
        };
      } catch (e: any) {
        resultaat.niobeData = { gevonden: true, parseFout: e.message };
      }
    } else {
      resultaat.niobeData = { gevonden: false };
    }

    // Tel application/json script-tags + dump de grote
    const jsonScripts = Array.from(html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g));
    resultaat.jsonScriptTags = {
      aantal: jsonScripts.length,
      tags: jsonScripts.slice(0, 10).map((m, i) => {
        try {
          const data = JSON.parse(m[1]);
          return {
            index: i,
            grootte: m[1].length,
            topLevelSleutels: Array.isArray(data) ? `[Array ${data.length}]` : Object.keys(data).slice(0, 15),
          };
        } catch {
          return { index: i, parseFout: true };
        }
      }),
    };

    // Dump de inhoud van de grootste script tag (de SPA-state)
    const grootsteScript = jsonScripts.reduce((a, b) => (a[1].length > b[1].length ? a : b), jsonScripts[0]);
    if (grootsteScript) {
      try {
        const data = JSON.parse(grootsteScript[1]);

        // Zoek de rooms-route key
        const roomsKey = Object.keys(data).find(k => k.includes("/rooms/") || k.includes("rooms"));
        const rootKey = Object.keys(data).find(k => k.startsWith("root >"));

        resultaat.grootsteScriptTag = {
          grootte: grootsteScript[1].length,
          topLevelSleutels: Object.keys(data),
          roomsKey: roomsKey ?? null,
          rootKey: rootKey ?? null,
        };

        // Navigeer naar de rooms data
        const roomsData = roomsKey ? data[roomsKey] : (rootKey ? data[rootKey] : null);
        if (roomsData) {
          resultaat.roomsDataSleutels = Object.keys(roomsData).slice(0, 20);

          // Zoek sections array
          const vindSections = (obj: any, diepte = 0): any[] | null => {
            if (diepte > 5 || !obj || typeof obj !== "object") return null;
            if (Array.isArray(obj) && obj[0]?.sectionComponentType) return obj;
            for (const k of Object.keys(obj)) {
              const r = vindSections(obj[k], diepte + 1);
              if (r) return r;
            }
            return null;
          };

          const sections = vindSections(roomsData);
          if (sections) {
            resultaat.sectionsGevonden = true;
            resultaat.sectionTypes = sections.map((s: any) => s.sectionComponentType).filter(Boolean);

            // Dump de inhoud van elke sectie (beperkt)
            resultaat.sectiesInhoud = {};
            for (const sectie of sections) {
              const type = sectie.sectionComponentType;
              if (!type) continue;
              resultaat.sectiesInhoud[type] = samenvat(sectie, 0);
            }
          } else {
            resultaat.sectionsGevonden = false;
            resultaat.roomsDataSamenvatting = samenvat(roomsData, 0);
          }
        }
      } catch (e: any) {
        resultaat.grootsteScriptTagFout = e.message;
      }
    }

    // OG meta tags
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/)?.[1] ?? "";
    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/)?.[1] ?? "";
    resultaat.ogMetaTags = { title: ogTitle, description: ogDesc.slice(0, 200) };

    // Zoek specifieke Airbnb-veldnamen in de volledige HTML (als bewijsstuk)
    const veldnamen = [
      "neighborhoodOverview", "houseRules", "spaceDescription", "transit",
      "interactionWithGuests", "guestAccess", "amenities", "cancellationPolicy",
      "the_space", "space", "host", "primaryHost", "sectionComponentType",
      "niobeMinimalClientData", "__NEXT_DATA__",
    ];
    resultaat.veldnamenAanwezig = veldnamen.filter(v => html.includes(`"${v}"`));

  } catch (err: any) {
    resultaat.fout = err.message;
  }

  return NextResponse.json(resultaat, {
    headers: { "Content-Type": "application/json" },
  });
}
