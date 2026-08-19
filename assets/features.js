/* 慈溪味 · 增强功能
   1) 收藏（localStorage）  2) 按食材找菜「有什么吃什么」
   3) 购物清单 / 采购清单    4) 人数换算 / 分量缩放
   5) 营养 / 卡路里估算      6) Schema.org Recipe JSON-LD
   7) PWA / 离线 */
(function () {
  "use strict";

  var LS_FAV = "cx_favs";
  var LS_SHOP = "cx_shop";
  var LS_ING = "cx_ing";

  /* ---------- 通用存储 ---------- */
  function readLS(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- 1. 收藏 ---------- */
  function getFavs() { var v = readLS(LS_FAV); return Array.isArray(v) ? v : []; }
  function isFav(id) { return getFavs().indexOf(id) >= 0; }
  function toggleFav(id) {
    var f = getFavs(); var i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    writeLS(LS_FAV, f);
    return i < 0; // 返回 true 表示已收藏
  }
  function favCount() { return getFavs().length; }

  /* ---------- 3. 购物清单 ---------- */
  function shopGet() { var v = readLS(LS_SHOP); return Array.isArray(v) ? v : []; }
  function shopHas(id) { return shopGet().indexOf(id) >= 0; }
  function shopAdd(id) { var s = shopGet(); if (s.indexOf(id) < 0) { s.push(id); writeLS(LS_SHOP, s); } }
  function shopRemove(id) { var s = shopGet(); var i = s.indexOf(id); if (i >= 0) { s.splice(i, 1); writeLS(LS_SHOP, s); } }
  function shopAddMany(ids) { var s = shopGet(); ids.forEach(function (id) { if (s.indexOf(id) < 0) s.push(id); }); writeLS(LS_SHOP, s); }
  function shopClear() { writeLS(LS_SHOP, []); }

  /* ---------- 食材词典 ----------
     k=关键词  g=分组  main=主料(参与匹配)  kcal/p/f/c=每100g营养(估算)
     u=单份默认克数(用于「1条/1个」等无重量时的营养估算) */
  var ING = [
    /* 海鲜 */
    { k: "黄鱼", g: "海鲜", main: 1, kcal: 105, p: 17.7, f: 3.4, c: 0.6, u: 600 },
    { k: "梅鱼", g: "海鲜", main: 1, kcal: 100, p: 17.0, f: 3.0, c: 0.5, u: 400 },
    { k: "带鱼", g: "海鲜", main: 1, kcal: 127, p: 18.1, f: 5.6, c: 0, u: 500 },
    { k: "鲳鱼", g: "海鲜", main: 1, kcal: 140, p: 15.6, f: 7.6, c: 0, u: 500 },
    { k: "鲈鱼", g: "海鲜", main: 1, kcal: 105, p: 18.6, f: 3.4, c: 0, u: 600 },
    { k: "鲻鱼", g: "海鲜", main: 1, kcal: 105, p: 18.0, f: 3.5, c: 0, u: 600 },
    { k: "鳗鱼", g: "海鲜", main: 1, kcal: 181, p: 18.6, f: 12.2, c: 0, u: 500 },
    { k: "墨鱼", g: "海鲜", main: 1, kcal: 84, p: 15.2, f: 0.9, c: 1.0, u: 400 },
    { k: "鱿鱼", g: "海鲜", main: 1, kcal: 84, p: 15.2, f: 0.9, c: 1.0, u: 400 },
    { k: "虾", g: "海鲜", main: 1, kcal: 93, p: 18.6, f: 0.8, c: 2.8, u: 300 },
    { k: "蟹", g: "海鲜", main: 1, kcal: 95, p: 15.5, f: 3.2, c: 0.3, u: 600 },
    { k: "海瓜子", g: "海鲜", main: 1, kcal: 73, p: 13.5, f: 1.5, c: 1.5, u: 400 },
    { k: "泥螺", g: "海鲜", main: 1, kcal: 80, p: 13.0, f: 2.0, c: 1.0, u: 300 },
    { k: "蛤蜊", g: "海鲜", main: 1, kcal: 62, p: 10.1, f: 1.1, c: 2.8, u: 500 },
    { k: "花蛤", g: "海鲜", main: 1, kcal: 62, p: 10.1, f: 1.1, c: 2.8, u: 500 },
    { k: "蛏子", g: "海鲜", main: 1, kcal: 70, p: 11.0, f: 1.5, c: 2.0, u: 500 },
    { k: "生蚝", g: "海鲜", main: 1, kcal: 73, p: 9.0, f: 2.5, c: 4.0, u: 500 },
    { k: "海蜇", g: "海鲜", main: 1, kcal: 33, p: 4.5, f: 0.3, c: 3.0, u: 300 },
    { k: "紫菜", g: "海鲜", main: 1, kcal: 250, p: 28.0, f: 1.5, c: 44.0, u: 15 },
    { k: "苔菜", g: "海鲜", main: 1, kcal: 250, p: 28.0, f: 1.5, c: 44.0, u: 15 },
    { k: "海带", g: "海鲜", main: 1, kcal: 13, p: 1.2, f: 0.1, c: 2.1, u: 200 },
    /* 河鲜 */
    { k: "鲫鱼", g: "河鲜", main: 1, kcal: 108, p: 17.1, f: 3.6, c: 0, u: 400 },
    { k: "草鱼", g: "河鲜", main: 1, kcal: 113, p: 16.6, f: 5.2, c: 0, u: 800 },
    { k: "鲤鱼", g: "河鲜", main: 1, kcal: 109, p: 17.6, f: 4.1, c: 0, u: 800 },
    { k: "黄鳝", g: "河鲜", main: 1, kcal: 89, p: 18.0, f: 1.4, c: 0, u: 500 },
    { k: "泥鳅", g: "河鲜", main: 1, kcal: 96, p: 17.9, f: 2.0, c: 0, u: 400 },
    { k: "螺蛳", g: "河鲜", main: 1, kcal: 60, p: 10.0, f: 1.0, c: 2.0, u: 500 },
    /* 肉类 */
    { k: "猪肉", g: "肉类", main: 1, kcal: 395, p: 13.2, f: 37.0, c: 2.4, u: 300 },
    { k: "五花肉", g: "肉类", main: 1, kcal: 508, p: 9.3, f: 53.0, c: 0, u: 300 },
    { k: "里脊", g: "肉类", main: 1, kcal: 155, p: 20.2, f: 7.9, c: 0.7, u: 250 },
    { k: "排骨", g: "肉类", main: 1, kcal: 278, p: 16.7, f: 23.0, c: 0, u: 500 },
    { k: "猪蹄", g: "肉类", main: 1, kcal: 260, p: 22.6, f: 18.8, c: 0, u: 500 },
    { k: "猪肝", g: "肉类", main: 1, kcal: 129, p: 19.3, f: 3.5, c: 5.0, u: 200 },
    { k: "猪肚", g: "肉类", main: 1, kcal: 110, p: 15.2, f: 5.1, c: 1.0, u: 300 },
    { k: "猪血", g: "肉类", main: 1, kcal: 55, p: 12.0, f: 0.3, c: 0.9, u: 300 },
    { k: "腊肉", g: "肉类", main: 1, kcal: 498, p: 16.9, f: 45.0, c: 2.1, u: 150 },
    { k: "咸肉", g: "肉类", main: 1, kcal: 498, p: 16.9, f: 45.0, c: 2.1, u: 150 },
    { k: "火腿", g: "肉类", main: 1, kcal: 498, p: 16.9, f: 45.0, c: 2.1, u: 150 },
    { k: "牛肉", g: "肉类", main: 1, kcal: 125, p: 20.0, f: 4.2, c: 1.2, u: 300 },
    { k: "羊肉", g: "肉类", main: 1, kcal: 203, p: 19.0, f: 14.1, c: 0, u: 300 },
    { k: "鸡肉", g: "肉类", main: 1, kcal: 167, p: 19.3, f: 9.4, c: 1.3, u: 500 },
    { k: "鸡翅", g: "肉类", main: 1, kcal: 194, p: 17.4, f: 12.5, c: 4.6, u: 400 },
    { k: "鸡爪", g: "肉类", main: 1, kcal: 254, p: 23.9, f: 16.4, c: 2.7, u: 300 },
    { k: "鸭肉", g: "肉类", main: 1, kcal: 240, p: 15.5, f: 19.7, c: 0.2, u: 500 },
    { k: "鸽子", g: "肉类", main: 1, kcal: 201, p: 16.5, f: 14.2, c: 1.7, u: 350 },
    { k: "肉末", g: "肉类", main: 1, kcal: 395, p: 13.2, f: 37.0, c: 2.4, u: 200 },
    { k: "香肠", g: "肉类", main: 1, kcal: 508, p: 24.0, f: 40.0, c: 7.0, u: 100 },
    { k: "培根", g: "肉类", main: 1, kcal: 508, p: 24.0, f: 40.0, c: 7.0, u: 100 },
    /* 蛋奶豆 */
    { k: "鸡蛋", g: "蛋豆", main: 1, kcal: 144, p: 13.3, f: 8.8, c: 2.8, u: 50 },
    { k: "鸭蛋", g: "蛋豆", main: 1, kcal: 180, p: 12.6, f: 13.0, c: 3.1, u: 70 },
    { k: "咸鸭蛋", g: "蛋豆", main: 1, kcal: 190, p: 12.7, f: 12.7, c: 6.3, u: 70 },
    { k: "皮蛋", g: "蛋豆", main: 1, kcal: 171, p: 14.2, f: 10.7, c: 4.5, u: 60 },
    { k: "鹌鹑蛋", g: "蛋豆", main: 1, kcal: 160, p: 12.8, f: 11.1, c: 2.1, u: 10 },
    { k: "豆腐", g: "蛋豆", main: 1, kcal: 84, p: 8.1, f: 3.7, c: 3.0, u: 300 },
    { k: "豆腐干", g: "蛋豆", main: 1, kcal: 142, p: 16.2, f: 3.6, c: 7.0, u: 150 },
    { k: "豆皮", g: "蛋豆", main: 1, kcal: 409, p: 44.6, f: 17.4, c: 18.8, u: 50 },
    { k: "黄豆", g: "蛋豆", main: 1, kcal: 390, p: 35.0, f: 16.0, c: 34.2, u: 50 },
    { k: "毛豆", g: "蛋豆", main: 1, kcal: 131, p: 13.1, f: 5.0, c: 10.5, u: 200 },
    { k: "蚕豆", g: "蛋豆", main: 1, kcal: 111, p: 8.8, f: 0.4, c: 19.5, u: 200 },
    { k: "豌豆", g: "蛋豆", main: 1, kcal: 111, p: 7.4, f: 0.3, c: 21.2, u: 150 },
    { k: "豆芽", g: "蛋豆", main: 0, kcal: 18, p: 2.1, f: 0.1, c: 2.9, u: 200 },
    { k: "腐竹", g: "蛋豆", main: 1, kcal: 461, p: 44.6, f: 21.7, c: 22.3, u: 50 },
    { k: "油豆腐", g: "蛋豆", main: 1, kcal: 245, p: 17.0, f: 17.6, c: 4.5, u: 150 },
    { k: "千张", g: "蛋豆", main: 1, kcal: 260, p: 24.5, f: 16.0, c: 5.5, u: 100 },
    { k: "臭豆腐", g: "蛋豆", main: 1, kcal: 130, p: 9.0, f: 7.0, c: 4.0, u: 200 },
    /* 蔬菜 */
    { k: "芋艿", g: "蔬菜", main: 1, kcal: 79, p: 2.2, f: 0.2, c: 18.1, u: 300 },
    { k: "芋头", g: "蔬菜", main: 1, kcal: 79, p: 2.2, f: 0.2, c: 18.1, u: 300 },
    { k: "冬笋", g: "蔬菜", main: 1, kcal: 40, p: 4.1, f: 0.1, c: 6.0, u: 250 },
    { k: "春笋", g: "蔬菜", main: 1, kcal: 25, p: 2.4, f: 0.1, c: 4.1, u: 250 },
    { k: "茭白", g: "蔬菜", main: 1, kcal: 23, p: 1.2, f: 0.2, c: 5.9, u: 300 },
    { k: "青菜", g: "蔬菜", main: 0, kcal: 16, p: 1.5, f: 0.2, c: 3.3, u: 200 },
    { k: "芹菜", g: "蔬菜", main: 0, kcal: 16, p: 0.8, f: 0.1, c: 3.9, u: 200 },
    { k: "韭菜", g: "蔬菜", main: 0, kcal: 26, p: 2.4, f: 0.4, c: 4.6, u: 150 },
    { k: "冬瓜", g: "蔬菜", main: 1, kcal: 12, p: 0.4, f: 0.2, c: 2.6, u: 400 },
    { k: "丝瓜", g: "蔬菜", main: 1, kcal: 20, p: 1.0, f: 0.2, c: 4.2, u: 300 },
    { k: "茄子", g: "蔬菜", main: 1, kcal: 23, p: 1.1, f: 0.2, c: 4.9, u: 300 },
    { k: "番茄", g: "蔬菜", main: 1, kcal: 20, p: 0.9, f: 0.2, c: 4.0, u: 300 },
    { k: "西红柿", g: "蔬菜", main: 1, kcal: 20, p: 0.9, f: 0.2, c: 4.0, u: 300 },
    { k: "土豆", g: "蔬菜", main: 1, kcal: 81, p: 2.6, f: 0.2, c: 17.8, u: 250 },
    { k: "马铃薯", g: "蔬菜", main: 1, kcal: 81, p: 2.6, f: 0.2, c: 17.8, u: 250 },
    { k: "萝卜", g: "蔬菜", main: 1, kcal: 21, p: 0.9, f: 0.1, c: 4.0, u: 300 },
    { k: "白萝卜", g: "蔬菜", main: 1, kcal: 21, p: 0.9, f: 0.1, c: 4.0, u: 300 },
    { k: "胡萝卜", g: "蔬菜", main: 0, kcal: 39, p: 1.0, f: 0.2, c: 8.8, u: 150 },
    { k: "藕", g: "蔬菜", main: 1, kcal: 73, p: 1.9, f: 0.2, c: 16.4, u: 300 },
    { k: "山药", g: "蔬菜", main: 1, kcal: 57, p: 1.9, f: 0.2, c: 12.4, u: 300 },
    { k: "辣椒", g: "蔬菜", main: 0, kcal: 32, p: 1.3, f: 0.4, c: 5.7, u: 50 },
    { k: "青椒", g: "蔬菜", main: 0, kcal: 25, p: 1.0, f: 0.2, c: 4.5, u: 100 },
    { k: "四季豆", g: "蔬菜", main: 1, kcal: 28, p: 2.0, f: 0.4, c: 4.2, u: 200 },
    { k: "豇豆", g: "蔬菜", main: 1, kcal: 29, p: 2.1, f: 0.2, c: 4.6, u: 200 },
    { k: "南瓜", g: "蔬菜", main: 1, kcal: 23, p: 0.7, f: 0.1, c: 5.3, u: 300 },
    { k: "黄瓜", g: "蔬菜", main: 1, kcal: 16, p: 0.8, f: 0.2, c: 2.9, u: 200 },
    { k: "苦瓜", g: "蔬菜", main: 1, kcal: 22, p: 1.0, f: 0.2, c: 4.9, u: 200 },
    { k: "白菜", g: "蔬菜", main: 0, kcal: 18, p: 1.5, f: 0.1, c: 3.2, u: 300 },
    { k: "大白菜", g: "蔬菜", main: 0, kcal: 18, p: 1.5, f: 0.1, c: 3.2, u: 300 },
    { k: "菠菜", g: "蔬菜", main: 0, kcal: 28, p: 2.6, f: 0.3, c: 4.5, u: 200 },
    { k: "油菜", g: "蔬菜", main: 0, kcal: 16, p: 1.5, f: 0.2, c: 3.3, u: 200 },
    { k: "生菜", g: "蔬菜", main: 0, kcal: 15, p: 1.3, f: 0.3, c: 2.0, u: 200 },
    { k: "油麦菜", g: "蔬菜", main: 0, kcal: 15, p: 1.4, f: 0.4, c: 2.1, u: 200 },
    { k: "马兰头", g: "蔬菜", main: 1, kcal: 25, p: 2.4, f: 0.4, c: 4.0, u: 150 },
    { k: "草头", g: "蔬菜", main: 1, kcal: 25, p: 3.0, f: 0.3, c: 3.0, u: 150 },
    { k: "草籽", g: "蔬菜", main: 1, kcal: 25, p: 3.0, f: 0.3, c: 3.0, u: 150 },
    { k: "荠菜", g: "蔬菜", main: 1, kcal: 31, p: 2.9, f: 0.4, c: 4.7, u: 150 },
    { k: "空心菜", g: "蔬菜", main: 0, kcal: 23, p: 2.2, f: 0.3, c: 3.6, u: 200 },
    { k: "苋菜", g: "蔬菜", main: 0, kcal: 30, p: 2.8, f: 0.4, c: 4.0, u: 200 },
    { k: "蒜苔", g: "蔬菜", main: 0, kcal: 61, p: 2.0, f: 0.1, c: 15.4, u: 100 },
    { k: "蒜苗", g: "蔬菜", main: 0, kcal: 40, p: 2.1, f: 0.4, c: 6.2, u: 100 },
    { k: "葱", g: "蔬菜", main: 0, kcal: 30, p: 1.7, f: 0.3, c: 6.5, u: 20 },
    { k: "姜", g: "蔬菜", main: 0, kcal: 80, p: 1.8, f: 0.8, c: 17.8, u: 10 },
    { k: "蒜", g: "蔬菜", main: 0, kcal: 149, p: 6.4, f: 0.5, c: 33.0, u: 10 },
    { k: "香菜", g: "蔬菜", main: 0, kcal: 33, p: 1.8, f: 0.4, c: 6.2, u: 10 },
    { k: "西葫芦", g: "蔬菜", main: 1, kcal: 19, p: 0.8, f: 0.2, c: 3.8, u: 300 },
    { k: "芦笋", g: "蔬菜", main: 1, kcal: 20, p: 2.2, f: 0.1, c: 3.9, u: 200 },
    { k: "花菜", g: "蔬菜", main: 1, kcal: 24, p: 2.1, f: 0.2, c: 4.6, u: 250 },
    { k: "西兰花", g: "蔬菜", main: 1, kcal: 36, p: 4.1, f: 0.6, c: 4.3, u: 250 },
    { k: "玉米", g: "蔬菜", main: 1, kcal: 112, p: 4.0, f: 1.2, c: 22.8, u: 200 },
    /* 菌菇 */
    { k: "香菇", g: "菌菇", main: 1, kcal: 26, p: 2.2, f: 0.3, c: 5.2, u: 50 },
    { k: "木耳", g: "菌菇", main: 1, kcal: 27, p: 1.5, f: 0.2, c: 6.0, u: 30 },
    { k: "黑木耳", g: "菌菇", main: 1, kcal: 27, p: 1.5, f: 0.2, c: 6.0, u: 30 },
    { k: "金针菇", g: "菌菇", main: 1, kcal: 26, p: 2.4, f: 0.4, c: 4.7, u: 200 },
    { k: "口蘑", g: "菌菇", main: 1, kcal: 24, p: 3.0, f: 0.3, c: 3.3, u: 200 },
    { k: "蘑菇", g: "菌菇", main: 1, kcal: 24, p: 3.0, f: 0.3, c: 3.3, u: 200 },
    { k: "杏鲍菇", g: "菌菇", main: 1, kcal: 31, p: 2.4, f: 0.3, c: 5.5, u: 200 },
    { k: "平菇", g: "菌菇", main: 1, kcal: 20, p: 1.9, f: 0.3, c: 2.3, u: 200 },
    { k: "笋干", g: "菌菇", main: 1, kcal: 40, p: 4.1, f: 0.1, c: 6.0, u: 50 },
    { k: "银耳", g: "菌菇", main: 1, kcal: 200, p: 10.0, f: 1.4, c: 67.0, u: 20 },
    /* 主食 */
    { k: "年糕", g: "主食", main: 1, kcal: 154, p: 3.3, f: 0.6, c: 34.7, u: 200 },
    { k: "糯米", g: "主食", main: 1, kcal: 348, p: 7.3, f: 1.0, c: 78.3, u: 150 },
    { k: "大米", g: "主食", main: 1, kcal: 346, p: 7.4, f: 0.8, c: 77.9, u: 150 },
    { k: "米饭", g: "主食", main: 1, kcal: 116, p: 2.6, f: 0.3, c: 25.9, u: 250 },
    { k: "面条", g: "主食", main: 1, kcal: 110, p: 3.6, f: 0.6, c: 22.8, u: 300 },
    { k: "面粉", g: "主食", main: 1, kcal: 366, p: 11.2, f: 1.5, c: 71.5, u: 200 },
    { k: "粉丝", g: "主食", main: 1, kcal: 338, p: 0.8, f: 0.2, c: 83.7, u: 50 },
    { k: "红薯粉", g: "主食", main: 1, kcal: 337, p: 0.5, f: 0.2, c: 84.0, u: 100 },
    { k: "粉皮", g: "主食", main: 1, kcal: 150, p: 0.2, f: 0.2, c: 36.0, u: 100 },
    { k: "春卷皮", g: "主食", main: 1, kcal: 230, p: 7.0, f: 0.5, c: 50.0, u: 100 },
    { k: "馄饨皮", g: "主食", main: 1, kcal: 260, p: 9.0, f: 1.0, c: 54.0, u: 100 },
    { k: "豆沙", g: "主食", main: 1, kcal: 243, p: 5.5, f: 1.0, c: 52.0, u: 100 },
    { k: "汤圆", g: "主食", main: 1, kcal: 232, p: 4.4, f: 1.0, c: 51.0, u: 100 },
    { k: "粽子", g: "主食", main: 1, kcal: 195, p: 4.5, f: 2.0, c: 40.0, u: 150 },
    { k: "馒头", g: "主食", main: 1, kcal: 223, p: 7.0, f: 1.1, c: 47.0, u: 100 },
    { k: "饼", g: "主食", main: 1, kcal: 230, p: 8.0, f: 6.0, c: 36.0, u: 100 },
    /* 水果甜品坚果 */
    { k: "杨梅", g: "水果", main: 1, kcal: 34, p: 0.8, f: 0.3, c: 6.7, u: 100 },
    { k: "橘子", g: "水果", main: 1, kcal: 44, p: 0.8, f: 0.1, c: 9.7, u: 100 },
    { k: "柑", g: "水果", main: 1, kcal: 44, p: 0.8, f: 0.1, c: 9.7, u: 100 },
    { k: "桃", g: "水果", main: 1, kcal: 48, p: 0.9, f: 0.1, c: 12.2, u: 150 },
    { k: "梨", g: "水果", main: 1, kcal: 44, p: 0.4, f: 0.2, c: 10.2, u: 200 },
    { k: "芝麻", g: "水果", main: 0, kcal: 559, p: 19.1, f: 46.1, c: 24.0, u: 10 },
    { k: "核桃", g: "水果", main: 0, kcal: 627, p: 14.9, f: 58.8, c: 19.1, u: 20 },
    { k: "花生", g: "水果", main: 1, kcal: 563, p: 24.8, f: 44.3, c: 21.7, u: 50 },
    { k: "红豆", g: "水果", main: 1, kcal: 324, p: 20.2, f: 0.6, c: 63.4, u: 50 },
    { k: "绿豆", g: "水果", main: 1, kcal: 329, p: 21.6, f: 0.8, c: 62.0, u: 50 },
    { k: "白果", g: "水果", main: 1, kcal: 355, p: 13.0, f: 2.0, c: 72.6, u: 30 },
    { k: "桂花", g: "水果", main: 0, kcal: 300, p: 8.0, f: 2.0, c: 65.0, u: 5 },
    { k: "酒酿", g: "水果", main: 1, kcal: 100, p: 2.0, f: 0.5, c: 22.0, u: 100 },
    { k: "红枣", g: "水果", main: 1, kcal: 264, p: 3.2, f: 0.5, c: 67.8, u: 20 },
    { k: "莲子", g: "水果", main: 1, kcal: 350, p: 17.2, f: 2.0, c: 67.2, u: 30 },
    { k: "桂圆", g: "水果", main: 1, kcal: 71, p: 1.2, f: 0.1, c: 16.6, u: 20 },
    { k: "枸杞", g: "水果", main: 0, kcal: 258, p: 13.9, f: 1.5, c: 64.1, u: 10 },
    { k: "蜂蜜", g: "水果", main: 0, kcal: 321, p: 0.4, f: 1.9, c: 75.6, u: 15 },
    /* 调料（main=0 不参与主料匹配） */
    { k: "酱油", g: "调料", main: 0, kcal: 63, p: 5.6, f: 0.1, c: 10.1, u: 15 },
    { k: "生抽", g: "调料", main: 0, kcal: 63, p: 5.6, f: 0.1, c: 10.1, u: 15 },
    { k: "老抽", g: "调料", main: 0, kcal: 63, p: 5.6, f: 0.1, c: 10.1, u: 15 },
    { k: "盐", g: "调料", main: 0, kcal: 0, p: 0, f: 0, c: 0, u: 5 },
    { k: "糖", g: "调料", main: 0, kcal: 400, p: 0, f: 0, c: 100, u: 10 },
    { k: "白糖", g: "调料", main: 0, kcal: 400, p: 0, f: 0, c: 100, u: 10 },
    { k: "冰糖", g: "调料", main: 0, kcal: 400, p: 0, f: 0, c: 100, u: 10 },
    { k: "醋", g: "调料", main: 0, kcal: 31, p: 2.1, f: 0.3, c: 4.9, u: 15 },
    { k: "黄酒", g: "调料", main: 0, kcal: 66, p: 1.6, f: 0, c: 5.0, u: 15 },
    { k: "白酒", g: "调料", main: 0, kcal: 298, p: 0, f: 0, c: 0, u: 15 },
    { k: "料酒", g: "调料", main: 0, kcal: 66, p: 1.6, f: 0, c: 5.0, u: 15 },
    { k: "蚝油", g: "调料", main: 0, kcal: 114, p: 4.5, f: 0, c: 24.0, u: 15 },
    { k: "淀粉", g: "调料", main: 0, kcal: 346, p: 1.2, f: 0.1, c: 85.0, u: 10 },
    { k: "五香粉", g: "调料", main: 0, kcal: 300, p: 10.0, f: 5.0, c: 55.0, u: 3 },
    { k: "白胡椒粉", g: "调料", main: 0, kcal: 296, p: 10.0, f: 2.0, c: 60.0, u: 3 },
    { k: "花椒", g: "调料", main: 0, kcal: 300, p: 10.0, f: 5.0, c: 55.0, u: 3 },
    { k: "八角", g: "调料", main: 0, kcal: 300, p: 10.0, f: 5.0, c: 55.0, u: 3 },
    { k: "桂皮", g: "调料", main: 0, kcal: 300, p: 10.0, f: 5.0, c: 55.0, u: 3 },
    { k: "香叶", g: "调料", main: 0, kcal: 300, p: 10.0, f: 5.0, c: 55.0, u: 3 },
    { k: "辣椒粉", g: "调料", main: 0, kcal: 290, p: 10.0, f: 8.0, c: 50.0, u: 5 },
    { k: "豆瓣酱", g: "调料", main: 0, kcal: 140, p: 7.0, f: 5.0, c: 15.0, u: 15 },
    { k: "甜面酱", g: "调料", main: 0, kcal: 150, p: 4.0, f: 1.0, c: 30.0, u: 15 },
    { k: "香油", g: "调料", main: 0, kcal: 898, p: 0, f: 99.8, c: 0.2, u: 5 },
    { k: "猪油", g: "调料", main: 0, kcal: 827, p: 0, f: 91.0, c: 0, u: 15 },
    { k: "菜油", g: "调料", main: 0, kcal: 899, p: 0, f: 99.9, c: 0, u: 15 },
    { k: "食用油", g: "调料", main: 0, kcal: 899, p: 0, f: 99.9, c: 0, u: 15 },
    { k: "油", g: "调料", main: 0, kcal: 899, p: 0, f: 99.9, c: 0, u: 15 }
  ];

  /* ---------- 4. 人数换算 / 分量缩放 ---------- */
  // 解析 "大黄鱼 1条（约600克）"、"黄酒 2汤匙"、"盐 适量" 等
  function parseQty(s) {
    s = String(s);
    var out = { raw: s, scalable: false, amount: null, unit: "", digitStart: -1, digitEnd: -1, half: false };
    var m = s.match(/(\d+(?:\.\d+)?)/);
    if (m) {
      out.amount = parseFloat(m[1]);
      out.scalable = true;
      out.digitStart = m.index;
      out.digitEnd = m.index + m[1].length;
    } else if (s.indexOf("半") >= 0) {
      out.amount = 0.5;
      out.scalable = true;
      out.half = true;
    }
    var um = s.match(/(克|千克|公斤|斤|两|毫升|ml|升|汤匙|茶匙|大勺|小勺|汤勺|茶勺|勺|条|片|根|块|个|只|颗|粒|段|朵|瓣|张|把|杯|碗|g|kg|L)/i);
    if (um) out.unit = um[1].toLowerCase();
    return out;
  }

  function roundNice(x) {
    if (x >= 100) return Math.round(x);
    if (x >= 10) return Math.round(x * 2) / 2;
    if (x >= 1) return Math.round(x * 10) / 10;
    return Math.round(x * 100) / 100;
  }

  function formatAmt(x) {
    var v = parseFloat(x.toFixed(2));
    return String(v);
  }

  function scaleIngredient(s, factor) {
    if (!factor || factor === 1) return String(s);
    var p = parseQty(String(s));
    if (!p.scalable) return String(s);
    var nv = roundNice(p.amount * factor);
    if (p.digitStart >= 0) {
      return p.raw.slice(0, p.digitStart) + formatAmt(nv) + p.raw.slice(p.digitEnd);
    }
    if (p.half) {
      return p.raw.replace("半", formatAmt(nv));
    }
    return String(s);
  }

  function scaleIngredients(list, factor) {
    return (list || []).map(function (s) { return scaleIngredient(s, factor); });
  }

  /* ---------- 2. 按食材找菜「有什么吃什么」 ---------- */
  function matchLongest(s) {
    var best = null;
    for (var i = 0; i < ING.length; i++) {
      var e = ING[i];
      if (s.indexOf(e.k) >= 0) {
        if (!best || e.k.length > best.k.length) best = e;
      }
    }
    return best;
  }

  function findByIngredient(recipes, q) {
    q = String(q || "").trim();
    if (!q) return [];
    var keys = [q];
    for (var i = 0; i < ING.length; i++) {
      var e = ING[i];
      if (e.main && (e.k.indexOf(q) >= 0 || q.indexOf(e.k) >= 0)) {
        if (keys.indexOf(e.k) < 0) keys.push(e.k);
      }
    }
    var res = [];
    recipes.forEach(function (r) {
      var text = (r.ingredients || []).join(" ");
      for (var j = 0; j < keys.length; j++) {
        if (text.indexOf(keys[j]) >= 0) { res.push(r); break; }
      }
    });
    return res;
  }

  function mainKeywords() {
    var arr = [];
    ING.forEach(function (e) { if (e.main) arr.push(e.k); });
    return arr;
  }

  /* ---------- 5. 营养 / 卡路里估算 ---------- */
  function toGrams(amount, unit) {
    var u = (unit || "").toLowerCase();
    if (u === "g" || u === "克") return amount;
    if (u === "kg" || u === "千克" || u === "公斤") return amount * 1000;
    if (u === "斤") return amount * 500;
    if (u === "两") return amount * 50;
    return null; // 非重量单位（计数/容积类）
  }

  function ingGrams(s, e) {
    var p = parseQty(s);
    if (!p.scalable) return e.main ? e.u : 0; // 适量：主料按默认一份，调料忽略
    var w = toGrams(p.amount, p.unit);
    if (w != null) return w;
    return p.amount * e.u; // 计数类：数量 × 单份克数
  }

  function calcNutrition(r) {
    var total = { kcal: 0, p: 0, f: 0, c: 0 };
    var matched = [];
    var ings = r.ingredients || [];
    ings.forEach(function (s) {
      var e = matchLongest(s);
      if (!e) return;
      var grams = ingGrams(s, e);
      if (grams <= 0) return;
      var k = grams / 100;
      total.kcal += e.kcal * k;
      total.p += e.p * k;
      total.f += e.f * k;
      total.c += e.c * k;
      matched.push({ name: e.k, grams: Math.round(grams) });
    });
    return {
      kcal: Math.round(total.kcal),
      p: Math.round(total.p * 10) / 10,
      f: Math.round(total.f * 10) / 10,
      c: Math.round(total.c * 10) / 10,
      matched: matched
    };
  }

  /* ---------- 3. 购物清单聚合（分组：食材按大类，调料香料单独且去量词） ---------- */
  // 香料：本身是调味料，词典里被归在"蔬菜"，单独拎到调料香料区
  var SPICE = { "葱": 1, "姜": 1, "蒜": 1, "香菜": 1 };
  // 食材大类归并（采购分区）
  var FOOD_GROUP = {
    "海鲜": "海鲜河鲜", "河鲜": "海鲜河鲜",
    "肉类": "肉类", "蛋豆": "蛋奶豆",
    "蔬菜": "蔬菜菌菇", "菌菇": "蔬菜菌菇",
    "主食": "主食", "水果": "干果甜品"
  };
  var FOOD_ORDER = ["海鲜河鲜", "肉类", "蛋奶豆", "蔬菜菌菇", "主食", "干果甜品"];

  function isSeasoning(e) {
    return e && (e.g === "调料" || SPICE[e.k]);
  }

  function shopAggregate(recipesById) {
    // recipesById: id -> recipe 对象
    // 返回分组结构：[{label, tag, items:[{text, count}]}]，tag: food|seasoning|other
    var ids = shopGet();
    var groups = {};      // label -> {label, tag, items:{key->{text,count}}, itemOrder:[]}
    var hasSeasoning = false;
    var hasOther = false;

    function ensure(label, tag) {
      if (!groups[label]) groups[label] = { label: label, tag: tag, items: {}, itemOrder: [] };
      return groups[label];
    }
    function pushItem(g, key, text) {
      if (!g.items[key]) { g.items[key] = { text: text, count: 0 }; g.itemOrder.push(key); }
      g.items[key].count += 1;
    }
    function toItems(g) {
      return g.itemOrder.map(function (k) { return g.items[k]; });
    }

    ids.forEach(function (id) {
      var r = recipesById[id];
      if (!r) return;
      (r.ingredients || []).forEach(function (s) {
        var e = matchLongest(s);
        if (isSeasoning(e)) {
          hasSeasoning = true;
          var g = ensure("调料香料", "seasoning");
          pushItem(g, e.k, e.k);            // 去量词，只用标准名
        } else if (e && FOOD_GROUP[e.g]) {
          var label = FOOD_GROUP[e.g];
          var g2 = ensure(label, "food");
          pushItem(g2, s, s);               // 保留原文和量词
        } else {
          hasOther = true;
          var g3 = ensure("其他", "other");
          pushItem(g3, s, s);
        }
      });
    });

    var out = [];
    FOOD_ORDER.forEach(function (label) {
      var g = groups[label];
      if (g) out.push({ label: g.label, tag: g.tag, items: toItems(g) });
    });
    if (hasSeasoning) {
      var sg = groups["调料香料"];
      out.push({ label: sg.label, tag: sg.tag, items: toItems(sg) });
    }
    if (hasOther) {
      var og = groups["其他"];
      out.push({ label: og.label, tag: og.tag, items: toItems(og) });
    }
    return out;
  }

  /* ---------- 6. Schema.org JSON-LD ---------- */
  function injectRecipeJsonLd(r, catName) {
    var el = document.getElementById("recipe-jsonld");
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = "recipe-jsonld";
      document.head.appendChild(el);
    }
    var steps = [];
    (r.steps || []).forEach(function (s, i) {
      steps.push({ "@type": "HowToStep", position: i + 1, text: s });
    });
    var data = {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: r.name,
      description: r.desc || "",
      recipeCuisine: "慈溪菜",
      recipeCategory: catName || (r.cat || ""),
      recipeYield: "2-3 人份",
      recipeIngredient: (r.ingredients || []).slice(),
      recipeInstructions: steps
    };
    if (r.time) {
      var t = parseInt(r.time, 10);
      if (!isNaN(t) && t > 0) data.totalTime = "PT" + t + "M";
    }
    el.textContent = JSON.stringify(data);
  }

  function injectItemListJsonLd(items) {
    var el = document.getElementById("itemlist-jsonld");
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = "itemlist-jsonld";
      document.head.appendChild(el);
    }
    var data = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: (items || []).map(function (it, i) {
        return { "@type": "ListItem", position: i + 1, name: it.name };
      })
    };
    el.textContent = JSON.stringify(data);
  }

  /* ---------- 7. PWA 注册 ---------- */
  function registerPWA() {
    if (!("serviceWorker" in navigator)) return;
    if (window.addEventListener) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      });
    }
  }

  /* ---------- 导出 API ---------- */
  window.CX = {
    fav: { get: getFavs, is: isFav, toggle: toggleFav, count: favCount },
    shop: { get: shopGet, has: shopHas, add: shopAdd, remove: shopRemove, addMany: shopAddMany, clear: shopClear, aggregate: shopAggregate },
    ing: { find: findByIngredient, mainKeywords: mainKeywords },
    scale: { one: scaleIngredient, list: scaleIngredients, parse: parseQty },
    nutrition: { calc: calcNutrition },
    seo: { recipe: injectRecipeJsonLd, itemList: injectItemListJsonLd },
    pwa: { register: registerPWA }
  };
})();