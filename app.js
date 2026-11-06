"use strict";

const BLESSINGS = [
  {
    id: "winter-peace",
    label: "冬安",
    lines: ["愿这一年的疲惫", "在热汤升起的那刻慢慢散去", "冬至安好", "记得好好吃饭"],
    signature: "冬夜很长，记得慢慢走 · 致尹锴",
  },
  {
    id: "good-sleep",
    label: "好眠",
    lines: ["今夜最长", "也最适合把没做完的事先放下", "愿你关灯以后", "心里没有未落的雪"],
    signature: "今夜好好休息 · 致尹锴",
  },
  {
    id: "leave-a-light",
    label: "留灯",
    lines: ["今年的冬天", "不必事事圆满", "愿你有热汤，有好眠", "也有一盏为你留的灯"],
    signature: "总有一盏灯，为你亮着 · 致尹锴",
  },
  {
    id: "ease",
    label: "从容",
    lines: ["日子不必每天都用力", "允许自己慢一点、散一点", "在冬天里", "把心养得柔软"],
    signature: "慢一点，也很好 · 致尹锴",
  },
  {
    id: "reunion",
    label: "相见",
    lines: ["愿你想念的人都在附近", "想说的话都有回应", "哪怕隔着很远", "也总有一盏灯替你留着"],
    signature: "想见的人，总会相见 · 致尹锴",
  },
  {
    id: "journey",
    label: "远行",
    lines: ["愿你往后的路", "偶尔有风，却没有真正的寒", "想见的人能见到", "想做的事有回音"],
    signature: "去想去的地方 · 致尹锴",
  },
  {
    id: "spring",
    label: "来春",
    lines: ["过了今夜", "白天会一寸一寸长回来", "愿你等的事有进展", "盼的春天不迟到"],
    signature: "春天正在回来的路上 · 致尹锴",
  },
  {
    id: "always-safe",
    label: "常安",
    lines: ["最后不祝你万事胜意", "只愿你在漫长岁月里", "常有热饭、好梦", "和可以回去的地方"],
    signature: "冬至安好，愿你常安 · 致尹锴",
  },
];

const CHINESE_NUMERALS = ["零", "一", "二", "三", "四", "五", "六", "七", "八"];
const PENTATONIC_NOTES = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

const elements = {
  atmosphere: document.querySelector("#atmosphere"),
  frost: document.querySelector("#frost"),
  stage: document.querySelector("#stage"),
  gateView: document.querySelector("#gateView"),
  mapView: document.querySelector("#mapView"),
  letterView: document.querySelector("#letterView"),
  openButton: document.querySelector("#openButton"),
  soundToggle: document.querySelector("#soundToggle"),
  soundLabel: document.querySelector("#soundLabel"),
  nameSeal: document.querySelector("#nameSeal"),
  mapTitleTop: document.querySelector("#mapTitleTop"),
  mapTitleBottom: document.querySelector("#mapTitleBottom"),
  mapPrompt: document.querySelector("#mapPrompt"),
  progress: document.querySelector("#progress"),
  mapFooter: document.querySelector("#mapFooter"),
  completionActions: document.querySelector("#completionActions"),
  flakes: [...document.querySelectorAll("[data-blessing]")],
  letterFolio: document.querySelector("#letterFolio"),
  letterLines: document.querySelector("#letterLines"),
  letterQuote: document.querySelector("#letterQuote"),
  letterSignature: document.querySelector("#letterSignature"),
  previousButton: document.querySelector("#previousButton"),
  backButton: document.querySelector("#backButton"),
  nextButton: document.querySelector("#nextButton"),
  replayButton: document.querySelector("#replayButton"),
  refrostButton: document.querySelector("#refrostButton"),
  announcer: document.querySelector("#announcer"),
};

const state = {
  view: "gate",
  currentBlessing: 0,
  read: new Set(),
  gateRevealed: false,
  frostDragDistance: 0,
  pointerDown: false,
  lastPointer: null,
  soundEnabled: true,
  soundSupported: "AudioContext" in window || "webkitAudioContext" in window,
};

const atmosphereContext = elements.atmosphere.getContext("2d", { alpha: false });
const frostContext = elements.frost.getContext("2d");
const backdropCanvas = document.createElement("canvas");
const backdropContext = backdropCanvas.getContext("2d", { alpha: false });
let audioContext = null;
let width = 0;
let height = 0;
let dpr = 1;
let stars = [];
let snowflakes = [];
let frostSeed = 20261222;
let animationFrame = 0;
let lastFrame = 0;
let isDocumentVisible = !document.hidden;

function seededRandom(seed) {
  return function random() {
    let value = (seed |= 0);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function setupCanvas(canvas, context) {
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createScene() {
  const random = seededRandom(640434);
  const starCount = Math.max(70, Math.min(190, Math.round((width * height) / 4100)));
  const snowCount = Math.max(18, Math.min(72, Math.round((width * height) / 11000)));

  stars = Array.from({ length: starCount }, () => ({
    x: random() * width,
    y: random() * height,
    radius: random() * random() * 1.35 + 0.2,
    opacity: 0.16 + random() * 0.55,
    phase: random() * Math.PI * 2,
  }));

  snowflakes = Array.from({ length: snowCount }, () => {
    const depth = random();
    return {
      x: random() * width,
      y: random() * height,
      radius: 0.6 + depth * depth * 2.4,
      speed: 7 + depth * 31,
      drift: 4 + random() * 15,
      phase: random() * Math.PI * 2,
      opacity: 0.28 + depth * 0.5,
    };
  });
}

function drawBackdrop() {
  backdropContext.clearRect(0, 0, width, height);

  let gradient = backdropContext.createRadialGradient(
    width * 0.73,
    height * 0.2,
    0,
    width * 0.7,
    height * 0.24,
    Math.max(width, height) * 0.76,
  );
  gradient.addColorStop(0, "#17384b");
  gradient.addColorStop(0.34, "#091a27");
  gradient.addColorStop(1, "#040912");
  backdropContext.fillStyle = gradient;
  backdropContext.fillRect(0, 0, width, height);

  gradient = backdropContext.createRadialGradient(
    width * 0.7,
    height * 0.18,
    0,
    width * 0.7,
    height * 0.18,
    Math.max(88, width * 0.28),
  );
  gradient.addColorStop(0, "rgba(209, 236, 248, 0.18)");
  gradient.addColorStop(1, "rgba(209, 236, 248, 0)");
  backdropContext.fillStyle = gradient;
  backdropContext.fillRect(0, 0, width, height);

  gradient = backdropContext.createRadialGradient(
    width * 0.7,
    height * 0.66,
    0,
    width * 0.7,
    height * 0.66,
    Math.max(width, height) * 0.62,
  );
  gradient.addColorStop(0, "rgba(229, 157, 82, 0.2)");
  gradient.addColorStop(0.38, "rgba(157, 88, 40, 0.07)");
  gradient.addColorStop(1, "rgba(157, 88, 40, 0)");
  backdropContext.fillStyle = gradient;
  backdropContext.fillRect(0, 0, width, height);
}

function paintBackdrop() {
  atmosphereContext.drawImage(backdropCanvas, 0, 0, width, height);
}

function drawStars(time) {
  for (const star of stars) {
    const twinkle = REDUCED_MOTION.matches
      ? 1
      : 0.74 + Math.sin(time * 0.0013 + star.phase) * 0.26;
    atmosphereContext.globalAlpha = star.opacity * twinkle;
    atmosphereContext.fillStyle = "#e6f4fb";
    atmosphereContext.beginPath();
    atmosphereContext.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    atmosphereContext.fill();
  }
  atmosphereContext.globalAlpha = 1;
}

function drawSnowflake(context, x, y, radius, opacity, rotation = 0) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.strokeStyle = `rgba(224, 242, 250, ${opacity})`;
  context.lineWidth = radius > 2.1 ? 0.8 : 0.6;
  context.beginPath();
  for (let branch = 0; branch < 6; branch += 1) {
    const angle = (branch * Math.PI) / 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    context.moveTo(0, 0);
    context.lineTo(cos * radius, sin * radius);
    if (radius > 2.2) {
      for (const position of [0.48, 0.74]) {
        const baseX = cos * radius * position;
        const baseY = sin * radius * position;
        const twig = radius * (position < 0.5 ? 0.32 : 0.2);
        for (const direction of [-1, 1]) {
          const twigAngle = angle + direction * (Math.PI / 3);
          context.moveTo(baseX, baseY);
          context.lineTo(baseX + Math.cos(twigAngle) * twig, baseY + Math.sin(twigAngle) * twig);
        }
      }
    }
  }
  context.stroke();
  context.restore();
}

function drawSnow(time, delta) {
  for (const flake of snowflakes) {
    if (!REDUCED_MOTION.matches) {
      flake.y += flake.speed * delta;
      if (flake.y > height + 7) {
        flake.y = -7;
        flake.x = Math.random() * width;
      }
    }
    const x = flake.x + Math.sin(time * 0.0007 + flake.phase) * flake.drift;
    if (flake.radius > 2) {
      drawSnowflake(
        atmosphereContext,
        x,
        flake.y,
        flake.radius * 1.25,
        flake.opacity,
        REDUCED_MOTION.matches ? 0 : time * 0.00018 + flake.phase,
      );
    } else {
      atmosphereContext.globalAlpha = flake.opacity;
      atmosphereContext.fillStyle = "#eef8fc";
      atmosphereContext.beginPath();
      atmosphereContext.arc(x, flake.y, flake.radius, 0, Math.PI * 2);
      atmosphereContext.fill();
    }
  }
  atmosphereContext.globalAlpha = 1;
}

function drawIceFrond(context, x, y, angle, length, depth, random) {
  const segments = Math.max(3, Math.floor(length / 8));
  let currentX = x;
  let currentY = y;
  const points = [];

  context.beginPath();
  context.moveTo(currentX, currentY);
  for (let index = 0; index < segments; index += 1) {
    angle += (random() - 0.5) * 0.25;
    currentX += Math.cos(angle) * 8;
    currentY += Math.sin(angle) * 8;
    context.lineTo(currentX, currentY);
    points.push([currentX, currentY, angle]);
  }
  context.lineWidth = 0.5;
  context.strokeStyle = "rgba(226, 245, 252, 0.27)";
  context.stroke();

  if (depth > 0) {
    for (let index = 2; index < points.length; index += 2) {
      const point = points[index];
      const branchLength = length * (0.27 - (index / segments) * 0.1);
      if (branchLength > 4) {
        drawIceFrond(context, point[0], point[1], point[2] + 1.02, branchLength, depth - 1, random);
        drawIceFrond(context, point[0], point[1], point[2] - 1.02, branchLength, depth - 1, random);
      }
    }
  }
}

function drawFrost() {
  const random = seededRandom(frostSeed);
  frostContext.clearRect(0, 0, width, height);
  frostContext.lineCap = "round";
  frostContext.lineJoin = "round";

  let gradient = frostContext.createLinearGradient(0, 0, width * 0.22, 0);
  gradient.addColorStop(0, "rgba(205, 233, 245, 0.34)");
  gradient.addColorStop(0.54, "rgba(205, 233, 245, 0.08)");
  gradient.addColorStop(1, "rgba(205, 233, 245, 0)");
  frostContext.fillStyle = gradient;
  frostContext.fillRect(0, 0, width, height);

  gradient = frostContext.createLinearGradient(width, 0, width * 0.78, 0);
  gradient.addColorStop(0, "rgba(205, 233, 245, 0.34)");
  gradient.addColorStop(0.54, "rgba(205, 233, 245, 0.08)");
  gradient.addColorStop(1, "rgba(205, 233, 245, 0)");
  frostContext.fillStyle = gradient;
  frostContext.fillRect(0, 0, width, height);

  gradient = frostContext.createLinearGradient(0, 0, 0, height * 0.17);
  gradient.addColorStop(0, "rgba(224, 243, 250, 0.22)");
  gradient.addColorStop(1, "rgba(224, 243, 250, 0)");
  frostContext.fillStyle = gradient;
  frostContext.fillRect(0, 0, width, height);

  gradient = frostContext.createLinearGradient(0, height, 0, height * 0.8);
  gradient.addColorStop(0, "rgba(224, 243, 250, 0.27)");
  gradient.addColorStop(1, "rgba(224, 243, 250, 0)");
  frostContext.fillStyle = gradient;
  frostContext.fillRect(0, 0, width, height);

  for (let index = 0; index < 16; index += 1) {
    const side = index % 4;
    const along = random();
    let x;
    let y;
    if (side === 0) {
      x = along * width;
      y = 1;
    } else if (side === 1) {
      x = along * width;
      y = height - 1;
    } else if (side === 2) {
      x = 1;
      y = along * height;
    } else {
      x = width - 1;
      y = along * height;
    }
    const baseAngles = [Math.PI / 2, -Math.PI / 2, 0, Math.PI];
    drawIceFrond(
      frostContext,
      x,
      y,
      baseAngles[side] + (random() - 0.5) * 1.1,
      34 + random() * 74,
      1,
      random,
    );
  }

  frostContext.strokeStyle = "rgba(230, 247, 252, 0.22)";
  frostContext.lineWidth = 0.55;
  for (let index = 0; index < 52; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 0.5 + random() * 1.5;
    frostContext.beginPath();
    for (let branch = 0; branch < 3; branch += 1) {
      const angle = (branch * Math.PI) / 3;
      frostContext.moveTo(x - Math.cos(angle) * radius, y - Math.sin(angle) * radius);
      frostContext.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    frostContext.stroke();
  }
}

function drawWipe(x, y) {
  const radius = Math.max(32, Math.min(52, width * 0.11));
  const gradient = frostContext.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.68, "rgba(0, 0, 0, 0.92)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  frostContext.save();
  frostContext.globalCompositeOperation = "destination-out";
  frostContext.fillStyle = gradient;
  frostContext.beginPath();
  frostContext.arc(x, y, radius, 0, Math.PI * 2);
  frostContext.fill();
  frostContext.restore();
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  setupCanvas(elements.atmosphere, atmosphereContext);
  setupCanvas(elements.frost, frostContext);
  setupCanvas(backdropCanvas, backdropContext);
  createScene();
  drawBackdrop();
  paintBackdrop();
  drawStars(0);
  drawSnow(0, 0);
  drawFrost();
  elements.frost.style.opacity = state.gateRevealed ? "0.55" : "1";
}

function renderFrame(time) {
  const delta = Math.min(0.05, (time - (lastFrame || time)) / 1000);
  lastFrame = time;
  paintBackdrop();
  drawStars(time);
  drawSnow(time, delta);
  if (isDocumentVisible && !REDUCED_MOTION.matches) {
    animationFrame = requestAnimationFrame(renderFrame);
  }
}

function ensureAnimation() {
  cancelAnimationFrame(animationFrame);
  lastFrame = 0;
  if (isDocumentVisible && REDUCED_MOTION.matches) {
    renderFrame(performance.now());
  } else if (isDocumentVisible) {
    animationFrame = requestAnimationFrame(renderFrame);
  }
}

function setView(view) {
  state.view = view;
  elements.gateView.hidden = view !== "gate";
  elements.mapView.hidden = !["constellation", "complete"].includes(view);
  elements.letterView.hidden = view !== "letter";
  elements.soundToggle.hidden = view === "gate" || !state.soundSupported;

  if (view !== "gate") {
    elements.frost.style.opacity = "0.55";
  }
}

function chime(index = 0) {
  if (!state.soundEnabled || !state.soundSupported) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    state.soundSupported = false;
    elements.soundToggle.hidden = true;
    return;
  }

  try {
    audioContext ||= new AudioContextClass();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(0.7, now);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.032, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    master.connect(filter);
    filter.connect(audioContext.destination);

    const baseFrequency = PENTATONIC_NOTES[index % PENTATONIC_NOTES.length];
    [1, 2.01].forEach((ratio, oscillatorIndex) => {
      const oscillator = audioContext.createOscillator();
      const voiceGain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(baseFrequency * ratio, now);
      voiceGain.gain.setValueAtTime(oscillatorIndex === 0 ? 1 : 0.18, now);
      oscillator.connect(voiceGain);
      voiceGain.connect(master);
      oscillator.start(now);
      oscillator.stop(now + 1.2);
    });
  } catch {
    state.soundSupported = false;
    elements.soundToggle.hidden = true;
  }
}

function announce(message) {
  elements.announcer.textContent = "";
  window.setTimeout(() => {
    elements.announcer.textContent = message;
  }, 20);
}

function updateMap() {
  const count = state.read.size;
  elements.progress.textContent = `已拾 ${CHINESE_NUMERALS[count]} 封 · 共 八 封`;

  for (const flake of elements.flakes) {
    const blessingIndex = Number(flake.dataset.blessing);
    const blessing = BLESSINGS[blessingIndex];
    const isRead = state.read.has(blessing.id);
    flake.classList.toggle("is-read", isRead);
    flake.setAttribute(
      "aria-label",
      `${isRead ? "回看" : "打开"}第${CHINESE_NUMERALS[blessingIndex + 1]}封冬笺：${blessing.label}`,
    );
  }

  if (count === 0) {
    elements.mapFooter.textContent = "雪光还未亮起 · 轻轻碰一碰";
  } else if (count < BLESSINGS.length) {
    elements.mapFooter.textContent = `已亮 ${CHINESE_NUMERALS[count]} 封 · 轻轻回看`;
  } else {
    elements.mapFooter.textContent = "八封冬笺，皆已为你点亮";
  }

  const isComplete = count === BLESSINGS.length;
  elements.mapView.classList.toggle("is-complete", isComplete);
  elements.completionActions.hidden = !isComplete;
  elements.nameSeal.textContent = isComplete ? "冬 至 · 二〇二六" : "致 尹 锴";
  elements.mapTitleTop.textContent = isComplete ? "八封冬笺" : "长夜有尽";
  elements.mapTitleBottom.textContent = isComplete ? "皆已点亮" : "愿你有光";
  elements.mapPrompt.textContent = isComplete
    ? "所有雪光，都落在了这一夜"
    : "轻触一枚雪光，拆一封冬笺";
}

function showMap() {
  const isComplete = state.read.size === BLESSINGS.length;
  setView(isComplete ? "complete" : "constellation");
  updateMap();
  window.setTimeout(() => {
    document.querySelector("#mapTitle").focus({ preventScroll: true });
  }, REDUCED_MOTION.matches ? 0 : 520);
}

function showBlessing(index) {
  state.currentBlessing = (index + BLESSINGS.length) % BLESSINGS.length;
  const blessing = BLESSINGS[state.currentBlessing];
  state.read.add(blessing.id);

  elements.letterFolio.textContent = `第 ${CHINESE_NUMERALS[state.currentBlessing + 1]} 封 · ${blessing.label.split("").join(" ")}`;
  elements.letterLines.innerHTML = blessing.lines.map((line) => `<span>${line}</span>`).join("");
  elements.letterSignature.textContent = blessing.signature;
  setView("letter");
  updateMap();
  chime(state.currentBlessing);
  announce(`第${CHINESE_NUMERALS[state.currentBlessing + 1]}封冬笺，${blessing.label}。${blessing.lines.join("，")}`);

  requestAnimationFrame(() => {
    elements.letterQuote.focus({ preventScroll: true });
  });
}

function revealGate(fromDrag = false) {
  if (state.gateRevealed) {
    return;
  }
  state.gateRevealed = true;
  elements.frost.style.opacity = "0.55";
  chime(fromDrag ? 7 : 4);

  const delay = REDUCED_MOTION.matches ? 0 : 640;
  window.setTimeout(() => {
    setView("constellation");
    updateMap();
    announce("冬窗已经推开。轻触一枚雪光，阅读冬至祝福。");
    document.querySelector("#mapTitle").focus({ preventScroll: true });
  }, delay);
}

function resetExperience() {
  state.view = "gate";
  state.currentBlessing = 0;
  state.read.clear();
  state.gateRevealed = false;
  state.frostDragDistance = 0;
  state.pointerDown = false;
  state.lastPointer = null;
  frostSeed += 37;
  setView("gate");
  updateMap();
  drawFrost();
  elements.frost.style.opacity = "1";
  window.scrollTo(0, 0);
  elements.openButton.focus({ preventScroll: true });
  announce("冬夜重新覆霜。");
}

function pointIsInteractive(target) {
  return target instanceof Element && Boolean(target.closest("button, a, [role='button']"));
}

function onPointerDown(event) {
  if (state.view !== "gate" || state.gateRevealed || pointIsInteractive(event.target)) {
    return;
  }
  state.pointerDown = true;
  state.lastPointer = { x: event.clientX, y: event.clientY };
  state.frostDragDistance = 0;
  drawWipe(event.clientX, event.clientY);
}

function onPointerMove(event) {
  if (!state.pointerDown || state.view !== "gate" || state.gateRevealed) {
    return;
  }

  const previous = state.lastPointer;
  const distance = Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
  state.frostDragDistance += distance;
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let step = 1; step <= steps; step += 1) {
    const ratio = step / steps;
    drawWipe(
      previous.x + (event.clientX - previous.x) * ratio,
      previous.y + (event.clientY - previous.y) * ratio,
    );
  }
  state.lastPointer = { x: event.clientX, y: event.clientY };

  if (state.frostDragDistance > 82) {
    state.pointerDown = false;
    revealGate(true);
  }
}

function onPointerUp() {
  state.pointerDown = false;
  state.lastPointer = null;
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  elements.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  elements.soundLabel.textContent = state.soundEnabled ? "风铃 开" : "风铃 关";
  if (state.soundEnabled) {
    chime(6);
  }
}

function attachEvents() {
  elements.openButton.addEventListener("click", () => revealGate(false));
  elements.soundToggle.addEventListener("click", toggleSound);
  elements.flakes.forEach((flake) => {
    flake.addEventListener("click", () => showBlessing(Number(flake.dataset.blessing)));
  });
  elements.previousButton.addEventListener("click", () => showBlessing(state.currentBlessing - 1));
  elements.nextButton.addEventListener("click", () => showBlessing(state.currentBlessing + 1));
  elements.backButton.addEventListener("click", showMap);
  elements.replayButton.addEventListener("click", () => showBlessing(0));
  elements.refrostButton.addEventListener("click", resetExperience);

  window.addEventListener("resize", resize);
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });
  window.addEventListener("blur", onPointerUp);

  document.addEventListener("visibilitychange", () => {
    isDocumentVisible = !document.hidden;
    if (isDocumentVisible) {
      ensureAnimation();
    } else {
      cancelAnimationFrame(animationFrame);
    }
  });

  REDUCED_MOTION.addEventListener("change", () => {
    ensureAnimation();
  });
}

function initialize() {
  resize();
  attachEvents();
  updateMap();
  if (state.soundSupported) {
    elements.soundToggle.hidden = true;
  }
  ensureAnimation();
}

initialize();
