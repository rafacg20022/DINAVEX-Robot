import React, { Component } from "react";
import { connect } from "react-redux";
import { Row, Col, Card, Radio, Button, Space, Typography, message } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, AimOutlined, SendOutlined } from "@ant-design/icons";
import { formatearValor } from "../../Components/Items";
import { GANANCIAS, OPCIONES_GANANCIAS } from "../../constants/telemetria";
import { enviarComando } from "../../ros/conexionRos";

// Página Control: ganancias y modo de movimiento.
// Los botones de PARO y ARRANQUE están en App.jsx

class Control extends Component {
  state = {
    opcion: null, // opción elegida (1, 2 o 3)
  };

  enviarOpcion() {
    if (enviarComando("opcion", { valor: this.state.opcion })) {
      message.success("Opción enviada");
    } else {
      message.error("Sin conexión con ROS 2");
    }
  }

  cambiarModo(valor, comando) {
    // No mandar el modo que ya tiene el robot
    if (this.props.telemetria.modo === valor) return;

    if (!enviarComando(comando)) {
      message.error("Sin conexión con ROS 2");
    }
  }

  // Botón de un modo, iluminado si es el que tiene el STM32
  renderModo(valor, comando, etiqueta, icono) {
    const { telemetria, conectadoRos } = this.props;
    const encendido = telemetria !== null && telemetria.estado === 1;
    const activo = telemetria !== null && telemetria.modo === valor;

    return (
      <Button
        className="boton-modo"
        size="large"
        block
        type={activo ? "primary" : "default"}
        icon={icono}
        disabled={!conectadoRos || !encendido}
        onClick={() => this.cambiarModo(valor, comando)}
      >
        {etiqueta}
      </Button>
    );
  }

  // Ganancia que tiene el STM32
  renderGanancia(g) {
    const { telemetria } = this.props;

    return (
      <Col xs={12} key={g.campo}>
        <Typography.Text>{g.etiqueta}: </Typography.Text>
        <Typography.Text strong>
          {formatearValor(telemetria ? telemetria[g.campo] : null, 3)}
        </Typography.Text>
      </Col>
    );
  }

  render() {
    const { conectadoRos } = this.props;
    const { opcion } = this.state;

    return (
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card size="small" title="Ganancias">
            <Radio.Group
              options={OPCIONES_GANANCIAS}
              optionType="button"
              buttonStyle="solid"
              value={opcion}
              onChange={(e) => this.setState({ opcion: e.target.value })}
            />

            <Typography.Paragraph strong style={{ margin: "16px 0 8px" }}>PD (inclinación)</Typography.Paragraph>
            <Row gutter={[12, 4]}>
              {GANANCIAS.filter((g) => g.controlador === "PD").map((g) => this.renderGanancia(g))}
            </Row>

            <Typography.Paragraph strong style={{ margin: "12px 0 8px" }}>PI (velocidad)</Typography.Paragraph>
            <Row gutter={[12, 4]}>
              {GANANCIAS.filter((g) => g.controlador === "PI").map((g) => this.renderGanancia(g))}
            </Row>

            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={!conectadoRos || opcion === null}
              onClick={this.enviarOpcion.bind(this)}
              style={{ marginTop: 16 }}
            >
              Enviar opción
            </Button>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card size="small" title="Movimiento">
            <Space direction="vertical" style={{ width: "100%" }}>
              {this.renderModo(1, "adelante", "Adelante", <ArrowUpOutlined />)}
              {this.renderModo(0, "centro", "Centro", <AimOutlined />)}
              {this.renderModo(2, "atras", "Atrás", <ArrowDownOutlined />)}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                El botón iluminado es el modo que tiene el robot. Si se pierde la
                conexión, el robot regresa a centro.
              </Typography.Text>
            </Space>
          </Card>
        </Col>
      </Row>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    telemetria: state.robot.telemetria,
    conectadoRos: state.robot.conectadoRos,
  };
};

export default connect(mapStateToProps)(Control);
