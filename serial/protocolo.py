# ==============================================================
# PROTOCOLO SERIAL STM32 <-> RASPBERRY PI
# ==============================================================
#
# Funciones para leer los datos que manda el STM32 y para armar los
# comandos que se le mandan. Las usa receptor_stm32.py.
#
# Conexión: USB serial a 115200 baudios. Cada mensaje es una línea que
# termina en "\n". Hay dos formatos: json (el que usamos) y texto. Se
# elige con self.formato en receptor_stm32.py.
#
# --------------------------------------------------------------
# DATOS QUE MANDA EL STM32 (20 veces por segundo)
# --------------------------------------------------------------
#
# json:
# {"inclinacion":-1.25,"error":1.25,"vel_izq":42.0,"vel_der":43.0,"par_izq":0.12,"par_der":0.11,"pd_kp":32.000,"pd_kd":1.600,"pi_kp":0.500,"pi_ki":0.050,"estado":1,"bat_24v":24.10}
#
# texto (mismos datos en el mismo orden):
# $TEL,-1.25,1.25,42.0,43.0,0.12,0.11,32.000,1.600,0.500,0.050,1,24.10
#
#   inclinacion      grados (positivo = hacia adelante)
#   error            grados (setpoint - inclinación, del controlador PD)
#   vel_izq, vel_der velocidad de las ruedas en RPM
#   par_izq, par_der par de las ruedas en N·m
#   pd_kp, pd_kd     ganancias del PD que está usando el STM32
#   pi_kp, pi_ki     ganancias del PI que está usando el STM32
#   estado           1 = encendido, 0 = apagado
#   bat_24v          voltaje de la batería de 24 V
#
# - Las ganancias se mandan con 3 decimales (%.3f) para que la interfaz
#   pueda confirmar que se aplicaron.
# - Si un dato todavía no se mide, mandar 0. Si falta un campo, la línea
#   se descarta.
#
# Ejemplo en C (necesita -u _printf_float en el linker):
#
#   printf("{\"inclinacion\":%.2f,\"error\":%.2f,\"vel_izq\":%.1f,\"vel_der\":%.1f,"
#          "\"par_izq\":%.3f,\"par_der\":%.3f,\"pd_kp\":%.3f,\"pd_kd\":%.3f,"
#          "\"pi_kp\":%.3f,\"pi_ki\":%.3f,\"estado\":%d,\"bat_24v\":%.2f}\n",
#          inclinacion, error, vel_izq, vel_der, par_izq, par_der,
#          pd_kp, pd_kd, pi_kp, pi_ki, estado, bat_24v);
#
# --------------------------------------------------------------
# COMANDOS QUE RECIBE EL STM32
# --------------------------------------------------------------
#
#   json                                                                    texto
#   {"cmd":"ganancias","pd_kp":32.0,"pd_kd":1.6,"pi_kp":0.5,"pi_ki":0.05}   $GAN,32.000,1.600,0.500,0.050
#   {"cmd":"arranque"}                                                      $ARR
#   {"cmd":"paro"}                                                          $PARO
#   {"cmd":"adelante"}                                                      $ADE
#   {"cmd":"atras"}                                                         $ATR
#   {"cmd":"detener"}                                                       $DET
#
# - adelante y atras se repiten cada 200 ms mientras se mantiene presionado
#   el botón en la interfaz. Al soltarlo se manda detener.
#
# Los campos siempre llegan en este orden y sin espacios, así que en el
# STM32 se pueden leer sin librerías (sscanf necesita -u _scanf_float):
#
#   if (strstr(linea, "\"cmd\":\"paro\"")) paro();
#   else if (strstr(linea, "\"cmd\":\"arranque\"")) arranque();
#   else if (strstr(linea, "\"cmd\":\"adelante\"")) mover(1);
#   else if (strstr(linea, "\"cmd\":\"atras\"")) mover(-1);
#   else if (strstr(linea, "\"cmd\":\"detener\"")) mover(0);
#   else if (strstr(linea, "\"cmd\":\"ganancias\""))
#       sscanf(linea, "{\"cmd\":\"ganancias\",\"pd_kp\":%f,\"pd_kd\":%f,\"pi_kp\":%f,\"pi_ki\":%f}",
#              &pd_kp, &pd_kd, &pi_kp, &pi_ki);
#
# Reglas para el STM32:
# 1. Equilibra el robot por su cuenta, con o sin la Pi. Si se pierde la
#    comunicación sigue equilibrando. La Pi nunca manda paro por su cuenta.
# 2. paro es el único comando que apaga los motores. Después de un paro
#    solo vuelve a operar con arranque.
# 3. adelante y atras solo cambian la velocidad de referencia; detener la
#    regresa a cero. El equilibrio sigue activo.
# 4. Si pasan 500 ms sin recibir adelante ni atras, hacer lo mismo que con
#    detener (por si se cae el Wi-Fi con el botón presionado).
# 5. Al recibir ganancias, aplicarlas y mandarlas en los siguientes datos.
# 6. Ignorar las líneas que no entienda.
#
# --------------------------------------------------------------
# CÓMO AGREGAR UN DATO NUEVO
# --------------------------------------------------------------
# 1. En el STM32, agregarlo a la línea (al final si se usa texto).
# 2. Agregar su nombre al final de CAMPOS (aquí abajo).
# 3. Agregarlo en ros2/simulador_robot.py, en el diccionario datos.
# 4. En la interfaz, agregarlo en web/src/constants/telemetria.js y, si se
#    quiere graficar, en web/src/Pages/Graficas/Graficas.jsx.
#
# --------------------------------------------------------------
# CÓMO AGREGAR UN COMANDO NUEVO
# --------------------------------------------------------------
# 1. En el STM32, atender la línea nueva.
# 2. Agregarlo en COMANDOS (aquí abajo) con su versión en texto.
# 3. Agregarlo en ros2/simulador_robot.py, en recibir_comando.
# 4. En la interfaz, mandarlo con enviarComando("nombre") (ver
#    web/src/ros/conexionRos.js).
# ==============================================================

import json
import math


# Datos que manda el STM32 (en el orden del formato texto)
CAMPOS = [
    "inclinacion", "error",
    "vel_izq", "vel_der",
    "par_izq", "par_der",
    "pd_kp", "pd_kd", "pi_kp", "pi_ki",
    "estado",
    "bat_24v",
]

GANANCIAS = ["pd_kp", "pd_kd", "pi_kp", "pi_ki"]

# Comandos que entiende el STM32 y cómo se escriben en formato texto
COMANDOS = {
    "ganancias": "$GAN",
    "arranque": "$ARR",
    "paro": "$PARO",
    "adelante": "$ADE",
    "atras": "$ATR",
    "detener": "$DET",
}


def revisar_numero(nombre, valor):

    # En Python true/false cuentan como números, por eso se revisan aparte
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError(f"{nombre} no es un número: {valor}")

    if not math.isfinite(valor):
        raise ValueError(f"{nombre} no es un número válido: {valor}")

    return float(valor)


# ==============================================
# LEER LOS DATOS DEL STM32
# ==============================================

def leer_datos(linea, formato):

    if formato == "texto":

        partes = linea.split(",")

        if partes[0] != "$TEL":
            raise ValueError("la línea no empieza con $TEL")

        if len(partes) - 1 != len(CAMPOS):
            raise ValueError(
                f"se esperaban {len(CAMPOS)} valores y llegaron {len(partes) - 1}"
            )

        recibido = {}

        for campo, texto in zip(CAMPOS, partes[1:]):
            try:
                recibido[campo] = float(texto)
            except ValueError:
                raise ValueError(f"{campo} no es un número: {texto}")

    else:

        try:
            recibido = json.loads(linea)
        except json.JSONDecodeError:
            raise ValueError("no es JSON válido")

        if not isinstance(recibido, dict):
            raise ValueError("el JSON no es un objeto {...}")

    faltan = [campo for campo in CAMPOS if campo not in recibido]

    if faltan:
        raise ValueError("faltan campos: " + ", ".join(faltan))

    # Solo se guardan los campos conocidos, ya revisados
    datos = {}

    for campo in CAMPOS:
        datos[campo] = revisar_numero(campo, recibido[campo])

    if datos["estado"] not in (0, 1):
        raise ValueError("estado debe ser 0 o 1")

    datos["estado"] = int(datos["estado"])

    return datos


# ==============================================
# ARMAR LOS COMANDOS PARA EL STM32
# ==============================================

def revisar_ganancias(ganancias):

    revisadas = {}

    for nombre in GANANCIAS:

        if nombre not in ganancias:
            raise ValueError(f"falta {nombre}")

        valor = revisar_numero(nombre, ganancias[nombre])

        if valor < 0:
            raise ValueError(f"{nombre} no puede ser negativa")

        revisadas[nombre] = valor

    return revisadas


def armar_comando(comando, formato, ganancias=None):

    if comando not in COMANDOS:
        raise ValueError(f"comando desconocido: {comando}")

    if comando == "ganancias":
        ganancias = revisar_ganancias(ganancias or {})

    if formato == "texto":

        linea = COMANDOS[comando]

        if comando == "ganancias":
            for nombre in GANANCIAS:
                linea += f",{ganancias[nombre]:.3f}"

    else:

        mensaje = {"cmd": comando}

        if comando == "ganancias":
            for nombre in GANANCIAS:
                mensaje[nombre] = round(ganancias[nombre], 3)

        # Sin espacios para que el STM32 lo pueda leer con sscanf
        linea = json.dumps(mensaje, separators=(",", ":"))

    return (linea + "\n").encode()
