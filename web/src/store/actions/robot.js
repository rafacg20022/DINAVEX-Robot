export const ROS_CONECTADO = "ROS_CONECTADO";
export const ROS_DESCONECTADO = "ROS_DESCONECTADO";
export const TELEMETRIA_RECIBIDA = "TELEMETRIA_RECIBIDA";
export const LINEA_SERIAL_RECIBIDA = "LINEA_SERIAL_RECIBIDA";
export const LIMPIAR_SERIAL = "LIMPIAR_SERIAL";

export const rosConectado = () => {
  return { type: ROS_CONECTADO };
};

export const rosDesconectado = () => {
  return { type: ROS_DESCONECTADO };
};

// Datos de /datos_stm32 y la hora en que llegaron
export const telemetriaRecibida = (datos, recibidoEn) => {
  return { type: TELEMETRIA_RECIBIDA, data: { datos, recibidoEn } };
};

// Línea de /serial_crudo y la hora en que llegó
export const lineaSerialRecibida = (linea, recibidoEn) => {
  return { type: LINEA_SERIAL_RECIBIDA, data: { linea, recibidoEn } };
};

export const limpiarSerial = () => {
  return { type: LIMPIAR_SERIAL };
};
