/*
  Datos del STM32 y de la página Monitor.
  "campo" es el nombre del dato en el JSON del STM32.

  CÓMO AGREGAR UN DATO NUEVO
  1. Agregarlo primero en serial/protocolo.py.
  2. Agregarlo al final de CAMPOS_STM32.
  3. Si se quiere ver en Monitor, agregar una línea en DATOS_MONITOR, por ejemplo:
       { campo: "temp_driver", etiqueta: "Temperatura driver", unidad: "°C", decimales: 1 },
  4. Si se quiere graficar, agregarlo en src/Pages/Graficas/Graficas.jsx.
  5. Correr npm run build
*/

// Datos que manda el STM32, en el mismo orden que serial/protocolo.py
// Son las columnas del TXT para MATLAB
export const CAMPOS_STM32 = [
  "inclinacion", "error",
  "vel_izq", "vel_der",
  "par_izq", "par_der",
  "pd_kp", "pd_kd", "pi_kp", "pi_ki",
  "estado",
  "bat_24v",
  "modo",
];

export const DATOS_MONITOR = [
  { campo: "inclinacion", etiqueta: "Inclinación", unidad: "°", decimales: 1 },
  { campo: "error", etiqueta: "Error", unidad: "°", decimales: 1 },
  { campo: "vel_izq", etiqueta: "Velocidad izquierda", unidad: "RPM", decimales: 0 },
  { campo: "vel_der", etiqueta: "Velocidad derecha", unidad: "RPM", decimales: 0 },
  { campo: "par_izq", etiqueta: "Par izquierdo", unidad: "N·m", decimales: 2 },
  { campo: "par_der", etiqueta: "Par derecho", unidad: "N·m", decimales: 2 },
  { campo: "bat_24v", etiqueta: "Batería 24 V", unidad: "V", decimales: 1 },
];

// Ganancias que manda el STM32 (Control, y Monitor del invitado)
export const GANANCIAS = [
  { campo: "pd_kp", etiqueta: "Kp", controlador: "PD" },
  { campo: "pd_kd", etiqueta: "Kd", controlador: "PD" },
  { campo: "pi_kp", etiqueta: "Kp", controlador: "PI" },
  { campo: "pi_ki", etiqueta: "Ki", controlador: "PI" },
];

// Opciones de ganancias de la página Control
// Las ganancias de cada opción están en el STM32
export const OPCIONES_GANANCIAS = [
  { value: 1, label: "Óptimo" },
  { value: 2, label: "Marginalmente estable" },
  { value: 3, label: "Inestable" },
];

// Ganancias óptimas, solo con estas se puede mover el robot
export const GANANCIAS_OPTIMAS = { pd_kp: -123, pd_kd: -25, pi_kp: -24, pi_ki: -4 };

// Llegan con decimales del STM32 (-123.000), por eso no se compara con ===
export const tieneGananciasOptimas = (telemetria) => {
  if (!telemetria) return false;

  return Object.keys(GANANCIAS_OPTIMAS).every(
    (campo) => Math.abs(telemetria[campo] - GANANCIAS_OPTIMAS[campo]) < 0.01
  );
};
