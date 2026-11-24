import * as vg from "npm:@uwdata/vgplot";
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";
import { Generators } from "observablehq:stdlib";
import { html } from "npm:htl";
import * as Inputs from "npm:@observablehq/inputs";

export function createChartGroup({ data, tableName }) {
  const callbacks = new Set();
  const brush = vg.Selection.intersect();

  const observeHover = () =>
    Generators.observe((notify) => {
      notify(null);
      const listener = (item) => notify(item);
      callbacks.add(listener);
      return () => callbacks.delete(listener);
    });

  const observeFilter = () =>
    Generators.observe((notify) => {
      const update = () => notify(brush.predicate(tableName));
      update();
      brush.addEventListener("value", update);
      return () => brush.removeEventListener("value", update);
    });

  const createTable = (options = {}) => {
    return vg.table({
      from: tableName,
      filterBy: brush,
      height: 250,
      ...options
    });
  };

  const createDownloadButton = (label = "Скачать CSV", filename = `${tableName}-filtered.csv`) => {
    return Inputs.button(label, {
      reduce: async () => {
        const result = await vg.coordinator().query(
          vg.Query.from(tableName).select("*").where(brush.predicate(tableName))
        );
        const csvString = d3.csvFormat(result.toArray());
        const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  return {
    data,
    tableName,
    callbacks,
    brush,
    observeHover,
    observeFilter,
    createTable,
    createDownloadButton
  };
}

export function createResponsiveChart({
  group,
  aspect = 0.5,
  x,
  y,
  specBase,
  vgMarks,
  tipTitle,
  pointerStroke
}) {
  return async (cardWidth) => {
    const spec = {
      ...specBase,
      width: cardWidth,
      height: Math.round(cardWidth * aspect)
    };

    const baseChart = vg.plot(
      vg.width(spec.width),
      vg.height(spec.height),
      vg.grid(true),
      ...(spec.x?.domain ? [vg.xDomain(spec.x.domain)] : []),
      vg.xReverse(Boolean(spec.x?.reverse)),
      vg.xLabel(spec.x?.label ?? x),
      ...(spec.y?.domain ? [vg.yDomain(spec.y.domain)] : []),
      vg.yReverse(Boolean(spec.y?.reverse)),
      vg.yLabel(spec.y?.label ?? y),
      ...(spec.color?.scheme ? [vg.colorScheme(spec.color.scheme)] : []),
      vg.colorReverse(Boolean(spec.color?.reverse)),
      ...(spec.color?.domain ? [vg.colorDomain(spec.color.domain)] : []),
      ...vgMarks,
      ...(group ? [vg.intervalXY({ as: group.brush })] : [])
    );

    const tipOverlay = Plot.plot({
      ...spec,
      marks: [
        Plot.dot(
          group.data,
          Plot.pointer({ x, y, r: 5, stroke: pointerStroke, strokeWidth: 2, fill: "none" })
        ),
        Plot.tip(group.data, Plot.pointer({ x, y, title: tipTitle }))
      ]
    });

    tipOverlay.querySelectorAll('g[aria-label*="axis"]').forEach((el) => {
      el.style.opacity = "0";
    });
    baseChart.style.margin = "0";
    tipOverlay.style.cssText =
      "position: absolute; inset: 0; margin: 0; background: transparent; pointer-events: none;";

    const container = html`<div style="position: relative; width: ${spec.width}px; height: ${spec.height}px;">${baseChart}${tipOverlay}</div>`;

    const xScale = tipOverlay.scale("x");
    const yScale = tipOverlay.scale("y");

    if (group) {
      const onSync = (item, source) => {
        if (!container.isConnected) {
          group.callbacks.delete(onSync);
          return;
        }
        if (source === container) return;
        if (!item) {
          tipOverlay.dispatchEvent(new PointerEvent("pointerleave"));
          return;
        }
        const rect = tipOverlay.getBoundingClientRect();
        const clientX = rect.left + xScale.apply(item[x]);
        const clientY = rect.top + yScale.apply(item[y]);
        tipOverlay.dispatchEvent(new PointerEvent("pointermove", { clientX, clientY }));
      };
      group.callbacks.add(onSync);
    }

    let ticking = false;
    let lastItem = null;

    const emitItem = (item) => {
      if (item === lastItem) return;
      lastItem = item;
      if (group) {
        group.callbacks.forEach((fn) => fn(item, container));
      }
      container.dispatchEvent(new Event("input", { bubbles: true }));
    };

    container.addEventListener(
      "pointermove",
      (e) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          tipOverlay.dispatchEvent(
            new PointerEvent("pointermove", {
              clientX: e.clientX,
              clientY: e.clientY
            })
          );
          emitItem(tipOverlay.value || null);
          ticking = false;
        });
      },
      true
    );

    container.addEventListener(
      "pointerleave",
      () => {
        tipOverlay.dispatchEvent(new PointerEvent("pointerleave"));
        emitItem(null);
      },
      true
    );

    Object.defineProperty(container, "value", { get: () => tipOverlay.value });

    await new Promise(requestAnimationFrame);
    if (baseChart.pending) {
      await baseChart.pending;
    }

    return container;
  };
}

export function withLoading(renderFn, aspect = 0.5) {
  return (w) => {
    const box = html`<div style="display: grid; place-items: center; width: ${w}px; height: ${Math.round(w * aspect)}px;">
      <observablehq-loading></observablehq-loading>
    </div>`;

    Promise.resolve(renderFn(w)).then((chart) => {
      if (box.isConnected) box.replaceWith(chart);
    });

    return box;
  };
}

export function renderItemInfo(item, emptyText = "-") {
  if (!item) return emptyText;
  return Object.entries(item).map(([key, val]) => {
    const formattedVal = typeof val === "number" ? Number(val.toFixed(2)) : (val ?? "—");
    return html`<p><strong>${key} = ${formattedVal}</strong></p>`;
  });
}
