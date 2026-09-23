import { query } from "../../db/pool.js";
import { searchNearbyHouses } from "../houses.js";

type UssdSession = { step: string; data: Record<string, unknown> };

export async function handleUssdRequest(params: {
  sessionId: string;
  phone: string;
  text: string;
}): Promise<string> {
  const { sessionId, phone, text } = params;
  const input = text.trim();
  const parts = input.split("*").filter(Boolean);
  const lastInput = parts[parts.length - 1] ?? "";

  let session = await getUssdSession(sessionId);
  if (!session) {
    session = { step: "menu", data: {} };
  }

  switch (session.step) {
    case "menu": {
      if (lastInput === "1") {
        await saveUssdSession(sessionId, phone, { step: "search_area", data: {} });
        return "CON Enter neighbourhood (ex: Kimironko):\n";
      }
      if (lastInput === "2") {
        await saveUssdSession(sessionId, phone, { step: "list_type", data: {} });
        return "CON List property:\n1.Room 2.Studio 3.1BR 4.Self-contained 5.House sale 6.Land\n";
      }
      return (
        "CON Welcome to Casa Rwanda\n" +
        "1. Search homes\n" +
        "2. List property\n" +
        "For full features, use WhatsApp.\n"
      );
    }

    case "search_area": {
      const area = lastInput.toLowerCase();
      // Default: Kigali CBD (Nyarugenge)
      let lat = -1.9441,
        lon = 30.0619;
      if (area.includes("kimironko") || area.includes("remera") || area.includes("gasabo")) {
        lat = -1.95;
        lon = 30.12;
      } else if (area.includes("kacyiru") || area.includes("nyarutarama")) {
        lat = -1.93;
        lon = 30.08;
      } else if (area.includes("musanze") || area.includes("ruhengeri")) {
        lat = -1.499;
        lon = 29.635;
      } else if (area.includes("rubavu") || area.includes("gisenyi")) {
        lat = -1.702;
        lon = 29.25;
      } else if (area.includes("huye") || area.includes("butare")) {
        lat = -2.596;
        lon = 29.739;
      }
      const results = await searchNearbyHouses(lat, lon, 10);
      if (results.length === 0) {
        await saveUssdSession(sessionId, phone, { step: "menu", data: {} });
        return "END No homes found. Try WhatsApp for better search.\n";
      }
      const list = results
        .slice(0, 3)
        .map((h, i) => `${i + 1}.${h.house_id} ${h.rent}RWF`)
        .join(" ");
      await saveUssdSession(sessionId, phone, { step: "menu", data: {} });
      return `END Found: ${list}\nUse WhatsApp to unlock contacts.\n`;
    }

    case "list_type": {
      const types = [
        "single_room",
        "studio",
        "one_bedroom",
        "self_contained",
        "house",
        "residential_plot",
      ];
      const idx = parseInt(lastInput, 10) - 1;
      if (idx < 0 || idx > 5) return "CON Invalid. Enter 1-6:\n";
      await saveUssdSession(sessionId, phone, {
        step: "list_rent",
        data: { type: types[idx] },
      });
      return "CON Enter monthly rent in RWF:\n";
    }

    case "list_rent": {
      const rent = parseInt(lastInput.replace(/\D/g, ""), 10);
      if (!rent) return "CON Invalid rent. Try again:\n";
      await saveUssdSession(sessionId, phone, { step: "menu", data: {} });
      return "END To list on Casa you need WhatsApp: ID verify + property video required.\n";
    }

    default:
      await saveUssdSession(sessionId, phone, { step: "menu", data: {} });
      return "CON Welcome to Casa Rwanda\n1.Search 2.List\n";
  }
}

async function getUssdSession(sessionId: string): Promise<UssdSession | null> {
  const result = await query<{ step: string; data: Record<string, unknown> }>(
    `SELECT step, data FROM ussd_sessions WHERE session_id = $1`,
    [sessionId]
  );
  if (!result.rows[0]) return null;
  return { step: result.rows[0].step, data: result.rows[0].data };
}

async function saveUssdSession(
  sessionId: string,
  phone: string,
  session: UssdSession
): Promise<void> {
  await query(
    `INSERT INTO ussd_sessions (session_id, phone, step, data, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (session_id) DO UPDATE SET
       step = EXCLUDED.step, data = EXCLUDED.data, updated_at = NOW()`,
    [sessionId, phone, session.step, JSON.stringify(session.data)]
  );
}
