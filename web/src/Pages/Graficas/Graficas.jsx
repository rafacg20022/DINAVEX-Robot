import React, { Component } from "react";
import { connect } from "react-redux";
import { Row, Col, Card, Button, Segmented, Space } from "antd";
import { PauseOutlined, CaretRightOutlined } from "@ant-design/icons";
import { GraficaItem } from "../../Components/Items";

/*
  CÓMO AGREGAR UNA GRÁFICA
  Agregar un objeto a GRAFICAS, por ejemplo:
    {
      titulo: "Temperatura del driver",
      unidad: "°C",
      series: [{ campo: "temp_driver", etiqueta: "Driver" }],
    },
  "campo" es el nombre del dato en el JSON del STM32.
  Una gráfica puede tener varias series (como izquierda y derecha).
*/

const GRAFICAS = [
  {
    titulo: "Inclinación",
    unidad: "°",
    series: [{ campo: "inclinacion", etiqueta: "Inclinación" }],
  },
  {
    titulo: "Error",
    unidad: "°",
    series: [{ campo: "error", etiqueta: "Error" }],
  },
  {
    titulo: "Velocidad de ruedas",
    unidad: "RPM",
    series: [
      { campo: "vel_izq", etiqueta: "Izquierda" },
      { campo: "vel_der", etiqueta: "Derecha" },
    ],
  },
  {
    titulo: "Par de ruedas",
    unidad: "N·m",
    series: [
      { campo: "par_izq", etiqueta: "Izquierda" },
      { campo: "par_der", etiqueta: "Derecha" },
    ],
  },
];

const VENTANAS = [10, 30, 60]; // segundos

class Graficas extends Component {
  state = {
    pausado: false,
    historialPausado: [],
    ventana: 30,
  };

  pausar() {
    if (this.state.pausado) {
      this.setState({ pausado: false, historialPausado: [] });
    } else {
      // Se guarda una copia de los datos al momento de pausar
      this.setState({ pausado: true, historialPausado: this.props.historial });
    }
  }

  render() {
    const { pausado, ventana } = this.state;
    const historial = pausado ? this.state.historialPausado : this.props.historial;

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
            <Segmented
              options={VENTANAS.map((v) => ({ label: v + " s", value: v }))}
              value={ventana}
              onChange={(valor) => this.setState({ ventana: valor })}
            />
          </Space>
        </Card>

        <Row gutter={[12, 12]}>
          {GRAFICAS.map((grafica) => (
            <Col xs={24} lg={12} key={grafica.titulo}>
              <Card size="small" title={grafica.titulo + " (" + grafica.unidad + ")"}>
                <GraficaItem historial={historial} series={grafica.series} ventana={ventana} />
              </Card>
            </Col>
          ))}
        </Row>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    historial: state.robot.historial,
  };
};

export default connect(mapStateToProps)(Graficas);
