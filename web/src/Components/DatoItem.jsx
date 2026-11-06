import React from "react";
import { Card, Statistic } from "antd";
import formatearValor from "./formatearValor";

// Tarjeta para mostrar un dato
const DatoItem = ({ titulo, valor, unidad, decimales = 1, color }) => {
  return (
    // Misma altura en todas las tarjetas
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
