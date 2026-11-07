import React, { Component } from "react";
import { connect } from "react-redux";
import { Layout, Menu, Tag, Button, Modal, Input, Typography, message } from "antd";
import { DashboardOutlined, ControlOutlined, LineChartOutlined, StopOutlined, MenuOutlined, PoweroffOutlined } from "@ant-design/icons";
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

  No se usan rutas porque al recargar la página da error 404 en la Pi.
*/

const { Header, Content, Footer, Sider } = Layout;

const PAGINAS = [
  { key: "monitor", label: "Monitor", icon: <DashboardOutlined />, componente: Monitor },
  { key: "control", label: "Control", icon: <ControlOutlined />, componente: Control },
  { key: "graficas", label: "Gráficas", icon: <LineChartOutlined />, componente: Graficas },
];

// Tiempo para marcar "sin datos" (ms)
const TIEMPO_SIN_DATOS = 1000;

// Código para apagar la Raspberry
const CODIGO_APAGAR = "robot2026";

class App extends Component {
  state = {
    paginaActual: "monitor",
    ahora: Date.now(),
    esCelular: false,   // pantalla chica
    menuCerrado: false,
    modalApagar: false,
    codigoApagar: "",
  };

  componentDidMount() {
    this.cerrarConexionRos = abrirConexionRos(this.props.dispatch);

    // Revisar cada 0.5 s si siguen llegando datos
    this.reloj = setInterval(() => this.setState({ ahora: Date.now() }), 500);
  }

  componentWillUnmount() {
    if (this.cerrarConexionRos) this.cerrarConexionRos();
    clearInterval(this.reloj);
  }

  cambiarPagina(e) {
    this.setState({ paginaActual: e.key });

    // En celular cerrar el menú
    if (this.state.esCelular) this.setState({ menuCerrado: true });
  }

  // Cuando cambia el tamaño de la pantalla
  cambiarTamano(esCelular) {
    this.setState({ esCelular, menuCerrado: esCelular });
  }

  // Depende del Wi-Fi, no reemplaza el paro de emergencia físico
  paro() {
    if (enviarComando("paro")) {
      message.success("Paro enviado");
    } else {
      message.error("Sin conexión con ROS 2");
    }
  }

  // La Pi también revisa que el robot esté en paro
  apagarPi() {
    if (this.state.codigoApagar !== CODIGO_APAGAR) {
      message.error("Código incorrecto");
      return;
    }

    if (enviarComando("apagar_pi")) {
      message.success("Apagado enviado");
      this.cerrarModalApagar();
    } else {
      message.error("Sin conexión con ROS 2");
    }
  }

  // Cerrar y borrar el código
  cerrarModalApagar() {
    this.setState({ modalApagar: false, codigoApagar: "" });
  }

  render() {
    const { conectadoRos, ultimaRecepcion, telemetria } = this.props;
    const { paginaActual, ahora, esCelular, menuCerrado, modalApagar, codigoApagar } = this.state;

    const pagina = PAGINAS.find((p) => p.key === paginaActual);
    const PaginaActual = pagina.componente;
    const conDatos = ultimaRecepcion !== null && ahora - ultimaRecepcion < TIEMPO_SIN_DATOS;

    // Sin datos del STM32 sí se deja apagar
    const robotEncendido = conDatos && telemetria.estado === 1;

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

          <div className="apagar-pi">
            <Button
              danger
              ghost
              block
              icon={<PoweroffOutlined />}
              disabled={!conectadoRos || robotEncendido}
              onClick={() => this.setState({ modalApagar: true })}
            >
              Apagar Raspberry
            </Button>
            {robotEncendido && <div className="aviso">Da PARO para poder apagarla</div>}
          </div>
        </Sider>

        {/* No cerrar al tocar afuera */}
        <Modal
          title="¿Apagar la Raspberry Pi?"
          open={modalApagar}
          centered
          maskClosable={false}
          okText="Apagar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true, disabled: !codigoApagar }}
          onOk={this.apagarPi.bind(this)}
          onCancel={this.cerrarModalApagar.bind(this)}
        >
          <p>Se corta el Wi-Fi y la interfaz deja de funcionar.</p>
          <Input.Password
            size="large"
            placeholder="Código"
            value={codigoApagar}
            onChange={(e) => this.setState({ codigoApagar: e.target.value })}
            onPressEnter={this.apagarPi.bind(this)}
          />
        </Modal>

        {/* Fondo oscuro del menú en celular */}
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
    telemetria: state.robot.telemetria,
  };
};

export default connect(mapStateToProps)(App);
