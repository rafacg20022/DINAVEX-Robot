import React from "react";
import { Card, Statistic } from "antd";
import formatearValor from "./formatearValor";

// Tarjeta con un dato del robot: título, valor y unidad.
const DatoItem = ({ titulo, valor, unidad, decimales = 1, color }) => {
  return (
    // height 100%: todas las tarjetas de un renglón miden lo mismo
    <Card size="small" style={{ height: "100%" }}>
      <Statistic
        title={titulo}
        value={formatearValor(valor, decimales)}
        suffix={unidad}
        valueStyle={color ? { color } : undefined}
      />
    </Card>
  );
};

export default DatoItem;
