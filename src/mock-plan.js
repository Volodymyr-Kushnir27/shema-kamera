export const mockPlan = {
  canvas: { width: 14, height: 9 },

  rooms: [],

  doors: [
    { id: "door1", label: "Двері 1", x: 5.0, y: 2.95, w: 1, h: 0.3 },
    { id: "door2", label: "Двері 2", x: 9.0, y: 2.95, w: 1, h: 0.3 }
  ],

  windows: [
    { id: "window1", label: "Вікно 1", x: 2.0, y: 1.02, w: 1.2, h: 0.22 },
    { id: "window2", label: "Вікно 2", x: 7.4, y: 1.02, w: 1.2, h: 0.22 }
  ],

  walls: [
    { id: "wall1", x1: 1, y1: 1, x2: 11, y2: 1 },
    { id: "wall2", x1: 11, y1: 1, x2: 11, y2: 6.5 },
    { id: "wall3", x1: 11, y1: 6.5, x2: 1, y2: 6.5 },
    { id: "wall4", x1: 1, y1: 6.5, x2: 1, y2: 1 },

    { id: "wall5", x1: 5.5, y1: 1, x2: 5.5, y2: 3 },
    { id: "wall6", x1: 5.5, y1: 3.3, x2: 5.5, y2: 6.5 },

    { id: "wall7", x1: 8.9, y1: 1, x2: 8.9, y2: 3 },
    { id: "wall8", x1: 8.9, y1: 3.3, x2: 8.9, y2: 6.5 },

    { id: "wall9", x1: 1, y1: 3.1, x2: 11, y2: 3.1 }
  ],

  cameras: [
    { id: "cam1", label: "Камера 1", x: 2.0, y: 2.0, angle: 90, fov: 70, range: 2.7 },
    { id: "cam2", label: "Камера 2", x: 6.6, y: 2.0, angle: 90, fov: 70, range: 2.7 },
    { id: "cam3", label: "Камера 3", x: 9.8, y: 2.0, angle: 90, fov: 70, range: 2.7 }
  ],

  devices: [
    { id: "server1", type: "server", label: "Сервер", x: 6.3, y: 5.0, w: 0.3, h: 0.3 },
    { id: "router1", type: "router", label: "Роутер", x: 7.2, y: 5.0, w: 0.3, h: 0.3 },
    { id: "battery1", type: "battery", label: "АКБ", x: 6.3, y: 5.9, w: 0.3, h: 0.3 },
    { id: "nvr1", type: "nvr", label: "Реєстратор", x: 7.2, y: 5.9, w: 0.3, h: 0.3 }
  ],

  texts: [
    { id: "text1", text: "Кімната 1", x: 2.6, y: 2.3, fontSize: 18, color: "#8aa9bf" },
    { id: "text2", text: "Кімната 2", x: 6.9, y: 2.3, fontSize: 18, color: "#8aa9bf" },
    { id: "text3", text: "Щитова / вузол", x: 6.1, y: 4.5, fontSize: 16, color: "#334155" }
  ],

  outsideAreas: [],
  car: null
};