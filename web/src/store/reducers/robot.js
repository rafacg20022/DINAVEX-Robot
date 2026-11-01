import { ROS_CONECTADO, ROS_DESCONECTADO, TELEMETRIA_RECIBIDA } from "../actions/robot";

// Segundos que se guardan para las gráficas (unos 600 datos)
export const SEGUNDOS_HISTORIAL = 60;

const initialState = {
  conectadoRos: false,
  telemetria: null,      // últimos datos del STM32
  ultimaRecepcion: null, // cuándo llegaron (Date.now())
  historial: [],         // [{ t, inclinacion, error, ... }] para las gráficas
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

      // Se agrega el dato nuevo y se quitan los que tengan más de 60 s
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

    default:
      return state;
  }
};

export default reducer;
