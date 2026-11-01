import { rosConectado, rosDesconectado, telemetriaRecibida } from "../store/actions/robot";

/*
  Conexión con ROS 2 por medio de rosbridge (WebSocket en el puerto 9090).

  - Recibe /datos_stm32: los datos del STM32 en JSON.
  - Publica en /comandos_stm32: los comandos para el STM32, por ejemplo {"cmd":"paro"}.

  Si se pierde la conexión vuelve a intentar sola, esperando cada vez un poco
  más (máximo 15 s).

  CÓMO AGREGAR UN COMANDO NUEVO
  1. Agregarlo primero en serial/protocolo.py (ahí vienen los pasos).
  2. Desde la página mandarlo con:  enviarComando("calibrar")
     Si lleva datos:               enviarComando("ganancias", { pd_kp: 32, ... })
*/

const MAX_DELAY = 15000;

let socket = null;

const obtenerUrl = () => {
  // Con "npm run dev" la dirección de la Pi se pone en el archivo .env
  if (import.meta.env.DEV && import.meta.env.VITE_ROSBRIDGE_URL_DEV) {
    return import.meta.env.VITE_ROSBRIDGE_URL_DEV;
  }
  return "ws://" + window.location.hostname + ":9090";
};

export const abrirConexionRos = (dispatch) => {
  let reconnectDelay = 1000;
  let shouldReconnect = true;
  let timer = null;

  const connect = () => {
    socket = new WebSocket(obtenerUrl());

    socket.onopen = () => {
      reconnectDelay = 1000;

      // throttle_rate: 100 -> máximo 10 mensajes por segundo para no saturar el celular
      socket.send(JSON.stringify({
        op: "subscribe",
        topic: "/datos_stm32",
        type: "std_msgs/msg/String",
        throttle_rate: 100,
        queue_length: 1,
      }));

      socket.send(JSON.stringify({
        op: "advertise",
        topic: "/comandos_stm32",
        type: "std_msgs/msg/String",
      }));

      dispatch(rosConectado());
    };

    socket.onmessage = (event) => {
      try {
        const mensaje = JSON.parse(event.data);

        if (mensaje.op === "publish" && mensaje.topic === "/datos_stm32") {
          const datos = JSON.parse(mensaje.msg.data);
          dispatch(telemetriaRecibida(datos, Date.now()));
        }
      } catch (error) {
        console.error("Error al procesar datos:", error);
      }
    };

    socket.onclose = () => {
      dispatch(rosDesconectado());

      if (shouldReconnect) {
        timer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(MAX_DELAY, reconnectDelay * 1.6);
      }
    };
  };

  connect();

  // Se llama al cerrar la página
  return () => {
    shouldReconnect = false;
    clearTimeout(timer);
    if (socket) socket.close();
  };
};

// Manda un comando al STM32. Regresa false si no hay conexión con ROS 2.
export const enviarComando = (cmd, datos = {}) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;

  const comando = JSON.stringify({ cmd, ...datos });

  socket.send(JSON.stringify({
    op: "publish",
    topic: "/comandos_stm32",
    msg: { data: comando },
  }));

  return true;
};

export default abrirConexionRos;
