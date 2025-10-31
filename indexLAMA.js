import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, child, update, remove } from "firebase/database";

const app = express();
app.use(bodyParser.json());

// 🔧 Firebase Config
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

// 🔧 WhatsApp Cloud API Config
const VERIFY_TOKEN = "poi-taxi-verify";
const WHATSAPP_TOKEN = "EAAUzJvcgTvwBP4MgkCHstWa8iZB8AyxgyAjUIEdVtAbLKWx3BP3ik5wBofGaO3YGWZC0Uqo9O4KngKfwblY4WYosMih2513mkn82mir8OZAXeCX8T1npg3tDiZAIFunhkY9SGekZCtZCAN29zE2dRne808pl3l2O85xGarHvVgbZCv3TMtNCuX55ADgKAxbAgZDZD";
const PHONE_NUMBER_ID = "905097019346311";

// ✅ Fungsi kirim pesan WhatsApp
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
    console.error("❌ Gagal kirim pesan:", err);
  }
}

// ✅ Route utama
app.get("/", (req, res) => res.send("✅ POI Taxi Bot aktif - Mall Nusantara"));

// ✅ Verifikasi Webhook Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else res.sendStatus(403);
});

// ✅ Proses pesan WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body?.toLowerCase() || "";
    let reply = "";

    // === 🚕 DAFTAR ANTRIAN ===
    if (text.startsWith("#daftarantrian")) {
      const parts = text.split(" ");
      const noPolisi = parts[1];
      const noLambung = parts[2];

      if (!noPolisi || !noLambung) {
        reply = "⚠️ Format salah.\nGunakan:\n#daftarantrian B1234XYZ KM1078";
      } else {
        const snapshot = await get(child(ref(db), "antrian"));
        let aktifCount = 0;
        if (snapshot.exists()) {
          const data = snapshot.val();
          aktifCount = Object.values(data).filter(x => x.status === "aktif").length;
        }

        const status = aktifCount < 3 ? "aktif" : "buffer";
        const waktu = new Date().toISOString();

        await set(ref(db, `antrian/${noPolisi}`), {
          noPolisi,
          noLambung,
          status,
          createdAt: waktu,
          nomor: from
        });

        if (status === "aktif") {
          reply = `🚕 *Anda masuk daftar Lobby Veteran Mall Nusantara*\nStatus: *AKTIF*\nNo Polisi: ${noPolisi}\nNo Lambung: ${noLambung}`;
        } else {
          reply = `🕒 *Anda masuk daftar Buffer Mall Nusantara*\nStatus: *MENUNGGU*\nNo Polisi: ${noPolisi}\nNo Lambung: ${noLambung}\nSilahkan kirim *ShareLive sekarang* agar posisi Anda mudah dipantau.`;
        }
      }
    }

    // === 📋 UPDATE ANTRIAN ===
    else if (text.startsWith("#updateantrian")) {
      const snapshot = await get(child(ref(db), "antrian"));
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val());
        const aktif = data
          .filter(x => x.status === "aktif")
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const buffer = data
          .filter(x => x.status === "buffer")
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        let daftar = `🏢 *ANTRIAN Mall Nusantara*\n\n🚖 *Lobby Veteran (Aktif)*:\n`;
        daftar += aktif
          .map((x, i) => `${i + 1}. ${x.noPolisi} | ${x.noLambung} (${x.status})`)
          .join("\n") || "- Belum ada -";

        daftar += `\n\n🕒 *Buffer (Menunggu)*:\n`;
        daftar += buffer
          .map((x, i) => `${i + aktif.length + 1}. ${x.noPolisi} | ${x.noLambung} (${x.status})`)
          .join("\n") || "- Belum ada -";

        reply = daftar;
      } else {
        reply = "🚗 Belum ada antrian di Mall Nusantara.";
      }
    }

    // === Kirim Balasan ===
    if (reply) await kirimPesan(from, reply);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error webhook:", err);
    res.sendStatus(500);
  }
});

// ✅ Menjalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));

export default app;
