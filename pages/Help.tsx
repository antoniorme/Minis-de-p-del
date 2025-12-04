
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, BookOpen, Settings, Users } from 'lucide-react';

const Help: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
      {
        q: "1. Pasos para crear un torneo",
        a: "El proceso es simple: \n1. Ve a la pestaña 'Registro' y añade a las parejas (mínimo 10 o 16).\n2. Cuando estés listo, pulsa 'Empezar' o ve a la pestaña 'Directo'.\n3. Allí verás el panel de configuración: verifica que están todos, elige el formato y el método de mezcla.\n4. ¡Pulsa 'Empezar Torneo' y a jugar!"
      },
      {
        q: "2. Métodos de Generación: ¿Cuál elijo?",
        a: "• NIVEL (Equilibrado): Ordena a las parejas por ELO. Las mejores van al Grupo A (Champions) y las de menor nivel al Grupo D (Europa). Ideal si quieres niveles homogéneos dentro de cada grupo.\n\n• MIX (Mezclado): Usa un sistema de 'bombos' o cremallera. Reparte a los mejores equitativamente entre todos los grupos (1º al A, 2º al B, 3º al C...). Ideal para que todos los grupos tengan una dificultad similar.\n\n• LLEGADA: Orden estricto de inscripción.\n\n• MANUAL: Se abrirá un asistente para que tú elijas dedo a dedo quién va a cada grupo."
      },
      { 
        q: "3. Mini 16: Lógica y Descansos", 
        a: "El sistema es inteligente y se adapta a tu club:\n• Si tienes MENOS de 8 pistas: Se juega el formato 'Rotativo'. Son 4 rondas de grupos. En cada ronda juegan 12 parejas y descansan 4. Todos juegan 3 partidos garantizados antes de Playoffs.\n• Si tienes 8 o MÁS pistas: Se activa el formato 'Simultáneo'. Son 3 rondas de grupos intensivas donde juegan las 16 parejas a la vez. No hay descansos." 
      },
      { 
        q: "4. Mini 10: Lógica Especial", 
        a: "Este formato está diseñado para 5 pistas. Se crean 2 grupos de 5 parejas (A y B). \n• Fase de Grupos: Juegan TODOS a la vez (5 partidos). Para lograr esto, en cada ronda hay un 'Partido Cruzado' entre una pareja del Grupo A y una del B.\n• Playoffs: Los 4 mejores de cada grupo van a Cuartos de Final cruzados (1ºA vs 4ºB...). Los 5º de cada grupo juegan directamente la Final de Consolación." 
      },
      { 
        q: "5. ¿Qué pasa si tengo reservas?", 
        a: "Si seleccionas el formato 'Mini 10' pero tienes 16 parejas inscritas, el sistema tomará a las 10 primeras según el criterio que elijas (ej. las 10 con mejor ELO) y dejará a las otras 6 marcadas como reservas en la base de datos, por si necesitas hacer cambios manuales luego." 
      },
      { 
        q: "6. Botón de Pánico (Reiniciar)", 
        a: "Si te has equivocado al crear el torneo (ej. elegiste 'Nivel' y querías 'Mix'), ve a la pantalla de Directo y pulsa el icono de engranaje ⚙️. Allí verás 'Reiniciar Configuración'. Esto borrará los partidos generados y te dejará configurar de nuevo sin borrar a los jugadores." 
      },
      { 
        q: "7. Cálculo del ELO", 
        a: "Nuestro algoritmo combina un 70% de rendimiento real (partidos ganados y diferencia de juegos) con un 30% de valoración manual. Esto permite que el organizador ajuste el nivel de un jugador si considera que su ranking no refleja la realidad." 
      },
  ];

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-3xl font-bold text-slate-900">Ayuda & Lógica</h2>
      
      {/* Introduction */}
      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-4 items-start">
          <div className="bg-white p-2 rounded-full text-emerald-600 shadow-sm"><BookOpen size={24}/></div>
          <div>
              <h3 className="font-bold text-emerald-800">Manual del Organizador</h3>
              <p className="text-sm text-emerald-700 mt-1">Aquí explicamos cómo el algoritmo decide los cruces y gestiona los tiempos de tu torneo.</p>
          </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-3">
          {faqs.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <button 
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-slate-50 transition-colors"
                  >
                      <span className="font-bold text-slate-800 text-sm md:text-base pr-4">{item.q}</span>
                      {openIndex === idx ? <ChevronUp size={20} className="text-slate-400 flex-shrink-0"/> : <ChevronDown size={20} className="text-slate-400 flex-shrink-0"/>}
                  </button>
                  {openIndex === idx && (
                      <div className="p-5 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-50 whitespace-pre-line">
                          <div className="pt-4">{item.a}</div>
                      </div>
                  )}
              </div>
          ))}
      </div>

      {/* ELO Explanation Card */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-md overflow-hidden mt-8">
          <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <TrendingUp size={24} />
              </div>
              <div>
                  <h3 className="font-bold text-blue-800">Detalle del Sistema ELO</h3>
                  <p className="text-xs text-blue-600">Cómo puntuamos a los jugadores</p>
              </div>
          </div>
          <div className="p-5 space-y-4 text-sm text-slate-600">
              <p>
                  El sistema utiliza un algoritmo dinámico que premia la competitividad y corrige desajustes.
              </p>
              
              <div className="space-y-3">
                  <div className="flex gap-3">
                      <span className="font-bold text-blue-600 whitespace-nowrap">Expectativa:</span>
                      <p>Calculamos la probabilidad de victoria antes de jugar. Si ganas a favoritos, sumas más puntos.</p>
                  </div>
                  <div className="flex gap-3">
                      <span className="font-bold text-blue-600 whitespace-nowrap">K-Factor:</span>
                      <p>La diferencia de juegos importa. Un 6-0 tiene mucho más impacto en el ranking que un 7-6.</p>
                  </div>
                  <div className="flex gap-3">
                      <span className="font-bold text-blue-600 whitespace-nowrap">Corrección:</span>
                      <p>El Ranking final es: <strong>70% Estadístico</strong> + <strong>30% Manual</strong>.</p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Help;
