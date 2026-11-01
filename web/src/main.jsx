import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import esES from "antd/locale/es_ES";
import App from "./App";
import store from "./store/store";
import { AZUL, AZUL_MARINO, FONDO } from "./constants/colores";
import "./App.css";

// Colores de antd con los del logo
const tema = {
  token: {
    colorPrimary: AZUL,
  },
  components: {
    Layout: {
      siderBg: AZUL_MARINO,
      headerBg: "#ffffff",
      bodyBg: FONDO,
      footerBg: FONDO,
    },
    Menu: {
      darkItemBg: AZUL_MARINO,
      darkItemSelectedBg: AZUL,
    },
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ConfigProvider locale={esES} theme={tema}>
      <App />
    </ConfigProvider>
  </Provider>
);
