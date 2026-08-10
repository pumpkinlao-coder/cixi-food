// 慈溪味 · 一键点菜
// 冷菜（先上）：腌糟醉鲜 + 部分凉食海鲜/时蔬
// 下酒菜（喝酒时优先）：冷菜 + 香酥/卤味/螺贝类
var ORDER_RECIPES = (typeof RECIPES_1 !== "undefined")
  ? RECIPES_1.concat(RECIPES_2, RECIPES_3, RECIPES_4, RECIPES_5, RECIPES_6)
  : [];
var COLD_IDS = [
  70,71,72,73,74,75,76,77,78,79,80,81,82,156,157,158,   // 腌糟醉鲜
  10,28,30,6,                                            // 新风鳗鲞/梅童鱼冻/酱泡摇蚶/抱盐鲳鱼
  68,150,61,52,111,69,                                   // 凉拌莴笋/马兰头/四喜烤麸/宁波烤菜/苔菜花生米
  44,141,46,39                                           // 酱鸭/卤牛肉/白切羊肉/白斩鸡
];
var SNACK_IDS = [
  70,71,72,73,77,78,79,157,156,81,82,158,               // 糟醉卤味
  4,8,133,136,176,188,187,31,151,110,69,111,             // 香酥/螺贝/花生/臭豆腐
  44,141,46,39,30,17,19,177,25,137,126,104               // 卤味/冷盘/盐水虾/龙头烤/麻花
];

// 主料指纹：同主料的菜不同时上一桌（id -> 主料组）
var FOOD_KEY = {
  23:"虾",24:"虾",25:"虾",137:"虾",176:"虾",177:"虾",178:"虾",136:"虾",
  13:"蟹",14:"蟹",15:"蟹",16:"蟹",139:"蟹",70:"蟹",71:"蟹",72:"蟹",
  1:"黄鱼",7:"黄鱼",8:"黄鱼",9:"黄鱼",33:"黄鱼",125:"黄鱼",192:"黄鱼",193:"黄鱼",
  3:"带鱼",4:"带鱼",34:"带鱼",131:"带鱼",
  5:"鲳鱼",6:"鲳鱼",132:"鲳鱼",
  2:"梅童",28:"梅童",
  10:"海鳗",11:"河鳗",
  19:"蛏",20:"蛏",91:"蛏",
  89:"蛤",134:"蛤",197:"蛤",
  127:"马鲛",128:"马鲛",
  126:"龙头鱼",160:"龙头鱼",
  135:"望潮",
  26:"鲫鱼",93:"鲫鱼",
  183:"鳝",184:"泥鳅",185:"黑鱼",186:"昂刺",179:"鳜鱼",180:"鳊鱼",181:"鲈鱼",182:"鲤鱼",
  187:"田螺",188:"田螺",31:"螺蛳",32:"螺蛳",
  189:"河蚌",190:"河蚌",
  38:"鸡",39:"鸡",144:"鸡",146:"鸡",196:"鸡",77:"鸡",
  44:"鸭",143:"鸭",162:"鸭",
  46:"羊",47:"羊",
  35:"扣肉",40:"扣肉",41:"扣肉",45:"扣肉",145:"扣肉",161:"扣肉",
  141:"牛",148:"牛",
  42:"排骨",164:"排骨",147:"大排",
  94:"年糕",95:"年糕",96:"年糕",97:"年糕",98:"年糕",124:"年糕",166:"年糕",174:"年糕",
  100:"米馒头",101:"洋糕",102:"灰汁团",103:"桔红糕",167:"青团",168:"酒酿饼",
  69:"苔菜花生米",111:"苔菜花生米",
  81:"毛豆",82:"毛豆",151:"毛豆",158:"毛豆",
  59:"芋艿",63:"芋艿",119:"芋艿",149:"芋艿",60:"土豆"
};

// 食材大组：鱼 / 虾蟹贝 / 肉禽 / 时蔬 —— 热菜按大组配额，避免一桌全是鱼
var GROUP_KEY = {
  // 鱼（海鱼 + 河鱼）
  1:"鱼",2:"鱼",3:"鱼",4:"鱼",5:"鱼",6:"鱼",7:"鱼",8:"鱼",9:"鱼",10:"鱼",11:"鱼",12:"鱼",
  26:"鱼",27:"鱼",28:"鱼",29:"鱼",33:"鱼",34:"鱼",
  125:"鱼",126:"鱼",127:"鱼",128:"鱼",129:"鱼",130:"鱼",131:"鱼",132:"鱼",179:"鱼",180:"鱼",
  181:"鱼",182:"鱼",183:"鱼",184:"鱼",185:"鱼",186:"鱼",206:"鱼",
  // 虾蟹贝螺
  13:"虾蟹贝",14:"虾蟹贝",15:"虾蟹贝",16:"虾蟹贝",17:"虾蟹贝",18:"虾蟹贝",19:"虾蟹贝",20:"虾蟹贝",
  21:"虾蟹贝",22:"虾蟹贝",23:"虾蟹贝",24:"虾蟹贝",25:"虾蟹贝",30:"虾蟹贝",31:"虾蟹贝",32:"虾蟹贝",
  133:"虾蟹贝",134:"虾蟹贝",135:"虾蟹贝",136:"虾蟹贝",137:"虾蟹贝",138:"虾蟹贝",139:"虾蟹贝",
  176:"虾蟹贝",177:"虾蟹贝",178:"虾蟹贝",187:"虾蟹贝",188:"虾蟹贝",189:"虾蟹贝",190:"虾蟹贝",
  // 肉禽
  35:"肉禽",36:"肉禽",37:"肉禽",38:"肉禽",39:"肉禽",40:"肉禽",41:"肉禽",42:"肉禽",43:"肉禽",
  44:"肉禽",45:"肉禽",46:"肉禽",47:"肉禽",48:"肉禽",49:"肉禽",50:"肉禽",51:"肉禽",
  140:"肉禽",141:"肉禽",142:"肉禽",143:"肉禽",144:"肉禽",145:"肉禽",146:"肉禽",147:"肉禽",148:"肉禽"
};

// 正餐主食池：饭馆点菜可当主食/点心上的菜。
// 排除早餐街头（粢饭团/米馒头/洋糕）与零食伴手礼（麻花/豆酥糖/藕丝糖/老鼠糖球/桔红糕/灰汁团/苔菜花生米小吃版）
var ORDER_MAIN_IDS = [
  94,95,96,97,98,124,166,   // 年糕类（三北年糕/荠菜炒/烤菜/汤年糕/年糕饺/苔条/蛋煎）
  99,                        // 面结面
  109,                       // 长河蛋黄馄饨
  108,110,                   // 梅干菜烧饼 / 周巷臭豆腐
  167,168,169,170,171        // 青团 / 酒酿饼 / 春卷 / 麻球 / 南瓜饼
];

// 点菜：返回按上菜顺序分组的菜谱 id
function generateOrder(people, drink) {
  var p = Math.min(Math.max(people, 2), 12);
  var cfg;
  if (p <= 2) cfg = drink ? { cold: 2, hot: 3, soup: 1, staple: 0 } : { cold: 1, hot: 2, soup: 1, staple: 0 };
  else if (p <= 4) cfg = drink ? { cold: 3, hot: 4, soup: 1, staple: 1 } : { cold: 2, hot: 3, soup: 1, staple: 1 };
  else if (p <= 6) cfg = drink ? { cold: 4, hot: 5, soup: 1, staple: 1 } : { cold: 3, hot: 4, soup: 1, staple: 1 };
  else if (p <= 8) cfg = drink ? { cold: 5, hot: 6, soup: 2, staple: 1 } : { cold: 4, hot: 5, soup: 2, staple: 1 };
  else if (p <= 10) cfg = drink ? { cold: 5, hot: 7, soup: 2, staple: 1 } : { cold: 4, hot: 6, soup: 2, staple: 1 };
  else cfg = drink ? { cold: 6, hot: 8, soup: 2, staple: 2 } : { cold: 5, hot: 7, soup: 2, staple: 2 };

  var byId = {};
  ORDER_RECIPES.forEach(function (r) { byId[r.id] = r; });
  var used = {}; // 主料去重
  function keyOf(id) { return FOOD_KEY[id] || byId[id].name; }
  function groupOf(id) { return GROUP_KEY[id] || (byId[id] && byId[id].cat === "veg" ? "时蔬" : "其他"); }
  function pick(pool, n, prefer, skipUsed) {
    var arr = (prefer && drink) ? pool.filter(function (id) { return SNACK_IDS.indexOf(id) >= 0; }) : pool;
    if (!skipUsed) arr = arr.filter(function (id) { return !used[keyOf(id)]; });
    var out = [];
    var pool2 = arr.slice();
    while (out.length < n && pool2.length) {
      var avail = pool2.filter(function (id) { return skipUsed || !used[keyOf(id)]; });
      if (!avail.length) break;
      var i = Math.floor(Math.random() * avail.length);
      var id = avail[i];
      pool2.splice(pool2.indexOf(id), 1);
      out.push(id);
      used[keyOf(id)] = true;
    }
    if (out.length < n) {
      var rest = pool.filter(function (id) { return out.indexOf(id) < 0 && (skipUsed || !used[keyOf(id)]); });
      while (out.length < n && rest.length) {
        var j = Math.floor(Math.random() * rest.length);
        var rid = rest.splice(j, 1)[0];
        out.push(rid);
        used[keyOf(rid)] = true;
      }
    }
    return out;
  }

  // 分池：冷菜 / 鱼 / 虾蟹贝 / 肉禽 / 时蔬 / 汤 / 正餐主食
  var coldPool = COLD_IDS.slice();
  var fishPool = [], shellPool = [], meatPool = [], vegPool = [], soupPool = [];
  ORDER_RECIPES.forEach(function (r) {
    if (COLD_IDS.indexOf(r.id) >= 0) return;
    var g = groupOf(r.id);
    if (g === "鱼") fishPool.push(r.id);
    else if (g === "虾蟹贝") shellPool.push(r.id);
    else if (g === "肉禽") meatPool.push(r.id);
    else if (r.cat === "veg") vegPool.push(r.id);
    else if (r.cat === "soup") soupPool.push(r.id);
  });
  var staplePool = ORDER_MAIN_IDS.slice();

  var cold = pick(coldPool, cfg.cold, true);
  // 热菜配额：鱼最多 2 道，肉禽与时蔬保底，虾蟹贝适量；削减至总和 = cfg.hot
  var fishN = Math.min(2, Math.max(1, Math.floor(cfg.hot / 4)));
  var meatN = Math.max(1, Math.ceil(cfg.hot / 3));
  var vegN = Math.max(1, cfg.hot >= 6 ? 2 : 1);
  var over = fishN + meatN + vegN - cfg.hot;
  if (over > 0) {
    var cutVeg = Math.min(vegN, over); vegN -= cutVeg; over -= cutVeg;
    if (over > 0) { var cutMeat = Math.min(meatN - 1, over); meatN -= cutMeat; over -= cutMeat; }
    if (over > 0) fishN -= over;
  }
  var shellN = cfg.hot - fishN - meatN - vegN;
  var hot = []
    .concat(pick(fishPool, fishN))
    .concat(pick(shellPool, shellN))
    .concat(pick(meatPool, meatN))
    .concat(pick(vegPool, vegN));
  // 某组不足时按大组回退补足（鱼组不再增加，防止鱼过多）
  if (hot.length < cfg.hot) {
    var need = cfg.hot - hot.length;
    var hotUsedGroups = {};
    hot.forEach(function (id) { hotUsedGroups[groupOf(id)] = true; });
    var fallback = [];
    if (!hotUsedGroups["时蔬"]) fallback = fallback.concat(pick(vegPool, 99));
    if (!hotUsedGroups["肉禽"]) fallback = fallback.concat(pick(meatPool, 99));
    if (hotUsedGroups["时蔬"] && hotUsedGroups["肉禽"]) fallback = fallback.concat(pick(shellPool, 99));
    var extra = pick(fallback, need);
    hot = hot.concat(extra);
  }
  var soup = pick(soupPool, cfg.soup);
  var staple = pick(staplePool, cfg.staple);

  return { cold: cold, hot: hot, soup: soup, staple: staple };
}
