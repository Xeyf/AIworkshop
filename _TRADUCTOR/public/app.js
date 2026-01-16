const root = document.getElementById("app");

const createElement = function (tag, attr, text = "") {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attr)) el[key] = value;
  el.textContent = text;
  return el;
};

{
  const card1 = createElement("div", { className: "card" });

  /* Row: language selectors */
  const rowLang = createElement("div", { className: "row mb-3" });

  const colSource = createElement("div", { className: "col" });
  const sourceSelect = createElement("select", {
    id: "source_language",
    className: "form-select",
  });
  [
    ["auto", "Detectar lenguaje"],
    ["es", "Español"],
    ["en", "Inglés"],
    ["fr", "Francés"],
    ["de", "Alemán"],
    ["pt", "Portugués"],
  ].forEach(([v, t]) => {
    const opt = createElement("option", { value: v }, t);
    sourceSelect.appendChild(opt);
  });
  colSource.appendChild(sourceSelect);

  const colTarget = createElement("div", { className: "col" });
  const targetSelect = createElement("select", {
    id: "target_language",
    className: "form-select",
  });
  [
    ["en", "Inglés"],
    ["es", "Español"],
    ["fr", "Francés"],
    ["de", "Alemán"],
    ["pt", "Portugués"],
  ].forEach(([v, t]) => {
    const opt = createElement("option", { value: v }, t);
    targetSelect.appendChild(opt);
  });
  colTarget.appendChild(targetSelect);

  rowLang.append(colSource, colTarget);

  const exampleBtn = createElement(
    "button",
    { id: "exampleBtn", className: "btn btn-secondary mb-3" },
    "Cargar ejemplo"
  );

  /* Textareas */
  const sourceText = createElement("textarea", {
    id: "source_text",
    className: "form-control mb-3",
    rows: 3,
    placeholder: "Texto original",
  });

  const outputText = createElement("textarea", {
    id: "output_text",
    className: "form-control mb-3",
    rows: 3,
    readOnly: true,
  });

  /* Translate button */
  const translateBtn = createElement(
    "button",
    { id: "runBtn", className: "btn btn-primary w-100" },
    "Translate"
  );

  /* Settings row */
  const settingsRow = createElement("div", { className: "row my-3" });

  const tempCol = createElement("div", { className: "col" });
  const tempLabel = createElement(
    "label",
    { className: "small" },
    "Temperature:"
  );
  const tempInput = createElement("input", {
    id: "temperature",
    className: "form-control",
    type: "number",
    min: 0,
    max: 1.5,
    step: 0.1,
    value: 0.2,
  });
  tempLabel.appendChild(tempInput);
  tempCol.appendChild(tempLabel);

  const tokensCol = createElement("div", { className: "col" });
  const tokensLabel = createElement(
    "label",
    { className: "small" },
    "Max tokens:"
  );
  const tokensInput = createElement("input", {
    id: "maxTokens",
    className: "form-control",
    type: "number",
    min: 50,
    max: 1000,
    step: 50,
    value: 350,
  });
  tokensLabel.appendChild(tokensInput);
  tokensCol.appendChild(tokensLabel);

  settingsRow.append(tempCol, tokensCol);

  /* Assemble first card */
  card1.append(
    rowLang,
    exampleBtn,
    sourceText,
    outputText,
    translateBtn,
    settingsRow
  );

  /* Card: raw output */
  const card2 = createElement("div", { className: "card" });
  card2.append(
    createElement("h3", {}, "Salida (raw)"),
    createElement("pre", { id: "raw" }),
    createElement("div", { className: "small", id: "usage" })
  );

  /* Card: JSON validation */
  const card3 = createElement("div", { className: "card" });
  card3.append(
    createElement("h3", {}, "Validación JSON"),
    createElement("pre", { id: "parsed" })
  );

  root.append(card1, card2, card3);
}

const sourceText = document.getElementById("source_text");
const sourceLanguage = document.getElementById("source_language");
const targetLanguage = document.getElementById("target_language");
const outputText = document.getElementById("output_text");

const tempEl = document.getElementById("temperature");
const maxEl = document.getElementById("maxTokens");

const rawEl = document.getElementById("raw");
const parsedEl = document.getElementById("parsed");
const usageEl = document.getElementById("usage");

const EXAMPLES = [
  "Hola",
  "Buenos días, ¿cómo estás?",
  "Necesito traducir este texto al inglés.",
  "El sistema falló inesperadamente durante la ejecución del proceso.",
  "Ayer, mientras caminaba bajo la lluvia, pensé en todas las decisiones que me trajeron hasta aquí.",
  "¡Esto es increíble! No puedo creer que finalmente funcione tan bien.",
  "El usuario debe autenticarse antes de acceder a los recursos protegidos del sistema.",
  "Si el valor introducido no cumple con las restricciones definidas, la operación será cancelada automáticamente.",
  "No estoy de acuerdo con la forma en que se ha gestionado esta situación y considero que debería revisarse cuanto antes.",
  "En un mundo cubierto por una niebla interminable, las palabras también pierden su significado y deben ser interpretadas con cuidado.",
];

document.getElementById("exampleBtn").addEventListener("click", () => {
  sourceText.value = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
});

document.getElementById("runBtn").addEventListener("click", async () => {
  rawEl.textContent = "";
  parsedEl.textContent = "";
  usageEl.textContent = "";

  const payload = {
    sourceText: sourceText.value,
    sourceLanguage: sourceLanguage.value,
    targetLanguage: targetLanguage.value,
    temperature: Number(tempEl.value),
    maxTokens: Number(maxEl.value),
  };

  try {
    const r = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(`API error:\n${JSON.stringify(data, null, 2)}`);

    rawEl.textContent = data.content || "";

    if (data.usage) {
      usageEl.textContent = `usage: prompt=${data.usage.prompt_tokens}, completion=${data.usage.completion_tokens}, total=${data.usage.total_tokens}`;
    }

    try {
      const obj = JSON.parse(data.content);
      parsedEl.textContent =
        "✅ JSON.parse OK\n\n" + JSON.stringify(obj, null, 2);
      if (Array.isArray(obj.traducciones) && obj.traducciones.length > 0) {
        outputText.value = obj.traducciones[0];
      } else {
        outputText.value = "";
      }
    } catch (e) {
      parsedEl.textContent = "❌ JSON.parse falló\n" + e.message;
    }
  } catch (e) {
    rawEl.textContent = "ERROR:\n" + String(e.message || e);
  }
});
