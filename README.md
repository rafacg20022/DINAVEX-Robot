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
- HTML, CSS y JavaScript.
- NetworkManager.
- systemd.

## Arquitectura de comunicación

STM32 / ESP32 → USB Serial → Raspberry Pi → ROS 2 → ROSBridge → Interfaz HTML.

## Organización del repositorio

- `ros2/`: nodos y programas ROS 2.
- `serial/`: recepción de mensajes desde microcontroladores.
- `web/`: interfaz de monitoreo.
- `servicios/`: configuración de servicios automáticos.
- `docs/`: documentación técnica.
- `scripts/`: herramientas de instalación.

## Comunicación serial

El microcontrolador debe transmitir mensajes JSON terminados en un salto de línea, mediante una conexión serial configurada a 115200 baudios.

Ejemplo:

```json
{"angulo":2.45,"velocidad_angular":1.35,"estado":"Conectado"}
```

Los datos se publican en el tópico ROS 2 `/datos_stm32`.

## Interfaz web

La Raspberry Pi genera un punto de acceso inalámbrico para acceder a la interfaz desde un navegador.

Configuración de referencia:

- Red Wi-Fi: `Robot_DINAVEX`
- Dirección IP: `192.168.50.1`
- Servidor HTTP: puerto `8000`
- ROSBridge WebSocket: puerto `9090`

La dirección de acceso es:

`http://192.168.50.1:8000`

## Estado del proyecto

En desarrollo.

Actualmente se trabaja en la comunicación serial entre la Raspberry Pi y los microcontroladores, el funcionamiento automático de los servicios y la visualización de información mediante ROS 2.

## Institución

Universidad Autónoma de San Luis Potosí  
Facultad de Ingeniería

Proyecto integrador de Ingeniería Mecatrónica.
