import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

const PORT = Number(process.env.PORT || 3000);
const CEREBRAS_BASE_URL =
  process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1";
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || "llama-3.3-70b";
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

// Endpoint principal: Translate
app.post("/api/translate", async (req, res) => {
  try {
    if (!CEREBRAS_API_KEY) {
      return res.status(500).json({ error: "Missing CEREBRAS_API_KEY" });
    }

    const {
      sourceText = "",
      sourceLanguage = "",
      targetLanguage = "",
      temperature = 0.2,
      maxTokens = 350,
    } = req.body ?? {};
    if (!sourceText.trim()) {
      return res.status(400).json({ error: "sourceText is required" });
    }

    const promptPath = path.join(__dirname, "prompt.md");
    const system = fs.readFileSync(promptPath, "utf-8").trim();

    // const system = `
    //   Eres un traductor profesional multilingüe.

    //   Instrucciones:
    //   - Traduce el texto recibido ('source_text') del idioma indicado en 'source_language' al idioma indicado en 'target_language'.
    //   - No comentes, expliques ni añadas contenido no especificado al output.
    //   - Devuelve dos traducciones alternativas, ordenadas según su uso más común.
    //   - Ambas traducciones deben devolverse en un array bajo la clave 'traducciones'.
    //   - Tanto la entrada como la salida deben estar estrictamente en formato JSON válido.

    //   Input:
    //   {
    //     "texto": "Texto plano",
    //     "idioma_origen": "es",
    //     "idioma_destino": "en"
    //   }

    //   Output:
    //   {
    //     "traducciones": ["Traducción 1", "Traducción 2"]
    //   }
    //   `.trim();

    const user = `TEXTO:\n${sourceText} IDIOMA ORIGEN:\n${sourceLanguage} IDIOMA OBJETIVO:\n${targetLanguage}`;

    const payload = {
      model: CEREBRAS_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
      // JSON “legacy” (funciona bien con instrucción explícita)
      response_format: { type: "json_object" },
    };

    const r = await fetch(`${CEREBRAS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    const content = data?.choices?.[0]?.message?.content ?? "";
    res.json({
      model: data?.model ?? CEREBRAS_MODEL,
      content,
      usage: data?.usage ?? null, // prompt_tokens / completion_tokens / total_tokens
    });
  } catch (err) {
    res.status(500).json({
      error: "Ticket generation failed",
      details: err?.message ?? String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
