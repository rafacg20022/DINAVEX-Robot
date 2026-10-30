import glob
import json
import time
import os
import serial
import rclpy

from rclpy.node import Node
from std_msgs.msg import String


class ReceptorSerial(Node):

    def __init__(self):

        super().__init__('receptor_serial')

        # ==========================================
        # CONFIGURACION ROS 2
        # ==========================================

        self.publisher = self.create_publisher(
            String,
            '/datos_stm32',
            10
        )

        # ==========================================
        # CONFIGURACION SERIAL
        # ==========================================

        self.baudrate = 115200

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

            self.puerto = serial.Serial(
                port=dispositivo,
                baudrate=self.baudrate,
                timeout=0,
                write_timeout=0
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

                    # Mostrar mensaje recibido

                    self.get_logger().info(
                        f"RX [{self.tipo_dispositivo}] "
                        f"[{self.ruta_puerto}]: {texto}"
                    )

                    # Validar JSON
                    try:

                        datos_json = json.loads(texto)

                        if not isinstance(
                            datos_json, dict
                        ):

                            self.get_logger().warning(
                                "JSON no es un objeto."
                            )

                            continue

                    except json.JSONDecodeError:

                        self.get_logger().warning(
                            f"JSON invalido: {texto}"
                        )

                        continue

                    # ==================================
                    # PUBLICAR EN ROS 2
                    # ==================================

                    mensaje = String()

                    mensaje.data = json.dumps(
                        datos_json
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
                        "Sin datos JSON validos "
                        "durante 5 segundos."
                    )

                    self.desconectar()

        except (serial.SerialException, OSError) as error:

            self.get_logger().error(
                f"Error serial: {error}"
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

    except KeyboardInterrupt:

        pass

    finally:

        nodo.destroy_node()

        rclpy.shutdown()


if __name__ == '__main__':

    main()
