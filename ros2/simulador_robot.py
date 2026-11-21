import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node
from std_msgs.msg import String

import math
import random
import time
import json


# Simulador para probar la interfaz sin el robot.
# Manda datos parecidos a los del STM32 (no es el modelo real).
#
# Antes de correrlo hay que detener el receptor:
#   sudo systemctl stop robot-serial
#   python3 simulador_robot.py

# Ganancias de cada opción (las reales están en el STM32)
OPCIONES = {
    1: {"pd_kp": 32.0, "pd_kd": 1.6, "pi_kp": 0.5, "pi_ki": 0.05},   # óptima
    2: {"pd_kp": 32.0, "pd_kd": 0.2, "pi_kp": 0.5, "pi_ki": 0.05},   # oscilatorio
    3: {"pd_kp": 15.0, "pd_kd": 3.0, "pi_kp": 0.3, "pi_ki": 0.02},   # otro
}


class SimuladorRobot(Node):

    def __init__(self):

        super().__init__('simulador_robot')

        # Crear publicador ROS 2
        self.publisher = self.create_publisher(
            String,
            '/datos_stm32',
            10
        )

        # Tráfico crudo, igual que el receptor
        self.publisher_crudo = self.create_publisher(
            String,
            '/serial_crudo',
            10
        )

        # Comandos de la interfaz
        self.subscription = self.create_subscription(
            String,
            '/comandos_stm32',
            self.recibir_comando,
            10
        )

        # Estado del robot simulado
        self.estado = 1
        self.ganancias = dict(OPCIONES[1])

        self.inclinacion = 0.0
        self.velocidad_angular = 20.0   # empieza con un empujón
        self.velocidad_ruedas = 0.0
        self.bateria = 24.8

        # 0 = centro, 1 = adelante, 2 = atrás, 3 = izquierda, 4 = derecha
        self.modo = 0
        self.ultimo_modo = 0.0

        self.tiempo = 0.0
        self.siguiente_empujon = 8.0

        # Temporizador de 20 Hz (igual que el STM32)
        self.dt = 0.05

        self.timer = self.create_timer(
            self.dt,
            self.publicar_datos
        )

        self.get_logger().info(
            'Simulador DINAVEX iniciado'
        )

    def publicar_crudo(self, direccion, texto):

        mensaje = String()
        mensaje.data = json.dumps({"dir": direccion, "texto": texto})

        self.publisher_crudo.publish(mensaje)

    def recibir_comando(self, msg):

        self.publicar_crudo("tx", msg.data)

        try:

            comando = json.loads(msg.data)
            cmd = comando["cmd"]

            if cmd == "paro":
                self.estado = 0
                self.modo = 0

            elif cmd == "arranque" and self.estado == 0:
                self.estado = 1
                self.inclinacion = 0.0
                self.velocidad_angular = 20.0

            elif cmd == "opcion":
                self.ganancias = dict(OPCIONES[comando["valor"]])

            elif cmd == "adelante" and self.estado == 1:
                self.modo = 1
                self.ultimo_modo = time.monotonic()

            elif cmd == "atras" and self.estado == 1:
                self.modo = 2
                self.ultimo_modo = time.monotonic()

            elif cmd == "izquierda" and self.estado == 1:
                self.modo = 3
                self.ultimo_modo = time.monotonic()

            elif cmd == "derecha" and self.estado == 1:
                self.modo = 4
                self.ultimo_modo = time.monotonic()

            elif cmd == "centro":
                self.modo = 0

            elif cmd == "inicio":
                self.get_logger().info("Interfaz iniciada")

        except (ValueError, KeyError, TypeError):

            self.get_logger().warning(
                f"Comando inválido: {msg.data}"
            )

    def publicar_datos(self):

        self.tiempo += self.dt

        # Regresar a centro si pasan 3 s sin repetir el modo
        if self.modo != 0 and time.monotonic() - self.ultimo_modo > 3.0:
            self.modo = 0

        # 1 hacia adelante, -1 hacia atrás, 0 sin avanzar
        direccion = 0

        if self.modo == 1:
            direccion = 1
        elif self.modo == 2:
            direccion = -1

        # 1 a la derecha, -1 a la izquierda, 0 sin girar
        giro = 0

        if self.modo == 3:
            giro = -1
        elif self.modo == 4:
            giro = 1

        if self.estado == 1:

            setpoint = 2.0 * direccion

            # Oscilación amortiguada según Kp y Kd
            w = 0.55 * math.sqrt(self.ganancias["pd_kp"])
            z = min(max(0.075 * self.ganancias["pd_kd"], 0.02), 2.0)

            aceleracion = (
                -w * w * (self.inclinacion - setpoint)
                - 2 * z * w * self.velocidad_angular
            )

            self.velocidad_angular += aceleracion * self.dt
            self.inclinacion += self.velocidad_angular * self.dt
            self.inclinacion = max(-30.0, min(30.0, self.inclinacion))

            # Un empujón cada 8 s
            if self.tiempo >= self.siguiente_empujon:
                self.velocidad_angular += random.choice([-1, 1]) * random.uniform(8, 15)
                self.siguiente_empujon += 8.0

            self.velocidad_ruedas += (40.0 * direccion - self.velocidad_ruedas) * 0.1

            error = setpoint - self.inclinacion

            par = 0.01 * (
                self.ganancias["pd_kp"] * error
                - self.ganancias["pd_kd"] * self.velocidad_angular
            )
            par = max(-2.0, min(2.0, par))

            velocidad = self.velocidad_ruedas + 0.8 * self.velocidad_angular

            # Al girar una rueda va hacia adelante y la otra hacia atrás
            vel_izq = velocidad + 20.0 * giro
            vel_der = velocidad - 20.0 * giro

            self.bateria = max(21.0, self.bateria - 0.002 * self.dt)

            ruido = 1.0

        else:

            self.inclinacion = 0.0
            self.velocidad_angular = 0.0
            self.velocidad_ruedas = 0.0
            error = par = vel_izq = vel_der = 0.0
            ruido = 0.0

        # Mismos datos que manda el STM32
        datos = {
            "inclinacion": round(self.inclinacion + ruido * random.gauss(0, 0.05), 2),
            "error": round(error, 2),
            "vel_izq": round(vel_izq + ruido * random.gauss(0, 0.5), 1),
            "vel_der": round(vel_der + ruido * random.gauss(0, 0.5), 1),
            "par_izq": round(par + ruido * random.gauss(0, 0.01), 3),
            "par_der": round(par + ruido * random.gauss(0, 0.01), 3),
            "pd_kp": self.ganancias["pd_kp"],
            "pd_kd": self.ganancias["pd_kd"],
            "pi_kp": self.ganancias["pi_kp"],
            "pi_ki": self.ganancias["pi_ki"],
            "estado": self.estado,
            "bat_24v": round(self.bateria, 2),
            "modo": self.modo
        }

        # Crear mensaje ROS 2
        mensaje = String()

        mensaje.data = json.dumps(datos)

        # Publicar mensaje
        self.publisher.publish(mensaje)

        # Sin espacios, como lo manda el STM32
        self.publicar_crudo("rx", json.dumps(datos, separators=(",", ":")))


def main():

    rclpy.init()

    nodo = SimuladorRobot()

    try:
        rclpy.spin(nodo)

    except (KeyboardInterrupt, ExternalShutdownException):
        pass

    finally:
        nodo.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()
