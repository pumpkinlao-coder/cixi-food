/* 慈溪味 · 应用逻辑 */
(function () {
  "use strict";

  var RECIPES = RECIPES_1.concat(RECIPES_2, RECIPES_3, RECIPES_4, RECIPES_5, RECIPES_6, RECIPES_7, RECIPES_8, RECIPES_9, RECIPES_10, RECIPES_11, RECIPES_12, RECIPES_13, RECIPES_14);

  // 挂载「做法变体」：VARIANT_LIB ~ VARIANT_LIB4 以菜名索引，避免与 id 强耦合
  (function () {
    var libs = [];
    if (typeof VARIANT_LIB !== "undefined") libs.push(VARIANT_LIB);
    if (typeof VARIANT_LIB2 !== "undefined") libs.push(VARIANT_LIB2);
    if (typeof VARIANT_LIB3 !== "undefined") libs.push(VARIANT_LIB3);
    if (typeof VARIANT_LIB4 !== "undefined") libs.push(VARIANT_LIB4);
    if (!libs.length) return;
    var pool = {};
    libs.forEach(function (lib) {
      Object.keys(lib).forEach(function (k) {
        pool[k] = (pool[k] || []).concat(lib[k]);
      });
    });
    RECIPES.forEach(function (r) {
      var extra = pool[r.name];
      if (extra && extra.length) r.variants = (r.variants || []).concat(extra);
    });
  })();


  var CATS = {
    sea:     { name: "海鲜",   emoji: "🦀", cls: "c-sea" },
    river:   { name: "河鲜",   emoji: "🐟", cls: "c-river" },
    meat:    { name: "肉类佳肴", emoji: "🥩", cls: "c-meat" },
    veg:     { name: "时蔬小炒", emoji: "🥬", cls: "c-veg" },
    cured:   { name: "腌糟醉鲜", emoji: "🥒", cls: "c-cured" },
    soup:    { name: "汤羹炖品", emoji: "🍲", cls: "c-soup" },
    staple:  { name: "主食点心", emoji: "🍚", cls: "c-staple" },
    dessert: { name: "甜品饮品", emoji: "🍡", cls: "c-dessert" }
  };
  var CAT_ORDER = ["sea", "river", "meat", "veg", "cured", "soup", "staple", "dessert"];
  var DIFF_NAME = { 1: "简单", 2: "中等", 3: "较难" };

  var state = { kw: "", cat: "all", sort: "default", remote: false, fav: false, season: "all", town: "all", time: "all", tool: "all" };
  var curRecipe = null;
  var curServe = 2;
  var CX = window.CX || {};

  function isRemote(id) {
    return (typeof REMOTE_RECIPES !== "undefined") && REMOTE_RECIPES.indexOf(id) >= 0;
  }

  // 时令 / 乡镇：按菜名索引的静态映射（season.js / town.js）
  function seasonsOf(name) {
    return (typeof SEASON_MAP !== "undefined" && SEASON_MAP[name]) || [];
  }
  function townOf(name) {
    return (typeof TOWN_MAP !== "undefined" && TOWN_MAP[name]) || "";
  }
  // 月度时令（month.js）：只收录上市月份有据可依的菜
  function monthsOf(name) {
    return (typeof MONTH_MAP !== "undefined" && MONTH_MAP[name]) || [];
  }
  function seasonOfMonth(m) {
    if (typeof MONTH_SEASON !== "undefined" && MONTH_SEASON[m]) return MONTH_SEASON[m];
    return ["冬", "冬", "春", "春", "春", "夏", "夏", "夏", "秋", "秋", "秋", "冬"][m - 1] || "";
  }

  // 时长换算统一走 features.js 的 CX.time.parse，避免排序与筛选两处口径不一致
  function timeVal(s) {
    return (CX.time && CX.time.parse) ? CX.time.parse(s) : 0;
  }

  function timeLevelDef(k) {
    if (typeof TIME_LEVELS === "undefined") return null;
    for (var i = 0; i < TIME_LEVELS.length; i++) {
      if (TIME_LEVELS[i].k === k) return TIME_LEVELS[i];
    }
    return null;
  }

  // 搜索用文本：菜名、描述、标签、食材、小贴士，再加上本地叫法与标准名的互认写法。
  // 于是搜「倭豆」能找到蚕豆菜，搜「弹涂」能找到弹涂鱼，搜「咸齑」能找到雪菜。
  function hayOf(r) {
    if (r.__hay) return r.__hay;
    var s = r.name + " " + r.desc + " " + r.tags.join(" ") + " " +
      r.ingredients.join(" ") + " " + (r.tips || "");
    if (typeof DIALECT !== "undefined") {
      var low = s.toLowerCase();
      for (var i = 0; i < DIALECT.length; i++) {
        var e = DIALECT[i];
        if (e.g === "饮食说法") continue;
        var forms = [e.t].concat(e.a || []);
        if (e.s) forms.push(e.s);
        var hit = false;
        for (var j = 0; j < forms.length; j++) {
          if (forms[j] && low.indexOf(forms[j].toLowerCase()) >= 0) { hit = true; break; }
        }
        if (hit) s += " " + forms.join(" ");
      }
    }
    r.__hay = s.toLowerCase();
    return r.__hay;
  }

  function matches(r) {
    if (state.cat !== "all" && r.cat !== state.cat) return false;
    if (state.remote && !isRemote(r.id)) return false;
    if (state.fav && CX.fav && !CX.fav.is(r.id)) return false;
    if (state.season !== "all" && seasonsOf(r.name).indexOf(state.season) < 0) return false;
    if (state.town !== "all" && townOf(r.name) !== state.town) return false;
    // 用时：档位是累积的，「30 分钟内」含 20 分钟内的菜
    if (state.time !== "all") {
      var mins = timeVal(r.time);
      var lv = timeLevelDef(state.time);
      if (!mins || !lv) return false;
      if (lv.max && mins > lv.max) return false;
      if (lv.min && mins < lv.min) return false;
    }
    // 厨具：一口锅 = 不用专门厨具且不用开火之外的都算；要蒸笼等则按需命中
    if (state.tool !== "all" && CX.tools) {
      if (state.tool === "base") {
        if (CX.tools.nofire(r) || CX.tools.of(r).length) return false;
      } else if (state.tool === "nofire") {
        if (!CX.tools.nofire(r)) return false;
      } else if (CX.tools.of(r).indexOf(state.tool) < 0) {
        return false;
      }
    }
    var kw = state.kw.trim().toLowerCase();
    if (!kw) return true;
    return hayOf(r).indexOf(kw) >= 0;
  }

  function filtered() {
    var list = RECIPES.filter(matches);
    if (state.sort === "diff") {
      list = list.slice().sort(function (a, b) { return a.diff - b.diff; });
    } else if (state.sort === "time") {
      list = list.slice().sort(function (a, b) { return timeVal(a.time) - timeVal(b.time); });
    }
    return list;
  }

  function diffHtml(d) {
    var dots = "";
    for (var i = 0; i < 3; i++) {
      dots += '<i class="dot' + (i < d ? " on" : "") + '"></i>';
    }
    return '<span class="diff" title="难度">' + dots + '<em>' + DIFF_NAME[d] + "</em></span>";
  }

  function cardHtml(r) {
    var cat = CATS[r.cat];
    var remote = isRemote(r.id);
    return (
      '<article class="card ' + cat.cls + (remote ? " is-remote" : "") + '" data-id="' + r.id + '" tabindex="0">' +
        '<button class="card-fav' + (CX.fav && CX.fav.is(r.id) ? " on" : "") + '" data-fav="' + r.id + '" aria-label="收藏" title="收藏">' + (CX.fav && CX.fav.is(r.id) ? "♥" : "♡") + "</button>" +
        '<div class="card-top">' +
          '<span class="card-emoji">' + r.emoji + "</span>" +
          '<span class="chip chip-cat">' + cat.name + "</span>" +
          (r.tags.indexOf("名菜") >= 0 ? '<span class="chip chip-fame">名菜</span>' : "") +
          (seasonsOf(r.name).length ? '<span class="chip chip-season">' + seasonsOf(r.name).join("/") + "令</span>" : "") +
          (townOf(r.name) ? '<span class="chip chip-town">' + townOf(r.name) + "</span>" : "") +
          fastChip(r) +
        "</div>" +
        "<h3 class='card-name'>" + r.name + "</h3>" +
        "<p class='card-desc'>" + r.desc + "</p>" +
        '<div class="card-meta">' + diffHtml(r.diff) +
          '<span class="card-time"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' + r.time + "</span>" +
          (remote ? '<span class="chip chip-remote" title="食材在普通超市/菜市场即可获得">🏠 外地可做</span>' : "") +
        "</div>" +
      "</article>"
    );
  }

  function renderGrid() {
    var list = filtered();
    var grid = document.getElementById("grid");
    var countEl = document.getElementById("resultCount");
    var emptyEl = document.getElementById("empty");
    grid.innerHTML = list.map(cardHtml).join("");
    if (countEl) countEl.textContent = "共 " + list.length + " 道";
    if (emptyEl) emptyEl.style.display = list.length ? "none" : "block";
    return list;
  }

  function renderPills() {
    var wrap = document.getElementById("catPills");
    if (!wrap) return;
    var counts = {};
    var remoteCount = 0;
    RECIPES.forEach(function (r) {
      counts[r.cat] = (counts[r.cat] || 0) + 1;
      if (isRemote(r.id)) remoteCount++;
    });
    var hintCount = document.getElementById("hintRemoteCount");
    if (hintCount) hintCount.textContent = remoteCount;
    var html =
      '<button class="pill' + (state.cat === "all" ? " active" : "") + '" data-cat="all">全部<span>' + RECIPES.length + "</span></button>";
    CAT_ORDER.forEach(function (k) {
      html +=
        '<button class="pill' + (state.cat === k ? " active" : "") + '" data-cat="' + k + '">' +
        CATS[k].emoji + " " + CATS[k].name + "<span>" + counts[k] + "</span></button>";
    });
    html +=
      '<button class="pill pill-remote' + (state.remote ? " active" : "") + '" data-remote="1" title="食材在普通超市/菜市场即可买到，不依赖慈溪本地特产">' +
      "🏠 外地可做<span>" + remoteCount + "</span></button>";
    var favN = CX.fav ? CX.fav.count() : 0;
    html +=
      '<button class="pill pill-fav' + (state.fav ? " active" : "") + '" data-fav="1" title="只看已收藏的菜">' +
      "❤️ 我的收藏<span>" + favN + "</span></button>";
    wrap.innerHTML = html;
    renderSeasonPills();
    renderTownPills();
    renderTimePills();
    renderToolPills();
    updateFilterToggleLabel();
    var qb = document.getElementById("quickBtn");
    if (qb) qb.classList.toggle("active", state.time === "t30" && state.tool === "base");
  }

  // 用时档：档位是累积的，所以「1 小时内」的计数包含更快的那几档
  function renderTimePills() {
    var wrap = document.getElementById("timePills");
    if (!wrap || typeof TIME_LEVELS === "undefined") return;
    var counts = {};
    var known = 0;
    RECIPES.forEach(function (r) {
      var v = timeVal(r.time);
      if (!v) return;
      known++;
      TIME_LEVELS.forEach(function (lv) {
        if (lv.max && v <= lv.max) counts[lv.k] = (counts[lv.k] || 0) + 1;
        if (lv.min && v >= lv.min) counts[lv.k] = (counts[lv.k] || 0) + 1;
      });
    });
    var html = '<button class="pill pill-time' + (state.time === "all" ? " active" : "") +
      '" data-time="all" title="不限用时">全部用时<span>' + known + "</span></button>";
    TIME_LEVELS.forEach(function (lv) {
      if (!counts[lv.k]) return;
      html += '<button class="pill pill-time' + (state.time === lv.k ? " active" : "") +
        '" data-time="' + lv.k + '" title="' + lv.label + '">' + lv.short +
        "<span>" + counts[lv.k] + "</span></button>";
    });
    wrap.innerHTML = html;
  }

  // 厨具：一口锅与不用开火互斥，要砂锅要蒸笼这类按「需要」计入，可重叠
  function renderToolPills() {
    var wrap = document.getElementById("toolPills");
    if (!wrap || !CX.tools || typeof TOOLS === "undefined") return;
    var counts = {};
    RECIPES.forEach(function (r) {
      if (CX.tools.nofire(r)) { counts.nofire = (counts.nofire || 0) + 1; return; }
      var t = CX.tools.of(r);
      if (!t.length) { counts.base = (counts.base || 0) + 1; return; }
      t.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
    });
    var html = '<button class="pill pill-tool' + (state.tool === "all" ? " active" : "") +
      '" data-tool="all" title="不限厨具">全部厨具<span>' + RECIPES.length + "</span></button>";
    (typeof TOOL_ORDER !== "undefined" ? TOOL_ORDER : []).forEach(function (k) {
      if (!counts[k] || !TOOLS[k]) return;
      var d = TOOLS[k];
      html += '<button class="pill pill-tool' + (state.tool === k ? " active" : "") +
        '" data-tool="' + k + '" title="' + d.note + '">' + d.emoji + " " + d.name +
        "<span>" + counts[k] + "</span></button>";
    });
    wrap.innerHTML = html;
  }

  function setFilterSub(open) {
    var sub = document.getElementById("filterSub");
    if (sub) sub.hidden = !open;
    var btn = document.getElementById("filterToggle");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    updateFilterToggleLabel();
  }

  function updateFilterToggleLabel() {
    var btn = document.getElementById("filterToggle");
    if (!btn) return;
    var sub = document.getElementById("filterSub");
    var open = sub ? !sub.hidden : true;
    var n = 0;
    ["season", "town", "time", "tool"].forEach(function (k) { if (state[k] !== "all") n++; });
    btn.textContent = open ? "收起筛选 ▲" : (n ? "更多筛选 ▼ · 已选 " + n + " 项" : "更多筛选 ▼");
  }

  // 30 分钟内能上桌的，卡片上给个闪电标
  function fastChip(r) {
    var v = timeVal(r.time);
    if (!v || v > 30) return "";
    return '<span class="chip chip-fast" title="30 分钟内能上桌">⚡ ' + r.time + "</span>";
  }

  function renderSeasonPills() {
    var wrap = document.getElementById("seasonPills");
    if (!wrap) return;
    if (typeof SEASON_MAP === "undefined") { wrap.innerHTML = ""; return; }
    var counts = {};
    RECIPES.forEach(function (r) {
      seasonsOf(r.name).forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
    });
    var total = RECIPES.filter(function (r) { return seasonsOf(r.name).length; }).length;
    var html = '<button class="pill pill-season' + (state.season === "all" ? " active" : "") +
      '" data-season="all" title="只看时令性明确的菜">全部时令<span>' + total + "</span></button>";
    (typeof SEASON_ORDER !== "undefined" ? SEASON_ORDER : []).forEach(function (s) {
      if (!counts[s]) return;
      html += '<button class="pill pill-season' + (state.season === s ? " active" : "") +
        '" data-season="' + s + '" title="' + s + '令上市的时令菜">' + s + "令<span>" + counts[s] + "</span></button>";
    });
    wrap.innerHTML = html;
  }

  function renderTownPills() {
    var wrap = document.getElementById("townPills");
    if (!wrap) return;
    if (typeof TOWN_MAP === "undefined") { wrap.innerHTML = ""; return; }
    var counts = {};
    RECIPES.forEach(function (r) {
      var t = townOf(r.name);
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    var total = RECIPES.filter(function (r) { return townOf(r.name); }).length;
    var html = '<button class="pill pill-town' + (state.town === "all" ? " active" : "") +
      '" data-town="all" title="只看出处可考的乡镇代表菜">全部乡镇<span>' + total + "</span></button>";
    (typeof TOWN_ORDER !== "undefined" ? TOWN_ORDER : []).forEach(function (t) {
      if (!counts[t]) return;
      html += '<button class="pill pill-town' + (state.town === t ? " active" : "") +
        '" data-town="' + t + '" title="' + t + '的代表菜">' + t + "<span>" + counts[t] + "</span></button>";
    });
    wrap.innerHTML = html;
  }

  function renderSeasonStrip() {
    var strip = document.getElementById("seasonStrip");
    if (!strip) return;
    if (typeof MONTH_MAP === "undefined") { strip.hidden = true; return; }
    var m = new Date().getMonth() + 1;
    var list = RECIPES.filter(function (r) { return monthsOf(r.name).indexOf(m) >= 0; });
    if (!list.length) { strip.hidden = true; return; }
    var season = seasonOfMonth(m);
    var badge = document.getElementById("seasonStripBadge");
    if (badge) badge.textContent = m + " 月 · " + season + "令";
    var text = document.getElementById("seasonStripText");
    if (text) {
      text.innerHTML = "眼下正是 <b>" + m + " 月</b> 当令的时候，慈溪人桌上常有这 <b>" + list.length + "</b> 道，点菜名可直接看做法。";
    }
    var items = document.getElementById("seasonStripItems");
    var show = list.slice(0, 24);
    if (items) {
      var html = show.map(function (r) {
        return '<button type="button" class="season-chip" data-id="' + r.id + '">' + r.emoji + " " + r.name + "</button>";
      }).join("");
      if (list.length > show.length) {
        html += '<span class="season-chip" style="cursor:default">……等 ' + list.length + " 道</span>";
      }
      items.innerHTML = html;
      items.querySelectorAll(".season-chip[data-id]").forEach(function (b) {
        b.addEventListener("click", function () { openModal(parseInt(b.dataset.id, 10), filtered()); });
      });
    }
    var more = document.getElementById("seasonStripMore");
    if (more) {
      var seasonTotal = RECIPES.filter(function (r) { return seasonsOf(r.name).indexOf(season) >= 0; }).length;
      more.hidden = false;
      more.textContent = "查看" + season + "令全部 " + seasonTotal + " 道 →";
      more.onclick = function () {
        state.season = season;
        renderPills();
        renderGrid();
        var sec = document.getElementById("recipes");
        if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    }
    strip.hidden = false;
  }

  function byIdMap() {
    var m = {};
    RECIPES.forEach(function (r) { m[r.id] = r; });
    return m;
  }

  function renderCurIngredients() {
    if (!curRecipe) return;
    var el = document.getElementById("modalIng");
    var factor = curServe / 2;
    var list = CX.scale ? CX.scale.list(curRecipe.ingredients, factor) : curRecipe.ingredients;
    el.innerHTML = list.map(function (x) { return "<li>" + x + "</li>"; }).join("");
  }

  function renderCurNutrition() {
    var el = document.getElementById("modalNutri");
    if (!el) return;
    if (!curRecipe || !CX.nutrition || !CX.nutrition.calc) { el.style.display = "none"; return; }
    var n = CX.nutrition.calc(curRecipe);
    if (!n || !n.matched || !n.matched.length) { el.style.display = "none"; return; }
    el.style.display = "flex";
    el.innerHTML =
      '<span>参考热量 <b>' + n.kcal + '</b> 千卡</span>' +
      '<span>蛋白质 <b>' + n.p + '</b>g</span>' +
      '<span>脂肪 <b>' + n.f + '</b>g</span>' +
      '<span>碳水 <b>' + n.c + '</b>g</span>' +
      '<span class="nut-note">按主要食材估算（整道菜），仅供参考，未计入油盐酱料与烹饪损耗。</span>';
  }

  function updateFavBtn() {
    var btn = document.getElementById("mFav");
    if (!btn) return;
    var on = curRecipe && CX.fav && CX.fav.is(curRecipe.id);
    btn.innerHTML = (on ? "♥ " : "♡ ") + (on ? "已收藏" : "收藏");
    btn.classList.toggle("on", !!on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function updateServePills() {
    var wrap = document.getElementById("servePills");
    if (!wrap) return;
    wrap.querySelectorAll(".serve-pill").forEach(function (b) {
      b.classList.toggle("active", parseInt(b.dataset.s, 10) === curServe);
    });
  }

  // 购物清单的两种看法：按采购分区（一站一站买），或按处理方式（回家先泡哪个）
  var shopView = "food";

  function renderShopList() {
    var ids = CX.shop ? CX.shop.get() : [];
    var countEl = document.getElementById("shopCount");
    if (countEl) countEl.textContent = ids.length;
    var listEl = document.getElementById("shopList");
    var emptyEl = document.getElementById("shopEmpty");
    var subEl = document.getElementById("shopSub");
    if (!listEl) return;
    var byId = byIdMap();
    var prep = shopView === "prep";
    var groups = CX.shop ? (prep ? CX.shop.aggregatePrep(byId) : CX.shop.aggregate(byId)) : [];
    var total = 0;
    groups.forEach(function (g) { total += g.items.length; });
    if (total) {
      listEl.innerHTML = groups.map(function (g) {
        var rows = g.items.map(function (it) {
          var cnt = it.count > 1 ? '<span class="sl-count">×' + it.count + "</span>" : "";
          var tip = it.tip ? '<span class="sl-tip">' + it.tip + "</span>" : "";
          return '<li><span class="sl-text">' + it.text + "</span>" + tip + cnt + "</li>";
        }).join("");
        var cls = "shop-group" + (g.tag === "seasoning" ? " is-seasoning" : g.tag === "other" ? " is-other" : "");
        return '<div class="' + cls + '">' +
          '<div class="shop-group-title">' + g.label + " <span>" + g.items.length + " 项</span>" +
          (g.hint ? '<em class="shop-group-hint">' + g.hint + "</em>" : "") + "</div>" +
          '<ul class="shop-items">' + rows + "</ul></div>";
      }).join("");
      listEl.style.display = "block";
      if (emptyEl) emptyEl.style.display = "none";
      if (subEl) {
        subEl.textContent = ids.length + " 道菜 · 共 " + total + " 项 · " + (prep ? "按处理方式" : "按采购分区");
      }
    } else {
      listEl.innerHTML = "";
      listEl.style.display = "none";
      if (emptyEl) emptyEl.style.display = "block";
      if (subEl) subEl.textContent = "已加入菜谱的食材汇总，也可以切到「本周菜单」排一周的菜";
    }
  }

  function toggleFavFromCard(id) {
    if (!CX.fav) return;
    CX.fav.toggle(id);
    renderGrid();
    renderPills();
    if (curRecipe && curRecipe.id === id) updateFavBtn();
  }

  function openModal(id, list) {
    var r = RECIPES.find(function (x) { return x.id === id; });
    if (!r) return;
    curRecipe = r;
    curServe = 2;
    var cat = CATS[r.cat];
    var idx = list.map(function (x) { return x.id; }).indexOf(id);
    var prevId = idx > 0 ? list[idx - 1].id : null;
    var nextId = idx < list.length - 1 ? list[idx + 1].id : null;

    document.getElementById("modalTitle").textContent = r.name;
    document.getElementById("modalEmoji").textContent = r.emoji;
    document.getElementById("modalCat").textContent = cat.name + " · " + DIFF_NAME[r.diff] + " · " + r.time;
    document.getElementById("modalDesc").textContent = r.desc;
    var remoteBadge = document.getElementById("modalRemote");
    if (remoteBadge) {
      if (isRemote(r.id)) {
        remoteBadge.className = "remote-badge ok";
        remoteBadge.innerHTML = "🏠 外地可做 · 食材在普通超市/菜市场即可买到";
      } else {
        remoteBadge.className = "remote-badge";
        remoteBadge.innerHTML = "📍 慈溪风味 · 含本地特色食材，外地可用替代或网购";
      }
      remoteBadge.style.display = "inline-flex";
    }
    var chipsHtml = r.tags
      .map(function (t) { return '<span class="tag">' + t + "</span>"; })
      .join("");
    seasonsOf(r.name).forEach(function (s) {
      chipsHtml += '<span class="tag tag-season">' + s + "令</span>";
    });
    if (townOf(r.name)) chipsHtml += '<span class="tag tag-town">' + townOf(r.name) + "</span>";
    document.getElementById("modalTags").innerHTML = chipsHtml;

    // 厨具提示：要什么家什，或者干脆不用开火
    var toolsEl = document.getElementById("modalTools");
    if (toolsEl) {
      var parts = [];
      if (CX.tools) {
        var tIds = CX.tools.of(r);
        if (CX.tools.nofire(r)) {
          parts.push('<span class="mt-chip mt-nofire">🥗 不用开火</span>');
        } else if (!tIds.length) {
          parts.push('<span class="mt-chip">🍳 只用一口锅</span>');
        }
        tIds.forEach(function (k) {
          var d = (typeof TOOLS !== "undefined") ? TOOLS[k] : null;
          if (d) parts.push('<span class="mt-chip mt-need">' + d.emoji + " " + d.name + "</span>");
        });
      }
      toolsEl.innerHTML = parts.join("");
      toolsEl.hidden = !parts.length;
    }
    document.getElementById("modalIng").innerHTML = "";
    renderCurIngredients();
    renderCurNutrition();
    updateFavBtn();
    updateServePills();
    renderPrep();

    // Schema.org 结构化数据（Recipe）
    if (CX.seo && CX.seo.recipe) CX.seo.recipe(r, cat.name);

    // 做法步骤（含变体 tab）
    var variants = r.variants || [];
    var tabsEl = document.getElementById("variantTabs");
    var stepsEl = document.getElementById("modalSteps");
    var renderSteps = function (stepsArr) {
      stepsEl.innerHTML = stepsArr
        .map(function (s, i) { return "<li><b>" + (i + 1) + "</b><p>" + s + "</p></li>"; })
        .join("");
    };
    if (variants.length) {
      var ORD = ["二", "三", "四", "五", "六", "七", "八"];
      var labels = ["做法一 · 常规"].concat(variants.map(function (v, i) {
        var n = ORD[i] || String(i + 2);
        return "做法" + n + " · " + String(v.label || "").replace(/^做法[一二三四五六七八\d]+\s*[·．.、]?\s*/, "");
      }));
      tabsEl.innerHTML = labels.map(function (lb, i) {
        return '<button type="button" class="variant-tab' + (i === 0 ? " active" : "") + '" data-v="' + i + '">' + lb + "</button>";
      }).join("");
      tabsEl.hidden = false;
      renderSteps(r.steps);
      tabsEl.querySelectorAll(".variant-tab").forEach(function (btn) {
        btn.addEventListener("click", function () {
          tabsEl.querySelectorAll(".variant-tab").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          var vi = parseInt(btn.dataset.v, 10);
          renderSteps(vi === 0 ? r.steps : variants[vi - 1].steps);
        });
      });
    } else {
      tabsEl.hidden = true;
      renderSteps(r.steps);
    }
    document.getElementById("modalTips").textContent = r.tips || "按个人口味调整盐糖用量。";
    document.getElementById("modalTips").style.display = r.tips ? "block" : "none";

    // 参考来源
    var refBox = document.getElementById("modalRefs");
    var refs = (typeof RECIPE_REFS !== "undefined" && RECIPE_REFS[r.id]) || [];
    var srcList = document.getElementById("modalRefList");
    if (refs.length) {
      srcList.innerHTML = refs.map(function (sid) {
        var s = SOURCE_LIB[sid];
        if (!s) return "";
        return '<li><a href="' + s.u + '" target="_blank" rel="noopener">' + s.t + "</a></li>";
      }).join("");
      refBox.style.display = "block";
    } else {
      refBox.style.display = "none";
    }

    var prevBtn = document.getElementById("prevBtn");
    var nextBtn = document.getElementById("nextBtn");
    prevBtn.style.visibility = prevId ? "visible" : "hidden";
    nextBtn.style.visibility = nextId ? "visible" : "hidden";
    prevBtn.dataset.id = prevId || "";
    nextBtn.dataset.id = nextId || "";

    document.getElementById("overlay").classList.add("open");
    document.body.classList.add("lock");
    try { history.replaceState(null, "", "#recipe-" + r.id); } catch (e) {}
  }

  function closeModal() {
    document.getElementById("overlay").classList.remove("open");
    document.body.classList.remove("lock");
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }

  function renderPrep() {
    var box = document.getElementById("prepSection");
    if (!box) return;
    if (!curRecipe || !CX.prep || !CX.prep.groups) { box.hidden = true; return; }
    var res = CX.prep.groups(curRecipe.ingredients) || { groups: [], lead: 0 };
    var groups = res.groups || [];
    if (!groups.length) { box.hidden = true; return; }
    var lead = document.getElementById("prepLead");
    if (lead) {
      lead.innerHTML = res.lead
        ? "有食材要提前动手，最久的是 <b>" + res.lead + " 分钟</b>。进门先把它泡上或养上，再回头切配，等的时间正好用。"
        : "食材洗净、切配、打散即可，按下面的顺序来。";
    }
    var wrap = document.getElementById("prepGroups");
    if (wrap) {
      wrap.innerHTML = groups.map(function (g) {
        var items = g.items.map(function (it) {
          return '<li><span class="prep-name">' + it.name + "</span>" +
            (it.tip ? '<span class="prep-tip">' + it.tip + "</span>" : "") + "</li>";
        }).join("");
        return '<div class="prep-group' + (g.g === "洗净备好" ? " is-plain" : "") + '">' +
          '<div class="prep-group-title">' + g.g +
          (g.hint ? "<span>" + g.hint + "</span>" : "") + "</div>" +
          '<ul class="prep-items">' + items + "</ul></div>";
      }).join("");
    }
    box.hidden = false;
  }

  /* ===== 做菜模式 ===== */
  var cookState = { steps: [], idx: 0, done: {}, timer: null, remain: 0, wake: null };
  var beepCtx = null;

  // 从步骤文字里读时长：「小火焖 20 分钟」「焯 30 秒」「炖 1 小时」
  function parseDuration(text) {
    var m = String(text || "").match(/(\d+(?:\.\d+)?)\s*(小时|钟头|分钟|分|秒钟|秒)/);
    if (!m) return 0;
    var n = parseFloat(m[1]);
    if (m[2] === "小时" || m[2] === "钟头") return Math.round(n * 3600);
    if (m[2] === "分钟" || m[2] === "分") return Math.round(n * 60);
    return Math.round(n);
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function beep(times) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!beepCtx) beepCtx = new AC();
      if (beepCtx.state === "suspended" && beepCtx.resume) beepCtx.resume();
      var t0 = beepCtx.currentTime, n = times || 3;
      for (var i = 0; i < n; i++) {
        var o = beepCtx.createOscillator(), g = beepCtx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, t0 + i * 0.45);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + i * 0.45 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.45 + 0.32);
        o.connect(g);
        g.connect(beepCtx.destination);
        o.start(t0 + i * 0.45);
        o.stop(t0 + i * 0.45 + 0.35);
      }
    } catch (e) { /* 不支持音频就静默 */ }
  }

  function keepAwake(on) {
    if (!navigator.wakeLock) return;
    if (on) {
      navigator.wakeLock.request("screen").then(function (l) { cookState.wake = l; }, function () {});
    } else if (cookState.wake) {
      try { cookState.wake.release(); } catch (e) {}
      cookState.wake = null;
    }
  }

  function stopCookTimer() {
    if (cookState.timer) { clearInterval(cookState.timer); cookState.timer = null; }
    var btn = document.getElementById("cookTimer");
    if (btn) {
      btn.classList.remove("running");
      var sec = parseDuration(cookState.steps[cookState.idx] || "");
      if (sec > 0) btn.textContent = "⏱ 计时 " + fmtTime(sec);
    }
  }

  function startCookTimer(sec) {
    stopCookTimer();
    cookState.remain = sec;
    var btn = document.getElementById("cookTimer");
    if (btn) btn.classList.add("running");
    var tick = function () {
      var b = document.getElementById("cookTimer");
      if (cookState.remain <= 0) {
        if (b) b.textContent = "⏱ 时间到";
        stopCookTimer();
        beep(4);
        return;
      }
      if (b) b.textContent = "⏱ " + fmtTime(cookState.remain) + "（点一下停）";
      cookState.remain -= 1;
    };
    tick();
    cookState.timer = setInterval(tick, 1000);
  }

  function renderCook() {
    var total = cookState.steps.length;
    if (!total) return;
    var i = cookState.idx;
    var no = document.getElementById("cookStepNo");
    if (no) no.textContent = "第 " + (i + 1) + " / " + total + " 步";
    var bar = document.getElementById("cookProgress");
    if (bar) bar.style.width = Math.round(((i + 1) / total) * 100) + "%";
    var text = cookState.steps[i];
    var stepEl = document.getElementById("cookText");
    if (stepEl) {
      stepEl.textContent = text;
      stepEl.classList.toggle("done", !!cookState.done[i]);
    }
    var sec = parseDuration(text);
    var timerBtn = document.getElementById("cookTimer");
    if (timerBtn) {
      timerBtn.hidden = sec <= 0;
      if (sec > 0) timerBtn.textContent = "⏱ 计时 " + fmtTime(sec);
    }
    var prev = document.getElementById("cookPrev");
    if (prev) prev.disabled = i === 0;
    var next = document.getElementById("cookNext");
    if (next) next.textContent = i === total - 1 ? "做完了 ✓" : "下一步 →";
    var dots = document.getElementById("cookDots");
    if (dots) {
      dots.innerHTML = cookState.steps.map(function (_, k) {
        return '<button type="button" class="cook-dot' + (k === i ? " on" : "") +
          (cookState.done[k] ? " done" : "") + '" data-k="' + k + '" aria-label="第 ' + (k + 1) + ' 步"></button>';
      }).join("");
      dots.querySelectorAll(".cook-dot").forEach(function (b) {
        b.addEventListener("click", function () {
          stopCookTimer();
          cookState.idx = parseInt(b.dataset.k, 10);
          renderCook();
        });
      });
    }
  }

  function openCook() {
    if (!curRecipe) return;
    var ov = document.getElementById("cookOverlay");
    if (!ov) return;
    var variants = curRecipe.variants || [];
    var tab = document.querySelector("#variantTabs .variant-tab.active");
    var vi = tab ? parseInt(tab.dataset.v, 10) : 0;
    cookState.steps = (vi > 0 && variants[vi - 1] ? variants[vi - 1].steps : curRecipe.steps || []).slice();
    if (!cookState.steps.length) return;
    cookState.idx = 0;
    cookState.done = {};
    var nameEl = document.getElementById("cookName");
    if (nameEl) nameEl.textContent = curRecipe.name;
    var vEl = document.getElementById("cookVariant");
    if (vEl) vEl.textContent = tab ? tab.textContent : "";
    if (beepCtx && beepCtx.state === "suspended" && beepCtx.resume) beepCtx.resume();
    ov.classList.add("open");
    document.body.classList.add("lock");
    renderCook();
    keepAwake(true);
  }

  function closeCook() {
    stopCookTimer();
    keepAwake(false);
    var ov = document.getElementById("cookOverlay");
    if (ov) ov.classList.remove("open");
    if (!document.getElementById("overlay").classList.contains("open")) {
      document.body.classList.remove("lock");
    }
  }

  function cookGo(d) {
    var total = cookState.steps.length;
    var n = cookState.idx + d;
    if (n < 0) return;
    if (n >= total) {
      for (var k = 0; k < total; k++) cookState.done[k] = true;
      stopCookTimer();
      renderCook();
      keepAwake(false);
      var next = document.getElementById("cookNext");
      if (next) next.textContent = "全部完成 ✓";
      return;
    }
    if (d > 0) cookState.done[cookState.idx] = true;
    stopCookTimer();
    cookState.idx = n;
    renderCook();
  }

  /* ===== 本地叫法词典 ===== */
  var dialectGroup = "all";
  var dialectQuery = "";

  function dialectDishCount(term) {
    if (!term) return 0;
    var q = term.toLowerCase();
    return RECIPES.filter(function (r) { return hayOf(r).indexOf(q) >= 0; }).length;
  }

  function renderDialectPills() {
    var wrap = document.getElementById("dialectPills");
    if (!wrap || typeof DIALECT === "undefined") return;
    var counts = {};
    DIALECT.forEach(function (e) { counts[e.g] = (counts[e.g] || 0) + 1; });
    var html = '<button class="pill' + (dialectGroup === "all" ? " active" : "") +
      '" data-dg="all">全部<span>' + DIALECT.length + "</span></button>";
    DIALECT_GROUP_ORDER.forEach(function (g) {
      if (!counts[g]) return;
      html += '<button class="pill' + (dialectGroup === g ? " active" : "") +
        '" data-dg="' + g + '">' + g + "<span>" + counts[g] + "</span></button>";
    });
    wrap.innerHTML = html;
  }

  function renderDialectList() {
    var host = document.getElementById("dialectList");
    if (!host || typeof DIALECT === "undefined") return;
    var q = dialectQuery.trim().toLowerCase();
    var list = DIALECT.filter(function (e) {
      if (dialectGroup !== "all" && e.g !== dialectGroup) return false;
      if (!q) return true;
      var hay = (e.t + " " + e.s + " " + (e.a || []).join(" ") + " " + e.n + " " + e.sc).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    if (!list.length) {
      host.innerHTML = '<div class="ing-empty">没找到这个说法，换个词试试。</div>';
      return;
    }
    host.innerHTML = list.map(function (e) {
      var n = dialectDishCount(e.t);
      var alt = (e.a && e.a.length) ? '<span class="dl-alt">也作 ' + e.a.join("、") + "</span>" : "";
      return '<article class="dl-card">' +
        '<div class="dl-head"><b>' + e.t + "</b>" +
        '<span class="dl-std">' + e.s + "</span>" +
        '<span class="dl-sc">' + e.sc + "</span></div>" +
        alt +
        '<p class="dl-note">' + e.n + "</p>" +
        '<div class="dl-foot">' +
        (n ? '<button type="button" class="dl-go" data-q="' + e.t + '">看用得上它的 ' + n + " 道菜 →</button>"
           : '<span class="dl-none">菜谱里暂时还没有它</span>') +
        (e.u ? '<a href="' + e.u + '" target="_blank" rel="noopener">' + e.st + "</a>" : "") +
        "</div></article>";
    }).join("");
    host.querySelectorAll(".dl-go").forEach(function (b) {
      b.addEventListener("click", function () {
        state.kw = b.dataset.q;
        var search = document.getElementById("searchInput");
        if (search) search.value = b.dataset.q;
        var ov = document.getElementById("dialectOverlay");
        if (ov) ov.classList.remove("open");
        if (!document.getElementById("overlay").classList.contains("open")) {
          document.body.classList.remove("lock");
        }
        renderGrid();
        var sec = document.getElementById("recipes");
        if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ===== 本周菜单 ===== */
  var weekPickDay = "";

  function renderWeek() {
    var host = document.getElementById("weekDays");
    if (!host || !CX.week) return;
    var w = CX.week.get();
    var byId = byIdMap();
    host.innerHTML = CX.week.days.map(function (d) {
      var ids = w[d] || [];
      var chips = ids.map(function (id) {
        var r = byId[id];
        if (!r) return "";
        return '<span class="week-chip"><b data-open="' + id + '">' + r.name + "</b>" +
          '<i data-del="' + id + '" data-day="' + d + '" title="移出这天">×</i></span>';
      }).join("");
      return '<div class="week-day"><div class="week-day-name">' + d + "</div>" +
        '<div class="week-day-body">' + (chips || '<span class="week-empty">还没安排</span>') +
        '<button class="week-add" type="button" data-day="' + d + '">+ 加菜</button></div></div>';
    }).join("");
    host.querySelectorAll(".week-chip b[data-open]").forEach(function (b) {
      b.addEventListener("click", function () { openModal(parseInt(b.dataset.open, 10), RECIPES); });
    });
    host.querySelectorAll(".week-chip i[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        CX.week.remove(b.dataset.day, parseInt(b.dataset.del, 10));
        renderWeek();
      });
    });
    host.querySelectorAll(".week-add").forEach(function (b) {
      b.addEventListener("click", function () { openWeekPicker(b.dataset.day); });
    });
    var n = CX.week.ids().length;
    var sub = document.getElementById("weekSummary");
    if (sub) sub.textContent = n ? "本周已排 " + n + " 道菜，合并后可一次买齐" : "还没排菜，点下面任一天的「+ 加菜」开始";
  }

  function openWeekPicker(day) {
    weekPickDay = day;
    var picker = document.getElementById("weekPicker");
    var label = document.getElementById("weekPickLabel");
    if (label) label.textContent = "往「" + day + "」里加菜";
    if (picker) picker.hidden = false;
    var input = document.getElementById("weekSearch");
    if (input) { input.value = ""; input.focus(); }
    renderWeekPicker();
  }

  function renderWeekPicker() {
    var host = document.getElementById("weekPickerList");
    if (!host) return;
    var q = (document.getElementById("weekSearch").value || "").trim().toLowerCase();
    var list = RECIPES.filter(function (r) { return !q || hayOf(r).indexOf(q) >= 0; }).slice(0, 60);
    if (!list.length) {
      host.innerHTML = '<div class="ing-empty">没找到，换个词试试。</div>';
      return;
    }
    host.innerHTML = list.map(function (r) {
      return '<button type="button" class="wp-item" data-id="' + r.id + '">' +
        '<span class="ih-emoji">' + r.emoji + "</span>" + r.name +
        '<span class="ih-cat">' + CATS[r.cat].name + "</span></button>";
    }).join("");
    host.querySelectorAll(".wp-item").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!weekPickDay) return;
        CX.week.add(weekPickDay, parseInt(b.dataset.id, 10));
        var picker = document.getElementById("weekPicker");
        if (picker) picker.hidden = true;
        weekPickDay = "";
        renderWeek();
      });
    });
  }

  function weekMenuText() {
    var w = CX.week.get();
    var byId = byIdMap();
    var lines = ["慈溪味 · 本周菜单"];
    var total = 0;
    CX.week.days.forEach(function (d) {
      var ids = w[d] || [];
      if (!ids.length) return;
      var names = ids.map(function (id) {
        var r = byId[id];
        if (!r) return "";
        total++;
        return r.name + "（" + r.time + "）";
      }).filter(Boolean);
      lines.push("");
      lines.push("【" + d + "】");
      names.forEach(function (n) { lines.push("· " + n); });
    });
    if (!total) return "";
    lines.push("");
    lines.push("共 " + total + " 道 · 出自「慈溪味 · 慈溪菜菜谱大全」");
    return lines.join("\n");
  }

  function randomPick() {
    var list = filtered();
    var pool = list.length ? list : RECIPES;
    var r = pool[Math.floor(Math.random() * pool.length)];
    openModal(r.id, list.length ? list : RECIPES);
  }

  function bind() {
    var grid = document.getElementById("grid");
    grid.addEventListener("click", function (e) {
      var favBtn = e.target.closest(".card-fav");
      if (favBtn) {
        e.stopPropagation();
        toggleFavFromCard(parseInt(favBtn.dataset.fav, 10));
        return;
      }
      var card = e.target.closest(".card");
      if (card) openModal(parseInt(card.dataset.id, 10), filtered());
    });

    document.getElementById("catPills").addEventListener("click", function (e) {
      var btn = e.target.closest(".pill");
      if (!btn) return;
      if (btn.dataset.remote) {
        state.remote = !state.remote;
      } else if (btn.dataset.fav) {
        state.fav = !state.fav;
      } else {
        state.cat = btn.dataset.cat;
      }
      renderPills();
      renderGrid();
    });

    var seasonWrap = document.getElementById("seasonPills");
    if (seasonWrap) {
      seasonWrap.addEventListener("click", function (e) {
        var btn = e.target.closest(".pill");
        if (!btn) return;
        state.season = btn.dataset.season;
        renderPills();
        renderGrid();
      });
    }

    var townWrap = document.getElementById("townPills");
    if (townWrap) {
      townWrap.addEventListener("click", function (e) {
        var btn = e.target.closest(".pill");
        if (!btn) return;
        state.town = btn.dataset.town;
        renderPills();
        renderGrid();
      });
    }

    var timeWrap = document.getElementById("timePills");
    if (timeWrap) {
      timeWrap.addEventListener("click", function (e) {
        var btn = e.target.closest(".pill");
        if (!btn) return;
        state.time = btn.dataset.time;
        renderPills();
        renderGrid();
      });
    }

    var toolWrap = document.getElementById("toolPills");
    if (toolWrap) {
      toolWrap.addEventListener("click", function (e) {
        var btn = e.target.closest(".pill");
        if (!btn) return;
        state.tool = btn.dataset.tool;
        renderPills();
        renderGrid();
      });
    }

    // 折叠「更多筛选」，窄屏默认收起，免得筛选条占掉半个屏幕
    var filterToggle = document.getElementById("filterToggle");
    if (filterToggle) {
      setFilterSub(window.innerWidth > 720);
      filterToggle.addEventListener("click", function () {
        var sub = document.getElementById("filterSub");
        setFilterSub(sub ? sub.hidden : true);
      });
    }

    // 下班快手菜：30 分钟内、只用一口锅，按用时从短到长排
    var quickBtn = document.getElementById("quickBtn");
    if (quickBtn) {
      quickBtn.addEventListener("click", function () {
        var on = state.time === "t30" && state.tool === "base";
        if (on) {
          state.time = "all";
          state.tool = "all";
        } else {
          state.time = "t30";
          state.tool = "base";
          state.sort = "time";
          sort.value = "time";
          setFilterSub(true);
        }
        renderPills();
        renderGrid();
      });
    }

    var search = document.getElementById("searchInput");
    search.addEventListener("input", function () {
      state.kw = search.value;
      renderGrid();
    });

    var sort = document.getElementById("sortSelect");
    sort.addEventListener("change", function () {
      state.sort = sort.value;
      renderGrid();
    });

    document.getElementById("overlay").addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });
    document.getElementById("closeModal").addEventListener("click", closeModal);

    document.addEventListener("keydown", function (e) {
      // 做菜模式 / 叫法词典打开时，方向键与 Esc 交给上面那一层处理
      var topCook = document.getElementById("cookOverlay");
      if (topCook && topCook.classList.contains("open")) return;
      var topDia = document.getElementById("dialectOverlay");
      if (topDia && topDia.classList.contains("open")) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") {
        var p = document.getElementById("prevBtn");
        if (p && p.dataset.id) openModal(parseInt(p.dataset.id, 10), filtered());
      }
      if (e.key === "ArrowRight") {
        var n = document.getElementById("nextBtn");
        if (n && n.dataset.id) openModal(parseInt(n.dataset.id, 10), filtered());
      }
    });

    var prevBtn = document.getElementById("prevBtn");
    var nextBtn = document.getElementById("nextBtn");
    prevBtn.addEventListener("click", function () {
      if (prevBtn.dataset.id) openModal(parseInt(prevBtn.dataset.id, 10), filtered());
    });
    nextBtn.addEventListener("click", function () {
      if (nextBtn.dataset.id) openModal(parseInt(nextBtn.dataset.id, 10), filtered());
    });
    document.getElementById("randomBtn").addEventListener("click", randomPick);
    document.getElementById("randomHero").addEventListener("click", randomPick);
    document.getElementById("resetBtn").addEventListener("click", function () {
      state.kw = ""; state.cat = "all"; state.sort = "default"; state.remote = false; state.fav = false;
      state.season = "all"; state.town = "all"; state.time = "all"; state.tool = "all";
      search.value = ""; sort.value = "default";
      renderPills();
      renderGrid();
    });

    var hintToggle = document.getElementById("hintToggle");
    var hintDetail = document.getElementById("hintDetail");
    if (hintToggle && hintDetail) {
      hintToggle.addEventListener("click", function () {
        var show = hintDetail.hidden;
        hintDetail.hidden = !show;
        hintToggle.textContent = show ? "收起判定标准" : "查看判定标准";
        hintToggle.setAttribute("aria-expanded", show ? "true" : "false");
      });
    }

    var backTop = document.getElementById("backTop");
    window.addEventListener("scroll", function () {
      backTop.classList.toggle("show", window.scrollY > 600);
    });
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var t = document.querySelector(a.getAttribute("href"));
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth" }); }
      });
    });

    // ===== 收藏 / 人数换算 / 购物清单 / 食材找菜 =====
    var mFav = document.getElementById("mFav");
    if (mFav) {
      mFav.addEventListener("click", function () {
        if (curRecipe && CX.fav) {
          CX.fav.toggle(curRecipe.id);
          updateFavBtn();
          renderGrid();
          renderPills();
        }
      });
    }

    var mShop = document.getElementById("mShop");
    if (mShop) {
      mShop.addEventListener("click", function () {
        if (curRecipe && CX.shop) {
          CX.shop.add(curRecipe.id);
          renderShopList();
          mShop.textContent = "✅ 已加入";
          setTimeout(function () { mShop.textContent = "🧺 加入购物清单"; }, 1200);
        }
      });
    }

    var servePills = document.getElementById("servePills");
    if (servePills) {
      servePills.addEventListener("click", function (e) {
        var b = e.target.closest(".serve-pill");
        if (!b) return;
        curServe = parseInt(b.dataset.s, 10);
        updateServePills();
        renderCurIngredients();
      });
    }

    // 有什么吃什么（多食材反查：说出家里有的，列出能做的，并标出差哪几样）
    var ingOverlay = document.getElementById("ingOverlay");
    var ingInput = document.getElementById("ingInput");
    var ingKeywords = document.getElementById("ingKeywords");
    var ingResult = document.getElementById("ingResult");
    var ingTokensEl = document.getElementById("ingTokens");
    var ingReady = document.getElementById("ingReady");
    var pantryTokens = [];
    var pantryReadyOnly = false;

    function pantryMerge(list) {
      list.forEach(function (t) {
        t = String(t || "").trim();
        if (t && pantryTokens.indexOf(t) < 0) pantryTokens.push(t);
      });
    }
    function renderPantryTokens() {
      if (!ingTokensEl) return;
      if (!pantryTokens.length) {
        ingTokensEl.innerHTML = '<span class="ing-tokens-hint">还没选食材，输入或用下面的常用食材</span>';
        return;
      }
      ingTokensEl.innerHTML = pantryTokens.map(function (t) {
        return '<span class="ing-token">' + t + '<i data-t="' + t + '" title="去掉">×</i></span>';
      }).join("") + '<button type="button" class="ing-token-clear" id="ingTokenClear">清空</button>';
      ingTokensEl.querySelectorAll("i[data-t]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = pantryTokens.indexOf(b.dataset.t);
          if (i >= 0) pantryTokens.splice(i, 1);
          renderPantryTokens();
          renderIngResult();
        });
      });
      var c = document.getElementById("ingTokenClear");
      if (c) {
        c.addEventListener("click", function () {
          pantryTokens = [];
          renderPantryTokens();
          renderIngResult();
        });
      }
    }
    function pantryTokensNow() {
      var typed = (CX.pantry && CX.pantry.split) ? CX.pantry.split(ingInput.value) : [];
      var all = pantryTokens.concat(typed), out = [];
      all.forEach(function (t) { if (t && out.indexOf(t) < 0) out.push(t); });
      return out;
    }
    if (ingOverlay) {
      document.getElementById("ingOpen").addEventListener("click", function () {
        ingOverlay.classList.add("open");
        document.body.classList.add("lock");
        renderIngKeywords();
        renderPantryTokens();
        renderIngResult();
        setTimeout(function () { ingInput.focus(); }, 60);
      });
      document.getElementById("ingClose").addEventListener("click", closeIng);
      ingOverlay.addEventListener("click", function (e) { if (e.target === this) closeIng(); });
      // 敲到空格、顿号、逗号就当成一个食材收下，继续输下一个
      ingInput.addEventListener("input", function () {
        if (/[\s、，,+＋\/／;；]$/.test(ingInput.value)) {
          pantryMerge(CX.pantry.split(ingInput.value));
          ingInput.value = "";
          renderPantryTokens();
        }
        renderIngResult();
      });
      ingInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          pantryMerge(CX.pantry.split(ingInput.value));
          ingInput.value = "";
          renderPantryTokens();
          renderIngResult();
        }
      });
      if (ingReady) {
        ingReady.addEventListener("click", function () {
          pantryReadyOnly = !pantryReadyOnly;
          ingReady.classList.toggle("active", pantryReadyOnly);
          ingReady.setAttribute("aria-pressed", pantryReadyOnly ? "true" : "false");
          renderIngResult();
        });
      }
    }
    function closeIng() {
      ingOverlay.classList.remove("open");
      document.body.classList.remove("lock");
    }
    function renderIngKeywords() {
      if (!ingKeywords) return;
      var kws = CX.ing && CX.ing.mainKeywords ? CX.ing.mainKeywords() : [];
      var scores = {};
      RECIPES.forEach(function (r) {
        var text = (r.ingredients || []).join(" ");
        kws.forEach(function (k) {
          if (text.indexOf(k) >= 0) scores[k] = (scores[k] || 0) + 1;
        });
      });
      var popular = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; }).slice(0, 30);
      ingKeywords.innerHTML = popular.map(function (k) {
        return '<button type="button" class="ing-kw">' + k + "</button>";
      }).join("");
      ingKeywords.querySelectorAll(".ing-kw").forEach(function (btn) {
        btn.addEventListener("click", function () {
          pantryMerge([btn.textContent]);
          renderPantryTokens();
          renderIngResult();
        });
      });
    }
    function renderIngResult() {
      if (!ingResult) return;
      var tokens = pantryTokensNow();
      if (!tokens.length) {
        ingResult.innerHTML = '<div class="ing-empty">把家里现有的食材写进来，看看能凑出什么菜。多个食材用空格隔开，比如「蛎黄 年糕 雪菜」。</div>';
        return;
      }
      var hits = (CX.pantry && CX.pantry.find) ? CX.pantry.find(RECIPES, tokens) : [];
      var readyN = hits.filter(function (h) { return !h.miss.length; }).length;
      if (pantryReadyOnly) hits = hits.filter(function (h) { return !h.miss.length; });
      if (!hits.length) {
        ingResult.innerHTML = '<div class="ing-empty">用「' + tokens.join("、") + '」还凑不出菜，' +
          (pantryReadyOnly ? "关掉「只看能做的」再挑挑看。" : "减少一两样或换个食材试试。") + "</div>";
        return;
      }
      var head = '<div class="ing-stat">用「' + tokens.join("、") + '」能碰到 ' + hits.length + " 道" +
        (readyN ? "，其中 <b>" + readyN + "</b> 道现在就能做" : "") + "</div>";
      var shown = hits.slice(0, 80);
      ingResult.innerHTML = head + shown.map(function (h) {
        var r = h.r;
        var line = h.miss.length
          ? '<span class="ih-miss">还差 ' + h.miss.join("、") + "</span>"
          : '<span class="ih-ready">主料齐了</span>';
        return '<button type="button" class="ing-hit' + (h.miss.length ? "" : " is-ready") + '" data-id="' + r.id + '">' +
          '<span class="ih-emoji">' + r.emoji + "</span>" +
          '<span class="ih-body"><span class="ih-name">' + r.name + "</span>" + line + "</span>" +
          '<span class="ih-score">有 ' + h.have.length + "/" + h.total + "</span></button>";
      }).join("");
      ingResult.querySelectorAll(".ing-hit").forEach(function (btn) {
        btn.addEventListener("click", function () {
          closeIng();
          openModal(parseInt(btn.dataset.id, 10), RECIPES);
        });
      });
    }

    // 购物清单 / 本周菜单
    var shopOverlay = document.getElementById("shopOverlay");
    var shopTab = "list";
    function switchShopTab(tab) {
      shopTab = tab;
      var isList = tab === "list";
      var paneList = document.getElementById("shopPaneList");
      var paneWeek = document.getElementById("shopPaneWeek");
      var actsList = document.getElementById("shopActionsList");
      var actsWeek = document.getElementById("shopActionsWeek");
      var tabList = document.getElementById("shopTabList");
      var tabWeek = document.getElementById("shopTabWeek");
      if (paneList) paneList.hidden = !isList;
      if (paneWeek) paneWeek.hidden = isList;
      if (actsList) actsList.hidden = !isList;
      if (actsWeek) actsWeek.hidden = isList;
      if (tabList) tabList.classList.toggle("active", isList);
      if (tabWeek) tabWeek.classList.toggle("active", !isList);
      if (isList) renderShopList(); else renderWeek();
    }
    if (shopOverlay) {
      document.getElementById("shopOpen").addEventListener("click", function () {
        renderShopList();
        renderWeek();
        shopOverlay.classList.add("open");
        document.body.classList.add("lock");
      });
      document.getElementById("shopClose").addEventListener("click", closeShop);
      shopOverlay.addEventListener("click", function (e) { if (e.target === this) closeShop(); });
      document.getElementById("shopTabList").addEventListener("click", function () { switchShopTab("list"); });
      document.getElementById("shopTabWeek").addEventListener("click", function () { switchShopTab("week"); });
      document.getElementById("shopClear").addEventListener("click", function () {
        if (CX.shop) CX.shop.clear();
        renderShopList();
      });
      document.getElementById("shopCopy").addEventListener("click", copyShopList);
      var shopViewBtn = document.getElementById("shopView");
      if (shopViewBtn) {
        shopViewBtn.addEventListener("click", function () {
          shopView = shopView === "prep" ? "food" : "prep";
          shopViewBtn.textContent = shopView === "prep" ? "🧾 按采购分区" : "🥢 按处理方式";
          renderShopList();
        });
      }
      var weekSearch = document.getElementById("weekSearch");
      if (weekSearch) weekSearch.addEventListener("input", renderWeekPicker);
      var weekClearBtn = document.getElementById("weekClear");
      if (weekClearBtn) {
        weekClearBtn.addEventListener("click", function () {
          if (CX.week) CX.week.clear();
          renderWeek();
        });
      }
      var weekMergeBtn = document.getElementById("weekMerge");
      if (weekMergeBtn) {
        weekMergeBtn.addEventListener("click", function () {
          var ids = CX.week ? CX.week.ids() : [];
          if (!ids.length) return;
          CX.shop.addMany(ids);
          switchShopTab("list");
          weekMergeBtn.textContent = "✅ 已并入清单";
          setTimeout(function () { weekMergeBtn.textContent = "🧺 合并成采购单"; }, 1400);
        });
      }
      var weekCopyBtn = document.getElementById("weekCopy");
      if (weekCopyBtn) {
        weekCopyBtn.addEventListener("click", function () {
          var text = weekMenuText();
          if (!text) return;
          copyText(text, weekCopyBtn, "📋 复制菜单");
        });
      }
    }
    function closeShop() {
      shopOverlay.classList.remove("open");
      document.body.classList.remove("lock");
    }
    function copyText(text, btn, restore) {
      var done = function () {
        if (btn) {
          btn.textContent = "✅ 已复制";
          setTimeout(function () { btn.textContent = restore; }, 1200);
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    }
    function copyShopList() {
      var byId = byIdMap();
      var prep = shopView === "prep";
      var groups = CX.shop ? (prep ? CX.shop.aggregatePrep(byId) : CX.shop.aggregate(byId)) : [];
      var total = 0;
      groups.forEach(function (g) { total += g.items.length; });
      if (!total) return;
      var text = groups.map(function (g) {
        var lines = ["【" + g.label + "】" + (prep && g.hint ? "（" + g.hint + "）" : "")];
        g.items.forEach(function (it) {
          lines.push("□ " + it.text + (it.count > 1 ? " ×" + it.count : "") +
            (prep && it.tip ? "  —— " + it.tip : ""));
        });
        return lines.join("\n");
      }).join("\n\n");
      copyText("慈溪味 · 采购清单\n\n" + text, document.getElementById("shopCopy"), "📋 复制清单");
    }
    function fallbackCopy(text, done) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }

    // ===== 做菜模式 =====
    var cookOverlay = document.getElementById("cookOverlay");
    var mCook = document.getElementById("mCook");
    if (mCook) mCook.addEventListener("click", openCook);
    if (cookOverlay) {
      document.getElementById("cookClose").addEventListener("click", closeCook);
      document.getElementById("cookPrev").addEventListener("click", function () { cookGo(-1); });
      document.getElementById("cookNext").addEventListener("click", function () { cookGo(1); });
      var cookText = document.getElementById("cookText");
      if (cookText) {
        cookText.addEventListener("click", function () {
          var i = cookState.idx;
          cookState.done[i] = !cookState.done[i];
          renderCook();
        });
      }
      var cookTimerBtn = document.getElementById("cookTimer");
      if (cookTimerBtn) {
        cookTimerBtn.addEventListener("click", function () {
          var sec = parseDuration(cookState.steps[cookState.idx] || "");
          if (!sec) return;
          if (cookState.timer) { stopCookTimer(); return; }
          startCookTimer(sec);
        });
      }
      document.addEventListener("keydown", function (e) {
        if (!cookOverlay.classList.contains("open")) return;
        if (e.key === "ArrowRight") cookGo(1);
        else if (e.key === "ArrowLeft") cookGo(-1);
      });
    }

    // ===== 本地叫法词典 =====
    var dialectOverlay = document.getElementById("dialectOverlay");
    function closeDialect() {
      dialectOverlay.classList.remove("open");
      document.body.classList.remove("lock");
    }
    if (dialectOverlay) {
      document.getElementById("dialectOpen").addEventListener("click", function () {
        renderDialectPills();
        renderDialectList();
        dialectOverlay.classList.add("open");
        document.body.classList.add("lock");
      });
      document.getElementById("dialectClose").addEventListener("click", closeDialect);
      dialectOverlay.addEventListener("click", function (e) { if (e.target === this) closeDialect(); });
      var dPills = document.getElementById("dialectPills");
      if (dPills) {
        dPills.addEventListener("click", function (e) {
          var b = e.target.closest(".pill");
          if (!b) return;
          dialectGroup = b.dataset.dg;
          renderDialectPills();
          renderDialectList();
        });
      }
      var dInput = document.getElementById("dialectInput");
      if (dInput) {
        dInput.addEventListener("input", function () {
          dialectQuery = dInput.value;
          renderDialectList();
        });
      }
    }

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (ingOverlay && ingOverlay.classList.contains("open")) closeIng();
      else if (shopOverlay && shopOverlay.classList.contains("open")) closeShop();
      else if (cookOverlay && cookOverlay.classList.contains("open")) closeCook();
      else if (dialectOverlay && dialectOverlay.classList.contains("open")) closeDialect();
    });

    // ===== 一键点菜 =====
    var orderOverlay = document.getElementById("orderOverlay");
    var orderPeople = document.getElementById("orderPeople");
    var orderDrink = document.getElementById("orderDrink");
    var drinkNote = document.getElementById("drinkNote");
    var orderGo = document.getElementById("orderGo");
    var orderForm = document.getElementById("orderForm");
    var orderResult = document.getElementById("orderResult");
    var orderMenu = document.getElementById("orderMenu");
    var orderSummary = document.getElementById("orderSummary");
    var orderState = { people: 4, drink: false };
    var lastOrder = null;

    if (orderOverlay && typeof generateOrder === "function") {
      document.getElementById("orderOpen").addEventListener("click", function () {
        orderOverlay.classList.add("open");
        document.body.classList.add("lock");
      });
      document.getElementById("orderClose").addEventListener("click", closeOrder);
      orderOverlay.addEventListener("click", function (e) {
        if (e.target === this) closeOrder();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && orderOverlay.classList.contains("open")) closeOrder();
      });

      orderPeople.addEventListener("click", function (e) {
        var b = e.target.closest(".order-pill");
        if (!b) return;
        orderState.people = parseInt(b.dataset.p, 10);
        orderPeople.querySelectorAll(".order-pill").forEach(function (x) { x.classList.toggle("active", x === b); });
      });

      orderDrink.addEventListener("click", function () {
        orderState.drink = !orderState.drink;
        orderDrink.classList.toggle("active", orderState.drink);
        orderDrink.setAttribute("aria-pressed", orderState.drink ? "true" : "false");
        drinkNote.hidden = !orderState.drink;
      });

      orderGo.addEventListener("click", showOrderResult);
      document.getElementById("orderAgain").addEventListener("click", showOrderResult);
      document.getElementById("orderEdit").addEventListener("click", function () {
        orderForm.hidden = false;
        orderResult.hidden = true;
      });
      var orderCopyBtn = document.getElementById("orderCopy");
      if (orderCopyBtn) orderCopyBtn.addEventListener("click", copyOrderMenu);
    }

    function closeOrder() {
      orderOverlay.classList.remove("open");
      document.body.classList.remove("lock");
    }

    function copyOrderMenu() {
      if (!lastOrder) return;
      var groups = [
        { title: "冷菜（先上）", ids: lastOrder.cold },
        { title: "热菜", ids: lastOrder.hot },
        { title: "汤羹", ids: lastOrder.soup },
        { title: "主食点心", ids: lastOrder.staple }
      ];
      var lines = ["慈溪味 · " + lastOrder.people + " 人" + (lastOrder.drink ? "（喝点酒）" : "") + " 一桌菜"];
      var total = 0;
      groups.forEach(function (g) {
        if (!g.ids.length) return;
        lines.push("");
        lines.push("【" + g.title + "】");
        g.ids.forEach(function (id) {
          var r = lastOrder.byId[id];
          if (!r) return;
          total++;
          lines.push("· " + r.name + "（" + r.time + "）");
        });
      });
      lines.push("");
      lines.push("共 " + total + " 道 · 出自「慈溪味 · 慈溪菜菜谱大全」");
      var text = lines.join("\n");
      var done = function () {
        var btn = document.getElementById("orderCopy");
        if (btn) { btn.textContent = "✅ 已复制"; setTimeout(function () { btn.textContent = "📋 复制菜单"; }, 1200); }
      };
      var fallback = function () {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* 忽略 */ }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    }

    function showOrderResult() {
      var o = generateOrder(orderState.people, orderState.drink);
      var byId = {};
      RECIPES.forEach(function (r) { byId[r.id] = r; });
      var groups = [
        { key: "cold", title: "🧊 冷菜 · 先上", cls: "cold", ids: o.cold },
        { key: "hot", title: "🔥 热菜", cls: "hot", ids: o.hot },
        { key: "soup", title: "🍲 汤羹", cls: "soup", ids: o.soup },
        { key: "staple", title: "🍚 主食点心", cls: "staple", ids: o.staple }
      ];
      var html = groups.map(function (g) {
        if (!g.ids.length) return "";
        return '<div class="order-group"><div class="order-group-title ' + g.cls + '">' + g.title + "</div>" +
          '<div class="order-items">' + g.ids.map(function (id) {
            var r = byId[id];
            return '<button type="button" class="order-item" data-id="' + id + '"><span class="oi-emoji">' + r.emoji + "</span>" + r.name + "</button>";
          }).join("") + "</div></div>";
      }).join("");
      orderMenu.innerHTML = html;
      var total = o.cold.length + o.hot.length + o.soup.length + o.staple.length;
      orderSummary.textContent = orderState.people + " 人" + (orderState.drink ? " · 喝点" : "") + " · 共 " + total + " 道";
      lastOrder = { cold: o.cold, hot: o.hot, soup: o.soup, staple: o.staple, byId: byId, people: orderState.people, drink: orderState.drink };
      orderForm.hidden = true;
      orderResult.hidden = false;
      orderMenu.querySelectorAll(".order-item").forEach(function (b) {
        b.addEventListener("click", function () {
          openModal(parseInt(b.dataset.id, 10), filtered());
        });
      });
    }
  }

  function initChart() {
    var el = document.getElementById("catChart");
    if (!el || typeof echarts === "undefined") return;
    // 防止重复初始化导致分布图叠加渲染两次
    if (el.__cxChartInited) return;
    el.__cxChartInited = true;
    var existing = echarts.getInstanceByDom ? echarts.getInstanceByDom(el) : null;
    if (existing) existing.dispose();
    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue("--accent").trim();
    var accent2 = style.getPropertyValue("--accent2").trim();
    var ink = style.getPropertyValue("--ink").trim();
    var muted = style.getPropertyValue("--muted").trim();
    var rule = style.getPropertyValue("--rule").trim();
    var bg2 = style.getPropertyValue("--bg2").trim();

    var counts = {};
    RECIPES.forEach(function (r) { counts[r.cat] = (counts[r.cat] || 0) + 1; });
    var names = CAT_ORDER.map(function (k) { return CATS[k].name; });
    var vals = CAT_ORDER.map(function (k) { return counts[k] || 0; });

    var chart = echarts.init(el, null, { renderer: "svg" });
    chart.setOption({
      animation: false,
      tooltip: {
        trigger: "axis",
        appendToBody: true,
        axisPointer: { type: "shadow" },
        backgroundColor: bg2,
        borderColor: rule,
        textStyle: { color: ink, fontFamily: "inherit" }
      },
      grid: { left: 8, right: 24, top: 20, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: muted },
        splitLine: { lineStyle: { color: rule } }
      },
      yAxis: {
        type: "category",
        data: names,
        axisLine: { lineStyle: { color: rule } },
        axisLabel: { color: ink },
        axisTick: { show: false }
      },
      series: [{
        type: "bar",
        data: vals,
        barWidth: 16,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: {
            type: "linear", x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: accent2 },
              { offset: 1, color: accent }
            ]
          }
        },
        label: {
          show: true,
          position: "right",
          color: muted,
          formatter: "{c} 道"
        }
      }]
    });
    window.addEventListener("resize", function () { chart.resize(); });
  }

  function initStats() {
    var el = document.getElementById("statTotal");
    if (el) el.textContent = RECIPES.length;
  }

  function deepLink() {
    var m = location.hash.match(/^#recipe-(\d+)/);
    if (m) {
      var id = parseInt(m[1], 10);
      if (RECIPES.some(function (r) { return r.id === id; })) {
        openModal(id, RECIPES);
        return true;
      }
    }
    return false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    initStats();
    renderPills();
    renderGrid();
    renderSeasonStrip();
    bind();
    initChart();
    renderShopList();
    // 全站 ItemList 结构化数据 + PWA 注册
    if (CX.seo && CX.seo.itemList) CX.seo.itemList(RECIPES);
    if (CX.pwa && CX.pwa.register) CX.pwa.register();
    // 初始 hash 可能尚未就绪，分两步处理确保深链可靠
    setTimeout(function () { deepLink(); }, 300);
  });

  // 支持 hash 变化时（如点击带 #recipe-N 的链接）打开对应菜谱
  window.addEventListener("hashchange", function () {
    if (deepLink()) return;
    // 无有效 hash 时关闭弹窗
    closeModal();
  });
})();
