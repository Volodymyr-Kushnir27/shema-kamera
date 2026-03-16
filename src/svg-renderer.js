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
      Number(windowItem.h),
    );
  }

  for (const cam of plan.cameras || []) {
    values.push(Number(cam.x), Number(cam.y), Number(cam.range));
  }

  for (const area of plan.outsideAreas || []) {
    values.push(Number(area.x), Number(area.y), Number(area.w), Number(area.h));
  }

  for (const wall of plan.walls || []) {
    values.push(
      Number(wall.x1),
      Number(wall.y1),
      Number(wall.x2),
      Number(wall.y2),
    );
  }

  for (const device of plan.devices || []) {
    values.push(
      Number(device.x),
      Number(device.y),
      Number(device.w),
      Number(device.h),
    );
  }

  for (const text of plan.texts || []) {
    values.push(Number(text.x), Number(text.y));
  }

  if (plan.car) {
    values.push(
      Number(plan.car.x),
      Number(plan.car.y),
      Number(plan.car.w),
      Number(plan.car.h),
    );
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

function pointOnCircle(cx, cy, radius, deg) {
  const rad = degToRad(deg);
  return {
    x: cx + Math.cos(rad) * radius,
    y: cy + Math.sin(rad) * radius,
  };
}

function buildArcLinePath(cx, cy, radius, startDeg, endDeg) {
  const p1 = pointOnCircle(cx, cy, radius, startDeg);
  const p2 = pointOnCircle(cx, cy, radius, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;

  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}

function fmtMeters(value) {
  return `${Number(value || 0).toFixed(1)}`;
}

function fmtDegrees(value) {
  return `${Math.round(Number(value || 0))}°`;
}

function renderCamera(cam, scale) {
  const x = scaleValue(cam.x, scale);
  const y = scaleValue(cam.y, scale);

  const range = Number(cam.range ?? 3);
  const rangePx = scaleValue(range, scale);

  const angle = Number(cam.angle ?? 90);
  const fov = Number(cam.fov ?? 70);

  const startDeg = angle - fov / 2;
  const endDeg = angle + fov / 2;

  const fovPath = buildFovPath(x, y, angle, fov, rangePx);
  const fovArcPath = buildArcLinePath(x, y, rangePx * 0.78, startDeg, endDeg);

  const centerPoint = pointOnCircle(x, y, rangePx, angle);
  const rangeLabelPoint = pointOnCircle(x, y, rangePx * 0.58, angle);
  const fovLabelPoint = pointOnCircle(x, y, rangePx * 0.42, angle);
  const angleLabelPoint = pointOnCircle(x, y, 56, angle);

  const angleRad = degToRad(angle);

  const rotateHandleDistance = 34;
  const rotateHx = x + Math.cos(angleRad) * rotateHandleDistance;
  const rotateHy = y + Math.sin(angleRad) * rotateHandleDistance;

  const fovEdgeRad = degToRad(endDeg);
  const fovHandleDistance = rangePx * 0.82;
  const fovHx = x + Math.cos(fovEdgeRad) * fovHandleDistance;
  const fovHy = y + Math.sin(fovEdgeRad) * fovHandleDistance;

  const rangeHx = centerPoint.x;
  const rangeHy = centerPoint.y;

  return `
    <g class="camera movable" data-type="camera" data-id="${escapeXml(cam.id)}">
      <path
        class="camera-fov"
        d="${fovPath}"
        fill="#6eaef0"
        fill-opacity="0.20"
        stroke="#7ec6f5"
        stroke-width="3"
      />

      <path
        class="camera-fov-arc"
        d="${fovArcPath}"
        fill="none"
        stroke="#1d9bf0"
        stroke-width="4"
        stroke-dasharray="10 8"
        pointer-events="none"
      />

      <line
        class="camera-center-line"
        x1="${x}"
        y1="${y}"
        x2="${centerPoint.x}"
        y2="${centerPoint.y}"
        stroke="#7ec6f5"
        stroke-width="5"
        stroke-dasharray="12 10"
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

      <line
        class="camera-range-line"
        x1="${x}"
        y1="${y}"
        x2="${rangeHx}"
        y2="${rangeHy}"
        stroke="#0891b2"
        stroke-width="2"
        stroke-dasharray="5 4"
        opacity="0.75"
        pointer-events="none"
      />

        <rect
         class="camera-hit"
         x="${x - 24}"
         y="${y - 18}"
         width="48"
          height="40"
         rx="10"
        fill="transparent"
      />

      <g class="camera-icon" pointer-events="none">
  <line
    x1="${x - 10}"
    y1="${y + 10}"
    x2="${x - 18}"
    y2="${y + 20}"
    stroke="#5b6472"
    stroke-width="4"
    stroke-linecap="round"
  />
  <line
    x1="${x - 18}"
    y1="${y + 20}"
    x2="${x - 6}"
    y2="${y + 20}"
    stroke="#5b6472"
    stroke-width="4"
    stroke-linecap="round"
  />

  <rect
    x="${x - 16}"
    y="${y - 9}"
    width="24"
    height="18"
    rx="5"
    fill="#2f86e6"
    stroke="#1d4ed8"
    stroke-width="2"
  />

  <rect
    x="${x + 7}"
    y="${y - 5}"
    width="8"
    height="10"
    rx="2"
    fill="#60a5fa"
    stroke="#1d4ed8"
    stroke-width="2"
  />

  <circle
    cx="${x - 4}"
    cy="${y}"
    r="5.5"
    fill="#ffffff"
    stroke="#1d4ed8"
    stroke-width="2"
  />

  <circle
    cx="${x - 4}"
    cy="${y}"
    r="2.2"
    fill="#1d4ed8"
  />
</g>

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

      <circle
        class="camera-range-handle"
        data-role="range-handle"
        cx="${rangeHx}"
        cy="${rangeHy}"
        r="7"
        fill="#0891b2"
        stroke="#ffffff"
        stroke-width="2"
      />

     <text
  class="camera-label"
  x="${x + 22}"
  y="${y - 14}"
  font-size="18"
  font-weight="700"
  fill="#24479a"
>${escapeXml(cam.label)}</text>

      <text
        class="camera-fov-value"
        x="${fovLabelPoint.x}"
        y="${fovLabelPoint.y}"
        text-anchor="middle"
        font-size="16"
        font-weight="700"
        fill="#0f6aa1"
      >${escapeXml(fmtDegrees(fov))}</text>

      <text
        class="camera-range-value"
        x="${rangeLabelPoint.x}"
        y="${rangeLabelPoint.y - 6}"
        text-anchor="middle"
        font-size="16"
        font-weight="700"
        fill="#0f8ab2"
      >${escapeXml(fmtMeters(range))}</text>

      <text
        class="camera-angle-value"
        x="${angleLabelPoint.x}"
        y="${angleLabelPoint.y - 10}"
        text-anchor="middle"
        font-size="14"
        font-weight="700"
        fill="#2563eb"
      >${escapeXml(fmtDegrees(angle))}</text>
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
    router: "#2563eb",
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
    canvas: plan?.canvas || { width: 18, height: 12 },
    rooms: Array.isArray(plan?.rooms) ? plan.rooms : [],
    doors: Array.isArray(plan?.doors) ? plan.doors : [],
    windows: Array.isArray(plan?.windows) ? plan.windows : [],
    walls: Array.isArray(plan?.walls) ? plan.walls : [],
    cameras: Array.isArray(plan?.cameras) ? plan.cameras : [],
    devices: Array.isArray(plan?.devices) ? plan.devices : [],
    texts: Array.isArray(plan?.texts) ? plan.texts : [],
    outsideAreas: Array.isArray(plan?.outsideAreas) ? plan.outsideAreas : [],
    car: plan?.car || null,
  };

  const scale = detectScale(safePlan);

const rawWidth = Number(safePlan.canvas?.width) || 14;
const rawHeight = Number(safePlan.canvas?.height) || 9;

const baseWidth = rawWidth <= 30 ? rawWidth * scale : rawWidth;
const baseHeight = rawHeight <= 30 ? rawHeight * scale : rawHeight;

const padding = Math.max(220, Math.round(scaleValue(2.6, scale)));

const viewX = -padding;
const viewY = -padding;
const viewWidth = baseWidth + padding * 2;
const viewHeight = baseHeight + padding * 2;

  const rooms = safePlan.rooms
    .map((room) => renderRoom(room, scale))
    .join("\n");
  const doors = safePlan.doors
    .map((door) => renderDoor(door, scale))
    .join("\n");
  const windows = safePlan.windows
    .map((item) => renderWindow(item, scale))
    .join("\n");
  const outside = safePlan.outsideAreas
    .map((area) => renderOutsideArea(area, scale))
    .join("\n");
  const walls = safePlan.walls
    .map((wall) => renderWall(wall, scale))
    .join("\n");
  const cameras = safePlan.cameras
    .map((cam) => renderCamera(cam, scale))
    .join("\n");
  const devices = safePlan.devices
    .map((device) => renderDevice(device, scale))
    .join("\n");
  const texts = safePlan.texts
    .map((item) => renderTextItem(item, scale))
    .join("\n");
  const car = renderCar(safePlan.car, scale);

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${viewWidth}"
  height="${viewHeight}"
  viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}"
  data-scale="${scale}"
>
  <rect
    x="${viewX}"
    y="${viewY}"
    width="${viewWidth}"
    height="${viewHeight}"
    fill="#f4f4f4"
  />
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
