(() => {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, nodes, pulses;

<<<<<<< HEAD
  const NODE_COUNT_DIVISOR = 24000;
=======
  const GREEN = "0, 255, 163";
  const NODE_COUNT_DIVISOR = 24000; // lower = more nodes
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
  const LINK_DIST = 160;
  const PULSE_SPEED = 0.006;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.max(24, Math.min(90, Math.floor((w * h) / NODE_COUNT_DIVISOR)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 0.6,
    }));
    pulses = [];
  }

  function maybeSpawnPulse(edges) {
    if (Math.random() < 0.012 && edges.length) {
      const e = edges[Math.floor(Math.random() * edges.length)];
      pulses.push({ a: e.a, b: e.b, t: 0 });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
<<<<<<< HEAD
    const accent = getComputedStyle(document.body).getPropertyValue("--accent-rgb").trim() || "0, 255, 163";

=======

    // move nodes
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    });

<<<<<<< HEAD
=======
    // draw links
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.22;
<<<<<<< HEAD
          ctx.strokeStyle = `rgba(${accent}, ${alpha})`;
=======
          ctx.strokeStyle = `rgba(${GREEN}, ${alpha})`;
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          edges.push({ a, b });
        }
      }
    }

<<<<<<< HEAD
    nodes.forEach((n) => {
      ctx.fillStyle = `rgba(${accent}, 0.55)`;
=======
    // nodes
    nodes.forEach((n) => {
      ctx.fillStyle = `rgba(${GREEN}, 0.55)`;
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

<<<<<<< HEAD
=======
    // pulses traveling along edges
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
    maybeSpawnPulse(edges);
    pulses.forEach((p) => (p.t += PULSE_SPEED));
    pulses = pulses.filter((p) => p.t <= 1);
    pulses.forEach((p) => {
      const x = p.a.x + (p.b.x - p.a.x) * p.t;
      const y = p.a.y + (p.b.y - p.a.y) * p.t;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
<<<<<<< HEAD
      grad.addColorStop(0, `rgba(${accent}, 0.9)`);
      grad.addColorStop(1, `rgba(${accent}, 0)`);
=======
      grad.addColorStop(0, `rgba(${GREEN}, 0.9)`);
      grad.addColorStop(1, `rgba(${GREEN}, 0)`);
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
})();
