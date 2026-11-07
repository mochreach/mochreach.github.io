// Lattice's opening animation as a background, and the install box's tabs and copy buttons.

// The fractal: as Lattice's splash (crates/lattice-tui/src/splash.rs), a lattice of dots grows out
// from the top-left corner, then bands of colour ripple through it. Each visit picks its own
// pattern, scale and shape of front. With reduced motion it's drawn once, fully grown.
(() => {
  const COLOURS = ["#ffef00", "#ff9f1a", "#ff2a1a", "#e0458f", "#8d6bff", "#2fa8ff", "#25c99a"];
  const GROW = 1.6, EDGE = 3, BAND = 10, RIPPLE = 14, GAP = 8;

  const pascal = (p) => (x, y) => {
    while (x > 0 || y > 0) {
      if ((x % p) + (y % p) >= p) return false;
      x = Math.floor(x / p); y = Math.floor(y / p);
    }
    return true;
  };
  const carpet = (x, y) => {
    while (x > 0 || y > 0) {
      if (x % 3 === 1 && y % 3 === 1) return false;
      x = Math.floor(x / 3); y = Math.floor(y / 3);
    }
    return true;
  };
  const xor = (k) => (x, y) => ((x ^ y) % k) === 0;
  const PATTERNS = [pascal(2), pascal(3), pascal(5), carpet, xor(3), xor(5)];
  const FRONTS = [Math.hypot, (x, y) => x + y, Math.max];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const canvas of document.querySelectorAll("[data-fractal]")) {
    const ctx = canvas.getContext("2d");
    const lit = pick(PATTERNS), scale = pick([1, 2, 2]), front = pick(FRONTS);
    const hue = Math.floor(Math.random() * COLOURS.length), ripple = Math.random() < 1 / 3 ? -1 : 1;
    let dots = [], far = 1, dpr = 1, start = performance.now(), visible = true, frame = 0;

    function layout() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      dots = [];
      for (let y = 0; y * GAP < h; y++)
        for (let x = 0; x * GAP < w; x++)
          if (lit(Math.floor(x / scale), Math.floor(y / scale))) dots.push([x, y, front(x, y)]);
      far = front(Math.ceil(w / GAP), Math.ceil(h / GAP));
    }

    function draw(now) {
      const t = still ? 99 : (now - start) / 1000;
      const k = Math.min(t / GROW, 1), grown = far * k * k * (3 - 2 * k);
      const size = Math.max(2, GAP * 0.42) * dpr, step = GAP * dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const [x, y, r] of dots) {
        if (r > grown) continue;
        const band = Math.floor(((r - ripple * t * RIPPLE) / BAND) % COLOURS.length + COLOURS.length);
        ctx.fillStyle = grown - r < EDGE && k < 1 ? "#fff" : COLOURS[(band + hue) % COLOURS.length];
        ctx.fillRect(x * step, y * step, size, size);
      }
      if (!still && visible) frame = requestAnimationFrame(draw);
    }

    layout();
    new ResizeObserver(() => { layout(); if (still) draw(0); }).observe(canvas);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(draw);
    }).observe(canvas);
    requestAnimationFrame(draw);
  }
})();

// The install box: a tab for each system, opening on the visitor's own. Without JS every panel shows.
(() => {
  const box = document.querySelector("[data-install]");
  if (!box) return;
  const tabs = box.querySelector(".install-tabs");
  const buttons = [...tabs.querySelectorAll("[data-os]")];
  const panels = [...box.querySelectorAll("[data-panel]")];

  function show(os) {
    for (const b of buttons) b.setAttribute("aria-selected", String(b.dataset.os === os));
    for (const p of panels) p.hidden = !p.dataset.panel.split(" ").includes(os);
  }

  const platform = (navigator.userAgentData?.platform || navigator.platform || navigator.userAgent).toLowerCase();
  const os = platform.includes("win") ? "windows" : platform.includes("mac") ? "mac" : "linux";
  tabs.hidden = false;
  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.os)));
  show(os);

  for (const copy of box.querySelectorAll("[data-copy]")) {
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copy.dataset.copy);
        copy.textContent = "Copied";
      } catch {
        getSelection().selectAllChildren(copy.previousElementSibling);
        copy.textContent = "Press Ctrl+C";
      }
      setTimeout(() => { copy.textContent = "Copy"; }, 2000);
    });
  }
})();

// The video: a thumbnail until it's clicked, then YouTube's player (from youtube-nocookie.com), so nothing loads
// from YouTube beyond the thumbnail until someone asks. Without JS the thumbnail links to the video.
for (const link of document.querySelectorAll("[data-embed]")) {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${link.dataset.embed}?autoplay=1&rel=0`;
    frame.title = link.getAttribute("aria-label").replace(/^Play /, "");
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    const box = document.createElement("div");
    box.className = "thumb";
    box.append(frame);
    link.replaceWith(box);
    frame.focus();
  });
}
