# DINAVEX — Robot Autoequilibrado Didáctico Interactivo

## Descripción

DINAVEX es una plataforma robótica didáctica diseñada para la experimentación, implementación y evaluación de algoritmos de control aplicados a sistemas de péndulo invertido.

El proyecto integra un microcontrolador STM32, una Raspberry Pi 400 y ROS 2 para gestionar la adquisición de datos, la comunicación entre dispositivos y la visualización de variables del robot.

El sistema permite acceder a una interfaz web desde un teléfono celular mediante un punto de acceso Wi-Fi generado por la Raspberry Pi.

## Objetivo

Desarrollar una plataforma didáctica que permita experimentar con algoritmos de control y visualizar variables del robot en tiempo real.

## Hardware

- Raspberry Pi 400.
- STM32 Nucleo.
- ESP32 para pruebas de comunicación.
- Sensor inercial MPU-6050.
- Motores BLDC.
- Drivers de motores.
- Encoders.

## Software

- Ubuntu 24.04.
- ROS 2 Jazzy Jalisco.
- Python 3.
- ROSBridge WebSocket.
- React (Vite), Ant Design y Redux.
- NetworkManager.
- systemd.

## Arquitectura de comunicación

STM32 ⇄ USB Serial ⇄ Raspberry Pi ⇄ ROS 2 ⇄ ROSBridge ⇄ Interfaz web.

- `/datos_stm32`: datos que manda el STM32 (JSON).
- `/comandos_stm32`: comandos que manda la interfaz al STM32 (JSON).

El control (PD de inclinación y PI de velocidad) corre en el STM32, que equilibra el robot por su cuenta aunque la Raspberry Pi o la interfaz se desconecten.

## Organización del repositorio

- `serial/receptor_stm32.py`: recibe los datos del STM32 y le envía los comandos.
- `serial/protocolo.py`: formato de los mensajes con el STM32.
- `ros2/simulador_robot.py`: simula el robot para probar la interfaz sin el STM32.
- `web/`: interfaz en React. `web/dist/` es la versión compilada que sirve la Raspberry Pi.
- `servicios/`: servicios de arranque automático.

## Comunicación serial

Conexión serial a 115200 baudios con mensajes JSON terminados en salto de línea. El STM32 manda 20 veces por segundo:

```json
{"inclinacion":-1.25,"error":1.25,"vel_izq":42.0,"vel_der":43.0,"par_izq":0.12,"par_der":0.11,"pd_kp":32.000,"pd_kd":1.600,"pi_kp":0.500,"pi_ki":0.050,"estado":1,"bat_24v":24.10,"bat_5v":5.02}
```

Y recibe comandos como `{"cmd":"paro"}`, `{"cmd":"arranque"}` o `{"cmd":"ganancias","pd_kp":32.0,"pd_kd":1.6,"pi_kp":0.5,"pi_ki":0.05}`.

La lista completa de datos, comandos y reglas para el STM32 está en `serial/protocolo.py`.

## Interfaz web

La Raspberry Pi genera un punto de acceso inalámbrico para acceder a la interfaz desde un navegador.

- Red Wi-Fi: `Robot_DINAVEX`
- Dirección IP: `192.168.50.1`
- Servidor HTTP: puerto `8000`
- ROSBridge WebSocket: puerto `9090`

La dirección de acceso es: `http://192.168.50.1:8000`

Tiene tres páginas: Monitor, Control y Gráficas. El botón de PARO está siempre visible, pero depende del Wi-Fi, por lo que no sustituye a un paro de emergencia físico.

## Servicios

| Servicio | Función |
|---|---|
| `robot-serial.service` | Ejecuta `receptor_stm32.py` |
| `robot-bridge.service` | Ejecuta ROSBridge |
| `robot-web.service` | Sirve la interfaz (`web/dist`) |

Para actualizarlos en la Raspberry Pi:

```bash
sudo cp servicios/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart robot-serial robot-bridge robot-web
```

## Probar sin el robot

En la Raspberry Pi:

```bash
sudo systemctl stop robot-serial
source /opt/ros/jazzy/setup.bash
python3 ros2/simulador_robot.py
```

Al terminar: `sudo systemctl start robot-serial`.

## Modificar la interfaz

En la computadora:

```bash
cd web
npm install
npm run dev      # para probar (copiar antes .env.example como .env)
npm run build    # genera web/dist
```

Después de cambiar la interfaz hay que correr `npm run build` antes de subir los cambios.

## Estado del proyecto

En desarrollo.

Pendiente: actualizar el firmware del STM32 al formato nuevo de mensajes y probar el sistema completo en el robot.

## Institución

Universidad Autónoma de San Luis Potosí  
Facultad de Ingeniería

Proyecto integrador de Ingeniería Mecatrónica.
