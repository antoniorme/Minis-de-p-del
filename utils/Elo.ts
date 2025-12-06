
import { Player, Pair } from '../types';

// CONFIGURACIÓN ELO
const K_FACTOR = 20; // Reducido de 32 a 20 para mayor estabilidad
const MAX_POINTS_CAP = 25; // Nadie puede ganar/perder más de 25 ptos en un partido

// 1. TABLA DE ANCLAS (Puntos Base por Categoría)
export const CATEGORY_ANCHORS: Record<string, number> = {
    'Iniciación': 800,
    '5ª CAT': 1000,
    '4ª CAT': 1200,
    '3ª CAT': 1400,
    '2ª CAT': 1600,
    '1ª CAT': 1800
};

// HELPER: Convert Manual Rating (1-10) to ELO Adjustment
// 5 es neutro. Cada punto del slider son 30 puntos de ELO.
// Rango: 1 (-120 pts) a 10 (+150 pts)
export const manualToElo = (manualRating: number): number => {
    return (manualRating - 5) * 30;
};

// 2. CALCULAR ELO INICIAL (Al crear/editar jugador)
export const calculateInitialElo = (categories: string[], manualRating: number): number => {
    // A. Base por Categoría (Promedio si tiene varias)
    let basePoints = 1200; // Fallback
    
    if (categories && categories.length > 0) {
        let sum = 0;
        let count = 0;
        categories.forEach(cat => {
            if (CATEGORY_ANCHORS[cat]) {
                sum += CATEGORY_ANCHORS[cat];
                count++;
            }
        });
        if (count > 0) basePoints = sum / count;
    }

    // B. Ajuste Manual (Slider 1-10)
    const adjustment = manualToElo(manualRating);

    return Math.round(basePoints + adjustment);
};

// 3. CALCULAR EXPECTATIVA DE VICTORIA (0 a 1)
const getExpectedScore = (ratingA: number, ratingB: number): number => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

// 4. FACTOR DE CONTUNDENCIA (Multiplicador por diferencia de juegos)
const getMarginMultiplier = (scoreA: number, scoreB: number): number => {
    const diff = Math.abs(scoreA - scoreB);
    const total = scoreA + scoreB;
    
    // Si es un partido muy corto (ej. retirada), factor bajo
    if (total < 4) return 0.5;

    // Diferencia de juegos (Suavizado)
    if (diff >= 5) return 1.2;  // 6-0, 6-1 (Paliza suave)
    if (diff >= 3) return 1.1; // 6-2, 6-3 (Cómoda)
    return 1.0;                 // 6-4, 6-5, 7-6 (Ajustada)
};

// 5. CALCULAR INTERCAMBIO DE PUNTOS (DELTA)
export const calculateMatchDelta = (
    pairAElo: number, 
    pairBElo: number, 
    scoreA: number, 
    scoreB: number
): number => {
    // Determinar ganador real (1 o 0)
    const actualScoreA = scoreA > scoreB ? 1 : 0;
    
    // Calcular expectativa
    const expectedA = getExpectedScore(pairAElo, pairBElo);
    
    // Obtener multiplicador por paliza
    const marginMult = getMarginMultiplier(scoreA, scoreB);

    // Fórmula Maestra: K * Multiplicador * (Real - Esperado)
    let delta = K_FACTOR * marginMult * (actualScoreA - expectedA);

    // Aplicar Hard Cap (Límite máximo de puntos)
    if (delta > MAX_POINTS_CAP) delta = MAX_POINTS_CAP;
    if (delta < -MAX_POINTS_CAP) delta = -MAX_POINTS_CAP;

    return Math.round(delta);
};

// HELPER: Obtener ELO visual para la UI
export const calculateDisplayRanking = (player: Player): number => {
    // Si ya tiene un ELO calculado real, usamos ese.
    if (player.global_rating) return Math.round(player.global_rating);
    
    // Si es legacy o nuevo sin procesar, lo calculamos al vuelo
    return calculateInitialElo(player.categories || [], player.manual_rating || 5);
};

// HELPER: Obtener ELO promedio de una pareja
export const getPairTeamElo = (p1: Player, p2: Player): number => {
    const elo1 = calculateDisplayRanking(p1);
    const elo2 = calculateDisplayRanking(p2);
    return Math.round((elo1 + elo2) / 2);
};
