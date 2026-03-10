export const mockPlan = {
  canvas: { width: 14, height: 9 },

  rooms: [
    { id: "room1", label: "Кімната 1", x: 1, y: 1, w: 4, h: 3 },
    { id: "room2", label: "Кімната 2", x: 5, y: 1, w: 4, h: 3 },
    { id: "bathroom", label: "Санвузол", x: 9, y: 1, w: 2, h: 3 },
    { id: "room4", label: "Кімната 4", x: 1, y: 5, w: 4, h: 3 },
    { id: "boiler", label: "Бойлерна кімната", x: 5, y: 5, w: 4, h: 3 }
  ],

  doors: [
    { id: "door1", label: "Двері до кімнати 2", x: 4, y: 2, w: 1, h: 0.4 },
    { id: "door2", label: "Двері до санвузла", x: 8, y: 2, w: 1, h: 0.4 },
    { id: "door3", label: "Двері до кімнати 4", x: 4, y: 6, w: 1, h: 0.4 },
    { id: "door4", label: "Двері до бойлерної", x: 8, y: 6, w: 1, h: 0.4 }
  ],

  walls: [
    { id: "wall-top", x1: 1, y1: 1, x2: 10, y2: 1 },
    { id: "wall-left", x1: 1, y1: 1, x2: 1, y2: 8 },
    { id: "wall-right", x1: 10, y1: 1, x2: 10, y2: 8 },
    { id: "wall-mid-h", x1: 1, y1: 4, x2: 10, y2: 4 },
    { id: "wall-mid-v1", x1: 5, y1: 1, x2: 5, y2: 4 },
    { id: "wall-mid-v2", x1: 9, y1: 1, x2: 9, y2: 4 },
    { id: "wall-low-v", x1: 5, y1: 5, x2: 5, y2: 8 }
  ],

  cameras: [
    { id: "cam1", label: "Камера 1", x: 2, y: 2, angle: 90, fov: 70, range: 3 },
    { id: "cam2", label: "Камера 2", x: 6, y: 2, angle: 90, fov: 70, range: 3 },
    { id: "cam3", label: "Камера 3", x: 10, y: 2, angle: 90, fov: 70, range: 3 },
    { id: "cam4", label: "Камера 4", x: 2, y: 6, angle: 90, fov: 70, range: 3 },
    { id: "cam5", label: "Камера 5", x: 6, y: 6, angle: 90, fov: 70, range: 3 },
    { id: "outcam1", label: "Вулична камера 1", x: 0.1, y: 4, angle: 0, fov: 70, range: 4 },
    { id: "outcam2", label: "Вулична камера 2", x: 10, y: 4, angle: 0, fov: 70, range: 4 }
  ],

  devices: [
    { id: "server1", type: "server", label: "Сервер", x: 6.0, y: 6.0, w: 0.3, h: 0.3 },
    { id: "battery1", type: "battery", label: "АКБ", x: 6.0, y: 7.2, w: 0.3, h: 0.3 },
    { id: "router1", type: "router", label: "Роутер", x: 7.0, y: 6.0, w: 0.3, h: 0.3 },
    { id: "nvr1", type: "nvr", label: "Реєстратор", x: 7.0, y: 7.2, w: 0.3, h: 0.3 }
  ],

  texts: [
    { id: "text1", text: "Щитова", x: 5.7, y: 5.5, fontSize: 18, color: "#334155" }
  ],

  outsideAreas: [],
  car: null
};