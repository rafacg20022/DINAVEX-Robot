import React, { Component } from "react";
import { Card, Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import logo from "../../assets/logo.jpg";

// Página de inicio de sesión

// Usuario y contraseña de la interfaz
const USUARIO = "DINAVEX";
const CONTRASENA = "robot2026";

class Login extends Component {
  entrar(valores) {
    if (valores.usuario === USUARIO && valores.contrasena === CONTRASENA) {
      this.props.onEntrar();
    } else {
      message.error("Usuario o contraseña incorrectos");
    }
  }

  render() {
    return (
      <div className="login">
        <img src={logo} alt="DINAVEX" className="logo" />
        <div className="subtitulo">Robot Autoequilibrado Didáctico Interactivo</div>

        <Card className="tarjeta-login">
          <Form onFinish={this.entrar.bind(this)}>
            <Form.Item name="usuario" rules={[{ required: true, message: "Escribe el usuario" }]}>
              <Input size="large" placeholder="Usuario" prefix={<UserOutlined />} />
            </Form.Item>

            <Form.Item name="contrasena" rules={[{ required: true, message: "Escribe la contraseña" }]}>
              <Input.Password size="large" placeholder="Contraseña" prefix={<LockOutlined />} />
            </Form.Item>

            <Button type="primary" htmlType="submit" size="large" block>
              Entrar
            </Button>
          </Form>
        </Card>

        <div className="pie-login">
          DINAVEX · Proyecto Integrador de Ingeniería Mecatrónica · UASLP
        </div>
      </div>
    );
  }
}

export default Login;
