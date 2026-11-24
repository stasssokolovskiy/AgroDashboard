# DB Example

```js
import {sql} from "./components/remoteDB.js";
import {
  createChartGroup,
  createResponsiveChart,
  withLoading,
  renderItemInfo
} from "./components/chart.js";

```

```sql id=stars_
SELECT id, ra, dec, ci, absmag, mag, COALESCE(proper, '-') AS proper
FROM stars
WHERE ci IS NOT NULL AND absmag IS NOT NULL AND ra IS NOT NULL AND dec IS NOT NULL
```

```js
import * as vg from "npm:@uwdata/vgplot";
import * as Arrow from "npm:apache-arrow";

const wasm = await vg.wasmConnector();
vg.coordinator().databaseConnector(wasm);

const ipcBytes = Arrow.tableToIPC(stars_, "stream");
const conn = await wasm.getConnection();
await conn.query("DROP TABLE IF EXISTS stars");
await conn.insertArrowFromIPCStream(ipcBytes, { name: "stars" });

```

```js
const starsGroup = createChartGroup({
  data: stars_,
  tableName: "stars"
});

const colorSpec = { scheme: "RdYlBu", reverse: true, domain: [-0.4, 3.0] };

const renderHrChart = createResponsiveChart({
  group: starsGroup,
  aspect: 0.6,
  x: "ci",
  y: "absmag",
  specBase: {
    x: { domain: d3.extent(stars_, (d) => d.ci), label: "Показатель цвета (CI)" },
    y: { domain: d3.extent(stars_, (d) => d.absmag), reverse: true, label: "Абсолютная звёздная величина (AbsMag)" },
    color: colorSpec
  },
  vgMarks: [
    vg.dot(vg.from(starsGroup.tableName), { x: "ci", y: "absmag", r: 0.22, fillOpacity: 0.5, fill: "ci" })
  ],
  tipTitle: (d) => `CI: ${d.ci.toFixed(2)}\nAbsMag: ${d.absmag.toFixed(2)}`,
  pointerStroke: "ci"
});

const renderSkyMap = createResponsiveChart({
  group: starsGroup,
  aspect: 0.5,
  x: "ra",
  y: "dec",
  specBase: {
    x: { reverse: true, label: "Прямое восхождение (RA)" },
    y: { label: "Склонение (Dec)" },
    color: colorSpec
  },
  vgMarks: [
    vg.rScale("linear"),
    vg.rDomain([0, 1]),
    vg.rRange([0.15, 3.2]),
    vg.rClamp(true),
    vg.dot(vg.from(starsGroup.tableName), { x: "ra", y: "dec", fill: "ci", fillOpacity: 0.85, r: vg.sql`exp(-0.5 * mag)` })
  ],
  tipTitle: (d) => `RA: ${d.ra.toFixed(2)}\nDec: ${d.dec.toFixed(2)}°`,
  pointerStroke: "ci"
});

const starsTable = starsGroup.createTable({ height: 250 });
const downloadBtn = starsGroup.createDownloadButton("CSV", "filtered-stars.csv");

```

```js

const hoveredStar = starsGroup.observeHover();
const filter = starsGroup.observeFilter();

```

```js

const stats = await vg.coordinator().query(
  vg.Query
    .from(starsGroup.tableName)
    .select({ count: vg.count() })
    .where(filter)
);
const totalCount = stats.get(0).count;

```

<div class="grid" style="grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: stretch;">

<div style="display: flex; flex-direction: column; gap: 1rem;">

<div class="card" style="margin: 0;">

### Диаграмма Герцшпрунга - Рассела
Абсолютная звёздная величина (**AbsMag**) и Цвет (**CI**).

```js
display(resize(withLoading(renderHrChart, 0.6)));
```

</div>

<div class="card" style="margin: 0;">

### Карта

Прямое восхождение (**RA**) и Склонение (**Dec**).

```js
display(resize(withLoading(renderSkyMap, 0.5)));
```

</div>

</div>

<div class="card" style="margin: 0;">



### Звёзды

<div class="card">

### Выбранная звезда (курсор)

 ${renderItemInfo(hoveredStar, "Не выбрано")}


</div>

<div class="card">

### Выделите области на графиках

Выбрано звёзд \(область\): **${totalCount.toLocaleString("ru-RU")}**

***Cкачать? ${downloadBtn}***

```js
display(starsTable);
```

</div>

</div>

</div>

