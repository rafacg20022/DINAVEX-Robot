import React, { useEffect, useRef } from "react";
import { Button } from "antd";

// Botón de Adelante / Atrás.
// Manda el comando cada 200 ms mientras está presionado y "detener" al soltarlo.

const INTERVALO = 200; // ms

const BotonMantenerItem = ({ comando, onComando, disabled, icon, children }) => {
  const intervalo = useRef(null);

  // Guardar siempre la última versión de onComando
  const onComandoRef = useRef(onComando);
  onComandoRef.current = onComando;

  const soltar = () => {
    if (intervalo.current === null) return;
    clearInterval(intervalo.current);
    intervalo.current = null;
    onComandoRef.current("detener");
  };

  const presionar = () => {
    if (disabled || intervalo.current !== null) return;
    onComandoRef.current(comando);
    intervalo.current = setInterval(() => onComandoRef.current(comando), INTERVALO);
  };

  // Soltar si se cambia de ventana o se bloquea el celular
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.hidden) soltar();
    };
    window.addEventListener("blur", soltar);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      window.removeEventListener("blur", soltar);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      soltar();
    };
  }, []);

  // Soltar si se deshabilita el botón
  useEffect(() => {
    if (disabled) soltar();
  }, [disabled]);

  return (
    <Button
      className="boton-mantener"
      size="large"
      block
      icon={icon}
      disabled={disabled}
      onPointerDown={presionar}
      onPointerUp={soltar}
      onPointerLeave={soltar}
      onPointerCancel={soltar}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </Button>
  );
};

export default BotonMantenerItem;
