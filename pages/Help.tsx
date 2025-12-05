import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, BookOpen, Settings, Users, RefreshCw } from 'lucide-react';

const Help: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
      {
        q: "1. Pasos para crear un torneo",
        a: "El proceso es simple: \n1. Ve a la pestaña 'Registro' y añade a las parejas (mínimo 10 o 16).\n2. Cuando estés listo, pulsa 'Empezar' o ve a la pestaña 'Directo'.\n3. Allí verás el panel de configuración: verifica que están todos, elige el formato y el método de mezcla.\n4. ¡Pulsa 'Empezar Torneo' y a jugar!"
      },
      {
        q: "2. Jugadores vs Parejas: ¿Cuál es la diferencia?",
        a: "Esta es una distinción clave:\n• **Jugadores:** Se guardan en la base de datos de tu club para siempre. Tienen su historial, ELO y estadísticas acumuladas. Los gestionas en 'Gestión Jugadores'.\n• **Parejas:** Son temporales y existen solo para el torneo actual. Al archivar un torneo, la pareja se disuelve, pero los jugadores siguen existiendo. \n\n*Nota:* Si eliminas una pareja del registro, los jugadores NO se borran."
      },
      {
          q: "3. Sustitución de Parejas (Reservas)",
          a: "Si una pareja titular no puede jugar o se lesiona, puedes sustituirla por una reserva sin alterar el calendario:\n1. Ve a la pestaña 'Control'.\n2. En la tarjeta de la pareja titular, pulsa el icono de refrescar (🔄).\n3. Selecciona qué pareja reserva entrará en su lugar.\n\nLa nueva pareja heredará los partidos ya jugados, los puntos y la posición en el grupo."
      },
      {
        q: "4. Métodos de Generación: ¿Cuál elijo?",
        a: "• NIVEL (Equilibrado): Ordena a las parejas por ELO. Las mejores van al Grupo A (Champions) y las de menor nivel al Grupo D (Europa). Ideal si quieres niveles homogéneos dentro de cada grupo.\n\n• MIX (Mezclado): Usa un sistema de 'bombos' o cremallera. Reparte a los mejores equitativamente entre todos los grupos (1º al A, 2º al B, 3º al C...). Ideal para que todos los grupos tengan una dificultad similar.\n\n• LLEGADA: Orden estricto de inscripción.\n\n• MANUAL: Se abrirá un asistente para que tú elijas dedo a dedo quién va a cada grupo."
      },
      { 
        q: "5. Formatos y Lógica", 
        a: "• **Mini 16:** 4 Grupos de 4. Si tienes <8 pistas, es rotativo con descansos (4 rondas). Si tienes >=8 pistas, es simultáneo (3 rondas).\n• **Mini 12:** 3 Grupos de 4. Pasan a cuartos los 2 primeros de cada grupo y los 2 mejores terceros.\n• **Mini 10:** 2 Grupos de 5. Juegan todos contra todos (5 partidos). Los cruces de cuartos son A vs B." 
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