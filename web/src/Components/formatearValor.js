// Formatea un valor para mostrarlo: "--" si todavía no hay dato.
const formatearValor = (valor, decimales = 1) => {
  if (valor === null || valor === undefined) return "--";
  if (typeof valor !== "number") return valor;
  return valor.toFixed(decimales);
};

export default formatearValor;
