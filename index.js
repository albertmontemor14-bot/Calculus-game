(function () {
  var world = document.getElementById("world");
  var heartsEl = document.getElementById("hearts");
  var overEl = document.getElementById("over");

  /* ---------- pixel art helper: turns a text map into a crisp SVG ---------- */
  function pix(map, pal, s) {
    var h = map.length, w = map[0].length, out = "";
    for (var y = 0; y < h; y++) {
      var x = 0;
      while (x < w) {
        var c = map[y][x];
        if (c === ".") { x++; continue; }
        var x2 = x;
        while (x2 < w && map[y][x2] === c) x2++;
        out += '<rect x="' + x + '" y="' + y + '" width="' + (x2 - x) + '" height="1" fill="' + pal[c] + '"/>';
        x = x2;
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w * s) + '" height="' + (h * s) +
      '" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges">' + out + '</svg>';
  }

  /* colors: k outline, s skin, h hair, a armor, g gold, n pants, l leather, r cape, f blade */
  var PAL = {
    k: "#1a1426", s: "#f2c9a0", S: "#d9a273", h: "#5a3216", H: "#8a5a2b", e: "#1a1426", w: "#ffffff",
    a: "#3b6fd4", A: "#264a99", B: "#7fa8ff", g: "#ffd84a", G: "#c9a227",
    n: "#2e3560", N: "#1f2447", l: "#7a4a26", L: "#4a2a12", r: "#d23b43", R: "#8f2229",
    f: "#f4f8fc", F: "#a9b6c8"
  };

  var BODY = [
    "...kkkkkk...",
    "..khhhhhhk..",
    ".khHhhhhhhk.",
    ".khhhhssssk.",
    ".khhssswesk.",
    "..ksssssssk.",
    "...ksssssk..",
    "....kssk....",
    ".kaBBaaaaAk.",
    ".kaBaaggaAk.",
    ".kaaaaggaAk.",
    ".kaaaaaaaAk.",
    ".kgggGggggk.",
    ".knnnnnnnnk."
  ];
  var LEG = ["knnnnk.", "knnnNk.", "knnnNk.", "kllllk.", "kllllk.", "kllllLk", "kLLLLLk", "kkkkkkk"];
  var CAPE = ["krrRRk", "krrRRk", "krrRRk", "krrRRk", "krrRRk", "krRRRk", "krRRRk", "kRRRRk", "kRRRk.", "kkkk.."];
  var ARM = ["kBak", "kaak", "kaAk", "kaAk", "kssk", "kkkk"];
  var SWORD = ["...kk..."];
  for (var i = 0; i < 15; i++) SWORD.push("..kfFk..");
  SWORD.push("kggggggk", "..klLk..", "..klLk..", "..klLk..", "..kggk..");

  var HEART = [".kkk.kkk.", "kwRRkRRRk", "kRRRRRRDk", "kRRRRRRDk", ".kRRRRDk.", "..kRRDk..", "...kRk...", "....k...."];
  var HEART_FULL = pix(HEART, { k: "#2a0f1a", R: "#ff4d5e", D: "#c92a3d", w: "#ffd0d6" }, 3);
  var HEART_EMPTY = pix(HEART, { k: "#1a1220", R: "#3a2b44", D: "#2a1f33", w: "#4a3a55" }, 3);

  var P, slimes, spawnT, over, keys = { left: false, right: false }, stepT = 0;

  function sfx(name) { if (window.SFX) SFX.play(name); }

  /* ---------- build the character ---------- */
  var player = document.createElement("div");
  player.id = "player";
  player.innerHTML =
    '<div class="sprite">' +
      '<div class="leg b">' + pix(LEG, PAL, 4) + '</div>' +
      '<div class="leg f">' + pix(LEG, PAL, 4) + '</div>' +
      '<div class="torso">' +
        '<div class="cape">' + pix(CAPE, PAL, 4) + '</div>' +
        '<div class="upper">' + pix(BODY, PAL, 4) + '</div>' +
        '<div class="arm">' + pix(ARM, PAL, 4) + '<div class="sword">' + pix(SWORD, PAL, 4) + '</div></div>' +
        '<div class="swoosh"></div>' +
      '</div>' +
    '</div>';
  world.appendChild(player);

  /* ---------- health (top left) ---------- */
  function drawHearts() {
    var html = "";
    for (var i = 0; i < P.max; i++) html += i < P.hp ? HEART_FULL : HEART_EMPTY;
    heartsEl.innerHTML = html;
    heartsEl.setAttribute("aria-label", P.hp + " of " + P.max + " hearts");
  }

  function reset() {
    if (slimes) slimes.forEach(function (s) { s.el.remove(); });
    P = { x: 80, y: 0, vy: 0, dir: 1, hp: 5, max: 5, inv: 0, atk: 0 };
    slimes = [];
    spawnT = 2;
    over = false;
    overEl.classList.remove("show");
    player.classList.remove("hurt", "swing", "walk", "air");
    drawHearts();
  }

  /* ---------- actions ---------- */
  var SWING_TIME = 0.34;

  function attack() {
    if (over || P.atk > 0) return;
    P.atk = SWING_TIME;
    sfx("slash");
    player.classList.remove("swing");
    void player.offsetWidth;            // restart the slash animation
    player.classList.add("swing");
    slimes.forEach(function (s) { s.hit = false; });
  }

  function jump() {
    if (!over && P.y === 0) { P.vy = 560; sfx("jump"); }
  }

  function hurtPlayer(fromX) {
    if (over || P.inv > 0) return;
    P.hp -= 1;
    sfx("hurt");
    P.inv = 1.1;
    P.x += (P.x + 24 < fromX ? -1 : 1) * 40;
    P.vy = 260;
    player.classList.add("hurt");
    heartsEl.classList.remove("shake");
    void heartsEl.offsetWidth;
    heartsEl.classList.add("shake");
    drawHearts();
    if (P.hp <= 0) {
      over = true;
      overEl.classList.add("show");
      setTimeout(function () { sfx("gameover"); }, 350);
    }
  }

  /* ---------- test enemy: slime ---------- */
  function spawnSlime() {
    var el = document.createElement("div");
    el.className = "slime";
    world.appendChild(el);
    sfx("spawn");
    var fromLeft = Math.random() < 0.5;
    slimes.push({ el: el, x: fromLeft ? -40 : window.innerWidth + 8, hp: 2, kb: 0, hit: false });
  }

  /* ---------- game loop ---------- */
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!over) {
      var move = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (move) { P.dir = move; P.x += move * 240 * dt; }
      P.x = Math.max(0, Math.min(window.innerWidth - 48, P.x));

      if (P.y > 0 || P.vy > 0) {
        P.vy -= 1500 * dt;
        P.y += P.vy * dt;
        if (P.y <= 0) { P.y = 0; P.vy = 0; sfx("land"); }
      }

      P.atk = Math.max(0, P.atk - dt);
      P.inv = Math.max(0, P.inv - dt);
      if (P.inv === 0) player.classList.remove("hurt");
      if (P.atk === 0) player.classList.remove("swing");
      player.classList.toggle("walk", move !== 0 && P.y === 0);
      player.classList.toggle("air", P.y > 0);
      if (move !== 0 && P.y === 0) {          // footsteps
        stepT -= dt;
        if (stepT <= 0) { sfx("step"); stepT = 0.28; }
      } else { stepT = 0; }

      spawnT -= dt;
      if (spawnT <= 0 && slimes.length < 3) { spawnSlime(); spawnT = 4 + Math.random() * 3; }

      var elapsed = SWING_TIME - P.atk;    // the blade only hurts during the strike part of the swing
      slimes.forEach(function (s) {
        var sc = s.x + 16;                  // slime center
        s.x += (P.x + 24 > sc ? 1 : -1) * 55 * dt + s.kb * dt;
        s.kb -= s.kb * 6 * dt;

        if (Math.abs(sc - (P.x + 24)) < 32 && P.y < 22) hurtPlayer(sc);

        if (P.atk > 0 && elapsed > 0.07 && elapsed < 0.26 && !s.hit && P.y < 50) {
          var front = (sc - (P.x + 24)) * P.dir;
          if (front > -10 && front < 115) {
            s.hit = true;
            s.hp -= 1;
            sfx("hit");
            s.kb = P.dir * 420;
            s.el.classList.add("flash");
            setTimeout(function () { s.el.classList.remove("flash"); }, 120);
          }
        }
      });
      slimes = slimes.filter(function (s) {
        if (s.hp > 0) return true;
        sfx("pop");
        s.el.remove();
        return false;
      });
    }

    player.style.transform = "translate3d(" + P.x + "px," + (-P.y) + "px,0) scaleX(" + P.dir + ")";
    slimes.forEach(function (s) { s.el.style.transform = "translate3d(" + s.x + "px,0,0)"; });
    requestAnimationFrame(loop);
  }

  /* ---------- controls ---------- */
  var map = {
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right"
  };
  window.addEventListener("keydown", function (e) {
    if (map[e.key]) { keys[map[e.key]] = true; e.preventDefault(); }
    else if (e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "W") { jump(); e.preventDefault(); }
    else if (e.key === "j" || e.key === "J" || e.key === "x" || e.key === "X") { attack(); }
  });
  window.addEventListener("keyup", function (e) {
    if (map[e.key]) keys[map[e.key]] = false;
  });
  world.addEventListener("pointerdown", function (e) {
    if (e.target === world) attack();   // click or tap the world to swing
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-act]"), function (b) {
    var act = b.getAttribute("data-act");
    function down(e) {
      e.preventDefault();
      if (act === "left" || act === "right") keys[act] = true;
      else if (act === "jump") jump();
      else if (act === "attack") attack();
    }
    function up() { if (act === "left" || act === "right") keys[act] = false; }
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointerup", up);
    b.addEventListener("pointerleave", up);
    b.addEventListener("pointercancel", up);
  });

  document.getElementById("again").addEventListener("click", reset);

  /* sound on / off button */
  var soundBtn = document.getElementById("sound");
  function soundLabel() { soundBtn.textContent = "Sound: " + (SFX.isMuted() ? "Off" : "On"); }
  if (window.SFX) {
    soundLabel();
    soundBtn.addEventListener("click", function () {
      SFX.toggle();
      if (window.Music) Music.setMuted(SFX.isMuted());   // one button controls sounds and music
      soundLabel();
    });
  } else {
    soundBtn.hidden = true;
  }

  reset();
  if (window.Music) Music.play("audio/overworld-day.mp3", 0.45);   // plays when the game starts
  requestAnimationFrame(loop);
})();
