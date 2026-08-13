/* 慈溪味 · 应用逻辑 */
(function () {
  "use strict";

  var RECIPES = RECIPES_1.concat(RECIPES_2, RECIPES_3, RECIPES_4, RECIPES_5, RECIPES_6, RECIPES_7);

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

  var state = { kw: "", cat: "all", sort: "default", remote: false };

  function isRemote(id) {
    return (typeof REMOTE_RECIPES !== "undefined") && REMOTE_RECIPES.indexOf(id) >= 0;
  }

  function timeVal(s) {
    if (!s) return 0;
    if (s.indexOf("半天") >= 0) return 240;
    var h = s.match(/(\d+(?:\.\d+)?)\s*小时/);
    if (h) return Math.round(parseFloat(h[1]) * 60);
    var m = s.match(/(\d+)\s*分钟/);
    if (m) return parseInt(m[1], 10);
    var d = s.match(/(\d+)\s*天/);
    if (d) return parseInt(d[1], 10) * 480;
    if (s.indexOf("数日") >= 0) return 1920;
    if (s.indexOf("半月") >= 0) return 7200;
    var mo = s.match(/(\d+)\s*个月/);
    if (mo) return parseInt(mo[1], 10) * 14400;
    if (s.indexOf("数月") >= 0) return 43200;
    return 0;
  }

  function matches(r) {
    if (state.cat !== "all" && r.cat !== state.cat) return false;
    if (state.remote && !isRemote(r.id)) return false;
    var kw = state.kw.trim().toLowerCase();
    if (!kw) return true;
    var hay = (r.name + " " + r.desc + " " + r.tags.join(" ") + " " +
      r.ingredients.join(" ") + " " + (r.tips || "")).toLowerCase();
    return hay.indexOf(kw) >= 0;
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
        '<div class="card-top">' +
          '<span class="card-emoji">' + r.emoji + "</span>" +
          '<span class="chip chip-cat">' + cat.name + "</span>" +
          (r.tags.indexOf("名菜") >= 0 ? '<span class="chip chip-fame">名菜</span>' : "") +
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
    wrap.innerHTML = html;
  }

  function openModal(id, list) {
    var r = RECIPES.find(function (x) { return x.id === id; });
    if (!r) return;
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
    document.getElementById("modalTags").innerHTML = r.tags
      .map(function (t) { return '<span class="tag">' + t + "</span>"; })
      .join("");
    document.getElementById("modalIng").innerHTML = r.ingredients
      .map(function (x) { return "<li>" + x + "</li>"; })
      .join("");

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
      var labels = ["做法一 · 常规"].concat(variants.map(function (v, i) { return "做法" + ["二", "三", "四"][i] + " · " + v.label.replace(/^做法[一二三四]\s*[·．.、]?\s*/, ""); }));
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

  function randomPick() {
    var list = filtered();
    var pool = list.length ? list : RECIPES;
    var r = pool[Math.floor(Math.random() * pool.length)];
    openModal(r.id, list.length ? list : RECIPES);
  }

  function bind() {
    var grid = document.getElementById("grid");
    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".card");
      if (card) openModal(parseInt(card.dataset.id, 10), filtered());
    });

    document.getElementById("catPills").addEventListener("click", function (e) {
      var btn = e.target.closest(".pill");
      if (!btn) return;
      if (btn.dataset.remote) {
        state.remote = !state.remote;
      } else {
        state.cat = btn.dataset.cat;
      }
      renderPills();
      renderGrid();
    });

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
      state.kw = ""; state.cat = "all"; state.sort = "default"; state.remote = false;
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
    }

    function closeOrder() {
      orderOverlay.classList.remove("open");
      document.body.classList.remove("lock");
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
    var easy = RECIPES.filter(function (r) { return r.diff === 1; }).length;
    var mid = RECIPES.filter(function (r) { return r.diff === 2; }).length;
    var hard = RECIPES.filter(function (r) { return r.diff === 3; }).length;
    var el2 = document.getElementById("statEasy");
    var el3 = document.getElementById("statMid");
    var el4 = document.getElementById("statHard");
    if (el2) el2.textContent = easy;
    if (el3) el3.textContent = mid;
    if (el4) el4.textContent = hard;
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
    bind();
    initChart();
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
