// script.js — password gate + renderer (uses previewVideo / fullVideo)
(function () {
    console.log("[portfolio] script.js loaded (final)");

    /* ========== CONFIG ========== */
    const PORTFOLIO_PRIVATE = false;              // toggle public/private
    const PORTFOLIO_PASSWORD = "ash";            // change as required

    /* ========== DOM ready ========== */
    function onReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else fn();
    }

    onReady(init);

    function init() {
        console.log("[portfolio] DOM ready");
        // Elements
        const passwordGate = document.getElementById("password-gate");
        const portfolioContent = document.getElementById("portfolio-content");
        let gridEl = document.getElementById("portfolio-grid");
        const passwordInput = document.getElementById("password-input");
        const passwordSubmit = document.getElementById("password-submit");
        const passwordError = document.getElementById("password-error");

        // ensure grid exists
        if (!gridEl) {
            console.warn("[portfolio] Missing #portfolio-grid — creating one under #portfolio-content");
            if (portfolioContent) {
                const main = document.createElement("main");
                main.id = "portfolio-grid";
                main.className = "grid";
                portfolioContent.appendChild(main);
            }
            gridEl = document.getElementById("portfolio-grid");
        }

        // Password helpers
        function unlockPortfolio() {
            if (passwordGate) passwordGate.classList.add("hidden");
            if (portfolioContent) portfolioContent.classList.remove("hidden");
            console.log("[portfolio] unlocked");
        }
        function lockPortfolio() {
            if (passwordGate) passwordGate.classList.remove("hidden");
            if (portfolioContent) portfolioContent.classList.add("hidden");
            try { passwordInput?.focus(); passwordInput?.select(); } catch(e){}
            console.log("[portfolio] locked");
        }

        // initial state
        if (!PORTFOLIO_PRIVATE) {
            unlockPortfolio();
        } else if (sessionStorage.getItem("portfolioUnlocked") === "true") {
            unlockPortfolio();
        } else {
            lockPortfolio();
        }

        // password interactions
        passwordInput?.addEventListener("input", () => passwordError?.classList.add("hidden"));
        passwordSubmit?.addEventListener("click", () => {
            const val = passwordInput?.value || "";
            if (val === PORTFOLIO_PASSWORD) {
                sessionStorage.setItem("portfolioUnlocked", "true");
                unlockPortfolio();
            } else {
                passwordError?.classList.remove("hidden");
                passwordError && (passwordError.textContent = "Incorrect password");
            }
        });
        passwordInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                passwordSubmit?.click();
            }
        });

        // ---------- data check & render ----------
        if (typeof GAMES === "undefined") {
            console.error("[portfolio] GAMES is not defined. games.js did not load or the file has an error.");
            // Provide a helpful in-page message for debugging:
            if (portfolioContent) {
                portfolioContent.innerHTML = "<div style='padding:24px;color:#f88;'>Error: games.js did not load. Check console.</div>";
            }
            return;
        }

        renderGrid(gridEl, GAMES);
        ensureModal();

        // ---------- renderer ----------
        function renderGrid(gridNode, games) {
            if (!gridNode) {
                console.error("[portfolio] No grid element to render into");
                return;
            }
            gridNode.innerHTML = ""; // clear

            games.forEach(game => {
                const card = document.createElement("div");
                card.className = "card";

                // preview container
                const preview = document.createElement("div");
                preview.className = "preview";

                const img = document.createElement("img");
                img.src = game.poster || "";
                img.alt = game.title || "";

                const vid = document.createElement("video");
                // do not set vid.src here to avoid preloading large files.
                // We will lazy-assign preview src on first hover.
                vid.muted = true;
                vid.loop = true;
                vid.playsInline = true;
                vid.preload = "metadata";
                // mark dataset for lazy load
                if (game.previewVideo) vid.dataset.previewSrc = game.previewVideo;

                preview.appendChild(img);
                preview.appendChild(vid);

                // title + description area
                const title = document.createElement("div");
                title.className = "title";
                title.textContent = game.title || "";

                // optional description (if provided)
                if (game.description) {
                    const desc = document.createElement("div");
                    desc.className = "card-desc";
                    desc.textContent = game.description;
                    card.append(preview, title, desc);
                } else {
                    card.append(preview, title);
                }

                // hover behaviour (desktop)
                let lazyAssigned = false;
                card.addEventListener("mouseenter", () => {
                    // lazy-assign preview src only when needed
                    if (!lazyAssigned && vid.dataset.previewSrc) {
                        vid.src = vid.dataset.previewSrc;
                        lazyAssigned = true;
                    }

                    // pause other previews
                    document.querySelectorAll(".preview video").forEach(v => {
                        if (v !== vid) {
                            try { v.pause(); v.currentTime = 0; } catch (e) {}
                        }
                    });

                    vid.play().catch(()=>{ /* autoplay may be blocked on some devices */ });
                });
                card.addEventListener("mouseleave", () => {
                    try { vid.pause(); vid.currentTime = 0; } catch (e) {}
                });

                // click -> modal (use fullVideo if available, fall back to preview)
                card.addEventListener("click", () => {
                    const src = game.fullVideo || game.previewVideo || "";
                    openModalWith(src);
                });

                gridNode.appendChild(card);
            });
        }

        // ---------- modal utilities ----------
        function ensureModal() {
            if (document.querySelector(".portfolio-modal")) return;
            const modal = document.createElement("div");
            modal.className = "portfolio-modal hidden modal";
            modal.innerHTML = `
        <div class="modal-content">
          <button class="close" aria-label="Close modal">&times;</button>
          <video controls playsinline></video>
        </div>
      `;
            document.body.appendChild(modal);

            const closeBtn = modal.querySelector(".close");
            const modalVideo = modal.querySelector("video");

            closeBtn.addEventListener("click", () => {
                modalVideo.pause();
                modalVideo.removeAttribute("src");
                modal.classList.add("hidden");
            });

            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    modalVideo.pause();
                    modalVideo.removeAttribute("src");
                    modal.classList.add("hidden");
                }
            });
        }

        function openModalWith(src) {
            const modal = document.querySelector(".portfolio-modal");
            if (!modal) return;
            const modalVideo = modal.querySelector("video");
            if (!src) {
                modalVideo.removeAttribute("src");
                return;
            }
            modalVideo.src = src;
            modal.classList.remove("hidden");
            modalVideo.currentTime = 0;
            modalVideo.play().catch(()=>{});
        }

        // debug helper
        window.__portfolio_debug = Object.assign(window.__portfolio_debug || {}, {
            unlock: () => { sessionStorage.setItem("portfolioUnlocked","true"); unlockPortfolio(); },
            lock:   () => { sessionStorage.removeItem("portfolioUnlocked"); lockPortfolio(); },
            renderNow: () => { renderGrid(document.getElementById("portfolio-grid"), (typeof GAMES !== "undefined" ? GAMES : [])); }
        });

        console.log("[portfolio] renderer initialized");
    } // end init
})();
