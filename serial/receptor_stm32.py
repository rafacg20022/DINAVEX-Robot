import glob
import json
import time
import os
import serial
import rclpy

from rclpy.executors import ExternalShutdownException
from rclpy.node import Node
from std_msgs.msg import String

import protocolo


class ReceptorSerial(Node):

    def __init__(self):

        super().__init__('receptor_serial')

        # ==========================================
        # CONFIGURACION ROS 2
        # ==========================================

        # Datos del STM32 hacia la interfaz
        self.publisher = self.create_publisher(
            String,
            '/datos_stm32',
            10
        )

        # Comandos de la interfaz hacia el STM32
        self.subscription = self.create_subscription(
            String,
            '/comandos_stm32',
            self.recibir_comando,
            10
        )

        # ==========================================
        # CONFIGURACION SERIAL
        # ==========================================

        self.baudrate = 115200

        # Formato de los mensajes: "json" o "texto" (ver protocolo.py)
        self.formato = "json"

        self.puerto = None
        self.ruta_puerto = None
        self.tipo_dispositivo = None

        self.buffer = bytearray()

        # Tiempo entre intentos de conexión
        self.intervalo_reconexion = 2.0
        self.ultimo_intento = 0.0

        # Tiempo máximo sin recibir datos válidos
        self.timeout_datos = 5.0
        self.ultimo_dato = None

        # Temporizador de lectura: 100 Hz
        self.timer = self.create_timer(
            0.01,
            self.actualizar
        )

        self.get_logger().info(
            "DINAVEX - Receptor serial iniciado"
        )

        self.get_logger().info(
            "Buscando STM32 o ESP32..."
        )

    # ==============================================
    # DETECTAR DISPOSITIVO USB
    # ==============================================

    def buscar_puerto(self):

        # Obtener dispositivos identificados por USB

        dispositivos = sorted(
            glob.glob('/dev/serial/by-id/*')
        )

        # Buscar primero STM32 o ESP32 conocidos

        for dispositivo in dispositivos:

            nombre = os.path.basename(
                dispositivo
            ).lower()

            # STM32 con ST-LINK
            if (
                'stlink' in nombre
                or 'st-link' in nombre
                or 'stmicroelectronics' in nombre
            ):

                return dispositivo, "STM32"

            # ESP32 con CH340 / CH341
            if (
                '1a86' in nombre
                or 'ch340' in nombre
                or 'ch341' in nombre
            ):

                return dispositivo, "ESP32 (CH340)"

            # ESP32 con CP210x
            if (
                'cp210' in nombre
                or 'silicon_labs' in nombre
            ):

                return dispositivo, "ESP32 (CP210x)"

            # ESP32 con USB nativo
            if (
                'esp32' in nombre
                or 'espressif' in nombre
            ):

                return dispositivo, "ESP32"

        # ==========================================
        # BUSQUEDA ALTERNATIVA
        # ==========================================

        # Algunos STM32 y ESP32 utilizan ttyACM

        puertos_acm = sorted(
            glob.glob('/dev/ttyACM*')
        )

        if puertos_acm:

            return puertos_acm[0], "USB CDC (STM32/ESP32)"

        # Otros ESP32 utilizan ttyUSB

        puertos_usb = sorted(
            glob.glob('/dev/ttyUSB*')
        )

        if puertos_usb:

            return puertos_usb[0], "USB Serial (ESP32)"

        return None, None

    # ==============================================
    # CONECTAR AL DISPOSITIVO
    # ==============================================

    def conectar(self):

        ahora = time.monotonic()

        # Evitar intentos continuos

        if (
            ahora - self.ultimo_intento
            < self.intervalo_reconexion
        ):
            return

        self.ultimo_intento = ahora

        dispositivo, tipo = self.buscar_puerto()

        if dispositivo is None:
            return

        try:

            # write_timeout de 0.1 s: si el STM32 deja de leer,
            # el envío de un comando no se queda trabado
            self.puerto = serial.Serial(
                port=dispositivo,
                baudrate=self.baudrate,
                timeout=0,
                write_timeout=0.1
            )

            self.ruta_puerto = dispositivo
            self.tipo_dispositivo = tipo

            self.buffer.clear()
            self.ultimo_dato = time.monotonic()

            self.get_logger().info(
                "================================"
            )

            self.get_logger().info(
                f"DISPOSITIVO: {tipo}"
            )

            self.get_logger().info(
                f"PUERTO: {dispositivo}"
            )

            self.get_logger().info(
                f"BAUDRATE: {self.baudrate}"
            )

            self.get_logger().info(
                "CONEXION ESTABLECIDA"
            )

            self.get_logger().info(
                "================================"
            )

        except (serial.SerialException, OSError) as error:

            self.get_logger().warning(
                f"Error de conexión: {error}"
            )

            self.puerto = None

    # ==============================================
    # DESCONECTAR DISPOSITIVO
    # ==============================================

    def desconectar(self):

        if self.puerto is not None:

            try:
                self.puerto.close()

            except (serial.SerialException, OSError):
                pass

        self.puerto = None
        self.ruta_puerto = None
        self.tipo_dispositivo = None
        self.ultimo_dato = None

        self.buffer.clear()

        self.get_logger().warning(
            "Dispositivo desconectado."
        )

        self.get_logger().info(
            "Esperando reconexión USB..."
        )

    # ==============================================
    # LEER DATOS SERIAL
    # ==============================================

    def actualizar(self):

        # Si no hay dispositivo, buscarlo

        if self.puerto is None:

            self.conectar()
            return

        try:

            cantidad = self.puerto.in_waiting

            if cantidad > 0:

                datos = self.puerto.read(
                    min(cantidad, 4096)
                )

                self.buffer.extend(datos)

                # Evitar crecimiento indefinido
                if len(self.buffer) > 8192:

                    self.get_logger().warning(
                        "Buffer demasiado grande."
                    )

                    self.buffer.clear()
                    return

                # Procesar mensajes completos
                while b'\n' in self.buffer:

                    linea, _, resto = (
                        self.buffer.partition(b'\n')
                    )

                    self.buffer = bytearray(resto)

                    texto = linea.decode(
                        'utf-8',
                        errors='replace'
                    ).strip()

                    if not texto:
                        continue

                    # Mostrar mensaje recibido. Va en debug porque
                    # 20 mensajes por segundo llenan el log de la SD.
                    # Para verlos: --ros-args --log-level debug

                    self.get_logger().debug(
                        f"RX [{self.tipo_dispositivo}] "
                        f"[{self.ruta_puerto}]: {texto}"
                    )

                    # Revisar que vengan todos los datos (ver protocolo.py)
                    try:

                        datos_stm32 = protocolo.leer_datos(
                            texto,
                            self.formato
                        )

                    except ValueError as error:

                        # Máximo un aviso cada 2 segundos
                        self.get_logger().warning(
                            f"Línea descartada ({error}): {texto[:80]}",
                            throttle_duration_sec=2.0
                        )

                        continue

                    # ==================================
                    # PUBLICAR EN ROS 2
                    # ==================================

                    mensaje = String()

                    mensaje.data = json.dumps(
                        datos_stm32
                    )

                    self.publisher.publish(mensaje)

                    self.ultimo_dato = (
                        time.monotonic()
                    )

            # ======================================
            # VERIFICAR TIEMPO SIN DATOS
            # ======================================

            if self.ultimo_dato is not None:

                tiempo = (
                    time.monotonic()
                    - self.ultimo_dato
                )

                if tiempo > self.timeout_datos:

                    self.get_logger().warning(
                        "Sin datos validos "
                        "durante 5 segundos."
                    )

                    self.desconectar()

        except (serial.SerialException, OSError) as error:

            self.get_logger().error(
                f"Error serial: {error}"
            )

            self.desconectar()

    # ==============================================
    # ENVIAR COMANDOS AL STM32
    # ==============================================

    def recibir_comando(self, msg):

        # La interfaz manda por ejemplo: {"cmd": "paro"}
        try:

            comando = json.loads(msg.data)

            linea = protocolo.armar_comando(
                comando.get("cmd"),
                self.formato,
                comando
            )

        except (ValueError, AttributeError) as error:

            self.get_logger().warning(
                f"Comando inválido ({error}): {msg.data}",
                throttle_duration_sec=2.0
            )

            return

        if self.puerto is None:

            self.get_logger().warning(
                "No se envió el comando: STM32 desconectado",
                throttle_duration_sec=2.0
            )

            return

        try:

            self.puerto.write(linea)

            self.get_logger().debug(
                f"TX [{self.ruta_puerto}]: {linea}"
            )

        except serial.SerialTimeoutException:

            self.get_logger().warning(
                "No se envió el comando: el STM32 no está leyendo",
                throttle_duration_sec=2.0
            )

        except (serial.SerialException, OSError) as error:

            self.get_logger().error(
                f"Error serial al enviar: {error}"
            )

            self.desconectar()

    # ==============================================
    # CERRAR PROGRAMA
    # ==============================================

    def destroy_node(self):

        if self.puerto is not None:

            try:
                self.puerto.close()

            except (serial.SerialException, OSError):
                pass

        return super().destroy_node()


# ==============================================
# FUNCION PRINCIPAL
# ==============================================

def main():

    rclpy.init()

    nodo = ReceptorSerial()

    try:

        rclpy.spin(nodo)

    # Ctrl+C o systemctl stop
    except (KeyboardInterrupt, ExternalShutdownException):

        pass

    finally:

        nodo.destroy_node()

        rclpy.try_shutdown()


if __name__ == '__main__':

    main()
