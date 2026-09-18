(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------------------------------------
     Almacenamiento simple para recordar preferencias del
     usuario (tema y tamaño de texto) entre visitas.
     --------------------------------------------------------- */
  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* almacenamiento no disponible: seguimos sin persistir */
    }
  }

  /* ---------------------------------------------------------
     1. Fondo: corazones flotando lentamente hacia arriba
     --------------------------------------------------------- */
  var HEART_EMOJIS = ["❤️", "💕", "💗", "💖", "✨", "🌸"];

  function spawnBackgroundHeart(container) {
    var el = document.createElement("span");
    el.className = "bg-heart";
    el.textContent =
      HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
    var left = Math.random() * 100;
    var duration = 10 + Math.random() * 8;
    var size = 0.8 + Math.random() * 1.1;
    var drift = (Math.random() * 60 - 30).toFixed(0) + "px";

    el.style.left = left + "%";
    el.style.fontSize = size + "rem";
    el.style.animationDuration = duration + "s";
    el.style.setProperty("--drift", drift);

    container.appendChild(el);
    window.setTimeout(function () {
      el.remove();
    }, duration * 1000 + 500);
  }

  function startBackgroundHearts() {
    var container = document.getElementById("bgHearts");
    if (!container || reduceMotion) return;

    for (var i = 0; i < 3; i++) {
      window.setTimeout(function () {
        spawnBackgroundHeart(container);
      }, i * 900);
    }
    window.setInterval(function () {
      spawnBackgroundHeart(container);
    }, 2600);
  }

  /* ---------------------------------------------------------
     2. Destellos al abrir la carta (cantidad moderada)
     --------------------------------------------------------- */
  function burstHearts() {
    var layer = document.getElementById("burst");
    if (!layer || reduceMotion) return;

    var count = 14;
    for (var i = 0; i < count; i++) {
      (function () {
        var el = document.createElement("span");
        el.className = "burst-item";
        el.textContent =
          HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
        var left = 30 + Math.random() * 40;
        var dx = (Math.random() * 160 - 80).toFixed(0) + "px";
        var delay = Math.random() * 300;

        el.style.left = left + "%";
        el.style.setProperty("--dx", dx);
        el.style.animationDelay = delay + "ms";

        layer.appendChild(el);
        window.setTimeout(function () {
          el.remove();
        }, 1800 + delay);
      })();
    }
  }

  /* ---------------------------------------------------------
     3. Abrir la carta: envolvente -> destellos -> carta abierta
     --------------------------------------------------------- */
  function getStoredVolume() {
    var stored = safeGet("carta-volume");
    var value = stored !== null ? Number(stored) : 60;
    if (isNaN(value) || value < 0 || value > 100) value = 60;
    return value;
  }

  function tryPlayMusic() {
    var audio = document.getElementById("bgMusic");
    var soundBtn = document.getElementById("soundBtn");
    if (!audio) return;
    audio.volume = getStoredVolume() / 100;
    /* Se llama de forma síncrona dentro del clic de "Abrir carta"
       para que el navegador lo reconozca como iniciado por la
       persona y permita el sonido. Si el navegador igual lo
       bloquea, el botón 🔊/🔇 deja iniciarlo manualmente. */
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(function () {
          if (soundBtn) soundBtn.textContent = "🔊";
        })
        .catch(function () {
          /* el navegador bloqueó el autoplay: se queda silenciada
             hasta que la persona toque el botón de sonido */
          if (soundBtn) soundBtn.textContent = "🔇";
        });
    }
  }

  function openLetter() {
    var envelope = document.getElementById("envelope");
    var welcome = document.getElementById("welcome");
    var letter = document.getElementById("letter");
    var openBtn = document.getElementById("openBtn");

    if (openBtn) openBtn.disabled = true;
    if (envelope) envelope.classList.add("opening");

    /* La música se intenta reproducir aquí mismo, dentro del
       gesto de clic, no en un setTimeout, para que los
       navegadores no bloqueen el autoplay. */
    tryPlayMusic();

    window.setTimeout(
      function () {
        burstHearts();
      },
      reduceMotion ? 0 : 500
    );

    window.setTimeout(
      function () {
        if (welcome) welcome.hidden = true;
        if (letter) {
          letter.hidden = false;
          letter.classList.remove("leaving");
          letter.classList.add("entering");
          setupScrollWatcher();
        }
      },
      reduceMotion ? 150 : 950
    );
  }

  /* ---------------------------------------------------------
     Cerrar la carta: vuelve a la pantalla inicial con el
     sobre cerrado, lista para abrirse de nuevo.
     --------------------------------------------------------- */
  function closeLetter() {
    var envelope = document.getElementById("envelope");
    var welcome = document.getElementById("welcome");
    var letter = document.getElementById("letter");
    var openBtn = document.getElementById("openBtn");
    var reading = document.getElementById("reading");
    var finalMessage = document.getElementById("finalMessage");
    var audio = document.getElementById("bgMusic");
    var soundBtn = document.getElementById("soundBtn");

    if (!letter || letter.hidden) return;

    letter.classList.remove("entering");
    letter.classList.add("leaving");

    window.setTimeout(
      function () {
        letter.hidden = true;
        letter.classList.remove("leaving");

        if (envelope) envelope.classList.remove("opening");
        if (welcome) welcome.hidden = false;
        if (openBtn) openBtn.disabled = false;
        if (reading) reading.scrollTop = 0;
        if (finalMessage) finalMessage.hidden = true;
        finalShown = false;

        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        if (soundBtn) soundBtn.textContent = "🔇";
      },
      reduceMotion ? 0 : 480
    );
  }

  /* ---------------------------------------------------------
     4. Controles de tamaño de texto
     --------------------------------------------------------- */
  var FONT_SIZES = [1.0, 1.15, 1.3, 1.45]; // rem
  var fontIndex = 1;

  function applyFontSize() {
    var reading = document.getElementById("reading");
    if (!reading) return;
    reading.style.setProperty("--reading-size", FONT_SIZES[fontIndex] + "rem");
    reading.style.fontSize = FONT_SIZES[fontIndex] + "rem";
    safeSet("carta-font-index", String(fontIndex));
  }

  function setupFontControls() {
    var stored = safeGet("carta-font-index");
    if (stored !== null && FONT_SIZES[Number(stored)] !== undefined) {
      fontIndex = Number(stored);
    }
    applyFontSize();

    var downBtn = document.getElementById("fontDown");
    var resetBtn = document.getElementById("fontReset");
    var upBtn = document.getElementById("fontUp");

    if (downBtn) {
      downBtn.addEventListener("click", function () {
        fontIndex = Math.max(0, fontIndex - 1);
        applyFontSize();
      });
    }
    if (upBtn) {
      upBtn.addEventListener("click", function () {
        fontIndex = Math.min(FONT_SIZES.length - 1, fontIndex + 1);
        applyFontSize();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        fontIndex = 1;
        applyFontSize();
      });
    }
  }

  /* ---------------------------------------------------------
     5. Modo claro / oscuro
     --------------------------------------------------------- */
  function setupTheme() {
    var root = document.documentElement;
    var themeBtn = document.getElementById("themeBtn");
    var stored = safeGet("carta-theme");

    if (stored === "dark" || stored === "light") {
      root.setAttribute("data-theme", stored);
    }
    updateThemeIcon();

    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var current = root.getAttribute("data-theme");
        var isDark =
          current === "dark" ||
          (current !== "light" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        var next = isDark ? "light" : "dark";
        root.setAttribute("data-theme", next);
        safeSet("carta-theme", next);
        updateThemeIcon();
      });
    }
  }

  function updateThemeIcon() {
    var root = document.documentElement;
    var themeBtn = document.getElementById("themeBtn");
    if (!themeBtn) return;
    var current = root.getAttribute("data-theme");
    var isDark =
      current === "dark" ||
      (current !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    themeBtn.textContent = isDark ? "☀️" : "🌙";
    themeBtn.setAttribute(
      "aria-label",
      isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
  }

  /* ---------------------------------------------------------
     6. Sonido opcional
     --------------------------------------------------------- */
  function setupSound() {
    var soundBtn = document.getElementById("soundBtn");
    var audio = document.getElementById("bgMusic");
    var slider = document.getElementById("volumeSlider");
    if (audio) audio.volume = getStoredVolume() / 100;
    if (slider) slider.value = String(getStoredVolume());

    if (soundBtn && audio) {
      soundBtn.addEventListener("click", function () {
        if (audio.paused) {
          var p = audio.play();
          if (p && typeof p.then === "function") {
            p.then(function () {
              soundBtn.textContent = "🔊";
            }).catch(function () {
              soundBtn.textContent = "🔇";
            });
          } else {
            soundBtn.textContent = "🔊";
          }
        } else {
          audio.pause();
          soundBtn.textContent = "🔇";
        }
      });
    }

    if (slider && audio) {
      slider.addEventListener("input", function () {
        var value = Number(slider.value);
        audio.volume = value / 100;
        safeSet("carta-volume", String(value));
      });
    }
  }

  /* ---------------------------------------------------------
     7. Detectar el final del texto y mostrar el cierre
     --------------------------------------------------------- */
  var finalShown = false;

  function setupScrollWatcher() {
    var reading = document.getElementById("reading");
    var fadeHint = document.getElementById("fadeHint");
    var finalMessage = document.getElementById("finalMessage");
    if (!reading) return;

    function updateHint() {
      var hasOverflow = reading.scrollHeight > reading.clientHeight + 4;
      var atEnd =
        reading.scrollTop + reading.clientHeight >= reading.scrollHeight - 12;

      if (fadeHint) {
        fadeHint.classList.toggle("hidden", !hasOverflow || atEnd);
      }

      if (hasOverflow && atEnd && !finalShown) {
        finalShown = true;
        if (finalMessage) {
          finalMessage.hidden = false;
        }
        if (!reduceMotion) burstHearts();
      }
    }

    reading.addEventListener("scroll", updateHint);
    window.setTimeout(updateHint, 300);
  }

  /* ---------------------------------------------------------
     Inicio
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    startBackgroundHearts();
    setupFontControls();
    setupTheme();
    setupSound();

    var openBtn = document.getElementById("openBtn");
    if (openBtn) {
      openBtn.addEventListener("click", openLetter);
    }

    var closeBtn = document.getElementById("closeBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeLetter);
    }
  });
})();
