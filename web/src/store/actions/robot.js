export const ROS_CONECTADO = "ROS_CONECTADO";
export const ROS_DESCONECTADO = "ROS_DESCONECTADO";
export const TELEMETRIA_RECIBIDA = "TELEMETRIA_RECIBIDA";

export const rosConectado = () => {
  return { type: ROS_CONECTADO };
};

export const rosDesconectado = () => {
  return { type: ROS_DESCONECTADO };
};

// datos: lo que llega de /datos_stm32
// recibidoEn: Date.now() cuando llegó
export const telemetriaRecibida = (datos, recibidoEn) => {
  return { type: TELEMETRIA_RECIBIDA, data: { datos, recibidoEn } };
};
