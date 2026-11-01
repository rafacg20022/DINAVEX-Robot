/*
  Datos que se muestran como tarjetas en la página Monitor.
  "campo" debe llamarse igual que en el JSON del STM32 (ver serial/protocolo.py).

  CÓMO AGREGAR UN DATO NUEVO
  1. Agregarlo primero en serial/protocolo.py (ahí vienen los pasos).
  2. Agregar una línea aquí abajo, por ejemplo:
       { campo: "temp_driver", etiqueta: "Temperatura driver", unidad: "°C", decimales: 1 },
  3. Para graficarlo, agregarlo en src/Pages/Graficas/Graficas.jsx.
  4. Compilar: npm run build
*/

export const DATOS_MONITOR = [
  { campo: "inclinacion", etiqueta: "Inclinación", unidad: "°", decimales: 1 },
  { campo: "error", etiqueta: "Error", unidad: "°", decimales: 1 },
  { campo: "vel_izq", etiqueta: "Velocidad izquierda", unidad: "RPM", decimales: 0 },
  { campo: "vel_der", etiqueta: "Velocidad derecha", unidad: "RPM", decimales: 0 },
  { campo: "par_izq", etiqueta: "Par izquierdo", unidad: "N·m", decimales: 2 },
  { campo: "par_der", etiqueta: "Par derecho", unidad: "N·m", decimales: 2 },
  { campo: "bat_24v", etiqueta: "Batería 24 V", unidad: "V", decimales: 1 },
];

// Ganancias de los dos controladores (página Control)
export const GANANCIAS = [
  { campo: "pd_kp", etiqueta: "Kp", controlador: "PD" },
  { campo: "pd_kd", etiqueta: "Kd", controlador: "PD" },
  { campo: "pi_kp", etiqueta: "Kp", controlador: "PI" },
  { campo: "pi_ki", etiqueta: "Ki", controlador: "PI" },
];
