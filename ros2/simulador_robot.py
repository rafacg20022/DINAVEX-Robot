import rclpy
from rclpy.executors import ExternalShutdownException
from rclpy.node import Node
from std_msgs.msg import String

import math
import random
import time
import json


# Simulador para probar la interfaz sin el robot.
# Publica los mismos datos que el STM32 en /datos_stm32 y responde a los
# comandos de /comandos_stm32. No es un modelo real del péndulo, solo
# genera señales parecidas.
#
# En la Raspberry, antes de correrlo hay que detener el receptor:
#   sudo systemctl stop robot-serial
#   python3 simulador_robot.py

class SimuladorRobot(Node):

    def __init__(self):

        super().__init__('simulador_robot')

        # Crear publicador ROS 2
        self.publisher = self.create_publisher(
            String,
            '/datos_stm32',
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
        self.ganancias = {
            "pd_kp": 32.0,
            "pd_kd": 1.6,
            "pi_kp": 0.5,
            "pi_ki": 0.05
        }

        self.inclinacion = 0.0
        self.velocidad_angular = 20.0   # empieza con un empujón
        self.velocidad_ruedas = 0.0
        self.bateria = 24.8

        # 1 = adelante, -1 = atrás, 0 = detenido
        self.movimiento = 0
        self.ultimo_movimiento = 0.0

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

    def recibir_comando(self, msg):

        try:

            comando = json.loads(msg.data)
            cmd = comando["cmd"]

            if cmd == "paro":
                self.estado = 0

            elif cmd == "arranque" and self.estado == 0:
                self.estado = 1
                self.inclinacion = 0.0
                self.velocidad_angular = 20.0

            elif cmd == "ganancias":
                for nombre in self.ganancias:
                    self.ganancias[nombre] = round(float(comando[nombre]), 3)

            elif cmd == "adelante":
                self.movimiento = 1
                self.ultimo_movimiento = time.monotonic()

            elif cmd == "atras":
                self.movimiento = -1
                self.ultimo_movimiento = time.monotonic()

            elif cmd == "detener":
                self.movimiento = 0

        except (ValueError, KeyError, TypeError):

            self.get_logger().warning(
                f"Comando inválido: {msg.data}"
            )

    def publicar_datos(self):

        self.tiempo += self.dt

        # Si pasan 0.5 s sin adelante/atrás se detiene (igual que el STM32)
        if time.monotonic() - self.ultimo_movimiento > 0.5:
            self.movimiento = 0

        if self.estado == 1:

            setpoint = 2.0 * self.movimiento

            # Oscilación amortiguada: con más Kp oscila más rápido
            # y con más Kd se calma más rápido
            w = 0.55 * math.sqrt(self.ganancias["pd_kp"])
            z = min(max(0.075 * self.ganancias["pd_kd"], 0.02), 2.0)

            aceleracion = (
                -w * w * (self.inclinacion - setpoint)
                - 2 * z * w * self.velocidad_angular
            )

            self.velocidad_angular += aceleracion * self.dt
            self.inclinacion += self.velocidad_angular * self.dt
            self.inclinacion = max(-30.0, min(30.0, self.inclinacion))

            # Un empujón cada 8 s para que siempre se mueva algo
            if self.tiempo >= self.siguiente_empujon:
                self.velocidad_angular += random.choice([-1, 1]) * random.uniform(8, 15)
                self.siguiente_empujon += 8.0

            self.velocidad_ruedas += (40.0 * self.movimiento - self.velocidad_ruedas) * 0.1

            error = setpoint - self.inclinacion

            par = 0.01 * (
                self.ganancias["pd_kp"] * error
                - self.ganancias["pd_kd"] * self.velocidad_angular
            )
            par = max(-2.0, min(2.0, par))

            velocidad = self.velocidad_ruedas + 0.8 * self.velocidad_angular

            self.bateria = max(21.0, self.bateria - 0.002 * self.dt)

            ruido = 1.0

        else:

            self.inclinacion = 0.0
            self.velocidad_angular = 0.0
            self.velocidad_ruedas = 0.0
            error = par = velocidad = 0.0
            ruido = 0.0

        # Los mismos datos que manda el STM32 (ver serial/protocolo.py)
        datos = {
            "inclinacion": round(self.inclinacion + ruido * random.gauss(0, 0.05), 2),
            "error": round(error, 2),
            "vel_izq": round(velocidad + ruido * random.gauss(0, 0.5), 1),
            "vel_der": round(velocidad + ruido * random.gauss(0, 0.5), 1),
            "par_izq": round(par + ruido * random.gauss(0, 0.01), 3),
            "par_der": round(par + ruido * random.gauss(0, 0.01), 3),
            "pd_kp": self.ganancias["pd_kp"],
            "pd_kd": self.ganancias["pd_kd"],
            "pi_kp": self.ganancias["pi_kp"],
            "pi_ki": self.ganancias["pi_ki"],
            "estado": self.estado,
            "bat_24v": round(self.bateria, 2),
            "bat_5v": round(5.02 + random.gauss(0, 0.01), 2)
        }

        # Crear mensaje ROS 2
        mensaje = String()

        mensaje.data = json.dumps(datos)

        # Publicar mensaje
        self.publisher.publish(mensaje)


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
