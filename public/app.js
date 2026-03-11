document.addEventListener("DOMContentLoaded", () => {
  const promptInput = document.getElementById("promptInput");
  const jsonInput = document.getElementById("jsonInput");
  const svgPreview = document.getElementById("svgPreview");
  const statusBox = document.getElementById("statusBox");
  const previewWrap = document.getElementById("previewWrap");
  const modeLabel = document.getElementById("modeLabel");

  const generateBtn = document.getElementById("generateBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const addCameraBtn = document.getElementById("addCameraBtn");
  const addWallBtn = document.getElementById("addWallBtn");
  const addDoorBtn = document.getElementById("addDoorBtn");
  const addWindowBtn = document.getElementById("addWindowBtn");
  const addServerBtn = document.getElementById("addServerBtn");
  const addNvrBtn = document.getElementById("addNvrBtn");
  const addBatteryBtn = document.getElementById("addBatteryBtn");
  const addRouterBtn = document.getElementById("addRouterBtn");
  const addTextBtn = document.getElementById("addTextBtn");
  const deleteModeBtn = document.getElementById("deleteModeBtn");
  const cancelModeBtn = document.getElementById("cancelModeBtn");
  const resetBtn = document.getElementById("resetBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let plan = null;
  let mode = "normal";
  let selectedMoveTarget = null;
  let selectedWallHandle = null;
  let pendingWallPoint = null;
  let rotatingCameraId = null;
  let editingFovCameraId = null;

  const DEVICE_SIZE = { w: 0.3, h: 0.3 };
  const DEFAULT_DOOR = { w: 1, h: 0.3 };
  const DEFAULT_WINDOW = { w: 1.2, h: 0.22 };

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function setStatus(message, type = "info") {
    statusBox.textContent = message;
    statusBox.className = `status ${type}`;
  }

  function ensureArrays() {
    if (!plan) return;

    plan.canvas ||= { width: 14, height: 9 };
    plan.rooms ||= [];
    plan.doors ||= [];
    plan.windows ||= [];
    plan.walls ||= [];
    plan.cameras ||= [];
    plan.devices ||= [];
    plan.texts ||= [];
    plan.outsideAreas ||= [];
    if (!("car" in plan)) plan.car = null;
  }

  function emptyPlan() {
    return {
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
  }

  function syncJson() {
    if (!plan) return;
    jsonInput.value = JSON.stringify(plan, null, 2);
  }

  function parsePlanFromTextarea() {
    const raw = jsonInput.value.trim();
    if (!raw) throw new Error("JSON порожній");
    return JSON.parse(raw);
  }

  function clearSelection() {
    selectedMoveTarget = null;
    selectedWallHandle = null;

    svgPreview.querySelectorAll(".selected-for-move").forEach((el) => {
      el.classList.remove("selected-for-move");
    });

    svgPreview.querySelectorAll(".selected-handle").forEach((el) => {
      el.classList.remove("selected-handle");
    });
  }

  function highlightSelected(type, id) {
    svgPreview.querySelectorAll(".selected-for-move").forEach((el) => {
      el.classList.remove("selected-for-move");
    });

    const selectorMap = {
      camera: `.camera[data-id="${id}"]`,
      device: `.device[data-id="${id}"]`,
      text: `.text-item[data-id="${id}"]`,
      door: `.door[data-id="${id}"]`,
      window: `.window[data-id="${id}"]`
    };

    const selector = selectorMap[type];
    if (!selector) return;

    const el = svgPreview.querySelector(selector);
    if (el) el.classList.add("selected-for-move");
  }

  function highlightWallHandle(wallId, end) {
    svgPreview.querySelectorAll(".selected-handle").forEach((el) => {
      el.classList.remove("selected-handle");
    });

    const handle = svgPreview.querySelector(
      `.wall[data-id="${wallId}"] .wall-handle[data-end="${end}"]`
    );

    if (handle) handle.classList.add("selected-handle");
  }

  function updateModeUi() {
    const map = {
      normal: "Режим: звичайний",
      "add-camera": "Режим: додавання камери",
      "add-wall": "Режим: додавання стіни",
      "add-door": "Режим: додавання дверей",
      "add-window": "Режим: додавання вікна",
      "add-server": "Режим: додавання сервера",
      "add-nvr": "Режим: додавання реєстратора",
      "add-battery": "Режим: додавання АКБ",
      "add-router": "Режим: додавання роутера",
      "add-text": "Режим: додавання тексту",
      delete: "Режим: видалення"
    };

    modeLabel.textContent = map[mode] || "Режим: звичайний";

    previewWrap.classList.toggle("crosshair", mode !== "normal" && mode !== "delete");
    previewWrap.classList.toggle("delete-mode", mode === "delete");

    addCameraBtn.classList.toggle("active-mode", mode === "add-camera");
    addWallBtn.classList.toggle("active-mode", mode === "add-wall");
    addDoorBtn.classList.toggle("active-mode", mode === "add-door");
    addWindowBtn.classList.toggle("active-mode", mode === "add-window");
    addServerBtn.classList.toggle("active-mode", mode === "add-server");
    addNvrBtn.classList.toggle("active-mode", mode === "add-nvr");
    addBatteryBtn.classList.toggle("active-mode", mode === "add-battery");
    addRouterBtn.classList.toggle("active-mode", mode === "add-router");
    addTextBtn.classList.toggle("active-mode", mode === "add-text");
    deleteModeBtn.classList.toggle("active-danger", mode === "delete");
  }

  function resetMode() {
    mode = "normal";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
  }

  function findCameraById(id) {
    return plan.cameras.find((item) => item.id === id);
  }

  function findDeviceById(id) {
    return plan.devices.find((item) => item.id === id);
  }

  function findTextById(id) {
    return plan.texts.find((item) => item.id === id);
  }

  function findDoorById(id) {
    return plan.doors.find((item) => item.id === id);
  }

  function findWindowById(id) {
    return plan.windows.find((item) => item.id === id);
  }

  function findWallById(id) {
    return plan.walls.find((item) => item.id === id);
  }

  function getTargetFromEventTarget(target) {
    if (!target) return null;

    return (
      target.closest(".wall-handle") ||
      target.closest(".camera") ||
      target.closest(".device") ||
      target.closest(".text-item") ||
      target.closest(".door") ||
      target.closest(".window") ||
      target.closest(".wall")
    );
  }

  function getTargetType(node) {
    if (!node) return null;
    if (node.classList.contains("wall-handle")) return "wall-handle";
    if (node.classList.contains("camera")) return "camera";
    if (node.classList.contains("device")) return "device";
    if (node.classList.contains("text-item")) return "text";
    if (node.classList.contains("door")) return "door";
    if (node.classList.contains("window")) return "window";
    if (node.classList.contains("wall")) return "wall";
    return null;
  }

  async function renderPlan() {
    const response = await fetch("/api/render-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Не вдалося відрендерити план");
    }

    svgPreview.innerHTML = data.svg;
    bindSvgEvents();
    updateModeUi();
  }

  function eventToPlanCoords(event) {
    const svg = svgPreview.querySelector("svg");
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const scale = Number(svg.dataset.scale || 1);

    const x = ((event.clientX - rect.left) / rect.width) * viewBox.width;
    const y = ((event.clientY - rect.top) / rect.height) * viewBox.height;

    return {
      x: +(x / scale).toFixed(2),
      y: +(y / scale).toFixed(2)
    };
  }
  function angleFromCameraToPoint(camera, point) {
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;
  const angleRad = Math.atan2(dy, dx);
  let angleDeg = (angleRad * 180) / Math.PI;

  if (angleDeg < 0) {
    angleDeg += 360;
  }

  return +angleDeg.toFixed(1);
} 

function normalizeAngle360(angle) {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

function smallestAngleDiff(a, b) {
  let diff = normalizeAngle360(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function fovFromCameraToPoint(camera, point) {
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;

  const pointAngleRad = Math.atan2(dy, dx);
  let pointAngleDeg = (pointAngleRad * 180) / Math.PI;
  pointAngleDeg = normalizeAngle360(pointAngleDeg);

  const cameraAngle = normalizeAngle360(camera.angle ?? 90);
  const diff = smallestAngleDiff(pointAngleDeg, cameraAngle);

  let fov = diff * 2;

  if (fov < 10) fov = 10;
  if (fov > 170) fov = 170;

  return +fov.toFixed(1);
}

function startFovEdit(cameraId) {
  editingFovCameraId = cameraId;
  setStatus("Зміна кута огляду: рухайте мишкою.", "info");
}

function stopFovEdit() {
  if (editingFovCameraId) {
    editingFovCameraId = null;
    setStatus("Кут огляду оновлено.", "ok");
  }
}

function startCameraRotation(cameraId) {
  rotatingCameraId = cameraId;
  setStatus("Обертання камери: рухайте мишкою.", "info");
}

function stopCameraRotation() {
  if (rotatingCameraId) {
    rotatingCameraId = null;
    setStatus("Напрямок камери оновлено.", "ok");
  }
}

  async function moveSelectedTo(point) {
    if (!selectedMoveTarget || !point) return false;

    if (selectedMoveTarget.type === "camera") {
      const item = findCameraById(selectedMoveTarget.id);
      if (item) {
        item.x = point.x;
        item.y = point.y;
      }
    }

    if (selectedMoveTarget.type === "device") {
      const item = findDeviceById(selectedMoveTarget.id);
      if (item) {
        item.x = point.x;
        item.y = point.y;
      }
    }

    if (selectedMoveTarget.type === "text") {
      const item = findTextById(selectedMoveTarget.id);
      if (item) {
        item.x = point.x;
        item.y = point.y;
      }
    }

    if (selectedMoveTarget.type === "door") {
      const item = findDoorById(selectedMoveTarget.id);
      if (item) {
        item.x = point.x;
        item.y = point.y;
      }
    }

    if (selectedMoveTarget.type === "window") {
      const item = findWindowById(selectedMoveTarget.id);
      if (item) {
        item.x = point.x;
        item.y = point.y;
      }
    }

    syncJson();
    clearSelection();
    await renderPlan();
    setStatus("Об'єкт перенесено.", "ok");
    return true;
  }

  async function moveWallHandleTo(point) {
    if (!selectedWallHandle || !point) return false;

    const wall = findWallById(selectedWallHandle.id);
    if (!wall) return false;

    if (selectedWallHandle.end === "1") {
      wall.x1 = point.x;
      wall.y1 = point.y;
    } else {
      wall.x2 = point.x;
      wall.y2 = point.y;
    }

    syncJson();
    clearSelection();
    await renderPlan();
    setStatus("Стіна оновлена.", "ok");
    return true;
  }

  async function deleteByType(type, id) {
    if (type === "camera") {
      plan.cameras = plan.cameras.filter((item) => item.id !== id);
      syncJson();
      await renderPlan();
      setStatus("Камеру видалено.", "ok");
      return;
    }

    if (type === "device") {
      plan.devices = plan.devices.filter((item) => item.id !== id);
      syncJson();
      await renderPlan();
      setStatus("Обладнання видалено.", "ok");
      return;
    }

    if (type === "text") {
      plan.texts = plan.texts.filter((item) => item.id !== id);
      syncJson();
      await renderPlan();
      setStatus("Текст видалено.", "ok");
      return;
    }

    if (type === "wall") {
      plan.walls = plan.walls.filter((item) => item.id !== id);
      syncJson();
      await renderPlan();
      setStatus("Стіна видалена.", "ok");
      return;
    }

    if (type === "door") {
      plan.doors = plan.doors.filter((item) => item.id !== id);
      syncJson();
      await renderPlan();
      setStatus("Двері видалено.", "ok");
      return;
    }

    if (type === "window") {
      plan.windows = plan.windows.filter((item) => item.id !== id);
      syncJson();
      await renderPlan();
      setStatus("Вікно видалено.", "ok");
    }
  }

 function bindSvgEvents() {
  const svg = svgPreview.querySelector("svg");
  if (!svg) return;

  svg.onmousedown = (event) => {
    const rotateHandle = event.target.closest(".camera-rotate-handle");
    if (rotateHandle) {
      const cameraNode = rotateHandle.closest(".camera");
      const cameraId = cameraNode?.dataset?.id;
      if (!cameraId) return;

      startCameraRotation(cameraId);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const fovHandle = event.target.closest(".camera-fov-handle");
    if (fovHandle) {
      const cameraNode = fovHandle.closest(".camera");
      const cameraId = cameraNode?.dataset?.id;
      if (!cameraId) return;

      startFovEdit(cameraId);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  svg.onmousemove = async (event) => {
    if (rotatingCameraId) {
      const point = eventToPlanCoords(event);
      if (!point) return;

      const camera = findCameraById(rotatingCameraId);
      if (!camera) return;

      camera.angle = angleFromCameraToPoint(camera, point);
      syncJson();
      await renderPlan();
      return;
    }

    if (editingFovCameraId) {
      const point = eventToPlanCoords(event);
      if (!point) return;

      const camera = findCameraById(editingFovCameraId);
      if (!camera) return;

      camera.fov = fovFromCameraToPoint(camera, point);
      syncJson();
      await renderPlan();
    }
  };

  svg.onmouseup = () => {
    stopCameraRotation();
    stopFovEdit();
  };

  svg.onmouseleave = () => {
    stopCameraRotation();
    stopFovEdit();
  };

  svg.onclick = async (event) => {
    if (rotatingCameraId || editingFovCameraId) return;

    const point = eventToPlanCoords(event);
    if (!point) return;

    const targetNode = getTargetFromEventTarget(event.target);
    const targetType = getTargetType(targetNode);

    const wallNode =
      targetType === "wall-handle"
        ? targetNode.closest(".wall")
        : targetNode?.classList?.contains("wall")
          ? targetNode
          : targetNode?.closest(".wall");

    const wallId = wallNode?.dataset?.id || null;
    const targetId =
      targetType === "wall-handle"
        ? wallId
        : targetNode?.dataset?.id || wallId || null;

    const targetEnd = targetNode?.dataset?.end || null;

    if (mode === "delete" && targetType && targetId) {
      if (targetType === "wall-handle") {
        await deleteByType("wall", wallId);
        return;
      }

      await deleteByType(targetType, targetId);
      return;
    }

    if (selectedWallHandle) {
      await moveWallHandleTo(point);
      return;
    }

    if (selectedMoveTarget) {
      await moveSelectedTo(point);
      return;
    }

    if (mode === "normal" && targetType === "wall-handle") {
      if (!wallId) return;

      selectedWallHandle = {
        id: wallId,
        end: targetEnd
      };

      highlightWallHandle(wallId, targetEnd);
      setStatus("Точка стіни вибрана. Клікніть у нове місце.", "info");
      return;
    }

    if (
      mode === "normal" &&
      targetType &&
      !["wall", "wall-handle"].includes(targetType) &&
      targetId
    ) {
      selectedMoveTarget = {
        type: targetType,
        id: targetId
      };

      highlightSelected(targetType, targetId);
      setStatus("Об'єкт вибрано. Тепер клікніть у нове місце.", "info");
      return;
    }

    if (mode === "add-camera") {
      plan.cameras.push({
        id: uid("cam"),
        label: `Камера ${plan.cameras.length + 1}`,
        x: point.x,
        y: point.y,
        angle: 90,
        fov: 70,
        range: 3
      });

      syncJson();
      await renderPlan();
      resetMode();
      setStatus("Камеру додано.", "ok");
      return;
    }

    if (mode === "add-door") {
      plan.doors.push({
        id: uid("door"),
        label: `Двері ${plan.doors.length + 1}`,
        x: point.x,
        y: point.y,
        ...DEFAULT_DOOR
      });

      syncJson();
      await renderPlan();
      resetMode();
      setStatus("Двері додано.", "ok");
      return;
    }

    if (mode === "add-window") {
      plan.windows.push({
        id: uid("window"),
        label: `Вікно ${plan.windows.length + 1}`,
        x: point.x,
        y: point.y,
        ...DEFAULT_WINDOW
      });

      syncJson();
      await renderPlan();
      resetMode();
      setStatus("Вікно додано.", "ok");
      return;
    }

    if (mode === "add-server") {
      plan.devices.push({
        id: uid("server"),
        type: "server",
        label: "Сервер",
        x: point.x,
        y: point.y,
        ...DEVICE_SIZE
      });

      syncJson();
      await renderPlan();
      resetMode();
      setStatus("Сервер додано.", "ok");
      return;
    }

    if (mode === "add-nvr") {
      plan.devices.push({
        id: uid("nvr"),
        type: "nvr",
        label: "Реєстратор",
        x: point.x,
        y: point.y,
        ...DEVICE_SIZE
      });

      syncJson();
      await renderPlan();
      resetMode();
      setStatus("Реєстратор додано.", "ok");
      return;
    }

    if (mode === "add-battery") {
      plan.devices.push({
        id: uid("battery"),
        type: "battery",
        label: "АКБ",
        x: point.x,
        y: point.y,
        ...DEVICE_SIZE
      });

      syncJson();
      await renderPlan();
      resetMode();
      setStatus("АКБ додано.", "ok");
      return;
    }

    if (mode === "add-router") {
      plan.devices.push({
        id: uid("router"),
        type: "router",
        label: "Роутер",
        x: point.x,
        y: point.y,
        ...DEVICE_SIZE
      });

      syncJson();
      await renderPlan();
      resetMode();
      setStatus("Роутер додано.", "ok");
      return;
    }

    if (mode === "add-text") {
      const textValue = window.prompt("Введіть текст");

      if (textValue && textValue.trim()) {
        plan.texts.push({
          id: uid("text"),
          text: textValue.trim(),
          x: point.x,
          y: point.y,
          fontSize: 18,
          color: "#334155"
        });

        syncJson();
        await renderPlan();
        setStatus("Текст додано.", "ok");
      } else {
        setStatus("Текст не введено.", "info");
      }

      resetMode();
      return;
    }

    if (mode === "add-wall") {
      if (!pendingWallPoint) {
        pendingWallPoint = { x: point.x, y: point.y };
        setStatus("Перша точка стіни вибрана. Клікніть другу точку.", "info");
        return;
      }

      plan.walls.push({
        id: uid("wall"),
        x1: pendingWallPoint.x,
        y1: pendingWallPoint.y,
        x2: point.x,
        y2: point.y
      });

      syncJson();
      await renderPlan();
      resetMode();
      setStatus("Стіна додана.", "ok");
    }
  };
}

  async function loadMockPlan() {
    const response = await fetch("/api/mock-plan", {
      cache: "no-store"
    });

    const data = await response.json();
    plan = data;
    ensureArrays();
    syncJson();
    await renderPlan();
    resetMode();
    setStatus("Шаблон завантажено.", "ok");
  }

  generateBtn.addEventListener("click", async () => {
    try {
      const prompt = String(promptInput.value || "").trim();
      if (!prompt) {
        setStatus("Введіть опис об'єкта.", "error");
        return;
      }

      generateBtn.classList.add("loading");
      setStatus("Генерація плану...", "info");

      const response = await fetch("/api/generate-from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Помилка генерації");
      }

      plan = data.plan;
      ensureArrays();
      syncJson();
      await renderPlan();
      resetMode();
      setStatus("План згенеровано.", "ok");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Помилка генерації", "error");
    } finally {
      generateBtn.classList.remove("loading");
    }
  });

  refreshBtn.addEventListener("click", async () => {
    try {
      plan = parsePlanFromTextarea();
      ensureArrays();
      syncJson();
      await renderPlan();
      setStatus("План оновлено з JSON.", "ok");
    } catch (error) {
      console.error(error);
      setStatus(`Помилка JSON: ${error.message}`, "error");
    }
  });

  addCameraBtn.addEventListener("click", () => {
    mode = "add-camera";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати камеру.", "info");
  });

  addWallBtn.addEventListener("click", () => {
    mode = "add-wall";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть першу точку стіни.", "info");
  });

  addDoorBtn.addEventListener("click", () => {
    mode = "add-door";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати двері.", "info");
  });

  addWindowBtn.addEventListener("click", () => {
    mode = "add-window";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати вікно.", "info");
  });

  addServerBtn.addEventListener("click", () => {
    mode = "add-server";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати сервер.", "info");
  });

  addNvrBtn.addEventListener("click", () => {
    mode = "add-nvr";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати реєстратор.", "info");
  });

  addBatteryBtn.addEventListener("click", () => {
    mode = "add-battery";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати АКБ.", "info");
  });

  addRouterBtn.addEventListener("click", () => {
    mode = "add-router";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати роутер.", "info");
  });

  addTextBtn.addEventListener("click", () => {
    mode = "add-text";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати текст.", "info");
  });

  deleteModeBtn.addEventListener("click", () => {
    if (mode === "delete") {
      resetMode();
      setStatus("Режим видалення вимкнено.", "info");
      return;
    }

    mode = "delete";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Режим видалення увімкнено. Клікніть по об'єкту.", "info");
  });

  cancelModeBtn.addEventListener("click", () => {
    resetMode();
    setStatus("Режим скасовано.", "info");
  });

  resetBtn.addEventListener("click", async () => {
    try {
      await loadMockPlan();
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Помилка скидання шаблону", "error");
    }
  });

  clearAllBtn.addEventListener("click", async () => {
    try {
      plan = emptyPlan();
      ensureArrays();
      syncJson();
      await renderPlan();
      resetMode();
      setStatus("Полотно очищено.", "ok");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Помилка очищення", "error");
    }
  });

  loadMockPlan().catch((error) => {
    console.error(error);
    setStatus(error.message || "Не вдалося завантажити шаблон", "error");
  });
});