import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child } from "firebase/database";

const app = express();
app.use(bodyParser.json());

// Firebase config (POI Taxi)
const firebaseConfig = {
  apiKey: "AIzaSyArjIuAyCRw85LStoiJzgIdLyhs8HXPFhs",
  authDomain: "poi-taxi.firebaseapp.com",
  databaseURL: "https://poi-taxi-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "poi-taxi",
  storageBucket: "poi-taxi.firebasestorage.app",
  messagingSenderId: "774582687333",
  appId: "1:774582687333:web:ee95e1e3e705beaee4d88c"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// WhatsApp Cloud API (ganti jika pakai WABA sendiri)
const VERIFY_TOKEN = "poi-taxi-verify";
const WHATSAPP_TOKEN = "EAAUzJvcgTvwBP4MgkCHstWa8iZB8AyxgyAjUIEdVtAbLKWx3BP3ik5wBofGaO3YGWZC0Uqo9O4KngKfwblY4WYosMih2513mkn82mir8OZAXeCX8T1npg3tDiZAIFunhkY9SGekZCtZCAN29zE2dRne808pl3l2O85xGarHvVgbZCv3TMtNCuX55ADgKAxbAgZDZD";
const PHONE_NUMBER_ID = "905097019346311";

async function kirimPesan(nomor, isi) {
  try {
    await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: nomor,
        text: { body: isi }
      })
    });
  } catch (err) {
    console.error("Gagal kirim pesan:", err);
  }
}

app.get("/", (req, res) => res.send("POI Taxi Multi-Lokasi Bot running"));

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else res.sendStatus(403);
});

// Basic parse for optional location: if user appends location token as 4th+ word, use it, else default
function parseLocation(parts) {
  if (parts.length >= 4) {
    return parts.slice(3).join("_").toLowerCase();
  }
  return "mall_nusantara";
}

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const textRaw = message.text?.body || "";
    const text = textRaw.trim();
    const lc = text.toLowerCase();
    let reply = "";

    if (lc.startsWith("#daftarantrian")) {
      const parts = text.split(/\s+/);
      const noPolisi = parts[1] || "";
      const noLambung = parts[2] || "";
      const lokasi = parseLocation(parts);

      if (!noPolisi || !noLambung) {
        reply = "⚠️ Format salah.\nGunakan:\n#daftarantrian B1234XYZ KM101 [lokasi]\nContoh lokasi: mall_nusantara";
      } else {
        const snap = await get(child(ref(db), `pangkalan/${lokasi}/antrian`));
        let aktifCount = 0;
        if (snap.exists()) {
          const data = snap.val();
          aktifCount = Object.values(data).filter(x => x.status === "aktif").length;
        }
        const status = aktifCount < 3 ? "aktif" : "buffer";
        const waktu = new Date().toISOString();

        await set(ref(db, `pangkalan/${lokasi}/antrian/${noPolisi}`), {
          noPolisi,
          noLambung,
          status,
          createdAt: waktu,
          nomor: from
        });

        if (status === "aktif") {
          reply = `🚕 Anda masuk daftar Lobby ${lokasi.replace(/_/g,' ')}\nStatus: AKTIF\nNo Polisi: ${noPolisi}\nNo Lambung: ${noLambung}`;
        } else {
          reply = `🕒 Anda masuk daftar Buffer ${lokasi.replace(/_/g,' ')}\nStatus: MENUNGGU\nNo Polisi: ${noPolisi}\nNo Lambung: ${noLambung}\nSilahkan kirim ShareLive sekarang.`;
        }
      }
    } else if (lc.startsWith("#updateantrian")) {
      const parts = text.split(/\s+/);
      const lokasi = parseLocation(parts);
      const snap = await get(child(ref(db), `pangkalan/${lokasi}/antrian`));
      if (snap.exists()) {
        const data = Object.values(snap.val());
        const aktif = data.filter(x => x.status === "aktif").sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt));
        const buffer = data.filter(x => x.status === "buffer").sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt));

        let daftar = `🏢 ANTRIAN ${lokasi.replace(/_/g,' ').toUpperCase()}\n\n🚖 Lobby (Aktif):\n`;
        daftar += aktif.map((x,i)=> `${i+1}. ${x.noPolisi} | ${x.noLambung} (${x.status})`).join("\n") || "- Belum ada -";
        daftar += `\n\n🕒 Buffer (Menunggu):\n`;
        daftar += buffer.map((x,i)=> `${i+1+aktif.length}. ${x.noPolisi} | ${x.noLambung} (${x.status})`).join("\n") || "- Belum ada -";

        reply = daftar;
      } else {
        reply = `🚗 Belum ada antrian di ${lokasi.replace(/_/g,' ')}`;
      }
    }

    if (reply) await kirimPesan(from, reply);
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server running on ${PORT}`));

export default app;
