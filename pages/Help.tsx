
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

const Help: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
      { 
        q: "¿Cómo creo un torneo?", 
        a: "Ve a 'Registro', añade 16 parejas y pulsa 'Empezar Torneo'. Puedes elegir el método de generación de grupos: por Nivel (ELO), Manual, o por Orden de Llegada." 
      },
      { 
        q: "¿Cómo funcionan los grupos?", 
        a: "El sistema asigna 4 grupos (A, B, C, D). En cada turno (18min) juegan 3 grupos (6 partidos) y descansa 1 grupo (2 partidos) o descansan parejas sueltas según la configuración de pistas." 
      },
      { 
        q: "¿Puedo editar un resultado?", 
        a: "Sí. En la pestaña 'Directo', pulsa el icono del lápiz en un partido finalizado. También puedes ir a 'Resultados', buscar el grupo o fase y pulsar el botón de editar." 
      },
      { 
        q: "¿Qué hago al terminar?", 
        a: "Cuando se jueguen las finales, aparecerá un panel de 'Torneo Finalizado'. Luego, ve al Inicio (Dashboard) y pulsa el botón 'Finalizar y Archivar' para guardar los campeones y estadísticas en el historial." 
      },
  ];

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-3xl font-bold text-slate-900">Ayuda & FAQ</h2>
      
      {/* FAQ Section */}
      <div className="space-y-3">
          {faqs.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <button 
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-slate-50 transition-colors"
                  >
                      <span className="font-bold text-slate-800">{item.q}</span>
                      {openIndex === idx ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                  </button>
                  {openIndex === idx && (
                      <div className="p-5 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-50">
                          <div className="pt-4">{item.a}</div>
                      </div>
                  )}
              </div>
          ))}
      </div>

      {/* ELO Explanation Card */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-md overflow-hidden">
          <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <TrendingUp size={24} />
              </div>
              <div>
                  <h3 className="font-bold text-emerald-800">¿Cómo funciona el ELO?</h3>
                  <p className="text-xs text-emerald-600">Sistema de puntuación inteligente</p>
              </div>
          </div>
          <div className="p-5 space-y-4 text-sm text-slate-600">
              <p>
                  El sistema utiliza un algoritmo avanzado para calcular el nivel de cada jugador basándose en sus resultados reales, no solo en sensaciones.
              </p>
              
              <div className="space-y-3">
                  <div className="flex gap-3">
                      <span className="font-bold text-emerald-600 whitespace-nowrap">1. Expectativa:</span>
                      <p>Antes de cada partido, el sistema calcula la probabilidad de victoria comparando el promedio de puntos de la Pareja A vs Pareja B.</p>
                  </div>
                  <div className="flex gap-3">
                      <span className="font-bold text-emerald-600 whitespace-nowrap">2. Marcador:</span>
                      <p>No es lo mismo ganar 6-0 que 7-6. La diferencia de juegos influye en cuántos puntos subes o bajas (Factor K dinámico).</p>
                  </div>
                  <div className="flex gap-3">
                      <span className="font-bold text-emerald-600 whitespace-nowrap">3. Distribución:</span>
                      <p>Si ganas a una pareja teóricamente "mejor" que tú, ganas muchos puntos (y ellos pierden muchos). Si ganas a una "peor", ganas pocos puntos.</p>
                  </div>
                  <div className="flex gap-3">
                      <span className="font-bold text-emerald-600 whitespace-nowrap">4. Ranking:</span>
                      <p>El Ranking que ves en la ficha es una mezcla: <strong>70%</strong> ELO Estadístico (Partidos) + <strong>30%</strong> Valoración Manual del organizador.</p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Help;
