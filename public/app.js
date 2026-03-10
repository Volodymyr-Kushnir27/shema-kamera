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
  const addServerBtn = document.getElementById("addServerBtn");
  const addNvrBtn = document.getElementById("addNvrBtn");
  const addBatteryBtn = document.getElementById("addBatteryBtn");
  const addRouterBtn = document.getElementById("addRouterBtn");
  const addTextBtn = document.getElementById("addTextBtn");
  const deleteModeBtn = document.getElementById("deleteModeBtn");
  const cancelModeBtn = document.getElementById("cancelModeBtn");
  const resetBtn = document.getElementById("resetBtn");

  let plan = null;
  let mode = "normal";
  let selectedMoveTarget = null;
  let pendingWallPoint = null;

  const DEVICE_SIZE = { w: 0.3, h: 0.3 };

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function setStatus(message, type = "info") {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = `status ${type}`;
  }

  function ensureArrays() {
    if (!plan) return;

    plan.canvas ||= { width: 14, height: 9 };
    plan.rooms ||= [];
    plan.doors ||= [];
    plan.walls ||= [];
    plan.cameras ||= [];
    plan.devices ||= [];
    plan.texts ||= [];
    plan.outsideAreas ||= [];
    if (!("car" in plan)) plan.car = null;
  }

  function syncJson() {
    if (!jsonInput || !plan) return;
    jsonInput.value = JSON.stringify(plan, null, 2);
  }

  function parsePlanFromTextarea() {
    const raw = jsonInput.value.trim();
    if (!raw) throw new Error("JSON порожній");
    return JSON.parse(raw);
  }

  function clearSelection() {
    selectedMoveTarget = null;
    svgPreview.querySelectorAll(".selected-for-move").forEach((el) => {
      el.classList.remove("selected-for-move");
    });
  }

  function highlightSelected(type, id) {
    svgPreview.querySelectorAll(".selected-for-move").forEach((el) => {
      el.classList.remove("selected-for-move");
    });

    let selector = "";
    if (type === "camera") selector = `.camera[data-id="${id}"]`;
    if (type === "device") selector = `.device[data-id="${id}"]`;
    if (type === "text") selector = `.text-item[data-id="${id}"]`;

    if (!selector) return;

    const el = svgPreview.querySelector(selector);
    if (el) {
      el.classList.add("selected-for-move");
    }
  }

  function updateModeUi() {
    const map = {
      normal: "Режим: звичайний",
      "add-camera": "Режим: додавання камери",
      "add-wall": "Режим: додавання стіни",
      "add-server": "Режим: додавання сервера",
      "add-nvr": "Режим: додавання реєстратора",
      "add-battery": "Режим: додавання АКБ",
      "add-router": "Режим: додавання роутера",
      "add-text": "Режим: додавання тексту",
      delete: "Режим: видалення"
    };

    if (modeLabel) {
      modeLabel.textContent = map[mode] || "Режим: звичайний";
    }

    previewWrap?.classList.toggle("crosshair", mode !== "normal" && mode !== "delete");
    previewWrap?.classList.toggle("delete-mode", mode === "delete");

    addCameraBtn?.classList.toggle("active-mode", mode === "add-camera");
    addWallBtn?.classList.toggle("active-mode", mode === "add-wall");
    addServerBtn?.classList.toggle("active-mode", mode === "add-server");
    addNvrBtn?.classList.toggle("active-mode", mode === "add-nvr");
    addBatteryBtn?.classList.toggle("active-mode", mode === "add-battery");
    addRouterBtn?.classList.toggle("active-mode", mode === "add-router");
    addTextBtn?.classList.toggle("active-mode", mode === "add-text");
    deleteModeBtn?.classList.toggle("active-danger", mode === "delete");
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

  function getTargetFromEventTarget(target) {
    if (!target) return null;

    return (
      target.closest(".camera") ||
      target.closest(".device") ||
      target.closest(".text-item") ||
      target.closest(".wall")
    );
  }

  function getTargetType(node) {
    if (!node) return null;
    if (node.classList.contains("camera")) return "camera";
    if (node.classList.contains("device")) return "device";
    if (node.classList.contains("text-item")) return "text";
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

    syncJson();
    clearSelection();
    await renderPlan();
    setStatus("Об'єкт перенесено.", "ok");
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
    }
  }

  function bindSvgEvents() {
    const svg = svgPreview.querySelector("svg");
    if (!svg) return;

    svg.onclick = async (event) => {
      const point = eventToPlanCoords(event);
      if (!point) return;

      const targetNode = getTargetFromEventTarget(event.target);
      const targetType = getTargetType(targetNode);
      const targetId = targetNode?.dataset?.id || null;

      if (mode === "delete" && targetType && targetId) {
        await deleteByType(targetType, targetId);
        return;
      }

      // ЛОГІКА ПЕРЕНОСУ ЯК ВСТАВКА:
      // 1) якщо вже вибрали об'єкт -> другий клік переносить його в точку кліку
      if (selectedMoveTarget) {
        await moveSelectedTo(point);
        return;
      }

      // 2) якщо клікнули по об'єкту в звичайному режимі -> просто запам'ятали його
      if (mode === "normal" && targetType && targetType !== "wall" && targetId) {
        selectedMoveTarget = {
          type: targetType,
          id: targetId
        };

        highlightSelected(targetType, targetId);
        setStatus("Об'єкт вибрано. Тепер клікніть у нове місце.", "info");
        return;
      }

      // ДОДАВАННЯ КАМЕРИ
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

      // ДОДАВАННЯ СЕРВЕРА
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

      // ДОДАВАННЯ РЕЄСТРАТОРА
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

      // ДОДАВАННЯ АКБ
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

      // ДОДАВАННЯ РОУТЕРА
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

      // ДОДАВАННЯ ТЕКСТУ
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

      // ДОДАВАННЯ СТІНИ
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
    const response = await fetch("/api/mock-plan");
    const data = await response.json();

    plan = data;
    ensureArrays();
    syncJson();
    await renderPlan();
    resetMode();
    setStatus("План завантажено.", "ok");
  }

  generateBtn?.addEventListener("click", async () => {
    try {
      const prompt = String(promptInput?.value || "").trim();
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

  refreshBtn?.addEventListener("click", async () => {
    try {
      plan = parsePlanFromTextarea();
      ensureArrays();
      await renderPlan();
      setStatus("План оновлено з JSON.", "ok");
    } catch (error) {
      console.error(error);
      setStatus(`Помилка JSON: ${error.message}`, "error");
    }
  });

  addCameraBtn?.addEventListener("click", () => {
    mode = "add-camera";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати камеру.", "info");
  });

  addWallBtn?.addEventListener("click", () => {
    mode = "add-wall";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть першу точку стіни.", "info");
  });

  addServerBtn?.addEventListener("click", () => {
    mode = "add-server";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати сервер.", "info");
  });

  addNvrBtn?.addEventListener("click", () => {
    mode = "add-nvr";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати реєстратор.", "info");
  });

  addBatteryBtn?.addEventListener("click", () => {
    mode = "add-battery";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати АКБ.", "info");
  });

  addRouterBtn?.addEventListener("click", () => {
    mode = "add-router";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати роутер.", "info");
  });

  addTextBtn?.addEventListener("click", () => {
    mode = "add-text";
    pendingWallPoint = null;
    clearSelection();
    updateModeUi();
    setStatus("Клікніть на схемі, де треба додати текст.", "info");
  });

  deleteModeBtn?.addEventListener("click", () => {
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

  cancelModeBtn?.addEventListener("click", () => {
    resetMode();
    setStatus("Режим скасовано.", "info");
  });

  resetBtn?.addEventListener("click", async () => {
    try {
      await loadMockPlan();
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Помилка скидання", "error");
    }
  });

  loadMockPlan().catch((error) => {
    console.error(error);
    setStatus(error.message || "Не вдалося завантажити тестовий план", "error");
  });
});