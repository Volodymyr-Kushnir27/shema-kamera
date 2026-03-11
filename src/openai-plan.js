import OpenAI from "openai";
import { mockPlan } from "./mock-plan.js";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uid(prefix, i) {
  return `${prefix}${i + 1}`;
}

function normalizePlan(raw) {
  const base = {
    canvas: { width: 14, height: 9 },
    rooms: [],
    doors: [],
    windows: [],
    walls: [],
    cameras: [],
    devices: [],
    texts: [],
    outsideAreas: [],
    car: null
  };

  const plan = { ...base, ...(raw || {}) };

  plan.canvas = {
    width: toNum(plan.canvas?.width, 14),
    height: toNum(plan.canvas?.height, 9)
  };

  plan.rooms = safeArray(plan.rooms).map((room, i) => ({
    id: room.id || uid("room", i),
    label: room.label || `Кімната ${i + 1}`,
    x: toNum(room.x, 1),
    y: toNum(room.y, 1),
    w: toNum(room.w, 3),
    h: toNum(room.h, 2.5)
  }));

  plan.doors = safeArray(plan.doors).map((door, i) => ({
  id: door.id || `door${i + 1}`,
  label: door.label || `Двері ${i + 1}`,
  x: toNum(door.x, 1),
  y: toNum(door.y, 1),
  w: toNum(door.w, 1),
  h: toNum(door.h, 0.3),
  rotation: toNum(door.rotation, 0)
}));

  plan.windows = safeArray(plan.windows).map((item, i) => ({
  id: item.id || `window${i + 1}`,
  label: item.label || `Вікно ${i + 1}`,
  x: toNum(item.x, 1),
  y: toNum(item.y, 1),
  w: toNum(item.w, 1.2),
  h: toNum(item.h, 0.22),
  rotation: toNum(item.rotation, 0)
}));

  plan.walls = safeArray(plan.walls).map((wall, i) => ({
    id: wall.id || uid("wall", i),
    x1: toNum(wall.x1, 1),
    y1: toNum(wall.y1, 1),
    x2: toNum(wall.x2, 5),
    y2: toNum(wall.y2, 1)
  }));

  plan.cameras = safeArray(plan.cameras).map((cam, i) => ({
    id: cam.id || uid("cam", i),
    label: cam.label || `Камера ${i + 1}`,
    x: toNum(cam.x, 2),
    y: toNum(cam.y, 2),
    angle: toNum(cam.angle, 90),
    fov: toNum(cam.fov, 70),
    range: toNum(cam.range, 2.8)
  }));

  plan.devices = safeArray(plan.devices).map((device, i) => ({
    id: device.id || uid("device", i),
    type: device.type || "server",
    label: device.label || "Обладнання",
    x: toNum(device.x, 2),
    y: toNum(device.y, 2),
    w: toNum(device.w, 0.3),
    h: toNum(device.h, 0.3)
  }));

  plan.texts = safeArray(plan.texts).map((item, i) => ({
    id: item.id || uid("text", i),
    text: item.text || "Підпис",
    x: toNum(item.x, 1),
    y: toNum(item.y, 1),
    fontSize: toNum(item.fontSize, 18),
    color: item.color || "#334155"
  }));

  plan.outsideAreas = safeArray(plan.outsideAreas).map((item, i) => ({
    id: item.id || uid("outside", i),
    label: item.label || `Зона ${i + 1}`,
    x: toNum(item.x, 1),
    y: toNum(item.y, 1),
    w: toNum(item.w, 3),
    h: toNum(item.h, 2)
  }));

  plan.car = plan.car
    ? {
        x: toNum(plan.car.x, 1),
        y: toNum(plan.car.y, 1),
        w: toNum(plan.car.w, 1.8),
        h: toNum(plan.car.h, 0.9)
      }
    : null;

  return plan;
}

function extractJson(text) {
  const clean = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI не повернув JSON-об'єкт");

  return JSON.parse(match[0]);
}

function parseCount(prompt, word, fallback) {
  const re = new RegExp(`(\\d+)\\s*${word}`, "i");
  const m = String(prompt).match(re);
  if (m) return Number(m[1]);
  return fallback;
}

function hasWord(prompt, word) {
  return new RegExp(word, "i").test(String(prompt));
}

function extractRoomLabels(prompt, roomCount) {
  const labels = [];
  if (hasWord(prompt, "кухн")) labels.push("Кухня");
  if (hasWord(prompt, "санвуз")) labels.push("Санвузол");
  if (hasWord(prompt, "бойлер")) labels.push("Бойлерна");
  if (hasWord(prompt, "коридор")) labels.push("Коридор");
  if (hasWord(prompt, "віталь")) labels.push("Вітальня");
  if (hasWord(prompt, "спальн")) labels.push("Спальня");
  if (hasWord(prompt, "дитяч")) labels.push("Дитяча");

  while (labels.length < roomCount) {
    labels.push(`Кімната ${labels.length + 1}`);
  }

  return labels.slice(0, roomCount);
}

function buildCompactRoomRects(roomCount, labels) {
  const rects = [];

  const cols = roomCount <= 2 ? roomCount : 2;
  const rows = Math.ceil(roomCount / 2);

  const startX = 0.8;
  const startY = 0.8;
  const roomW = cols === 1 ? 5.5 : 4.9;
  const roomH = rows === 1 ? 3.4 : 2.7;
  const gapX = 0.6;
  const gapY = 0.6;

  for (let i = 0; i < roomCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    rects.push({
      id: `room${i + 1}`,
      label: labels[i] || `Кімната ${i + 1}`,
      x: +(startX + col * (roomW + gapX)).toFixed(2),
      y: +(startY + row * (roomH + gapY)).toFixed(2),
      w: roomW,
      h: roomH
    });
  }

  return rects;
}

function placeDoorsAndWindowsFromRooms(rooms) {
  const doors = [];
  const windows = [];

  rooms.forEach((room, i) => {
    doors.push({
      id: `door${i + 1}`,
      label: `Двері ${i + 1}`,
      x: +(room.x + room.w - 0.5).toFixed(2),
      y: +(room.y + room.h / 2).toFixed(2),
      w: 1,
      h: 0.3
    });

    windows.push({
      id: `window${i + 1}`,
      label: `Вікно ${i + 1}`,
      x: +(room.x + room.w / 2 - 0.6).toFixed(2),
      y: +(room.y + 0.02).toFixed(2),
      w: 1.2,
      h: 0.22
    });
  });

  return { doors, windows };
}

function placeCameras(rooms, count) {
  const cameras = [];
  if (!count) return cameras;

  for (let i = 0; i < count; i++) {
    const room = rooms[i % rooms.length] || { x: 1, y: 1, w: 4, h: 3 };
    const slot = i % 4;

    let x = room.x + 0.7;
    let y = room.y + 0.7;

    if (slot === 1) {
      x = room.x + room.w - 0.8;
      y = room.y + 0.7;
    }

    if (slot === 2) {
      x = room.x + 0.7;
      y = room.y + room.h - 0.7;
    }

    if (slot === 3) {
      x = room.x + room.w - 0.8;
      y = room.y + room.h - 0.7;
    }

    cameras.push({
      id: `cam${i + 1}`,
      label: `Камера ${i + 1}`,
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      angle: 90,
      fov: 70,
      range: 2.6
    });
  }

  return cameras;
}

function placeDevices(prompt, rooms) {
  const devices = [];
  const targetRoom = rooms[Math.max(0, rooms.length - 1)] || { x: 1, y: 1, w: 4, h: 3 };

  const baseX = targetRoom.x + 0.8;
  const baseY = targetRoom.y + targetRoom.h - 1.2;

  if (hasWord(prompt, "сервер")) {
    devices.push({
      id: "server1",
      type: "server",
      label: "Сервер",
      x: +baseX.toFixed(2),
      y: +baseY.toFixed(2),
      w: 0.3,
      h: 0.3
    });
  }

  if (hasWord(prompt, "реєстратор")) {
    devices.push({
      id: "nvr1",
      type: "nvr",
      label: "Реєстратор",
      x: +(baseX + 0.9).toFixed(2),
      y: +baseY.toFixed(2),
      w: 0.3,
      h: 0.3
    });
  }

  if (hasWord(prompt, "акб") || hasWord(prompt, "акум")) {
    devices.push({
      id: "battery1",
      type: "battery",
      label: "АКБ",
      x: +baseX.toFixed(2),
      y: +(baseY + 0.8).toFixed(2),
      w: 0.3,
      h: 0.3
    });
  }

  if (hasWord(prompt, "роут")) {
    devices.push({
      id: "router1",
      type: "router",
      label: "Роутер",
      x: +(baseX + 0.9).toFixed(2),
      y: +(baseY + 0.8).toFixed(2),
      w: 0.3,
      h: 0.3
    });
  }

  return devices;
}

function buildTextsFromRooms(rooms) {
  return rooms.map((room, i) => ({
    id: `text${i + 1}`,
    text: room.label,
    x: +(room.x + room.w / 2 - 0.6).toFixed(2),
    y: +(room.y + room.h / 2).toFixed(2),
    fontSize: 18,
    color: "#8aa9bf"
  }));
}

function buildWallsFromRooms(rooms) {
  const walls = [];

  rooms.forEach((room, i) => {
    walls.push(
      {
        id: `wall${i + 1}-1`,
        x1: room.x,
        y1: room.y,
        x2: +(room.x + room.w).toFixed(2),
        y2: room.y
      },
      {
        id: `wall${i + 1}-2`,
        x1: +(room.x + room.w).toFixed(2),
        y1: room.y,
        x2: +(room.x + room.w).toFixed(2),
        y2: +(room.y + room.h).toFixed(2)
      },
      {
        id: `wall${i + 1}-3`,
        x1: +(room.x + room.w).toFixed(2),
        y1: +(room.y + room.h).toFixed(2),
        x2: room.x,
        y2: +(room.y + room.h).toFixed(2)
      },
      {
        id: `wall${i + 1}-4`,
        x1: room.x,
        y1: +(room.y + room.h).toFixed(2),
        x2: room.x,
        y2: room.y
      }
    );
  });

  return walls;
}

function buildHeuristicPlan(prompt) {
  const roomCount = Math.max(1, Math.min(6, parseCount(prompt, "кімнат", 3)));
  const cameraCount = Math.max(1, Math.min(12, parseCount(prompt, "камер", 4)));
  const labels = extractRoomLabels(prompt, roomCount);

  const rooms = buildCompactRoomRects(roomCount, labels);
  const { doors, windows } = placeDoorsAndWindowsFromRooms(rooms);
  const cameras = placeCameras(rooms, cameraCount);
  const devices = placeDevices(prompt, rooms);
  const texts = buildTextsFromRooms(rooms);
  const walls = buildWallsFromRooms(rooms);

  return normalizePlan({
    canvas: { width: 14, height: 9 },
    rooms: [],
    doors,
    windows,
    walls,
    cameras,
    devices,
    texts,
    outsideAreas: [],
    car: null
  });
}

function compactPlan(plan, prompt = "") {
  const rawRoomCount = Math.max(
    plan.rooms?.length || 0,
    parseCount(prompt, "кімнат", 0),
    hasWord(prompt, "санвуз") ? 1 : 0,
    hasWord(prompt, "кухн") ? 1 : 0,
    hasWord(prompt, "бойлер") ? 1 : 0
  );

  const roomCount = Math.max(1, Math.min(6, rawRoomCount || 3));
  const aiLabels = plan.rooms.map((r) => r.label).filter(Boolean);
  const labels = [...aiLabels, ...extractRoomLabels(prompt, roomCount)].slice(0, roomCount);

  const rooms = buildCompactRoomRects(roomCount, labels);
  const texts = buildTextsFromRooms(rooms);
  const walls = buildWallsFromRooms(rooms);

  const requestedCameraCount = Math.max(
    plan.cameras?.length || 0,
    parseCount(prompt, "камер", plan.cameras?.length || 3)
  );
  const cameras = placeCameras(rooms, requestedCameraCount);

  let doors = safeArray(plan.doors);
  let windows = safeArray(plan.windows);

  if (!doors.length || !windows.length) {
    const auto = placeDoorsAndWindowsFromRooms(rooms);
    if (!doors.length) doors = auto.doors;
    if (!windows.length) windows = auto.windows;
  }

  const devices = plan.devices?.length ? placeDevicesFromExisting(plan.devices, rooms) : placeDevices(prompt, rooms);

  return normalizePlan({
    canvas: { width: 14, height: 9 },
    rooms: [],
    doors,
    windows,
    walls,
    cameras,
    devices,
    texts,
    outsideAreas: [],
    car: null
  });
}

function placeDevicesFromExisting(existingDevices, rooms) {
  const targetRoom = rooms[Math.max(0, rooms.length - 1)] || { x: 1, y: 1, w: 4, h: 3 };
  const baseX = targetRoom.x + 0.8;
  const baseY = targetRoom.y + targetRoom.h - 1.2;

  return safeArray(existingDevices).map((device, i) => {
    const dx = i % 2 === 0 ? 0 : 0.9;
    const dy = Math.floor(i / 2) * 0.8;

    return {
      id: device.id || uid("device", i),
      type: device.type || "server",
      label: device.label || "Обладнання",
      x: +(baseX + dx).toFixed(2),
      y: +(baseY + dy).toFixed(2),
      w: 0.3,
      h: 0.3
    };
  });
}

export async function generatePlanFromText(prompt) {
  if (!client) {
    const fallback = buildHeuristicPlan(prompt);
    fallback.texts.push({
      id: `note-${Date.now()}`,
      text: "AI недоступний — показано компактний шаблон",
      x: 0.9,
      y: 8.5,
      fontSize: 14,
      color: "#b91c1c"
    });
    return fallback;
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
Ти генеруєш тільки JSON для схеми відеоспостереження.

Формат:
{
  "canvas": { "width": 14, "height": 9 },
  "rooms": [],
  "doors": [],
  "windows": [],
  "walls": [],
  "cameras": [],
  "devices": [],
  "texts": [],
  "outsideAreas": [],
  "car": null
}

Правила:
- тільки JSON
- без markdown
- координати тримай у межах 14x9
- не розкидай об'єкти хаотично
- роби компактний логічний план
- якщо є кілька кімнат — групуй їх у межах одного плану, а не по всьому canvas
- сервер => type "server"
- реєстратор => type "nvr"
- АКБ => type "battery"
- роутер => type "router"
- двері => doors
- вікна => windows
`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = completion.choices?.[0]?.message?.content || "";
    const parsed = extractJson(text);
    const normalized = normalizePlan(parsed);
    return compactPlan(normalized, prompt);
  } catch (error) {
    console.error("AI GENERATION ERROR:", error);
    const fallback = buildHeuristicPlan(prompt);
    fallback.texts.push({
      id: `note-${Date.now()}`,
      text: "AI дала збій — показано компактний резервний план",
      x: 0.9,
      y: 8.5,
      fontSize: 14,
      color: "#b91c1c"
    });
    return fallback;
  }
}