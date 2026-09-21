/* =========================================================
   Color Harmony Lab - script.js
   WEB140 Color Theory Project - Isaiah Evans

   1. The three palettes (must match style.css and the
      documentation cards in index.html)
   2. Helper functions (contrast, hue, mixing)
   3. applyPalette() - switches the whole page to one palette
   4. Button click handlers
   ========================================================= */

/* ---------- 1. Palettes ---------- */

const palettes = {
    // Complementary: primary (175deg) and accent (355deg) are opposite each other
    palette1: {
        name: "Complementary",
        primary: "#0A5751",
        secondary: "#2B827B",
        accent: "#CE2230",
        background: "#F4FBFA",
        surface: "#E3F2F1",
        text: "#0D2120"
    },

    // Analogous: primary (210deg), secondary (240deg), accent (270deg) sit side by side
    palette2: {
        name: "Analogous",
        primary: "#0F4C8A",
        secondary: "#3030A6",
        accent: "#7F26D9",
        background: "#F7F8FD",
        surface: "#E8ECF7",
        text: "#0E152A"
    },

    // Triadic: primary (330deg), secondary (210deg), accent (90deg) are 120deg apart
    palette3: {
        name: "Triadic",
        primary: "#9E1A5C",
        secondary: "#125CA5",
        accent: "#80C936",
        background: "#FAF5F7",
        surface: "#F3E8ED",
        text: "#250E1A"
    }
};

const DEFAULT_PALETTE = "palette1";

/* ---------- 2. Helpers ---------- */

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb) {
    return "#" + rgb.map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// WCAG relative luminance
function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two colors (1 to 21)
function contrast(a, b) {
    const hi = Math.max(luminance(a), luminance(b));
    const lo = Math.min(luminance(a), luminance(b));
    return (hi + 0.05) / (lo + 0.05);
}

// Pick whichever readable color (white or the palette's text color) has more contrast on bg
function readableOn(bg, palette) {
    return contrast("#FFFFFF", bg) >= contrast(palette.text, bg) ? "#FFFFFF" : palette.text;
}

// Blend two colors: amount = how much of colorA to use (0 to 1)
function mix(colorA, colorB, amount) {
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    return rgbToHex(a.map((v, i) => v * amount + b[i] * (1 - amount)));
}

// Hue angle (0-360) on the HSL color wheel
function hexToHue(hex) {
    const [r, g, b] = hexToRgb(hex).map(v => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return 0;
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return Math.round((h * 60 + 360) % 360);
}

// Angular distance between two hues (0-180)
function hueGap(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}

/* ---------- 3. Apply a palette ---------- */

const SVG_NS = "http://www.w3.org/2000/svg";
const ROLE_LABELS = { primary: "Primary", secondary: "Secondary", accent: "Accent" };

let currentKey = DEFAULT_PALETTE;

function applyPalette(key) {
    const p = palettes[key];
    if (!p) return;
    currentKey = key;

    // CSS variables: the whole page recolors from these
    const root = document.documentElement.style;
    root.setProperty("--primary", p.primary);
    root.setProperty("--secondary", p.secondary);
    root.setProperty("--accent", p.accent);
    root.setProperty("--background", p.background);
    root.setProperty("--surface", p.surface);
    root.setProperty("--text", p.text);
    root.setProperty("--text-on-primary", readableOn(p.primary, p));
    root.setProperty("--text-on-secondary", readableOn(p.secondary, p));
    root.setProperty("--text-on-accent", readableOn(p.accent, p));
    root.setProperty("--border", mix(p.text, p.background, 0.16));

    // Swatch HEX values (the chips recolor themselves through the CSS variables)
    ["primary", "secondary", "accent", "background", "text"].forEach(role => {
        const hex = document.querySelector('[data-hex="' + role + '"]');
        if (hex) hex.textContent = p[role];
    });
    const surfaceHex = document.querySelector('[data-hex="surface"]');
    if (surfaceHex) surfaceHex.textContent = p.surface;

    // Palette name shown in the swatch heading
    document.querySelectorAll("[data-current-name]").forEach(el => {
        el.textContent = p.name;
    });

    // Buttons
    document.querySelectorAll(".palette-btn").forEach(btn => {
        const btnKey = btn.dataset.palette;
        btn.setAttribute("aria-pressed", String(btnKey === key));
        const label = btn.querySelector(".btn-name");
        if (label) label.textContent = palettes[btnKey].name;
    });

    // Highlight the matching analysis card
    document.querySelectorAll(".analysis-card").forEach(card => {
        const active = card.dataset.palette === key;
        card.classList.toggle("is-active", active);
        if (active) card.setAttribute("aria-current", "true");
        else card.removeAttribute("aria-current");
    });

    // Browser toolbar color on phones
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", p.primary);

    drawWheel(p);

    // Announce the change for screen readers
    const status = document.getElementById("status");
    if (status) {
        status.textContent = p.name + " palette applied. Primary " + p.primary +
            ", secondary " + p.secondary + ", accent " + p.accent + ".";
    }
}

/* ---------- Color wheel drawing ---------- */

function polar(hue, radius) {
    const rad = hue * Math.PI / 180;
    return [100 + radius * Math.sin(rad), 100 - radius * Math.cos(rad)];
}

function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
}

function drawWheel(p) {
    const svg = document.getElementById("wheel-svg");
    if (!svg) return;
    svg.replaceChildren();

    const hues = {
        primary: hexToHue(p.primary),
        secondary: hexToHue(p.secondary),
        accent: hexToHue(p.accent)
    };
    const RING = 78;

    // Unique hue positions, sorted around the circle
    const unique = [];
    Object.values(hues).forEach(h => {
        if (!unique.some(u => hueGap(u, h) < 4)) unique.push(h);
    });
    unique.sort((a, b) => a - b);

    // Connecting shape: line (2 hues), open path (neighbors) or closed triangle (evenly spaced)
    if (unique.length >= 2) {
        let ordered = unique.slice();
        let closed = unique.length > 2;
        if (unique.length > 2) {
            let bigGap = -1;
            let start = 0;
            unique.forEach((h, i) => {
                const next = unique[(i + 1) % unique.length];
                const gap = (next - h + 360) % 360;
                if (gap > bigGap) { bigGap = gap; start = (i + 1) % unique.length; }
            });
            if (bigGap > 180) {
                closed = false;
                ordered = unique.map((_, i) => unique[(start + i) % unique.length]);
            }
        }
        const pts = ordered.map(h => polar(h, RING).map(v => v.toFixed(1)).join(",")).join(" ");
        const tag = closed ? "polygon" : "polyline";
        svg.appendChild(svgEl(tag, { points: pts, fill: "none", stroke: "#000", "stroke-opacity": "0.35", "stroke-width": "6", "stroke-linejoin": "round", "stroke-linecap": "round" }));
        svg.appendChild(svgEl(tag, { points: pts, fill: "none", stroke: "#fff", "stroke-width": "3", "stroke-linejoin": "round", "stroke-linecap": "round" }));
    }

    // Markers: if primary and secondary share a hue, stack them radially so both are visible
    const sameHue = hueGap(hues.primary, hues.secondary) < 4;
    const markers = [
        { role: "accent", radius: RING, size: 12 },
        { role: "secondary", radius: sameHue ? 62 : RING, size: sameHue ? 8.5 : 10 },
        { role: "primary", radius: sameHue ? 90 : RING, size: sameHue ? 8.5 : 12 }
    ];
    markers.forEach(m => {
        const [x, y] = polar(hues[m.role], m.radius);
        svg.appendChild(svgEl("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: m.size, fill: p[m.role], stroke: "#fff", "stroke-width": "3" }));
        const label = svgEl("text", { x: x.toFixed(1), y: (y + 0.5).toFixed(1), "text-anchor": "middle", "dominant-baseline": "middle", "font-size": m.size > 9 ? 11 : 9, "font-weight": 700, "font-family": "sans-serif", fill: readableOn(p[m.role], p) });
        label.textContent = ROLE_LABELS[m.role][0];
        svg.appendChild(label);
    });

    // Wheel center text
    const harmony = document.getElementById("wheel-harmony");
    if (harmony) harmony.textContent = p.name;
    const rule = document.getElementById("wheel-rule");
    if (rule) {
        const gaps = [hueGap(hues.primary, hues.accent), hueGap(hues.primary, hues.secondary), hueGap(hues.secondary, hues.accent)];
        if (sameHue) rule.textContent = "Accent is " + gaps[0] + "° from primary";
        else if (unique.length === 3 && Math.min.apply(null, gaps) > 100) rule.textContent = "Colors are " + gaps[0] + "° apart";
        else rule.textContent = "Neighbors " + Math.min.apply(null, gaps) + "° apart";
    }

    // Hue list beside the wheel
    const list = document.getElementById("hue-list");
    if (list) {
        list.replaceChildren();
        ["primary", "secondary", "accent"].forEach(role => {
            const li = document.createElement("li");
            const dot = document.createElement("span");
            dot.className = "hue-dot";
            dot.style.background = p[role];
            const name = document.createElement("span");
            name.textContent = ROLE_LABELS[role] + " ";
            const code = document.createElement("code");
            code.textContent = p[role];
            name.appendChild(code);
            const deg = document.createElement("span");
            deg.className = "hue-deg";
            deg.textContent = hues[role] + "°";
            li.append(dot, name, deg);
            list.appendChild(li);
        });
    }
}

/* ---------- 4. Button handlers ---------- */

document.querySelectorAll(".palette-btn").forEach(btn => {
    btn.addEventListener("click", () => applyPalette(btn.dataset.palette));
});

applyPalette(DEFAULT_PALETTE);
