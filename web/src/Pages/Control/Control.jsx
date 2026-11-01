import React, { Component } from "react";
import { connect } from "react-redux";
import { Row, Col, Card, InputNumber, Button, Tag, Popconfirm, Space, Typography, message } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, PoweroffOutlined, SendOutlined, ReloadOutlined } from "@ant-design/icons";
import { BotonMantenerItem, formatearValor } from "../../Components/Items";
import { GANANCIAS } from "../../constants/telemetria";
import { enviarComando } from "../../ros/conexionRos";

// Página Control: ganancias, arranque y movimiento.
// El PARO está en el encabezado (App.jsx) para que se vea en todas las páginas.

// El STM32 manda las ganancias con 3 decimales
const TOLERANCIA_GANANCIAS = 0.0005;

class Control extends Component {
  state = {
    ganancias: null,  // lo que está escrito en los campos
    enviadas: null,   // las últimas que se mandaron, para ver si ya se aplicaron
  };

  componentDidMount() {
    this.llenarGanancias();
  }

  componentDidUpdate() {
    this.llenarGanancias();
  }

  // La primera vez que llegan datos, los campos se llenan con las ganancias del STM32
  llenarGanancias() {
    if (this.state.ganancias === null && this.props.telemetria) {
      this.recargarGanancias();
    }
  }

  recargarGanancias() {
    const { telemetria } = this.props;
    if (!telemetria) return;

    const ganancias = {};
    GANANCIAS.forEach((g) => {
      ganancias[g.campo] = telemetria[g.campo];
    });
    this.setState({ ganancias });
  }

  cambiarGanancia(campo, valor) {
    this.setState({ ganancias: { ...this.state.ganancias, [campo]: valor } });
  }

  enviarGanancias() {
    const { ganancias } = this.state;

    const incompletas = GANANCIAS.some((g) => ganancias[g.campo] === null || ganancias[g.campo] === undefined);
    if (incompletas) {
      message.warning("Llena las 4 ganancias");
      return;
    }

    if (enviarComando("ganancias", ganancias)) {
      message.success("Ganancias enviadas");
      this.setState({ enviadas: { ...ganancias } });
    } else {
      message.error("Sin conexión con ROS 2");
    }
  }

  // Muestra "Aplicado" cuando el STM32 ya reporta las ganancias que se mandaron
  estadoGanancias() {
    const { enviadas } = this.state;
    const { telemetria } = this.props;
    if (!enviadas) return null;

    const aplicadas = telemetria && GANANCIAS.every(
      (g) => Math.abs(telemetria[g.campo] - enviadas[g.campo]) < TOLERANCIA_GANANCIAS
    );

    if (aplicadas) return <Tag color="green">Aplicado</Tag>;
    return <Tag color="orange">Pendiente</Tag>;
  }

  arrancar() {
    if (enviarComando("arranque")) {
      message.success("Arranque enviado");
    } else {
      message.error("Sin conexión con ROS 2");
    }
  }

  mover(comando) {
    enviarComando(comando);
  }

  renderGanancia(g) {
    const { ganancias } = this.state;
    const { telemetria } = this.props;

    return (
      <Col xs={12} key={g.campo}>
        <Typography.Text>{g.etiqueta}</Typography.Text>
        <InputNumber
          value={ganancias ? ganancias[g.campo] : null}
          onChange={(valor) => this.cambiarGanancia(g.campo, valor)}
          disabled={ganancias === null}
          min={0}
          step={0.1}
          precision={3}
          style={{ width: "100%" }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          STM32: {formatearValor(telemetria ? telemetria[g.campo] : null, 3)}
        </Typography.Text>
      </Col>
    );
  }

  render() {
    const { telemetria, conectadoRos } = this.props;
    const encendido = telemetria !== null && telemetria.estado === 1;

    return (
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card size="small" title="Ganancias" extra={this.estadoGanancias()}>
            <Typography.Paragraph strong style={{ marginBottom: 8 }}>PD (inclinación)</Typography.Paragraph>
            <Row gutter={[12, 4]}>
              {GANANCIAS.filter((g) => g.controlador === "PD").map((g) => this.renderGanancia(g))}
            </Row>

            <Typography.Paragraph strong style={{ margin: "12px 0 8px" }}>PI (velocidad)</Typography.Paragraph>
            <Row gutter={[12, 4]}>
              {GANANCIAS.filter((g) => g.controlador === "PI").map((g) => this.renderGanancia(g))}
            </Row>

            <Space wrap style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                disabled={!conectadoRos || this.state.ganancias === null}
                onClick={this.enviarGanancias.bind(this)}
              >
                Enviar ganancias
              </Button>
              <Button
                icon={<ReloadOutlined />}
                disabled={!telemetria}
                onClick={this.recargarGanancias.bind(this)}
              >
                Usar las del STM32
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card size="small" title="Arranque" style={{ marginBottom: 12 }}>
            <Space wrap>
              <Popconfirm
                title="¿Arrancar el robot?"
                okText="Sí"
                cancelText="No"
                onConfirm={this.arrancar.bind(this)}
                disabled={!conectadoRos}
              >
                <Button icon={<PoweroffOutlined />} disabled={!conectadoRos}>
                  Arranque
                </Button>
              </Popconfirm>
              {telemetria && (
                <Tag color={encendido ? "green" : "red"}>{encendido ? "Encendido" : "Apagado"}</Tag>
              )}
            </Space>
          </Card>

          <Card size="small" title="Movimiento">
            <Space direction="vertical" style={{ width: "100%" }}>
              <BotonMantenerItem
                comando="adelante"
                onComando={this.mover.bind(this)}
                disabled={!conectadoRos || !encendido}
                icon={<ArrowUpOutlined />}
              >
                Adelante
              </BotonMantenerItem>
              <BotonMantenerItem
                comando="atras"
                onComando={this.mover.bind(this)}
                disabled={!conectadoRos || !encendido}
                icon={<ArrowDownOutlined />}
              >
                Atrás
              </BotonMantenerItem>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Mantén presionado para moverte. Al soltar, el robot deja de avanzar
                pero sigue equilibrándose.
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
