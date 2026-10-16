(function () {
  "use strict";

  const D = window.HV;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const byId = Object.fromEntries(D.events.map((e) => [e.id, e]));
  const Y0 = D.range.start, Y1 = D.range.end, NM = (Y1 - Y0 + 1) * 12;
  const mIndex = (y, m) => (y - Y0) * 12 + (m - 1);
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmtDate = (d) => `${d.y} 年 ${d.m} 月${d.d ? ` ${d.d} 日` : ""}`;
  const ym = (d) => `${d.y}.${pad2(d.m)}`;

  const PERIODS = {
    all:  { label: "全部", range: [Y0, Y1] },
    qing: { label: "晚清 1840–1911", range: [1840, 1911] },
    roc:  { label: "民国 1912–1949", range: [1912, 1949] }
  };
  const state = { tags: new Set(), minImp: 1, q: "", world: true, lensOnly: false, period: "all" };
  const inPeriod = (d) => { const [a, b] = PERIODS[state.period].range; return d.y >= a && d.y <= b; };

  /* ───────── 筛选逻辑 ───────── */
  function matches(e) {
    if (!inPeriod(e.date)) return false;
    if (e.importance < state.minImp) return false;
    if (state.lensOnly && !(D.lenses || {})[e.id]) return false;
    if (state.tags.size && !e.tags.some((t) => state.tags.has(t))) return false;
    if (state.q) {
      const ppl = (e.detail?.people || []).map((p) => D.people[p]?.name || "");
      const hay = [e.title, e.summary, ...ppl].join(" ").toLowerCase();
      if (!hay.includes(state.q.toLowerCase())) return false;
    }
    return true;
  }
  function worldVisible(w) {
    if (!state.world) return false;
    if (!inPeriod(w.date)) return false;
    if (state.q && !w.title.toLowerCase().includes(state.q.toLowerCase())) return false;
    return true;
  }
  const impVar = (i) => `var(--h${Math.max(1, Math.min(5, i))})`;
  const nodeVar = (i) => (i >= 5 ? "var(--h5)" : i >= 4 ? "var(--h4)" : "var(--h3)");

  /* ───────── KPI ───────── */
  function renderKpis() {
    const detailed = D.events.filter((e) => e.detail).length;
    const items = [
      [Y1 - Y0 + 1, "年 · " + Y0 + "–" + Y1],
      [D.events.length, "个收录事件"],
      [detailed, "篇完整详解"],
      [D.world.length, "条世界同期事件"]
    ];
    $("#kpis").innerHTML = items.map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
    $("#legend").innerHTML =
      `<span>重要度 1<span class="ramp">${[1, 2, 3, 4, 5].map((i) => `<i style="background:${impVar(i)}"></i>`).join("")}</span>5</span>` +
      `<span><span class="dot"></span>世界同期</span>`;
  }

  /* ───────── 密度图 ───────── */
  const CH = { W: 1000, padL: 40, top: 10, barH: 66 };
  let monthsCache = [];
  let view = { v0: 0, v1: NM, bw: 1 };

  function buildMonths() {
    const months = Array.from({ length: NM }, () => ({ all: [], vis: [], world: [] }));
    D.events.forEach((e) => {
      const i = mIndex(e.date.y, e.date.m);
      if (i < 0 || i >= NM) return;
      months[i].all.push(e);
      if (matches(e)) months[i].vis.push(e);
    });
    D.world.forEach((w) => {
      const i = mIndex(w.date.y, w.date.m);
      if (i >= 0 && i < NM && worldVisible(w)) months[i].world.push(w);
    });
    return months;
  }

  function renderDensity() {
    const svg = $("#density");
    const { W, padL, top, barH } = CH;
    const [py0, py1] = PERIODS[state.period].range;
    const v0 = mIndex(py0, 1), v1 = mIndex(py1, 12) + 1, vN = v1 - v0;
    const plotW = W - padL, bw = plotW / vN;
    view = { v0, v1, bw };
    const X = (i) => padL + (i - v0) * bw;
    const base = top + barH, eraY = base + 10, eraH = 18, worldY = eraY + eraH + 13, axisY = worldY + 22;
    const H = axisY + 6;
    const span = py1 - py0 + 1;
    const labelStep = span > 60 ? 10 : 5;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const months = (monthsCache = buildMonths());
    let s = "";

    // 行标签
    s += `<text x="0" y="${top + 10}">重要度</text>`;
    s += `<text x="0" y="${eraY + 13}">时期</text>`;
    s += `<text x="0" y="${worldY + 4}">世界</text>`;

    // 年份刻度与网格
    for (let y = py0; y <= py1; y++) {
      const x = X(mIndex(y, 1));
      const major = y % labelStep === 0 || y === py0 || y === py1;
      if (y % labelStep === 0) s += `<line x1="${x}" x2="${x}" y1="${top}" y2="${base}" stroke="var(--line)" stroke-dasharray="2 3"/>`;
      if (span <= 60 || y % 5 === 0 || y === py0 || y === py1)
        s += `<line x1="${x}" x2="${x}" y1="${axisY - 14}" y2="${axisY - (major ? 9 : 11)}" stroke="var(--ink-3)"/>`;
      const nearEdge = y !== py0 && y !== py1 && (y - py0 < labelStep / 2 || py1 - y < labelStep / 2);
      if (major && !nearEdge) {
        if (y === py1) s += `<text x="${W}" y="${axisY + 2}" text-anchor="end">${y}</text>`;
        else s += `<text x="${x + 2}" y="${axisY + 2}">${y}</text>`;
      }
    }

    // 柱（每月一根；跨度大时保证最小可见宽度）
    const barW = Math.max(bw * 0.8, 1.4);
    for (let i = v0; i < v1; i++) {
      const mo = months[i];
      if (!mo.all.length) continue;
      const list = mo.vis.length ? mo.vis : mo.all;
      const imp = Math.max(...list.map((e) => e.importance));
      const h = barH * (0.2 + 0.8 * (imp / 5));
      const x = X(i) + (bw - barW) / 2;
      const op = mo.vis.length ? 1 : 0.14;
      s += `<rect x="${x.toFixed(2)}" y="${(base - h).toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="0.6" style="fill:${impVar(imp)}" opacity="${op}"/>`;
    }
    s += `<line x1="${padL}" x2="${W}" y1="${base}" y2="${base}" stroke="var(--line)"/>`;

    // 时期带（裁剪到当前时段）
    D.eras.forEach((er) => {
      const a = Math.max(mIndex(er.start[0], er.start[1]), v0);
      const b = Math.min(mIndex(er.end[0], er.end[1]) + 1, v1);
      if (b <= a) return;
      const x0 = X(a), w = (b - a) * bw;
      s += `<g><title>${esc(er.name)}（${er.start[0]}–${er.end[0]}）</title>`;
      s += `<rect x="${x0 + 0.5}" y="${eraY}" width="${Math.max(w - 1, 1)}" height="${eraH}" rx="3" style="fill:var(--${er.color})" fill-opacity="0.28"/>`;
      s += `<rect x="${x0 + 0.5}" y="${eraY}" width="2.5" height="${eraH}" style="fill:var(--${er.color})"/>`;
      if (w > er.name.length * 11 + 14) s += `<text class="era-label" x="${x0 + 8}" y="${eraY + 13}">${esc(er.name)}</text>`;
      else if (w > 40) s += `<text class="era-label" x="${x0 + 8}" y="${eraY + 13}">${esc(er.name.slice(0, Math.floor((w - 14) / 11)))}…</text>`;
      s += `</g>`;
    });

    // 世界
    for (let i = v0; i < v1; i++) {
      if (!months[i].world.length) continue;
      s += `<circle cx="${X(i) + bw / 2}" cy="${worldY}" r="2.6" style="fill:var(--world)"/>`;
    }

    // 悬停高亮 + 捕获层
    s += `<rect id="hl" x="0" y="${top}" width="${Math.max(bw, 2)}" height="${worldY - top + 6}" fill="var(--ink)" opacity="0" pointer-events="none"/>`;
    s += `<rect id="hit" x="${padL}" y="0" width="${plotW}" height="${H}" fill="transparent"/>`;
    svg.innerHTML = s;
    bindDensityEvents(svg);
  }

  function bindDensityEvents(svg) {
    const tip = $("#tip"), box = $("#chartBox"), hl = $("#hl");
    const { v0, v1, bw } = view, padL = CH.padL;
    const snapR = Math.max(2, Math.round((v1 - v0) / 250));
    const idxFrom = (ev) => {
      const r = svg.getBoundingClientRect();
      const x = ((ev.clientX - r.left) * CH.W) / r.width;
      return v0 + Math.floor((x - padL) / bw);
    };
    const nearest = (i) => {
      // 柱子很细，吸附到附近有内容的月份，便于指向
      for (let d = 0; d <= snapR; d++) for (const j of [i - d, i + d]) {
        if (j < v0 || j >= v1) continue;
        const mo = monthsCache[j];
        if (mo && (mo.vis.length || mo.world.length)) return j;
      }
      return i;
    };
    const hide = () => { tip.hidden = true; hl.setAttribute("opacity", 0); };
    svg.onmousemove = (ev) => {
      let i = idxFrom(ev);
      if (i < v0 || i >= v1) return hide();
      i = nearest(i);
      const mo = monthsCache[i];
      const y = Y0 + Math.floor(i / 12), m = (i % 12) + 1;
      hl.setAttribute("x", padL + (i - v0) * bw);
      hl.setAttribute("opacity", 0.08);
      let html = `<b>${y}.${pad2(m)}</b>`;
      if (mo.vis.length) html += mo.vis.map((e) => `<div>● ${esc(e.title)}</div>`).join("");
      if (mo.world.length) html += mo.world.map((w) => `<div class="w">◦ ${esc(w.title)}</div>`).join("");
      if (!mo.vis.length && !mo.world.length) html += `<div class="w">无收录事件</div>`;
      tip.innerHTML = html;
      tip.hidden = false;
      const br = box.getBoundingClientRect();
      let left = ev.clientX - br.left + 14;
      if (left + 260 > br.width) left = ev.clientX - br.left - 14 - tip.offsetWidth;
      tip.style.left = Math.max(0, left) + "px";
      tip.style.top = "6px";
    };
    svg.onmouseleave = hide;
    svg.onclick = (ev) => {
      let i = idxFrom(ev);
      if (i < v0 || i >= v1) return;
      jumpToMonth(nearest(i));
    };
  }

  function jumpToMonth(i) {
    const rows = [...document.querySelectorAll(".month[data-i]")];
    if (!rows.length) return;
    const target = rows.find((r) => +r.dataset.i >= i) || rows[rows.length - 1];
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add("flash");
    setTimeout(() => target.classList.remove("flash"), 1600);
  }

  /* ───────── 筛选栏 ───────── */
  function renderFilters() {
    const visCount = D.events.filter(matches).length;
    const tagChips = D.tags.map((t) => `<button class="chip" data-tag="${t}" aria-pressed="${state.tags.has(t)}">${t}</button>`).join("");
    const impOpts = [[1, "全部"], [3, "≥3"], [4, "≥4"], [5, "仅 5"]];
    const impChips = impOpts.map(([v, l]) => `<button class="chip" data-imp="${v}" aria-pressed="${state.minImp === v}">${l}</button>`).join("");
    const perChips = Object.entries(PERIODS).map(([k, p]) => `<button class="chip" data-period="${k}" aria-pressed="${state.period === k}">${p.label}</button>`).join("");
    $("#filters").innerHTML =
      `<div class="fgroup"><span>时段</span>${perChips}</div>` +
      `<div class="fgroup"><span>主题</span>${tagChips}</div>` +
      `<div class="fgroup"><span>重要度</span>${impChips}</div>` +
      `<div class="fgroup"><button class="chip" data-lens aria-pressed="${state.lensOnly}"><span class="lens-dots"><i class="lz-power"></i><i class="lz-economy"></i><i class="lz-society"></i></span> 有多维评述</button><button class="chip" data-world aria-pressed="${state.world}">世界同期</button></div>` +
      `<div class="count num">显示 ${visCount} / ${D.events.length}</div>`;
  }
  $("#filters").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.tag) {
      const t = b.dataset.tag;
      state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t);
    } else if (b.dataset.period) {
      state.period = b.dataset.period;
    } else if (b.dataset.imp) {
      state.minImp = +b.dataset.imp;
    } else if ("lens" in b.dataset) {
      state.lensOnly = !state.lensOnly;
    } else if ("world" in b.dataset) {
      state.world = !state.world;
    }
    refresh();
  });
  let qTimer;
  $("#q").addEventListener("input", (ev) => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = ev.target.value.trim(); refresh(); }, 150);
  });

  /* ───────── 时间轴 ───────── */
  function erasOfYear(y) {
    return D.eras.filter((er) => er.start[0] <= y && er.end[0] >= y);
  }
  function impBars(n) {
    return `<span class="imp" title="重要度 ${n}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
  }
  const mediaOf = (e) => (D.media || {})[e.id] || [];
  const imagesOf = (e) => mediaOf(e).filter((m) => m.type === "image");

  function evCard(e) {
    const img = imagesOf(e)[0];
    const thumb = img ? `<img class="ev-thumb" src="${esc(img.thumb || img.src)}" data-fb="${esc(img.orig || "")}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : "";
    return `<button class="ev${e.detail ? " has-detail" : ""}${img ? " has-thumb" : ""}" data-id="${e.id}">
      <div class="ev-body">
      <div class="ev-top">
        <span class="ev-title">${esc(e.title)}</span>
        ${e.detail ? '<span class="badge">详解</span>' : ""}
        ${lensDots(e)}
        <span class="tags">${e.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</span>
        ${impBars(e.importance)}
      </div>
      <p class="ev-sum">${esc(e.summary)}</p>
      </div>${thumb}
    </button>`;
  }

  function renderTimeline() {
    const rows = new Map();
    const get = (y, m) => {
      const i = mIndex(y, m);
      if (!rows.has(i)) rows.set(i, { i, y, m, ev: [], world: [] });
      return rows.get(i);
    };
    D.events.filter(matches).forEach((e) => get(e.date.y, e.date.m).ev.push(e));
    D.world.filter(worldVisible).forEach((w) => get(w.date.y, w.date.m).world.push(w));
    const sorted = [...rows.values()].sort((a, b) => a.i - b.i);
    if (!sorted.length) { $("#timeline").innerHTML = `<div class="empty">没有符合条件的事件</div>`; return; }

    let html = "", curY = null;
    sorted.forEach((r) => {
      if (r.y !== curY) {
        if (curY !== null) html += `</div>`;
        curY = r.y;
        const tags = erasOfYear(r.y).map((er) => `<span class="era-tag" style="--c:var(--${er.color})">${er.name}</span>`).join("");
        html += `<div class="year"><div class="year-head"><h3>${r.y}</h3>${tags}</div>`;
      }
      const imp = r.ev.length ? Math.max(...r.ev.map((e) => e.importance)) : 0;
      const size = imp ? 8 + imp * 2 : 8;
      html += `<div class="month${r.ev.length ? "" : " world-only"}" data-i="${r.i}" id="m-${r.y}-${pad2(r.m)}">
        <div class="mlabel">${r.m} 月</div>
        <div class="axis"><span class="node" style="width:${size}px;height:${size}px;${imp ? `--c:${nodeVar(imp)}` : ""}"></span></div>
        <div class="mcards">
          ${r.ev.map(evCard).join("")}
          ${r.world.map((w) => `<div class="world-ev">世界 · ${esc(w.title)}</div>`).join("")}
        </div>
      </div>`;
    });
    html += `</div>`;
    $("#timeline").innerHTML = html;
  }
  $("#timeline").addEventListener("click", (ev) => {
    const b = ev.target.closest(".ev");
    if (b) location.hash = b.dataset.id;
  });

  /* ───────── 详情抽屉 ───────── */
  let map = null;
  const drawer = $("#drawer"), scrim = $("#scrim");

  function relatedOf(e) {
    const causes = new Set(e.causes || []), effects = new Set(e.effects || []);
    D.events.forEach((o) => {
      if ((o.effects || []).includes(e.id)) causes.add(o.id);
      if ((o.causes || []).includes(e.id)) effects.add(o.id);
    });
    const sortFn = (a, b) => mIndex(a.date.y, a.date.m) - mIndex(b.date.y, b.date.m);
    return {
      causes: [...causes].map((id) => byId[id]).filter(Boolean).sort(sortFn),
      effects: [...effects].map((id) => byId[id]).filter(Boolean).sort(sortFn)
    };
  }

  function causalSvg(e) {
    const { causes, effects } = relatedOf(e);
    const W = 720, nw = 210, nh = 46, gap = 12, colX = [0, (W - nw) / 2, W - nw], top = 26;
    const n = Math.max(causes.length, effects.length, 1);
    const H = top + n * (nh + gap);
    const colY = (k, len) => top + ((n - len) * (nh + gap)) / 2 + k * (nh + gap);
    const trunc = (t) => (t.length > 15 ? t.slice(0, 14) + "…" : t);
    const node = (ev, x, y, self) =>
      `<g class="cn${self ? " self" : ""}" data-id="${ev.id}"><rect x="${x}" y="${y}" width="${nw}" height="${nh}" rx="8"/>` +
      `<text class="y" x="${x + 12}" y="${y + 17}">${ym(ev.date)}</text>` +
      `<text x="${x + 12}" y="${y + 35}">${esc(trunc(ev.title))}</text></g>`;
    let s = `<defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" style="fill:var(--ink-3);stroke:none"/></marker></defs>`;
    s += `<text class="colh" x="${colX[0]}" y="14">前因</text><text class="colh" x="${colX[1]}" y="14">本事件</text><text class="colh" x="${colX[2]}" y="14">后果</text>`;
    const sy = colY(0, 1);
    const curve = (x1, y1, x2, y2) => { const mx = (x1 + x2) / 2; return `<path d="M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2 - 2} ${y2}" marker-end="url(#arr)"/>`; };
    causes.forEach((c, k) => { const y = colY(k, causes.length); s += curve(colX[0] + nw, y + nh / 2, colX[1], sy + nh / 2); });
    effects.forEach((c, k) => { const y = colY(k, effects.length); s += curve(colX[1] + nw, sy + nh / 2, colX[2], y + nh / 2); });
    causes.forEach((c, k) => (s += node(c, colX[0], colY(k, causes.length))));
    effects.forEach((c, k) => (s += node(c, colX[2], colY(k, effects.length))));
    if (!causes.length) s += `<text class="y" x="${colX[0] + 12}" y="${sy + 28}">暂未标注</text>`;
    if (!effects.length) s += `<text class="y" x="${colX[2] + 12}" y="${sy + 28}">暂未标注</text>`;
    s += node(e, colX[1], sy, true);
    return `<svg id="causal" viewBox="0 0 ${W} ${H}" role="img" aria-label="因果链">${s}</svg>`;
  }

  /* ───────── 多维视角 ───────── */
  const LENS = [
    { key: "power", name: "权力博弈", icon: "博" },
    { key: "economy", name: "经济学", icon: "经" },
    { key: "society", name: "社会学", icon: "社" }
  ];
  const lensOf = (e) => (D.lenses || {})[e.id] || null;

  function lensDots(e) {
    const l = lensOf(e);
    if (!l) return "";
    const on = LENS.filter((x) => l[x.key]);
    return `<span class="lens-dots" title="多维视角：${on.map((x) => x.name).join(" · ")}">${on.map((x) => `<i class="lz-${x.key}"></i>`).join("")}</span>`;
  }

  function lensesHtml(e) {
    const l = lensOf(e);
    if (!l) return "";
    const blocks = LENS.filter((x) => l[x.key]).map((x) => {
      const v = l[x.key];
      let body = "";
      if (typeof v === "string") {
        body = `<p>${esc(v)}</p>`;
      } else {
        body = `<p class="lz-lead">${esc(v.text)}</p>`;
        if (v.actors && v.actors.length) {
          body += `<div class="actors-wrap"><table class="actors"><thead><tr><th>博弈方</th><th>目标</th><th>筹码</th><th>结果</th></tr></thead><tbody>${v.actors
            .map((a) => `<tr><td><b>${esc(a.name)}</b></td><td>${esc(a.goal)}</td><td>${esc(a.leverage)}</td><td>${esc(a.outcome)}</td></tr>`)
            .join("")}</tbody></table></div>`;
        }
        if (v.points && v.points.length) {
          body += `<ul class="lz-points">${v.points.map((p) => `<li><span class="concept">${esc(p.concept)}</span><span>${esc(p.text)}</span></li>`).join("")}</ul>`;
        }
      }
      return `<div class="lz lz-${x.key}"><div class="lz-head"><span class="lz-icon">${x.icon}</span><h5>${x.name}</h5></div>${body}</div>`;
    });
    const brief = LENS.every((x) => !l[x.key] || typeof l[x.key] === "string");
    return `<div class="disclaim">多维视角属于分析性评述，借用政治学、经济学、社会学的概念来理解事件，不是史实陈述。${brief ? "本条为简评。" : ""}</div>${blocks.join("")}`;
  }

  function list(items) { return `<ul class="clean">${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`; }

  function detailHtml(e) {
    const d = e.detail;
    const secs = [];
    const add = (id, label, body) => secs.push({ id, label, body });

    const md = mediaHtml(e);
    if (md) add("media", "图片与影像", md);
    if (d) {
      add("bg", "全局背景", `<div class="two">
        <div class="panel"><h5>国内</h5><p>${esc(d.background.domestic)}</p></div>
        <div class="panel"><h5>国际</h5><p>${esc(d.background.international)}</p></div></div>`);
      add("cause", "起因", `<div class="panel direct" style="margin-bottom:10px"><h5>直接导火索</h5><p>${esc(d.causes.direct)}</p></div>
        <div class="panel"><h5>深层原因</h5>${list(d.causes.deep)}</div>`);
      add("proc", "过程", `<ol class="steps">${d.process.map((p) => `<li><span class="sd">${esc(p.date)}</span><span class="sn"></span><span>${esc(p.text)}</span></li>`).join("")}</ol>`);
      add("eff", "影响", `<div class="two"><div class="panel"><h5>短期</h5>${list(d.effects.short)}</div><div class="panel"><h5>长期</h5>${list(d.effects.long)}</div></div>`);
    }
    const lz = lensesHtml(e);
    if (lz) add("lens", "多维视角", lz);
    add("chain", "因果链", causalSvg(e));
    if (d) {
      add("ppl", "相关人物", `<div class="people">${d.people.map((pid) => {
        const p = D.people[pid]; if (!p) return "";
        return `<div class="person"><div class="avatar">${esc(p.name[0])}</div><div><b>${esc(p.name)}</b><span class="life">${esc(p.life)}</span><div class="role">${esc(p.role)}</div></div></div>`;
      }).join("")}</div>`);
      add("geo", "地理", `<div class="map" id="map"></div>
        <ul class="places">${d.places.map((p, i) => `<li data-i="${i}"><span class="pin">${i + 1}</span><span>${esc(p.name)} <small>${esc(p.note)}</small></span></li>`).join("")}</ul>
        <div class="map-note">底图：高德地图（现代行政区划）。坐标为近似位置，已按国内地图坐标系校正。</div>`);
      add("mat", "史料", d.materials.map((m) => `<div class="mat"><div class="mat-top"><span class="mat-type">${esc(m.type)}</span><b>${esc(m.title)}</b><span class="mat-meta">${esc(m.meta)}</span></div><blockquote>${esc(m.excerpt)}</blockquote></div>`).join(""));
      add("par", "古今对照", `<div class="disclaim">古今对照属于分析观点，不是史实陈述；只在机制上确实相似的地方做类比。</div>` +
        (d.parallels.length
          ? d.parallels.map((p) => `<div class="par"><h5>${esc(p.title)}</h5><div class="par-grid">
              <div class="s"><h6>相似之处</h6>${list(p.similar)}</div>
              <div class="d"><h6>关键差异</h6>${list(p.different)}</div></div>
              <div class="insight"><b>启示</b>　${esc(p.insight)}</div></div>`).join("")
          : `<div class="pending">${esc(d.parallelsNote || "暂无对照")}</div>`));
      add("ref", "参考来源", `<ol class="refs">${d.references.map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></li>`).join("")}</ol>`);
    } else {
      add("todo", "详解", `<div class="pending">这条目前只有摘要和因果链。<br/>完整详解（背景、过程、人物、地图、史料、古今对照）待撰写。</div>`);
    }

    return `<div class="d-head">
        <button class="d-close" aria-label="关闭">×</button>
        <div class="d-date">${fmtDate(e.date)}</div>
        <h2 class="d-title">${esc(e.title)}</h2>
        <div class="d-meta"><span class="tags">${e.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</span>${impBars(e.importance)}${e.detail ? "" : '<span class="tag">简要条目</span>'}</div>
        <nav class="d-nav">${secs.map((s, i) => `<a href="#" data-sec="${s.id}" class="${i === 0 ? "on" : ""}">${s.label}</a>`).join("")}</nav>
      </div>
      <p class="d-lead">${esc(e.summary)}</p>
      ${secs.map((s) => `<section class="sec" id="sec-${s.id}"><h4>${s.label}</h4>${s.body}</section>`).join("")}`;
  }

  /* ───────── 图片与影像 ───────── */
  function mediaHtml(e) {
    const items = mediaOf(e);
    const imgs = items.filter((m) => m.type === "image");
    const vids = items.filter((m) => m.type === "video");
    // 视频：除了数据里指定的链接，自动为每个事件生成哔哩哔哩搜索入口（国内可直接访问）
    const kw = e.title.replace(/[《》“”]/g, "").replace(/（.*?）/g, "").split("，")[0].trim();
    const bili = (q) => "https://search.bilibili.com/all?keyword=" + encodeURIComponent(q);
    const links = items.filter((m) => m.type === "link").concat([
      { title: "纪录片", note: `哔哩哔哩搜索「${kw} 纪录片」`, url: bili(kw + " 纪录片") },
      { title: "历史影像与讲解", note: `哔哩哔哩搜索「${kw}」`, url: bili(kw) }
    ]);
    let h = "";
    if (imgs.length) {
      h += `<div class="gallery${imgs.length === 1 ? " one" : ""}">${imgs.map((m, i) => `
        <figure class="gi" data-i="${i}">
          <img src="${esc(m.thumb || m.src)}" data-fb="${esc(m.orig || "")}" alt="${esc(m.caption)}" loading="lazy" referrerpolicy="no-referrer" />
          <figcaption>${esc(m.caption)}</figcaption>
        </figure>`).join("")}</div>`;
    }
    if (vids.length) {
      h += vids.map((m) => `<figure class="vid"><video controls preload="metadata" src="${esc(m.src)}"${m.poster ? ` poster="${esc(m.poster)}"` : ""}></video>
        <figcaption>${esc(m.caption)}<span class="credit">${esc(m.credit || "")}${m.license ? " · " + esc(m.license) : ""}</span></figcaption></figure>`).join("");
    }
    if (links.length) {
      h += `<div class="vlinks">${links.map((m) => `<a class="vlink" href="${esc(m.url)}" target="_blank" rel="noopener">
        <span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
        <span><b>${esc(m.title)}</b><small>${esc(m.note || "")}</small></span></a>`).join("")}</div>`;
    }
    h += `<div class="map-note">${imgs.length || vids.length ? "图片外链自维基共享资源（Wikimedia Commons），点击可查看大图、作者和授权信息；如果图片无法显示，可能是当前网络无法访问该网站。" : ""}视频入口为站外搜索结果，内容质量请自行甄别。</div>`;
    return h;
  }

  /* 外链图片加载失败时：先退回原图地址，再失败就隐藏 */
  document.addEventListener("error", (ev) => {
    const img = ev.target;
    if (!(img instanceof HTMLImageElement) || !("fb" in img.dataset)) return;
    if (img.dataset.fb && !img.dataset.tried && !/\.tiff?$/i.test(img.dataset.fb)) { img.dataset.tried = "1"; img.src = img.dataset.fb; return; }
    const box = img.closest(".gi") || (img.classList.contains("ev-thumb") ? img : null);
    if (box) box.style.display = "none";
  }, true);

  /* 灯箱 */
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.hidden = true;
  lb.innerHTML = `<button class="lb-close" aria-label="关闭">×</button><button class="lb-prev" aria-label="上一张">‹</button><button class="lb-next" aria-label="下一张">›</button>
    <figure><img alt="" referrerpolicy="no-referrer" /><figcaption></figcaption></figure>`;
  document.body.appendChild(lb);
  let lbList = [], lbIdx = 0;
  function lbShow(i) {
    lbIdx = (i + lbList.length) % lbList.length;
    const m = lbList[lbIdx];
    const li = $("img", lb);
    li.dataset.fb = m.orig || "";
    li.dataset.tried = "";
    li.src = m.src;
    $("img", lb).alt = m.caption;
    $("figcaption", lb).innerHTML = `<b>${esc(m.caption)}</b>` +
      `<span>${m.credit ? "作者 / 出处：" + esc(m.credit) : ""}${m.license ? "　授权：" + esc(m.license) : ""}${m.page ? `　<a href="${esc(m.page)}" target="_blank" rel="noopener">原始页面</a>` : ""}</span>` +
      (lbList.length > 1 ? `<span class="num">${lbIdx + 1} / ${lbList.length}</span>` : "");
    lb.classList.toggle("single", lbList.length < 2);
  }
  function lbOpen(list, i) { lbList = list; lb.hidden = false; lbShow(i); }
  function lbClose() { lb.hidden = true; $("img", lb).src = ""; }
  $(".lb-close", lb).onclick = lbClose;
  $(".lb-prev", lb).onclick = () => lbShow(lbIdx - 1);
  $(".lb-next", lb).onclick = () => lbShow(lbIdx + 1);
  lb.onclick = (ev) => { if (ev.target === lb) lbClose(); };

  /* 国内底图（高德）使用 GCJ-02 坐标，这里把 WGS-84 坐标转换过去 */
  function wgs2gcj(lat, lng) {
    const a = 6378245.0, ee = 0.00669342162296594323, PI = Math.PI;
    const x = lng - 105, y = lat - 35;
    let dLat = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    dLat += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    dLat += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
    dLat += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
    let dLng = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    dLng += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    dLng += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
    dLng += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
    const radLat = (lat / 180) * PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sq = Math.sqrt(magic);
    dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sq)) * PI);
    dLng = (dLng * 180) / ((a / sq) * Math.cos(radLat) * PI);
    return [lat + dLat, lng + dLng];
  }

  function initMap(e) {
    if (map) { map.remove(); map = null; }
    const el = $("#map");
    if (!el || !window.L) return;
    map = L.map(el, { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
      subdomains: "1234", maxZoom: 18, attribution: "© 高德地图"
    }).addTo(map);
    const markers = e.detail.places.map((p, i) => {
      const ll = wgs2gcj(p.lat, p.lng);
      return L.marker(ll, { icon: L.divIcon({ className: "", html: `<div class="pin">${i + 1}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }) })
        .bindTooltip(`<b>${esc(p.name)}</b><br>${esc(p.note)}`, { direction: "top", offset: [0, -10] })
        .addTo(map);
    });
    const fit = () => {
      map.invalidateSize();
      const b = L.latLngBounds(markers.map((m) => m.getLatLng()));
      map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
    };
    fit();
    setTimeout(fit, 320);
    document.querySelectorAll(".places li").forEach((li) => {
      li.onclick = () => { const m = markers[+li.dataset.i]; map.flyTo(m.getLatLng(), 15, { duration: 0.6 }); m.openTooltip(); };
    });
  }

  let navObs = null;
  function open(id) {
    const e = byId[id];
    if (!e) return close();
    $("#drawerBody").innerHTML = detailHtml(e);
    drawer.scrollTop = 0;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.hidden = false;
    document.body.classList.add("locked");
    document.title = `${e.title} · 近代中国时间轴`;
    if (e.detail) initMap(e); else if (map) { map.remove(); map = null; }

    // 导航
    const links = [...drawer.querySelectorAll(".d-nav a")];
    links.forEach((a) => (a.onclick = (ev) => { ev.preventDefault(); $("#sec-" + a.dataset.sec).scrollIntoView({ behavior: "smooth", block: "start" }); }));
    if (navObs) navObs.disconnect();
    navObs = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        const sid = en.target.id.slice(4);
        links.forEach((a) => a.classList.toggle("on", a.dataset.sec === sid));
        const on = links.find((a) => a.dataset.sec === sid);
        if (on) on.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    }, { root: drawer, rootMargin: "-160px 0px -65% 0px" });
    drawer.querySelectorAll(".sec").forEach((s) => navObs.observe(s));

    $(".d-close", drawer).onclick = () => (location.hash = "");
    drawer.querySelectorAll("#causal .cn:not(.self)").forEach((g) => (g.onclick = () => (location.hash = g.dataset.id)));
    const imgs = imagesOf(e);
    drawer.querySelectorAll(".gallery .gi").forEach((f) => (f.onclick = () => lbOpen(imgs, +f.dataset.i)));
  }
  function close() {
    if (!lb.hidden) lbClose();
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    scrim.hidden = true;
    document.body.classList.remove("locked");
    document.title = "近代中国时间轴";
  }
  scrim.onclick = () => (location.hash = "");
  document.addEventListener("keydown", (ev) => {
    if (!lb.hidden) {
      if (ev.key === "Escape") lbClose();
      else if (ev.key === "ArrowLeft") lbShow(lbIdx - 1);
      else if (ev.key === "ArrowRight") lbShow(lbIdx + 1);
      return;
    }
    if (ev.key === "Escape" && drawer.classList.contains("open")) location.hash = "";
  });
  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    id ? open(id) : close();
  }
  window.addEventListener("hashchange", route);

  /* ───────── 启动 ───────── */
  function refresh() { renderFilters(); renderDensity(); renderTimeline(); }
  renderKpis();
  refresh();
  route();
})();
