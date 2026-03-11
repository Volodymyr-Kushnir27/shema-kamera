function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function detectScale(plan) {
  const values = [];

  for (const room of plan.rooms || []) {
    values.push(Number(room.x), Number(room.y), Number(room.w), Number(room.h));
  }

  for (const door of plan.doors || []) {
    values.push(Number(door.x), Number(door.y), Number(door.w), Number(door.h));
  }

  for (const windowItem of plan.windows || []) {
    values.push(
      Number(windowItem.x),
      Number(windowItem.y),
      Number(windowItem.w),
      Number(windowItem.h)
    );
  }

  for (const cam of plan.cameras || []) {
    values.push(Number(cam.x), Number(cam.y), Number(cam.range));
  }

  for (const area of plan.outsideAreas || []) {
    values.push(Number(area.x), Number(area.y), Number(area.w), Number(area.h));
  }

  for (const wall of plan.walls || []) {
    values.push(Number(wall.x1), Number(wall.y1), Number(wall.x2), Number(wall.y2));
  }

  for (const device of plan.devices || []) {
    values.push(Number(device.x), Number(device.y), Number(device.w), Number(device.h));
  }

  for (const text of plan.texts || []) {
    values.push(Number(text.x), Number(text.y));
  }

  if (plan.car) {
    values.push(Number(plan.car.x), Number(plan.car.y), Number(plan.car.w), Number(plan.car.h));
  }

  const filtered = values.filter((v) => Number.isFinite(v));
  const maxValue = filtered.length ? Math.max(...filtered) : 0;

  return maxValue <= 30 ? 120 : 1;
}

function scaleValue(n, scale) {
  return (Number(n) || 0) * scale;
}

function buildFovPath(x, y, angle, fov, rangePx) {
  const start = degToRad(angle - fov / 2);
  const end = degToRad(angle + fov / 2);

  const x1 = x + Math.cos(start) * rangePx;
  const y1 = y + Math.sin(start) * rangePx;
  const x2 = x + Math.cos(end) * rangePx;
  const y2 = y + Math.sin(end) * rangePx;

  return `M ${x} ${y} L ${x1} ${y1} A ${rangePx} ${rangePx} 0 0 1 ${x2} ${y2} Z`;
}

function renderRoom(room, scale) {
  const x = scaleValue(room.x, scale);
  const y = scaleValue(room.y, scale);
  const w = scaleValue(room.w, scale);
  const h = scaleValue(room.h, scale);

  return `
    <g class="room" data-id="${escapeXml(room.id)}">
      <rect
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        rx="6"
        fill="none"
        stroke="#b8d6ea"
        stroke-width="6"
      />
    </g>
  `;
}

function renderDoor(door, scale) {
  const x = scaleValue(door.x, scale);
  const y = scaleValue(door.y, scale);
  const w = scaleValue(door.w, scale);
  const h = scaleValue(door.h, scale);
  const rotation = Number(door.rotation || 0);

  const cx = x + w / 2;
  const cy = y + h / 2;

  return `
    <g
      class="door movable"
      data-type="door"
      data-id="${escapeXml(door.id)}"
      transform="rotate(${rotation} ${cx} ${cy})"
    >
      <rect
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        rx="3"
        fill="#ffffff"
        stroke="#8eb9d6"
        stroke-width="2"
      />
    </g>
  `;
}

function renderWindow(windowItem, scale) {
  const x = scaleValue(windowItem.x, scale);
  const y = scaleValue(windowItem.y, scale);
  const w = scaleValue(windowItem.w, scale);
  const h = scaleValue(windowItem.h, scale);
  const rotation = Number(windowItem.rotation || 0);

  const cx = x + w / 2;
  const cy = y + h / 2;

  return `
    <g
      class="window movable"
      data-type="window"
      data-id="${escapeXml(windowItem.id)}"
      transform="rotate(${rotation} ${cx} ${cy})"
    >
      <rect
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        rx="3"
        fill="#dbeafe"
        stroke="#2563eb"
        stroke-width="2"
      />
      <line
        x1="${x + 4}"
        y1="${y + h / 2}"
        x2="${x + w - 4}"
        y2="${y + h / 2}"
        stroke="#60a5fa"
        stroke-width="2"
      />
    </g>
  `;
}

function renderOutsideArea(area, scale) {
  const x = scaleValue(area.x, scale);
  const y = scaleValue(area.y, scale);
  const w = scaleValue(area.w, scale);
  const h = scaleValue(area.h, scale);

  return `
    <g class="outside-area" data-id="${escapeXml(area.id)}">
      <rect
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        fill="none"
        stroke="#bfd7e7"
        stroke-width="4"
        stroke-dasharray="10 8"
      />
      <text
        x="${x + w / 2}"
        y="${y + h / 2 + 8}"
        text-anchor="middle"
        font-size="22"
        fill="#2f86e6"
        pointer-events="none"
      >${escapeXml(area.label)}</text>
    </g>
  `;
}

function renderWall(wall, scale) {
  const x1 = scaleValue(wall.x1, scale);
  const y1 = scaleValue(wall.y1, scale);
  const x2 = scaleValue(wall.x2, scale);
  const y2 = scaleValue(wall.y2, scale);

  return `
    <g class="wall" data-type="wall" data-id="${escapeXml(wall.id)}">
      <line
        class="wall-line"
        x1="${x1}"
        y1="${y1}"
        x2="${x2}"
        y2="${y2}"
        stroke="#5b8db0"
        stroke-width="8"
        stroke-linecap="round"
      />
      <line
        class="wall-hit"
        x1="${x1}"
        y1="${y1}"
        x2="${x2}"
        y2="${y2}"
        stroke="transparent"
        stroke-width="24"
        stroke-linecap="round"
      />
      <circle class="wall-handle" data-end="1" cx="${x1}" cy="${y1}" r="8" fill="#2563eb" />
      <circle class="wall-handle" data-end="2" cx="${x2}" cy="${y2}" r="8" fill="#2563eb" />
    </g>
  `;
}

function renderCamera(cam, scale) {
  const x = scaleValue(cam.x, scale);
  const y = scaleValue(cam.y, scale);
  const rangePx = scaleValue(cam.range ?? 3, scale);
  const angle = Number(cam.angle ?? 90);
  const fov = Number(cam.fov ?? 70);

  const fovPath = buildFovPath(x, y, angle, fov, rangePx);

  const angleRad = degToRad(angle);

  const rotateHandleDistance = 34;
  const rotateHx = x + Math.cos(angleRad) * rotateHandleDistance;
  const rotateHy = y + Math.sin(angleRad) * rotateHandleDistance;

  const fovEdgeRad = degToRad(angle + fov / 2);
  const fovHandleDistance = 48;
  const fovHx = x + Math.cos(fovEdgeRad) * fovHandleDistance;
  const fovHy = y + Math.sin(fovEdgeRad) * fovHandleDistance;

  return `
    <g class="camera movable" data-type="camera" data-id="${escapeXml(cam.id)}">
      <path
        class="camera-fov"
        d="${fovPath}"
        fill="#6eaef0"
        fill-opacity="0.16"
        stroke="none"
        pointer-events="none"
      />

      <line
        class="camera-rotate-line"
        x1="${x}"
        y1="${y}"
        x2="${rotateHx}"
        y2="${rotateHy}"
        stroke="#2563eb"
        stroke-width="2"
        stroke-dasharray="4 3"
        pointer-events="none"
      />

      <line
        class="camera-fov-line"
        x1="${x}"
        y1="${y}"
        x2="${fovHx}"
        y2="${fovHy}"
        stroke="#16a34a"
        stroke-width="2"
        stroke-dasharray="4 3"
        pointer-events="none"
      />

      <circle
        class="camera-hit"
        cx="${x}"
        cy="${y}"
        r="28"
        fill="transparent"
      />

      <circle class="camera-outer" cx="${x}" cy="${y}" r="18" fill="#2f86e6" />
      <circle class="camera-inner" cx="${x}" cy="${y}" r="8" fill="#ffffff" pointer-events="none" />
      <circle class="camera-dot" cx="${x}" cy="${y}" r="4" fill="#2f86e6" pointer-events="none" />

      <circle
        class="camera-rotate-handle"
        data-role="rotate-handle"
        cx="${rotateHx}"
        cy="${rotateHy}"
        r="7"
        fill="#f59e0b"
        stroke="#ffffff"
        stroke-width="2"
      />

      <circle
        class="camera-fov-handle"
        data-role="fov-handle"
        cx="${fovHx}"
        cy="${fovHy}"
        r="7"
        fill="#16a34a"
        stroke="#ffffff"
        stroke-width="2"
      />

      <text
        class="camera-label"
        x="${x + 28}"
        y="${y + 6}"
        font-size="18"
        fill="#2f86e6"
        pointer-events="none"
      >${escapeXml(cam.label)}</text>
    </g>
  `;
}

function renderDevice(device, scale) {
  const x = scaleValue(device.x, scale);
  const y = scaleValue(device.y, scale);
  const w = scaleValue(device.w ?? 0.3, scale);
  const h = scaleValue(device.h ?? 0.3, scale);

  const colors = {
    server: "#7c3aed",
    nvr: "#0f766e",
    battery: "#b45309",
    router: "#2563eb"
  };

  const fill = colors[device.type] || "#475569";

  return `
    <g class="device movable" data-type="device" data-id="${escapeXml(device.id)}">
      <rect
        class="device-hit"
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        fill="transparent"
      />
      <rect
        class="device-rect"
        x="${x}"
        y="${y}"
        width="${w}"
        height="${h}"
        rx="8"
        fill="${fill}"
        opacity="0.88"
      />
      <text
        class="device-label"
        x="${x + w + 8}"
        y="${y + h / 2 + 5}"
        font-size="16"
        fill="${fill}"
        pointer-events="none"
      >${escapeXml(device.label)}</text>
    </g>
  `;
}

function renderTextItem(textItem, scale) {
  const x = scaleValue(textItem.x, scale);
  const y = scaleValue(textItem.y, scale);
  const fontSize = Number(textItem.fontSize ?? 18);
  const text = textItem.text || "Текст";
  const width = Math.max(text.length * 10, 40);

  return `
    <g class="text-item movable" data-type="text" data-id="${escapeXml(textItem.id)}">
      <text
        class="custom-text"
        x="${x}"
        y="${y}"
        font-size="${fontSize}"
        fill="${escapeXml(textItem.color || "#334155")}"
        pointer-events="none"
      >${escapeXml(text)}</text>
      <rect
        class="text-hit"
        x="${x - 6}"
        y="${y - fontSize}"
        width="${width}"
        height="${fontSize + 10}"
        fill="transparent"
      />
    </g>
  `;
}

function renderCar(car, scale) {
  if (!car) return "";

  const x = scaleValue(car.x, scale);
  const y = scaleValue(car.y, scale);
  const w = scaleValue(car.w, scale);
  const h = scaleValue(car.h, scale);

  return `
    <rect
      x="${x}"
      y="${y}"
      width="${w}"
      height="${h}"
      rx="20"
      fill="#c6d8e5"
      stroke="#b0c7d7"
      stroke-width="3"
      pointer-events="none"
    />
  `;
}

export function generateSvg(plan) {
  const safePlan = {
    canvas: plan?.canvas || { width: 14, height: 9 },
    rooms: Array.isArray(plan?.rooms) ? plan.rooms : [],
    doors: Array.isArray(plan?.doors) ? plan.doors : [],
    windows: Array.isArray(plan?.windows) ? plan.windows : [],
    walls: Array.isArray(plan?.walls) ? plan.walls : [],
    cameras: Array.isArray(plan?.cameras) ? plan.cameras : [],
    devices: Array.isArray(plan?.devices) ? plan.devices : [],
    texts: Array.isArray(plan?.texts) ? plan.texts : [],
    outsideAreas: Array.isArray(plan?.outsideAreas) ? plan.outsideAreas : [],
    car: plan?.car || null
  };

  const scale = detectScale(safePlan);

  const rawWidth = Number(safePlan.canvas?.width) || 14;
  const rawHeight = Number(safePlan.canvas?.height) || 9;

  const width = rawWidth <= 30 ? rawWidth * scale : rawWidth;
  const height = rawHeight <= 30 ? rawHeight * scale : rawHeight;

  const rooms = safePlan.rooms.map((room) => renderRoom(room, scale)).join("\n");
  const doors = safePlan.doors.map((door) => renderDoor(door, scale)).join("\n");
  const windows = safePlan.windows.map((item) => renderWindow(item, scale)).join("\n");
  const outside = safePlan.outsideAreas.map((area) => renderOutsideArea(area, scale)).join("\n");
  const walls = safePlan.walls.map((wall) => renderWall(wall, scale)).join("\n");
  const cameras = safePlan.cameras.map((cam) => renderCamera(cam, scale)).join("\n");
  const devices = safePlan.devices.map((device) => renderDevice(device, scale)).join("\n");
  const texts = safePlan.texts.map((item) => renderTextItem(item, scale)).join("\n");
  const car = renderCar(safePlan.car, scale);

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  data-scale="${scale}"
>
  <rect width="100%" height="100%" fill="#f4f4f4" />
  ${rooms}
  ${doors}
  ${windows}
  ${outside}
  ${car}
  ${walls}
  ${devices}
  ${texts}
  ${cameras}
</svg>
`.trim();
}