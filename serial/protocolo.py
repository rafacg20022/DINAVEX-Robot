# PROTOCOLO SERIAL STM32 <-> RASPBERRY PI
#
# Funciones para leer los datos del STM32 y armar los comandos que se
# le mandan. Las usa receptor_stm32.py.
#
# Serial a 115200 baudios, un mensaje por línea. Hay dos formatos, json
# (el que usamos) y texto. Se cambia en receptor_stm32.py.
#
# DATOS DEL STM32 (20 veces por segundo)
#
# json:
# {"inclinacion":-1.25,"error":1.25,"vel_izq":42.0,"vel_der":43.0,"par_izq":0.12,"par_der":0.11,"pd_kp":32.000,"pd_kd":1.600,"pi_kp":0.500,"pi_ki":0.050,"estado":1,"bat_24v":24.10}
#
# texto:
# $TEL,-1.25,1.25,42.0,43.0,0.12,0.11,32.000,1.600,0.500,0.050,1,24.10
#
# inclinacion y error en grados (positivo hacia adelante), velocidades
# en RPM, par en N·m y bat_24v en volts. estado: 1 encendido, 0 apagado.
# pd_kp, pd_kd, pi_kp y pi_ki son las ganancias que tiene el STM32, con
# 3 decimales.
#
# Si falta un dato la línea se descarta. Si todavía no se mide, mandar 0.
#
# COMANDOS PARA EL STM32
#
# json:  {"cmd":"paro"}, {"cmd":"arranque"}, {"cmd":"adelante"},
#        {"cmd":"atras"}, {"cmd":"detener"} y
#        {"cmd":"ganancias","pd_kp":32.0,"pd_kd":1.6,"pi_kp":0.5,"pi_ki":0.05}
#
# texto: $PARO, $ARR, $ADE, $ATR, $DET y $GAN,32.000,1.600,0.500,0.050
#
# Los json van sin espacios y siempre en ese orden.
#
# adelante y atras se mandan cada 200 ms mientras se tiene presionado el
# botón. Al soltarlo se manda detener.
#
# apagar_pi no llega al STM32, con ese receptor_stm32.py apaga la Pi.
#
# Lo que tiene que hacer el STM32:
# 1. Equilibrar siempre, aunque se pierda la comunicación con la Pi.
# 2. Apagar los motores solo con paro (la Pi nunca lo manda sola) y
#    volver a operar con arranque.
# 3. Con adelante/atras cambiar la velocidad de referencia y con detener
#    regresarla a 0.
# 4. Si pasan 500 ms sin adelante ni atras, detenerse.
# 5. Aplicar las ganancias que lleguen y mandarlas en los datos.
# 6. Ignorar lo que no entienda.
#
# Para usar printf y sscanf con decimales en el STM32 hay que agregar
# -u _printf_float y -u _scanf_float en el linker.
#
# CÓMO AGREGAR UN DATO NUEVO
# 1. En el STM32, agregarlo al mensaje (al final si se usa texto).
# 2. Agregarlo al final de CAMPOS.
# 3. Agregarlo en ros2/simulador_robot.py, en el diccionario datos.
# 4. En la interfaz, agregarlo en web/src/constants/telemetria.js y, si se
#    quiere graficar, en web/src/Pages/Graficas/Graficas.jsx.
#
# CÓMO AGREGAR UN COMANDO NUEVO
# 1. En el STM32, atender el comando nuevo.
# 2. Agregarlo en COMANDOS con su versión en texto.
# 3. Agregarlo en ros2/simulador_robot.py, en recibir_comando.
# 4. En la interfaz, mandarlo con enviarComando("nombre").

import json
import math


# Datos que manda el STM32, en orden
CAMPOS = [
    "inclinacion", "error",
    "vel_izq", "vel_der",
    "par_izq", "par_der",
    "pd_kp", "pd_kd", "pi_kp", "pi_ki",
    "estado",
    "bat_24v",
]

GANANCIAS = ["pd_kp", "pd_kd", "pi_kp", "pi_ki"]

# Comandos y su versión en texto
COMANDOS = {
    "ganancias": "$GAN",
    "arranque": "$ARR",
    "paro": "$PARO",
    "adelante": "$ADE",
    "atras": "$ATR",
    "detener": "$DET",
}


def revisar_numero(nombre, valor):

    # True y False también cuentan como números
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError(f"{nombre} no es un número: {valor}")

    if not math.isfinite(valor):
        raise ValueError(f"{nombre} no es un número válido: {valor}")

    return float(valor)


# LEER LOS DATOS DEL STM32

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

    # Guardar solo los campos conocidos
    datos = {}

    for campo in CAMPOS:
        datos[campo] = revisar_numero(campo, recibido[campo])

    if datos["estado"] not in (0, 1):
        raise ValueError("estado debe ser 0 o 1")

    datos["estado"] = int(datos["estado"])

    return datos


# ARMAR LOS COMANDOS PARA EL STM32

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

        # Sin espacios para leerlo fácil en el STM32
        linea = json.dumps(mensaje, separators=(",", ":"))

    return (linea + "\n").encode()
