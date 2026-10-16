# 近代中国 · 时间轴

学习中国近代史（1840–1949）的站点，按月浏览重大事件。

## 运行

无需构建，直接双击打开 `index.html` 即可。地图底图使用高德瓦片，需要联网。

## 结构

```
index.html                页面骨架
css/style.css             样式（支持亮色/暗色）
js/app.js                 密度图、时间轴、筛选、详情抽屉、地图、因果链
data/events.js            1919–1949 事件，以及全局配置（时间范围、时期、主题标签）
data/events-1840-1918.js  1840–1918 事件、人物、世界同期
data/lenses.js            1919–1949 多维视角评述（权力博弈 / 经济学 / 社会学）
data/lenses-1840-1918.js  1840–1918 多维视角评述
data/details-extra.js     追加的完整详解（太平天国、戊戌变法、四一二政变、西安事变）
data/media.js             图片素材清单（外链地址、说明、作者、授权、原始页面）
vendor/leaflet/           地图库（本地化，避免 CDN 访问问题）
```

## 添加内容

事件内容在 `data/events*.js` 里（1840–1918 的文件用 `E(...)` 简写来写简要条目）：

- 简要条目：填写 `id / date / title / importance / tags / summary` 即可
- 完整详解：再加一个 `detail` 字段（背景、起因、过程、影响、人物、地点、史料、古今对照、来源），格式参照五四运动这一条
- 因果链：在 `causes` / `effects` 里填写关联事件的 id，双向关系会自动补全
- 地点坐标使用 WGS-84（GPS 坐标），程序会自动转换为高德使用的坐标系

多维视角在 `data/lenses*.js` 里，按事件 id 索引：

- 简评：`power / economy / society` 各写一个字符串
- 深度：写成对象 `{ text, actors, points }`，`actors` 是博弈方表格（目标、筹码、结果），`points` 是“概念 + 解释”列表，格式参照五四运动这一条

## 图片与影像

- 图片以外链方式引用维基共享资源（Wikimedia Commons），不下载到本地；所在网络无法访问该网站时图片不会显示
- 每张图都在灯箱中标注作者 / 出处、授权和原始页面链接；绝大多数为公有领域（Public domain）
- 视频：每个事件的详情页都会自动生成哔哩哔哩搜索入口（纪录片、历史影像）
- 新增图片：在 `data/media.js` 中按事件 id 添加 `{ type: "image", src, thumb, orig, caption, credit, license, page }`（`orig` 为原图地址，缩略图加载失败时使用）；
  本地视频可用 `{ type: "video", src, caption }`，外部链接可用 `{ type: "link", title, note, url }`
