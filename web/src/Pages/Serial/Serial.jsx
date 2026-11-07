import React, { Component } from "react";
import { connect } from "react-redux";
import { Card, Button, Space, Tag, Empty } from "antd";
import { PauseOutlined, CaretRightOutlined, ClearOutlined } from "@ant-design/icons";
import { limpiarSerial } from "../../store/actions/robot";
import { MAX_LINEAS_SERIAL } from "../../store/reducers/robot";

// Página Serial
// Lo que pasa por el puerto serial, la línea más nueva arriba

// Hora con milisegundos, por ejemplo 12:03:45.120
const formatearHora = (ms) => {
  return new Date(ms).toTimeString().slice(0, 8) + "." + String(ms % 1000).padStart(3, "0");
};

class Serial extends Component {
  state = {
    pausado: false,
    lineasPausadas: [],
  };

  pausar() {
    if (this.state.pausado) {
      this.setState({ pausado: false, lineasPausadas: [] });
    } else {
      // Guardar las líneas al pausar
      this.setState({ pausado: true, lineasPausadas: this.props.lineasSerial });
    }
  }

  limpiar() {
    this.props.dispatch(limpiarSerial());
    this.setState({ lineasPausadas: [] });
  }

  render() {
    const { pausado } = this.state;
    const lineas = pausado ? this.state.lineasPausadas : this.props.lineasSerial;

    return (
      <>
        <Card size="small" style={{ marginBottom: 12 }}>
          <Space wrap>
            <Button
              icon={pausado ? <CaretRightOutlined /> : <PauseOutlined />}
              onClick={this.pausar.bind(this)}
            >
              {pausado ? "Reanudar" : "Pausar"}
            </Button>
            <Button icon={<ClearOutlined />} onClick={this.limpiar.bind(this)}>
              Limpiar
            </Button>
          </Space>
        </Card>

        <Card size="small" title={"Puerto serial, últimas " + MAX_LINEAS_SERIAL + " líneas"}>
          {lineas.length === 0 ? (
            <Empty description="Sin datos del puerto serial" />
          ) : (
            <div className="consola-serial">
              {lineas.map((linea) => (
                <div key={linea.id} className="linea-serial">
                  <span className="hora">{formatearHora(linea.recibidoEn)}</span>
                  <Tag color={linea.dir === "rx" ? "blue" : "purple"}>{linea.dir.toUpperCase()}</Tag>
                  {linea.texto}
                  {linea.error && (
                    <div className="error">
                      {linea.dir === "rx" ? "Descartada: " : "No se envió: "}
                      {linea.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    lineasSerial: state.robot.lineasSerial,
  };
};

export default connect(mapStateToProps)(Serial);
