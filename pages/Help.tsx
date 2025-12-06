
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, BookOpen, Settings, Users, RefreshCw, Table, Sliders, Calculator, ShieldAlert } from 'lucide-react';

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
        q: "7. ¿Cómo funcionan los Puntos (ELO)?", 
        a: "Hemos diseñado un sistema que premia el mérito pero protege al jugador. Se basa en tres pilares: su Categoría (Puntos Base), tu valoración Manual y los resultados de sus partidos. \n\nConsulta la tarjeta detallada 'Cómo funcionan los Puntos' al final de esta página para ver la tabla exacta." 
      },
  ];

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-slate-900">Ayuda & Lógica</h2>
      
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

      {/* DETAILED ELO EXPLANATION CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden mt-8">
          <div className="bg-slate-900 p-5 text-white flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg text-blue-300">
                  <TrendingUp size={24} />
              </div>
              <div>
                  <h3 className="font-bold text-lg">Cómo funcionan los Puntos</h3>
                  <p className="text-xs text-slate-400">Guía rápida para dueños de club</p>
              </div>
          </div>
          
          <div className="p-6 space-y-8">
              
              {/* SECCIÓN 1: TABLA DE CATEGORÍAS */}
              <div>
                  <div className="flex items-center gap-2 mb-3 text-blue-600 font-bold uppercase text-xs tracking-wider">
                      <Table size={16}/> 1. Puntos de Salida (La Base)
                  </div>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      Cuando creas un jugador, el sistema le asigna unos puntos iniciales según su categoría teórica. Este es su "suelo".
                  </p>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                              <tr>
                                  <th className="px-4 py-3">Categoría</th>
                                  <th className="px-4 py-3 text-right">Puntos ELO</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                              <tr><td className="px-4 py-2 font-medium">Iniciación</td><td className="px-4 py-2 text-right font-bold">800</td></tr>
                              <tr><td className="px-4 py-2 font-medium">5ª Categoría</td><td className="px-4 py-2 text-right font-bold">1000</td></tr>
                              <tr><td className="px-4 py-2 font-medium">4ª Categoría</td><td className="px-4 py-2 text-right font-bold">1200</td></tr>
                              <tr><td className="px-4 py-2 font-medium">3ª Categoría</td><td className="px-4 py-2 text-right font-bold">1400</td></tr>
                              <tr><td className="px-4 py-2 font-medium">2ª Categoría</td><td className="px-4 py-2 text-right font-bold">1600</td></tr>
                              <tr><td className="px-4 py-2 font-medium">1ª Categoría</td><td className="px-4 py-2 text-right font-bold">1800+</td></tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                      <Calculator size={14} className="shrink-0 mt-0.5"/>
                      <span><strong>¿Juega en dos categorías?</strong> Si seleccionas, por ejemplo, 4ª y 3ª, el sistema hace la media automática (1300 pts).</span>
                  </div>
              </div>

              {/* SECCIÓN 2: AJUSTE MANUAL */}
              <div>
                  <div className="flex items-center gap-2 mb-3 text-amber-600 font-bold uppercase text-xs tracking-wider">
                      <Sliders size={16}/> 2. El "Afinador" (Ajuste Manual)
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                      Dentro de una categoría hay niveles muy distintos. El slider del <strong>1 al 10</strong> te permite afinar esa base.
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
                      <li><strong>Nivel 5 (Neutro):</strong> Se queda con los puntos de la tabla.</li>
                      <li><strong>Nivel 8-10 (Fuerte):</strong> Sumamos puntos extra (es un jugador puntero en su categoría).</li>
                      <li><strong>Nivel 1-3 (Flojo):</strong> Restamos puntos (acaba de subir o es el más débil).</li>
                  </ul>
              </div>

              {/* SECCIÓN 3: PARTIDOS */}
              <div>
                  <div className="flex items-center gap-2 mb-3 text-emerald-600 font-bold uppercase text-xs tracking-wider">
                      <RefreshCw size={16}/> 3. Ganar y Perder (Partidos)
                  </div>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      Una vez empieza a jugar, los puntos suben y bajan automáticamente.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-800 block mb-1">Premios por ganar</span>
                          <p className="text-xs text-slate-500">
                              Ganar a alguien mejor que tú da <strong>muchos puntos</strong> (ej. +20). Ganar a alguien peor da <strong>pocos puntos</strong> (ej. +2).
                          </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-800 block mb-1">Bonus por Paliza</span>
                          <p className="text-xs text-slate-500">
                              No es lo mismo ganar 6-5 que 6-0. Si ganas con mucha diferencia, el sistema te da un pequeño bonus extra.
                          </p>
                      </div>
                  </div>
                  <div className="mt-3 bg-rose-50 p-3 rounded-lg border border-rose-100 text-xs text-rose-800 flex items-start gap-2">
                      <ShieldAlert size={14} className="shrink-0 mt-0.5"/>
                      <span><strong>Límite de Seguridad:</strong> Para evitar locuras, nadie puede ganar ni perder más de <strong>25 puntos</strong> en un solo partido.</span>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default Help;
