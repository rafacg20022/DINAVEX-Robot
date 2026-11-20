import React, { Component } from "react";
import { connect } from "react-redux";
import { Card, Button, Space, Tag, Empty } from "antd";
import { PauseOutlined, CaretRightOutlined, ClearOutlined, FileExcelOutlined, FileTextOutlined, FunctionOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { limpiarSerial } from "../../store/actions/robot";
import { MAX_LINEAS_SERIAL } from "../../store/reducers/robot";
import { CAMPOS_STM32 } from "../../constants/telemetria";

// Página Serial
// Lo que pasa por el puerto serial, la línea más nueva arriba
// Se puede descargar en Excel, TXT o TXT para MATLAB

// Hora con milisegundos, por ejemplo 12:03:45.120
const formatearHora = (ms) => {
  return new Date(ms).toTimeString().slice(0, 8) + "." + String(ms % 1000).padStart(3, "0");
};

// Nombre con fecha y hora, por ejemplo serial_2026-11-09_12-03-45
const nombreArchivo = (prefijo) => {
  const ahora = new Date();
  return prefijo + "_" + ahora.toLocaleDateString("en-CA") + "_" + ahora.toTimeString().slice(0, 8).replace(/:/g, "-");
};

// Descargar un TXT con un enlace temporal
const bajarTxt = (renglones, nombre) => {
  const enlace = document.createElement("a");
  enlace.href = "data:text/plain;charset=utf-8," + encodeURIComponent(renglones.join("\r\n"));
  enlace.download = nombre + ".txt";
  enlace.click();
};

// Valores de una línea del STM32, en formato json o texto
const leerValores = (texto) => {
  if (texto.startsWith("$TEL")) return texto.split(",").slice(1).map(Number);

  const datos = JSON.parse(texto);
  return CAMPOS_STM32.map((campo) => datos[campo]);
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

  // Las líneas que se ven, pausadas o no
  lineasVisibles() {
    return this.state.pausado ? this.state.lineasPausadas : this.props.lineasSerial;
  }

  descargarExcel() {
    // En el archivo la más vieja va primero
    const filas = [...this.lineasVisibles()].reverse().map((linea) => [
      formatearHora(linea.recibidoEn),
      linea.dir.toUpperCase(),
      linea.texto,
      linea.error || "",
    ]);

    const hoja = XLSX.utils.aoa_to_sheet([["Hora", "Dirección", "Texto", "Error"], ...filas]);
    hoja["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 90 }, { wch: 40 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Serial");
    XLSX.writeFile(libro, nombreArchivo("serial") + ".xlsx");
  }

  descargarTxt() {
    const renglones = [...this.lineasVisibles()].reverse().map((linea) => {
      let renglon = formatearHora(linea.recibidoEn) + " " + linea.dir.toUpperCase() + " " + linea.texto;
      if (linea.error) {
        renglon += "  (" + (linea.dir === "rx" ? "Descartada: " : "No se envió: ") + linea.error + ")";
      }
      return renglon;
    });

    bajarTxt(renglones, nombreArchivo("serial"));
  }

  // Líneas que mandó el STM32 y que la Pi aceptó
  datosStm32() {
    return this.lineasVisibles().filter((linea) => linea.dir === "rx" && !linea.error);
  }

  // Columnas separadas por comas para abrirlo con readtable
  descargarMatlab() {
    const lineas = [...this.datosStm32()].reverse();
    const inicio = lineas[0].recibidoEn;

    const renglones = lineas.map((linea) => {
      const t = ((linea.recibidoEn - inicio) / 1000).toFixed(3);
      return [t, ...leerValores(linea.texto)].join(",");
    });

    bajarTxt([["t", ...CAMPOS_STM32].join(","), ...renglones], nombreArchivo("datos"));
  }

  render() {
    const { pausado } = this.state;
    const lineas = this.lineasVisibles();

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
            <Button
              icon={<FileExcelOutlined />}
              disabled={lineas.length === 0}
              onClick={this.descargarExcel.bind(this)}
            >
              Excel
            </Button>
            <Button
              icon={<FileTextOutlined />}
              disabled={lineas.length === 0}
              onClick={this.descargarTxt.bind(this)}
            >
              TXT
            </Button>
            <Button
              icon={<FunctionOutlined />}
              disabled={this.datosStm32().length === 0}
              onClick={this.descargarMatlab.bind(this)}
            >
              MATLAB
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
