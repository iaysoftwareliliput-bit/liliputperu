/* ===== CHATBOT LILI PRO · LILIPUT =====
   Motor de patrones (sin API externa) + registro de conversaciones (txt / Firebase) */
(function () {
  const WA = '51996110346';
  const CFG = { apiKey:"AIzaSyBVQXS-mP3aeQvITY95i3OQY87BQPRNtLk", authDomain:"codigo-descuento.firebaseapp.com", projectId:"codigo-descuento", storageBucket:"codigo-descuento.firebasestorage.app", messagingSenderId:"1094968477721", appId:"1:1094968477721:web:6275765e79f486297f8288" };
  const LS = 'liliput_chat_log', SID = Math.random().toString(36).slice(2, 8);
  const ADMIN = /[?&]admin=lili/.test(location.search);

  /* ---------- utilidades ---------- */
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function score(text, toks, it) {
    let s = 0;
    for (const kw of it.k) {
      if (kw.includes(' ')) { if (text.includes(kw)) s += 3; continue; }
      let best = 0;
      for (const t of toks) {
        if (t === kw) best = Math.max(best, 2);
        else if (t.length >= 4 && kw.length >= 4 && (t.startsWith(kw) || kw.startsWith(t))) best = Math.max(best, 1.5);
        else if (kw.length >= 5 && t.length >= 5 && lev(t, kw) <= (kw.length >= 8 ? 2 : 1)) best = Math.max(best, 1.2);
      }
      s += best;
    }
    return s;
  }

  /* ---------- base de conocimiento ---------- */
  const AREA = (id, k, t) => ({ id, k, cta: 'agendar', a: t + ' Puedes tocar la tarjeta de esa área en "Áreas de acompañamiento" para hacer un mini test orientativo (no reemplaza una evaluación profesional). Nuestro equipo puede evaluar el caso y armar un plan personalizado.' });
  const KB = [
    { id:'identidad', k:['quien eres','eres un robot','eres una ia','como te llamas','que eres','eres real','eres humana'], a:'Soy Lili 🦁, la asistente virtual de LILIPUT. Respondo dudas sobre nuestros servicios las 24 horas. Para temas clínicos o evaluaciones, el equipo de psicólogos es quien te atiende en persona u online.' },
    { id:'precio', k:['precio','precios','costo','costos','tarifa','tarifas','cobran','cuanto cuesta','cuanto cobran','cuanto sale','pagar','pago','yape','plin','transferencia','efectivo','seguro','seguros'], cta:'wa', a:'Trabajamos de manera particular (no con seguros). Aceptamos efectivo, transferencia y Yape/Plin. Las tarifas dependen del tipo de servicio (sesión, evaluación, paquetes), así que te las confirmamos por WhatsApp junto con las promociones vigentes.' },
    { id:'duracion', k:['dura','duracion','minutos','cuanto dura','cuanto tiempo','frecuencia','cada cuanto','cuantas sesiones','sesion','sesiones'], a:'Cada sesión dura aproximadamente 45 a 50 minutos. Al inicio se recomienda una vez por semana para construir confianza y dar continuidad; luego el plan se ajusta según los avances. La duración total del proceso depende de cada niño y sus objetivos: muchas veces es breve y efectiva.' },
    { id:'online', k:['online','virtual','videollamada','distancia','zoom','meet','remoto','en linea','desde casa'], a:'¡Sí! Atendemos presencial en Piura y también online por videollamada, para quienes viven fuera o prefieren la comodidad de casa. Ambas modalidades tienen la misma calidad profesional.', cta:'agendar' },
    { id:'agendar', k:['agendar','cita','citas','reservar','reserva','turno','primera cita','sacar cita','programar','quiero atenderme','quiero una consulta'], cta:'agendar', a:'Agendar es fácil 🗓️: 1) toca el botón "AGENDAR CITA" y llena el formulario, 2) escríbenos al WhatsApp 996 110 346, o 3) mándanos mensaje por Instagram, Facebook o TikTok. Te respondemos a la brevedad para coordinar día y hora.' },
    { id:'horario', k:['horario','horarios','hora','atienden','abren','abierto','sabado','domingo','hasta que hora','cuando atienden','dias'], a:'Atendemos de lunes a sábado, de 10:00 am a 6:00 pm. Los domingos estamos cerrados.', cta:'agendar' },
    { id:'ubicacion', k:['ubicacion','direccion','donde','queda','llegar','mapa','ubicados','sanchez cerro','piura','como llego','local','consultorio'], cta:'mapa', a:'Estamos en Av. Sánchez Cerro 3389, Calle Tizón B04, interior 201, Piura 📍. En el pie de la página tienes un video de cómo llegar y el enlace a Google Maps.' },
    { id:'contacto', k:['whatsapp','telefono','celular','numero','correo','email','instagram','facebook','tiktok','redes','contacto','llamar','escribir'], cta:'wa', a:'Puedes contactarnos por WhatsApp al 996 110 346, al correo Liliput.peru@gmail.com o en redes: Instagram @liliput.piura, Facebook y TikTok @liliput.piura.' },
    { id:'edades', k:['edad','edades','años','anos','pequeño','pequeno','bebe','adolescente','desde que edad','niños','ninos','hijo pequeño','padres'], a:'Atendemos a niños desde los 3 años, escolares y adolescentes, y también a padres que necesiten orientación. Adaptamos las estrategias a la edad y necesidades de cada paciente.' },
    { id:'senales', k:['necesita terapia','senales','sintomas','cuando llevar','como se si','deberia llevar','necesita ayuda','psicologo','llevar a mi hijo','preocupado','preocupada'], cta:'agendar', a:'Algunas señales que conviene consultar: cambios bruscos de conducta, irritabilidad o agresividad frecuente, aislamiento, bajo rendimiento sin causa clara, problemas de sueño, miedos intensos o cambios fuertes tras una pérdida o mudanza. Si persisten más de 2–3 semanas, una consulta ayuda a entender qué pasa. Cuéntame qué observas y te oriento con más detalle.' },
    { id:'informes', k:['informe','informes','certificado','certificados','constancia','reporte','reportes','documento para el colegio'], a:'Sí, emitimos informes psicológicos para colegios, certificados según evaluación previa y reportes de avance terapéutico cuando se solicitan. Se entregan de forma formal tras un proceso de evaluación responsable.' },
    { id:'profesionales', k:['profesionales','psicologa','edson','marie','lourdes','equipo','especialista','quienes','licenciado','licenciada','terapeuta','quien atiende'], a:'Nuestro equipo: Mgtr. Edson Gutiérrez Pellegrin (Psicopedagogía, enfoque cognitivo-conductual), Lic. Marie Merino Ancajima (intervención psicológica, regulación emocional, habilidades sociales) y Lic. Lourdes Benites Ladines (terapia cognitivo-conductual, psicología clínica). Al agendar puedes elegir profesional o dejarlo según disponibilidad.', cta:'agendar' },
    { id:'convenios', k:['convenio','convenios','colegio','colegios','instituciones','ugel','instituto'], a:'Tenemos convenios con 7 instituciones educativas de Piura, entre ellas UGEL Piura, Sócrates, Rosa Suárez Rafael, Saint Andrés, Divino Rey, José Joaquín Inclán e Inmaculada Concepción. Si vienes de una de ellas, consulta por tu código de descuento.' },
    { id:'proceso', k:['proceso','evaluacion','entrevista','como funciona','primera sesion','pasos','empezar','metodologia','cognitivo conductual','como trabajan','enfoque'], a:'Trabajamos en 3 pasos: 1) entrevista familiar para conocer la situación, 2) evaluación psicológica/psicopedagógica (pruebas, observación y cuestionarios según la edad) y 3) intervención y seguimiento con un plan personalizado y orientación a la familia. Nuestro enfoque es cognitivo-conductual, cálido y basado en evidencia.', cta:'agendar' },
    { id:'descuento', k:['descuento','codigo','promocion','promo','oferta','cupon','rebaja'], a:'Si tienes un código (por convenio o promoción), ingrésalo en el formulario de "AGENDAR CITA", en el campo "Código de descuento", y toca APLICAR. Cada código puede canjearse una sola vez por persona.', cta:'agendar' },
    { id:'eventos', k:['taller','talleres','evento','eventos','charla','charlas','proximos eventos'], a:'Realizamos talleres en colegios, como "No al bullying" y "Conciencia emocional". Mira la sección "Próximos eventos" para fechas y lugares.' },
    { id:'confidencial', k:['confidencial','privacidad','secreto','reservado','confidencialidad','privado'], a:'Toda la información es confidencial y se maneja con ética profesional. Los informes solo se entregan a quien corresponde y con autorización de los padres o tutores.' },
    AREA('ansiedad', ['ansiedad','ansioso','ansiosa','nervios','nervioso','preocupa','miedo','miedos','panico','angustia','temor'], 'Damos estrategias prácticas para que los niños y adolescentes manejen la ansiedad, reduzcan las preocupaciones excesivas y recuperen la calma.'),
    AREA('ira', ['ira','enojo','enojado','agresivo','agresividad','golpea','grita','gritos','rabia','furia','pelea','pelea con'], 'Ayudamos a identificar los detonantes del enojo y a expresar las emociones de forma adecuada y constructiva.'),
    AREA('frustracion', ['frustracion','rabieta','rabietas','berrinche','berrinches','no soporta perder','se frustra','tolerancia'], 'Acompañamos a los niños a manejar la frustración, fortaleciendo la paciencia y la resiliencia cuando las cosas no salen como esperan.'),
    AREA('impulsos', ['impulsivo','impulsos','impulsividad','hiperactivo','hiperactividad','no se queda quieto','actua sin pensar','inquieto'], 'Enseñamos herramientas para pensar antes de actuar y tomar decisiones más conscientes.'),
    AREA('atencion', ['atencion','concentracion','distrae','distraido','memoria','olvida','tdah','notas','rendimiento','aprendizaje','bajas notas','no aprende','dislexia'], 'Fortalecemos atención, concentración y memoria con ejercicios prácticos que mejoran el enfoque y el rendimiento académico. Un diagnóstico como TDAH solo lo determina una evaluación profesional completa.'),
    AREA('social', ['amigos','timido','timida','aislado','aislada','socializar','socializacion','acoso','bullying','no juega','relacionarse','rechazo'], 'Impulsamos habilidades sociales para crear amistades sanas e integrarse mejor. Si hay bullying, también orientamos a la familia y al colegio.'),
    AREA('autoestima', ['autoestima','inseguro','insegura','inseguridad','se menosprecia','baja autoestima','no confia'], 'Trabajamos el autoconcepto y la valoración personal para que se relacionen de forma más segura y positiva consigo mismos.'),
    AREA('vocacional', ['vocacional','carrera','universidad','estudiar','profesion','que estudiar','orientacion vocacional'], 'Acompañamos a adolescentes a descubrir intereses, habilidades y fortalezas para decidir su camino académico y profesional con claridad.'),
    AREA('estres', ['estres','estresado','estresada','agobiado','sueno','dormir','cansado','insomnio','presion'], 'Ayudamos a identificar las fuentes de estrés y a manejarlo con técnicas efectivas para recuperar equilibrio y bienestar.'),
    AREA('instrucciones', ['instrucciones','obedece','obedecer','hace caso','no hace caso','ordenes','normas','limites','desobediente','no respeta'], 'Brindamos estrategias para mejorar la comprensión y el seguimiento de instrucciones, la organización y el cumplimiento de tareas.')
  ];
  const SALUDO = { k:['hola','holi','buenas','buenos dias','buenas tardes','buenas noches','hey','saludos','ola'], a:'¡Hola! 😊 Soy Lili. Cuéntame, ¿en qué puedo ayudarte? Puedes preguntarme por precios, horarios, áreas de acompañamiento o cómo agendar.' };
  const GRACIAS = { k:['gracias','muchas gracias','genial','excelente','perfecto','ok gracias','listo'], a:'¡Con gusto! 💜 Si surge otra duda, aquí estaré.' };
  const ADIOS = { k:['adios','chau','chao','hasta luego','nos vemos','bye'], a:'¡Hasta pronto! 👋 Gracias por escribir a LILIPUT.' };
  const CRISIS = /suicid|quitarme la vida|matarme|hacerme dano|hacerse dano|autolesion|cortarse|no quiere vivir|no quiero vivir|quiere morir|quiero morir|abuso sexual|abusaron|abusa de|maltrat|me pega|le pega/;
  const CRISIS_A = 'Lamento mucho lo que estás viviendo 💜 Esto es importante y merece atención inmediata de una persona. Si hay riesgo ahora mismo, llama a emergencias (105) o acude a un centro de salud. En Perú puedes llamar gratis a la Línea 113, opción 5 (salud mental) o a la Línea 100 (violencia y abuso), ambas disponibles las 24 horas. También puedes escribirnos por WhatsApp y el equipo te orientará cuanto antes.';

  /* ---------- respuesta ---------- */
  let ultimo = null;
  function responder(q) {
    const t = norm(q), toks = t.split(' ');
    if (CRISIS.test(t)) return { id:'crisis', a:CRISIS_A, cta:'wa' };
    const r = KB.map(it => ({ it, s: score(t, toks, it) })).filter(x => x.s >= 2).sort((a, b) => b.s - a.s);
    if (r.length) {
      let a = r[0].it.a, cta = r[0].it.cta, id = r[0].it.id;
      if (r[1] && r[1].s >= r[0].s * 0.7 && r[1].it.id !== id) { a += '\n\n' + r[1].it.a; id += '+' + r[1].it.id; }
      ultimo = r[0].it.id; return { id, a, cta };
    }
    const sec = [[GRACIAS,'gracias'],[ADIOS,'adios'],[SALUDO,'saludo']].find(([o]) => score(t, toks, o) >= 1.5);
    if (sec) return { id: sec[1], a: sec[0].a };
    if (ultimo && toks.length <= 4 && /\b(mas|eso|como|por que|y si)\b/.test(t)) return { id:'seguimiento', a:'Sobre ese tema, lo mejor es una evaluación personalizada: cada niño es distinto. ¿Te ayudo a agendar una cita o prefieres hacerme otra pregunta?', cta:'agendar' };
    return { id:'sin_respuesta', a:'No estoy segura de haberte entendido bien 🤔 Puedes reformular la pregunta (por ejemplo: "¿cuánto cuesta?", "¿mi hijo se distrae mucho, qué hago?") o escribirnos por WhatsApp para que una persona te responda.', cta:'wa' };
  }

  /* ---------- registro ---------- */
  const leer = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } };
  const fmt = r => `[${r.fecha}] Sesión ${r.sid}\nPADRE/MADRE: ${r.q}\nLILI: ${r.a.replace(/\n+/g, ' ')}\n(tema: ${r.tema})\n`;
  function bajar(regs, nombre) {
    const txt = '=== LILIPUT · Registro de conversaciones del asistente Lili ===\n\n' + regs.map(fmt).join('\n');
    const url = URL.createObjectURL(new Blob([txt], { type:'text/plain;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href:url, download:nombre });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  async function fb() {
    const A = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const F = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    return { F, db: F.getFirestore(A.getApps().length ? A.getApp() : A.initializeApp(CFG)) };
  }
  async function guardar(q, a, tema) {
    const reg = { fecha: new Date().toLocaleString('es-PE'), sid: SID, q, a, tema };
    const all = leer(); all.push(reg); localStorage.setItem(LS, JSON.stringify(all.slice(-500)));
    try { const { F, db } = await fb(); await F.addDoc(F.collection(db, 'chat_logs'), { ...reg, ts: F.serverTimestamp() }); } catch (e) {}
  }
  async function exportarNube() {
    try {
      const { F, db } = await fb();
      const snap = await F.getDocs(F.collection(db, 'chat_logs'));
      const regs = snap.docs.map(d => d.data()).sort((x, y) => (x.ts?.seconds || 0) - (y.ts?.seconds || 0));
      bajar(regs, 'liliput_chat_completo.txt');
    } catch (e) { alert('No se pudo leer la nube. Revisa las reglas de Firestore para chat_logs.'); }
  }

  /* ---------- interfaz ---------- */
  document.getElementById('chatbot-burbuja')?.remove();
  document.getElementById('chatbot-ventana')?.remove();
  const css = document.createElement('style');
  css.textContent = `
  #chatbot-ventana{height:500px}
  .chatbot-header .hbtn{background:none;border:none;color:#fff;font-size:1rem;cursor:pointer;padding:.2rem}
  .chatbot-msg{white-space:pre-wrap}
  .chatbot-cta{align-self:flex-start;background:linear-gradient(135deg,#a855f7,#7e22ce);color:#fff;border:none;border-radius:20px;padding:.45rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer;text-decoration:none;font-family:inherit}
  .chatbot-typing{display:flex;gap:4px;padding:.65rem .8rem}
  .chatbot-typing i{width:7px;height:7px;background:#c084fc;border-radius:50%;animation:lilipunto 1s infinite}
  .chatbot-typing i:nth-child(2){animation-delay:.15s}.chatbot-typing i:nth-child(3){animation-delay:.3s}
  @keyframes lilipunto{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}
  #chatbot-form{display:flex;gap:.4rem;padding:.55rem .6rem;border-top:1px solid #f3d0e8;background:#fff}
  #chatbot-input{flex:1;border:2px solid #f3d0e8;border-radius:20px;padding:.5rem .8rem;font-size:.85rem;font-family:inherit;outline:none;color:#3b1f4e}
  #chatbot-input:focus{border-color:#e87fb0}
  #chatbot-enviar{background:linear-gradient(135deg,#e87fb0,#c084fc);color:#fff;border:none;border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:1rem}
  #chatbot-enviar:disabled{opacity:.5;cursor:not-allowed}
  #chatbot-opciones{max-height:96px}`;
  document.head.appendChild(css);

  document.body.insertAdjacentHTML('beforeend', `
  <div id="chatbot-burbuja" title="Chatea con Lili"><img src="lili2.png" alt="Chat con Lili"><span class="chatbot-punto"></span></div>
  <div id="chatbot-ventana">
    <div class="chatbot-header"><img src="lili2.png" alt="Lili">
      <div class="chatbot-header-info"><strong>Lili</strong><span>Asistente virtual · LILIPUT</span></div>
      ${ADMIN ? '<button class="hbtn" id="chatbot-nube" title="Exportar todo (nube)">☁️</button>' : ''}
      <button class="hbtn" id="chatbot-txt" title="Descargar esta conversación (.txt)">⬇</button>
      <button class="hbtn" id="chatbot-cerrar" aria-label="Cerrar chat">✕</button></div>
    <div id="chatbot-mensajes"></div>
    <div id="chatbot-opciones"></div>
    <form id="chatbot-form" autocomplete="off"><input id="chatbot-input" maxlength="300" placeholder="Escribe tu pregunta…"><button id="chatbot-enviar" type="submit">➤</button></form>
  </div>`);

  const $ = id => document.getElementById(id);
  const burbuja = $('chatbot-burbuja'), ventana = $('chatbot-ventana'), msgs = $('chatbot-mensajes'), ops = $('chatbot-opciones'), inp = $('chatbot-input'), btn = $('chatbot-enviar');
  let ocupado = false, iniciado = false;

  const msg = (t, tipo) => { const d = document.createElement('div'); d.className = 'chatbot-msg ' + tipo; d.textContent = t; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
  const CHIPS = [['🗓️ Agendar cita','¿Cómo agendo una cita?'],['💰 Precios','¿Cuánto cuesta una sesión?'],['🕒 Horario','¿Cuál es el horario de atención?'],['📍 Ubicación','¿Dónde están ubicados?'],['💻 Online','¿Tienen sesiones online?'],['👶 ¿Necesita terapia?','¿Cómo sé si mi hijo necesita terapia?']];
  function chips() {
    ops.innerHTML = '';
    CHIPS.forEach(([l, q]) => { const b = document.createElement('button'); b.className = 'chatbot-opcion-btn'; b.textContent = l; b.onclick = () => enviar(q); ops.appendChild(b); });
  }
  function cta(tipo, q) {
    const map = { agendar:['🗓️ Agendar cita', () => { ventana.classList.remove('abierto'); $('abrir-modal')?.click(); }], wa:['💬 Escribir por WhatsApp', () => window.open(`https://wa.me/${WA}?text=${encodeURIComponent('Hola, tengo una consulta: ' + q)}`, '_blank')], mapa:['🗺️ Abrir en Google Maps', () => window.open('https://maps.app.goo.gl/6HEXpfMfYwoTq6D8A', '_blank')] };
    const [l, fn] = map[tipo]; const b = document.createElement('button'); b.className = 'chatbot-cta'; b.textContent = l; b.onclick = fn; msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight;
  }
  async function enviar(q) {
    q = q.trim(); if (!q || ocupado) return;
    ocupado = true; btn.disabled = true; inp.value = ''; msg(q, 'user');
    const r = responder(q);
    const typing = document.createElement('div'); typing.className = 'chatbot-msg bot chatbot-typing'; typing.innerHTML = '<i></i><i></i><i></i>'; msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;
    await new Promise(res => setTimeout(res, 500 + Math.min(r.a.length * 4, 900)));
    typing.remove();
    const d = msg('', 'bot'); const paso = 3;
    for (let i = 0; i < r.a.length; i += paso) { d.textContent = r.a.slice(0, i + paso); msgs.scrollTop = msgs.scrollHeight; await new Promise(res => setTimeout(res, 12)); }
    if (r.cta) cta(r.cta, q);
    guardar(q, r.a, r.id); chips();
    ocupado = false; btn.disabled = false; inp.focus();
  }
  function abrir() {
    ventana.classList.add('abierto'); burbuja.querySelector('.chatbot-punto').style.display = 'none';
    if (!iniciado) { iniciado = true; msg('¡Hola! 👋 Soy Lili, tu asistente virtual de LILIPUT. Escríbeme tu pregunta o elige una opción de abajo, y te ayudo al instante.', 'bot'); chips(); }
    setTimeout(() => inp.focus(), 300);
  }
  burbuja.onclick = () => ventana.classList.contains('abierto') ? ventana.classList.remove('abierto') : abrir();
  $('chatbot-cerrar').onclick = () => ventana.classList.remove('abierto');
  $('chatbot-txt').onclick = () => { const l = leer().filter(x => x.sid === SID); l.length ? bajar(l, 'conversacion_liliput.txt') : alert('Aún no hay mensajes para descargar.'); };
  $('chatbot-nube')?.addEventListener('click', exportarNube);
  $('chatbot-form').onsubmit = e => { e.preventDefault(); enviar(inp.value); };
})();
