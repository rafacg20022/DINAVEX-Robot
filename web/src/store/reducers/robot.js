import {
  ROS_CONECTADO,
  ROS_DESCONECTADO,
  TELEMETRIA_RECIBIDA,
  LINEA_SERIAL_RECIBIDA,
  LIMPIAR_SERIAL,
} from "../actions/robot";

// Segundos que se guardan para las gráficas
export const SEGUNDOS_HISTORIAL = 60;

// Líneas que se guardan para la página Serial
export const MAX_LINEAS_SERIAL = 200;

const initialState = {
  conectadoRos: false,
  telemetria: null,      // últimos datos del STM32
  ultimaRecepcion: null, // hora en que llegaron
  historial: [],         // datos para las gráficas
  lineasSerial: [],      // tráfico del puerto serial, la más nueva primero
  contadorSerial: 0,     // id de cada línea
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case ROS_CONECTADO:
      return { ...state, conectadoRos: true };

    case ROS_DESCONECTADO:
      return { ...state, conectadoRos: false };

    case TELEMETRIA_RECIBIDA: {
      const { datos, recibidoEn } = action.data;
      const t = recibidoEn / 1000; // segundos

      // Agregar el dato nuevo y quitar los de más de 60 s
      const historial = [...state.historial, { t, ...datos }].filter(
        (punto) => punto.t >= t - SEGUNDOS_HISTORIAL
      );

      return {
        ...state,
        telemetria: datos,
        ultimaRecepcion: recibidoEn,
        historial,
      };
    }

    case LINEA_SERIAL_RECIBIDA: {
      const { linea, recibidoEn } = action.data;
      const id = state.contadorSerial + 1;

      // Agregar arriba y quitar las más viejas
      const lineasSerial = [{ id, recibidoEn, ...linea }, ...state.lineasSerial].slice(
        0,
        MAX_LINEAS_SERIAL
      );

      return { ...state, lineasSerial, contadorSerial: id };
    }

    case LIMPIAR_SERIAL:
      return { ...state, lineasSerial: [] };

    default:
      return state;
  }
};

export default reducer;
