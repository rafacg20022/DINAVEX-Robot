import React from "react";
import { ResponsiveLineCanvas } from "@nivo/line";
import { AZUL } from "../constants/colores";

// Gráfica de una o varias señales.
// series: [{ campo: "vel_izq", etiqueta: "Izquierda" }, ...]
// ventana: segundos que se muestran

// Colores de las líneas
const COLORES = [AZUL, "#fa8c16", "#52c41a", "#eb2f96"];

const GraficaItem = ({ historial, series, ventana = 30, altura = 220 }) => {
  if (historial.length < 2) {
    return (
      <div style={{ height: altura, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
        Esperando datos...
      </div>
    );
  }

  // Eje X en segundos, 0 es ahora
  const tUltimo = historial[historial.length - 1].t;
  const puntos = historial.filter((p) => p.t >= tUltimo - ventana);

  const data = series.map((serie) => ({
    id: serie.etiqueta,
    data: puntos.map((p) => ({ x: p.t - tUltimo, y: p[serie.campo] })),
  }));

  const conLeyenda = series.length > 1;

  return (
    <div style={{ height: altura }}>
      <ResponsiveLineCanvas
        data={data}
        colors={COLORES}
        margin={{ top: 10, right: 15, bottom: conLeyenda ? 60 : 40, left: 40 }}
        xScale={{ type: "linear", min: -ventana, max: 0 }}
        yScale={{ type: "linear", min: "auto", max: "auto" }}
        axisBottom={{ tickValues: 6, legend: "Tiempo (s)", legendOffset: 30, legendPosition: "middle" }}
        axisLeft={{ tickValues: 5 }}
        enablePoints={false}
        enableGridX={false}
        lineWidth={2}
        isInteractive={false}
        legends={conLeyenda ? [{
          anchor: "bottom-left",
          direction: "row",
          translateY: 58,
          itemWidth: 100,
          itemHeight: 14,
          symbolSize: 10,
        }] : []}
      />
    </div>
  );
};

// memo para que no se vuelva a dibujar si está en pausa
export default React.memo(GraficaItem);
