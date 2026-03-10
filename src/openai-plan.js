import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generatePlanFromText(prompt) {
  const completion = await client.chat.completions.create({
    model: process.env.CHAT_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `
Ти генеруєш JSON схему плану для системи відеоспостереження.

Поверни тільки JSON.
Без markdown.
Без пояснень.
Без трійних лапок.
Без коментарів.

Використовуй координати в межах:
canvas.width = 14
canvas.height = 9

Формат:
{
  "canvas": { "width": 14, "height": 9 },
  "rooms": [
    { "id": "room1", "label": "Кімната 1", "x": 1, "y": 1, "w": 4, "h": 3 }
  ],
  "doors": [
    { "id": "door1", "label": "Двері", "x": 5, "y": 2, "w": 1, "h": 0.4 }
  ],
  "walls": [
    { "id": "wall1", "x1": 1, "y1": 1, "x2": 10, "y2": 1 }
  ],
  "cameras": [
    { "id": "cam1", "label": "Камера 1", "x": 2, "y": 2, "angle": 90, "fov": 70, "range": 3 }
  ],
  "devices": [
    { "id": "server1", "type": "server", "label": "Сервер", "x": 2, "y": 2, "w": 0.3, "h": 0.3 },
    { "id": "nvr1", "type": "nvr", "label": "Реєстратор", "x": 3, "y": 2, "w": 0.3, "h": 0.3 },
    { "id": "battery1", "type": "battery", "label": "АКБ", "x": 4, "y": 2, "w": 0.3, "h": 0.3 },
    { "id": "router1", "type": "router", "label": "Роутер", "x": 5, "y": 2, "w": 0.3, "h": 0.3 }
  ],
  "texts": [
    { "id": "text1", "text": "Підпис", "x": 2, "y": 1, "fontSize": 18, "color": "#334155" }
  ],
  "outsideAreas": [],
  "car": null
}

Правила:
- Якщо просять сервер, додавай device type="server"
- Якщо просять реєстратор, додавай type="nvr"
- Якщо просять АКБ або акумулятор, додавай type="battery"
- Якщо просять роутер, додавай type="router"
- Якщо обладнання не згадано — devices = []
- Якщо текст не потрібен — texts = []
- Для server / nvr / battery / router завжди використовуй:
  "w": 0.3,
  "h": 0.3
- План має бути логічним
- Кімнати не повинні хаотично накладатися
- Якщо є зовнішня територія, можна додати outsideAreas
- Камери став у логічні точки контролю
- walls додавай тільки якщо це доречно
`
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const text = completion.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);

  if (!match) {
    console.error("AI response:", text);
    throw new Error("AI не повернув коректний JSON");
  }

  return JSON.parse(match[0]);
}