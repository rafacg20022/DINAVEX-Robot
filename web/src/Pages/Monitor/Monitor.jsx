import React, { Component } from "react";
import { connect } from "react-redux";
import { Row, Col, Card } from "antd";
import { DatoItem, GraficaItem } from "../../Components/Items";
import { DATOS_MONITOR } from "../../constants/telemetria";

// Página Monitor: los datos del robot de un vistazo.
// Las tarjetas salen de DATOS_MONITOR (src/constants/telemetria.js).

class Monitor extends Component {
  render() {
    const { telemetria, historial } = this.props;

    let estado = null;
    let colorEstado;
    if (telemetria) {
      estado = telemetria.estado === 1 ? "Encendido" : "Apagado";
      colorEstado = telemetria.estado === 1 ? "#52c41a" : "#ff4d4f";
    }

    return (
      <>
        <Row gutter={[12, 12]}>
          <Col xs={12} md={6}>
            <DatoItem titulo="Estado" valor={estado} color={colorEstado} />
          </Col>
          {DATOS_MONITOR.map((dato) => (
            <Col xs={12} md={6} key={dato.campo}>
              <DatoItem
                titulo={dato.etiqueta}
                valor={telemetria ? telemetria[dato.campo] : null}
                unidad={dato.unidad}
                decimales={dato.decimales}
              />
            </Col>
          ))}
        </Row>

        <Card size="small" title="Inclinación (°), últimos 30 s" style={{ marginTop: 12 }}>
          <GraficaItem
            historial={historial}
            series={[{ campo: "inclinacion", etiqueta: "Inclinación" }]}
            ventana={30}
          />
        </Card>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    telemetria: state.robot.telemetria,
    historial: state.robot.historial,
  };
};

export default connect(mapStateToProps)(Monitor);
