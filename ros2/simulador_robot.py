import rclpy
from rclpy.node import Node
from std_msgs.msg import String

import math
import time
import json


class SimuladorRobot(Node):

    def __init__(self):

        super().__init__('simulador_robot')

        # Crear publicador ROS 2
        self.publisher = self.create_publisher(
            String,
            '/datos_stm32',
            10
        )

        # Tiempo inicial
        self.inicio = time.monotonic()

        # Temporizador de 100 Hz
        self.timer = self.create_timer(
            0.01,
            self.publicar_datos
        )

        self.get_logger().info(
            'Simulador DINAVEX iniciado'
        )

    def publicar_datos(self):

        # Tiempo transcurrido
        t = time.monotonic() - self.inicio

        # Datos simulados
        angulo = 5 * math.sin(t)

        velocidad = 5 * math.cos(t)

        # Crear estructura JSON
        datos = {
            "angulo": round(angulo, 2),
            "velocidad_angular": round(velocidad, 2),
            "estado": "Simulacion"
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

    except KeyboardInterrupt:
        pass

    finally:
        nodo.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
