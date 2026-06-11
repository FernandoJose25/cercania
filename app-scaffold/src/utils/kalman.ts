// 📁 cercania/app-scaffold/src/utils/kalman.ts
/**
 * Filtro de Kalman para coordenadas GPS.
 *
 * Es el mismo algoritmo que usa Google Maps, Uber y Life360
 * para suavizar el movimiento y eliminar el "rebote" del GPS.
 *
 * Cómo funciona:
 * - Mantiene una estimación del estado real (posición) basada en
 *   el historial de mediciones.
 * - Cada nueva lectura GPS se "mezcla" con la predicción anterior
 *   según qué tan confiable es cada una.
 * - Resultado: posición suave y estable, sin saltos aleatorios.
 */

export class KalmanFilter {
    private lat: number = 0;
    private lng: number = 0;
    private variance: number = -1; // Varianza de la estimación (-1 = no inicializado)

    // Q: ruido del proceso (qué tan rápido puede cambiar la posición real)
    // Valor bajo = más suave pero más lento en detectar movimiento real
    // Valor alto = más reactivo pero más ruidoso
    private readonly Q_METERS_PER_SECOND = 3; // 3 m/s de movimiento máximo esperado

    reset(): void {
        this.variance = -1;
    }

    /**
     * Procesa una nueva lectura GPS y devuelve la posición filtrada.
     * @param lat Latitud medida
     * @param lng Longitud medida
     * @param accuracy Precisión del GPS en metros (de expo-location)
     * @param timestampMs Timestamp de la medición
     */
    process(
        lat: number,
        lng: number,
        accuracy: number,
        timestampMs: number
    ): { lat: number; lng: number } {
        // Precisión mínima de 1 metro para evitar división por cero
        const accuracyClamped = Math.max(accuracy, 1);

        if (this.variance < 0) {
            // Primera medición: inicializar con el valor recibido
            this.lat = lat;
            this.lng = lng;
            this.variance = accuracyClamped * accuracyClamped;
            return { lat: this.lat, lng: this.lng };
        }

        // Predición: la varianza crece con el tiempo (podría haberse movido)
        const secondsElapsed = Math.max(0, (timestampMs - this._lastTimestamp) / 1000);
        const processNoise = this.Q_METERS_PER_SECOND * secondsElapsed;
        this.variance += processNoise * processNoise;

        // Ganancia de Kalman: qué tanto confiamos en la nueva medición vs la predicción
        // K cercano a 1 = confía más en el nuevo GPS
        // K cercano a 0 = confía más en la predicción anterior
        const K = this.variance / (this.variance + accuracyClamped * accuracyClamped);

        // Actualizar estimación mezclando predicción y nueva medición
        this.lat = this.lat + K * (lat - this.lat);
        this.lng = this.lng + K * (lng - this.lng);

        // Reducir varianza según cuánto confió en la nueva medición
        this.variance = (1 - K) * this.variance;

        this._lastTimestamp = timestampMs;

        return { lat: this.lat, lng: this.lng };
    }

    private _lastTimestamp: number = Date.now();
}

// Instancia global (se reinicia al cerrar la app)
export const gpsKalman = new KalmanFilter();