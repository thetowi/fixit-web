export interface ConexionMercadoPago {
  conectado: boolean;
  trabajosPagados: number;
  trabajosGratisRestantes: number;
}

export interface IniciarConexionMercadoPago {
  initPoint: string;
}
