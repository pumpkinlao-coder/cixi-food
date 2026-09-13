/* 慈溪味 · 用时与厨具
   1) TIME_LEVELS：用时档位。菜谱的 time 字段（如「40分钟」「1.5小时」「2天」）换算成分钟后分档。
   2) TOOLS / TOOL_ORDER：厨具标签。base 表示不需要任何专门厨具，一口炒锅或汤锅就能做。
   3) TOOL_RULES：从做法步骤、小贴士与菜名里认出需要的厨具（关键词最长命中）。
   4) HEAT_WORDS：加热类动词。一个都没出现的菜，归入「不用开火」（凉拌、腌渍、醉、冻）。
   说明：厨具是按做法文字判定的，只作参考；同一道菜可能同时需要砂锅和蒸笼，筛选时两边都会出现。 */

var TIME_LEVELS = [
  { k: "t20", label: "20 分钟内", short: "20 分内", max: 20 },
  { k: "t30", label: "30 分钟内", short: "30 分内", max: 30 },
  { k: "t45", label: "45 分钟内", short: "45 分内", max: 45 },
  { k: "t60", label: "1 小时内", short: "1 小时内", max: 60 },
  { k: "slow", label: "1 小时以上", short: "慢工细做", min: 61 }
];

var TOOLS = {
  base:       { name: "只用一口锅", emoji: "🍳", note: "炒锅或汤锅就能做完，不用另添家什" },
  steamer:    { name: "要上笼蒸",   emoji: "🥟", note: "要蒸笼或隔水蒸" },
  casserole:  { name: "要砂锅",     emoji: "🍲", note: "砂锅慢炖更对味" },
  oven:       { name: "要烤箱",     emoji: "🔥", note: "要进烤箱" },
  ricecooker: { name: "要电饭煲",   emoji: "🍚", note: "用电饭煲做" },
  griddle:    { name: "要铁板",     emoji: "♨️", note: "要铁板" },
  pressure:   { name: "要高压锅",   emoji: "⏱", note: "要上高压锅" },
  microwave:  { name: "要微波炉",   emoji: "📻", note: "用微波炉" },
  nofire:     { name: "不用开火",   emoji: "🥗", note: "凉拌、腌渍、醉或冻，全程不点火" }
};

var TOOL_ORDER = ["base", "nofire", "steamer", "casserole", "oven", "ricecooker", "griddle", "pressure", "microwave"];

var TOOL_RULES = [
  { k: "高压锅", t: "pressure" },
  { k: "电饭煲", t: "ricecooker" },
  { k: "电饭锅", t: "ricecooker" },
  { k: "烤箱", t: "oven" },
  { k: "微波炉", t: "microwave" },
  { k: "砂锅", t: "casserole" },
  { k: "砂煲", t: "casserole" },
  { k: "隔水蒸", t: "steamer" },
  { k: "蒸笼", t: "steamer" },
  { k: "笼屉", t: "steamer" },
  { k: "上笼", t: "steamer" },
  { k: "旺火蒸", t: "steamer" },
  { k: "大火蒸", t: "steamer" },
  { k: "铁板", t: "griddle" }
];

/* 加热类动词，一个都没有就算「不用开火」。烙饼、干烤这类也要算进去，
   否则平底锅烙的饼会被误判成不需要开火。 */
var HEAT_WORDS = [
  "炒", "爆", "煸", "煎", "炸", "蒸", "炖", "煮", "煨", "烤", "烧", "汆", "焯", "烫",
  "烩", "焖", "焗", "熬", "滚", "烙", "下锅", "上笼", "起油锅", "热锅"
];
