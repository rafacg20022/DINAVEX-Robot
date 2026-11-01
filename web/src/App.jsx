import React, { Component } from "react";
import { connect } from "react-redux";
import { Layout, Menu, Tag, Button, Typography, message } from "antd";
import { DashboardOutlined, ControlOutlined, LineChartOutlined, StopOutlined, MenuOutlined } from "@ant-design/icons";
import { abrirConexionRos, enviarComando } from "./ros/conexionRos";
import Monitor from "./Pages/Monitor/Monitor";
import Control from "./Pages/Control/Control";
import Graficas from "./Pages/Graficas/Graficas";
import logo from "./assets/logo.jpg";

/*
  CÓMO AGREGAR UNA PÁGINA
  1. Crear src/Pages/MiPagina/MiPagina.jsx (se puede copiar Monitor.jsx).
  2. Importarla aquí arriba.
  3. Agregarla a PAGINAS con un ícono de @ant-design/icons.

  No se usan rutas (/control, /graficas) porque al recargar la página
  el servidor de la Pi (python http.server) daría error 404.
*/

const { Header, Content, Footer, Sider } = Layout;

const PAGINAS = [
  { key: "monitor", label: "Monitor", icon: <DashboardOutlined />, componente: Monitor },
  { key: "control", label: "Control", icon: <ControlOutlined />, componente: Control },
  { key: "graficas", label: "Gráficas", icon: <LineChartOutlined />, componente: Graficas },
];

// Si pasa más de 1 s sin datos, el STM32 se marca "sin datos"
const TIEMPO_SIN_DATOS = 1000;

class App extends Component {
  state = {
    paginaActual: "monitor",
    ahora: Date.now(),
    esCelular: false,   // pantalla chica: el menú se abre con el botón ☰
    menuCerrado: false,
  };

  componentDidMount() {
    this.cerrarConexionRos = abrirConexionRos(this.props.dispatch);

    // Para revisar cada medio segundo si siguen llegando datos
    this.reloj = setInterval(() => this.setState({ ahora: Date.now() }), 500);
  }

  componentWillUnmount() {
    if (this.cerrarConexionRos) this.cerrarConexionRos();
    clearInterval(this.reloj);
  }

  cambiarPagina(e) {
    this.setState({ paginaActual: e.key });

    // En el celular el menú se cierra al elegir una página
    if (this.state.esCelular) this.setState({ menuCerrado: true });
  }

  // antd avisa cuando la pantalla pasa de grande a chica (y al revés)
  cambiarTamano(esCelular) {
    this.setState({ esCelular, menuCerrado: esCelular });
  }

  // Ojo: este botón depende del Wi-Fi, no reemplaza un paro de emergencia físico
  paro() {
    if (enviarComando("paro")) {
      message.success("Paro enviado");
    } else {
      message.error("Sin conexión con ROS 2");
    }
  }

  render() {
    const { conectadoRos, ultimaRecepcion } = this.props;
    const { paginaActual, ahora, esCelular, menuCerrado } = this.state;

    const pagina = PAGINAS.find((p) => p.key === paginaActual);
    const PaginaActual = pagina.componente;
    const conDatos = ultimaRecepcion !== null && ahora - ultimaRecepcion < TIEMPO_SIN_DATOS;

    return (
      <Layout className="layout">
        <Sider
          className="menu-lateral"
          width={220}
          breakpoint="lg"
          collapsedWidth={0}
          trigger={null}
          collapsed={menuCerrado}
          onBreakpoint={this.cambiarTamano.bind(this)}
        >
          <div className="marca">
            <img src={logo} alt="DINAVEX" className="logo" />
            <div className="subtitulo">Robot Autoequilibrado Didáctico Interactivo</div>
          </div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[paginaActual]}
            items={PAGINAS.map(({ key, label, icon }) => ({ key, label, icon }))}
            onClick={this.cambiarPagina.bind(this)}
          />
        </Sider>

        {/* En el celular, fondo oscuro detrás del menú; al tocarlo se cierra */}
        {esCelular && !menuCerrado && (
          <div className="fondo-menu" onClick={() => this.setState({ menuCerrado: true })} />
        )}

        <Layout>
          <Header className="encabezado">
            {esCelular && (
              <Button type="text" icon={<MenuOutlined />} onClick={() => this.setState({ menuCerrado: false })} />
            )}

            <Typography.Title level={4} className="titulo">{pagina.label}</Typography.Title>

            <div className="estados">
              <Tag color={conectadoRos ? "green" : "red"}>
                ROS 2: {conectadoRos ? "conectado" : "desconectado"}
              </Tag>
              <Tag color={conDatos ? "green" : "orange"}>
                STM32: {conDatos ? "con datos" : "sin datos"}
              </Tag>
            </div>

            <Button
              type="primary"
              danger
              icon={<StopOutlined />}
              disabled={!conectadoRos}
              onClick={this.paro.bind(this)}
            >
              PARO
            </Button>
          </Header>

          <Content className="contenido">
            <PaginaActual />
          </Content>

          <Footer className="pie">
            DINAVEX · Proyecto Integrador de Ingeniería Mecatrónica · UASLP
          </Footer>
        </Layout>
      </Layout>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    conectadoRos: state.robot.conectadoRos,
    ultimaRecepcion: state.robot.ultimaRecepcion,
  };
};

export default connect(mapStateToProps)(App);
