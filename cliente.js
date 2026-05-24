/* ============================================================
   MÓDULO CLIENTE — WIZARD DE AGENDAMENTO COM FIREBASE
   Passos: 1 Serviço → 2 Profissional → 3 Horário → 4 Local → 5 Confirmação
   ============================================================ */
import { getFirestore, collection, addDoc, getDocs }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initializeApp, getApps }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

const firebaseConfig = {
    apiKey:            "AIzaSyDe4OT6kL9m_tCGHtqpdgTnbl8tK_jlt6M",
    authDomain:        "projeto-yan-barbeiro.firebaseapp.com",
    projectId:         "projeto-yan-barbeiro",
    storageBucket:     "projeto-yan-barbeiro.firebasestorage.app",
    messagingSenderId: "835967761157",
    appId:             "1:835967761157:web:a02aac9bae48930418556c"
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ── helpers ──────────────────────────────────────────────── */
const toMin   = s => { const [h,m] = s.split(":").map(Number); return h*60+m; };
const toHHMM  = n => `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
const hojeISO = () => new Date().toISOString().split("T")[0];
const fmtData = iso => new Date(iso+"T12:00:00")
    .toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const MAX_DIAS    = 30;
const ALMOCO_INI  = 12 * 60;
const ALMOCO_FIM  = 14 * 60;
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MESES_CURTO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

/* ── regras de data ───────────────────────────────────────── */
const dataPermitida = iso => {
    const d   = new Date(iso+"T12:00:00");
    const dow = d.getDay();
    if (dow === 0) return false;
    const hoje   = new Date(hojeISO()+"T12:00:00");
    const limite = new Date(hoje); limite.setDate(hoje.getDate() + MAX_DIAS);
    return d >= hoje && d <= limite;
};

/* ── chips de data ────────────────────────────────────────── */
window.iniciarCalendario = () => _renderizarChips();

const _renderizarChips = () => {
    const container = document.getElementById("date-chips");
    if (!container) return;
    const hoje      = new Date(); hoje.setHours(0,0,0,0);
    const selecionada = document.getElementById("horario-data-input")?.value || "";
    let html = "";
    for (let i = 0; i <= MAX_DIAS; i++) {
        const d   = new Date(hoje); d.setDate(hoje.getDate() + i);
        const dow = d.getDay();
        if (dow === 0) continue;
        const iso      = d.toISOString().split("T")[0];
        const permitida = dataPermitida(iso);
        const isSel    = iso === selecionada;
        const isHoje   = i === 0;
        let cls = "date-chip";
        if (!permitida)       cls += " date-chip--disabled";
        if (isHoje && !isSel) cls += " date-chip--today";
        if (isSel)            cls += " date-chip--selected";
        const onclick = permitida ? `onclick="window._selecionarDataCal('${iso}')"` : "";
        html += `<div class="${cls}" ${onclick}>
            <span class="date-chip__dow">${DIAS_SEMANA[dow]}</span>
            <span class="date-chip__day">${d.getDate()}</span>
            <span class="date-chip__mon">${MESES_CURTO[d.getMonth()]}</span>
        </div>`;
    }
    container.innerHTML = html;
};

window._selecionarDataCal = iso => {
    document.getElementById("horario-data-input").value = iso;
    const hint = document.getElementById("date-picker-hint");
    if (hint){ hint.textContent = fmtData(iso); hint.className = "cal-hint selected"; }
    _renderizarChips();
    window.renderizarHorarios();
};

/* ── máscara de telefone ──────────────────────────────────── */
const aplicarMascara = input => {
    input.addEventListener("input", () => {
        let v = input.value.replace(/\D/g,"").slice(0,11);
        if (v.length <= 10) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/,"($1) $2-$3");
        else                v = v.replace(/^(\d{2})(\d{5})(\d{0,4})$/,"($1) $2-$3");
        input.value = v.replace(/-$/,"");
    });
};

/* ── validação de e-mail em tempo real ────────────────────── */
const aplicarValidacaoEmail = input => {
    const feedback = document.createElement("small");
    feedback.id = "email-feedback";
    feedback.style.cssText = "font-size:.75rem;margin-top:3px;display:block;";
    input.parentNode.appendChild(feedback);

    input.addEventListener("input", () => {
        const v = input.value.trim();
        if (!v) { feedback.textContent = ""; input.style.borderColor = ""; return; }
        if (emailValido(v)) {
            feedback.textContent = "✓ E-mail válido";
            feedback.style.color = "var(--success, #22c55e)";
            input.style.borderColor = "var(--success, #22c55e)";
        } else {
            feedback.textContent = "E-mail inválido";
            feedback.style.color = "var(--danger, #ef4444)";
            input.style.borderColor = "var(--danger, #ef4444)";
        }
    });
};

/* ── modal de sucesso ─────────────────────────────────────── */
window.abrirModalSucesso = (ag, endereco) => {
    const endTxt = endereco
        ? `${endereco.rua}, ${endereco.numero} — ${endereco.bairro}`
        : "Endereço não cadastrado";
    document.getElementById("sucesso-detalhes").innerHTML = `
        <div class="sucesso-linha"><i class="bi bi-scissors"></i>
            <div><strong>${ag.servicoNome}</strong><span>${ag.duration} minutos</span></div></div>
        <div class="sucesso-linha"><i class="bi bi-person"></i>
            <div><strong>${ag.barbeiroNome}</strong><span>Profissional</span></div></div>
        <div class="sucesso-linha"><i class="bi bi-calendar-event"></i>
            <div><strong>${fmtData(ag.data)}</strong><span>às ${ag.horarioInicio} — ${ag.horarioFim}</span></div></div>
        <div class="sucesso-linha"><i class="bi bi-cash"></i>
            <div><strong>R$ ${Number(ag.price).toFixed(2)}</strong><span>Valor do serviço</span></div></div>
        <div class="sucesso-linha"><i class="bi bi-geo-alt"></i>
            <div><strong>${endTxt}</strong><span>Local</span></div></div>`;
    const modal = document.getElementById("modal-sucesso");
    modal.classList.add("visible"); modal.style.display = "flex";
};
window.fecharModalSucesso = () => {
    const modal = document.getElementById("modal-sucesso");
    modal.classList.remove("visible"); modal.style.display = "none";
    window.resetarWizard(); window.mudarTela("view-cliente-form");
};

/* ── tela inicial ─────────────────────────────────────────── */
window.iniciarAgendamento = () => {
    const nome     = document.getElementById("cliente-nome").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const email    = document.getElementById("cliente-email").value.trim();
    if (!nome||!telefone||!email){ alert("Por favor, preencha todos os campos"); return; }
    if (!emailValido(email)){ alert("Por favor, insira um e-mail válido."); return; }
    window.appState.clienteAtual = { nome, telefone, email };
    window.mudarTela("view-cliente");
    window.resetarWizard();
    window.renderizarServicos();
};

/* ── STEP 1 — serviços ────────────────────────────────────── */
window.renderizarServicos = async () => {
    const c = document.getElementById("lista-servicos");
    c.innerHTML = `<div class="col-12 text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando serviços...</div>`;
    try {
        const snap = await getDocs(collection(db,"servicos"));
        window.mockServices = [];
        snap.forEach(d => window.mockServices.push({ id:d.id, ...d.data() }));
        const ativos = window.mockServices.filter(s => s.ativo !== false);
        if (!ativos.length){ c.innerHTML = `<p class="text-muted text-center mt-3">Nenhum serviço disponível no momento.</p>`; return; }
        c.innerHTML = ativos.map(s => `
            <div class="col-6 col-md-4 mb-3">
              <div class="service-card" onclick="window.selecionarServico('${s.id}',event)">
                <img src="${s.img||''}" class="service-icon" alt="${s.name}" onerror="this.style.display='none'">
                <h6>${s.name}</h6><p class="price">R$ ${Number(s.price).toFixed(2)}</p>
                <small class="duration"><i class="bi bi-clock"></i> ${s.duration}min</small>
              </div></div>`).join("");
    } catch(e){ console.error(e); c.innerHTML = `<p class="text-danger text-center">Erro ao carregar serviços.</p>`; }
};
window.selecionarServico = (id, evt) => {
    const s = window.mockServices.find(x => x.id===id); if(!s) return;
    window.appState.agendamento.servicoId   = id;
    window.appState.agendamento.servicoNome = s.name;
    window.appState.agendamento.servico     = s;
    document.querySelectorAll(".service-card").forEach(c=>c.classList.remove("selected"));
    (evt?.target||event.target).closest(".service-card").classList.add("selected");
    document.getElementById("btn-next-servico").disabled = false;
};

/* ── STEP 2 — barbeiros ───────────────────────────────────── */
window.renderizarBarbeiros = async () => {
    const c = document.getElementById("lista-barbeiros");
    c.innerHTML = `<div class="col-12 text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando profissionais...</div>`;
    try {
        const snap = await getDocs(collection(db,"profissionais"));
        window.mockBarbers = [];
        snap.forEach(d => window.mockBarbers.push({ id:d.id, ...d.data() }));
        const ativos = window.mockBarbers.filter(b => b.ativo !== false);
        if (!ativos.length){ c.innerHTML = `<p class="text-muted text-center mt-3">Nenhum profissional disponível no momento.</p>`; return; }
        c.innerHTML = ativos.map(b => `
            <div class="col-6 col-md-4">
              <div class="barbeiro-card" onclick="window.selecionarBarbeiro('${b.id}',event)">
                <img src="${b.img||''}" class="barbeiro-img" alt="${b.name}" onerror="this.textContent='👤'">
                <h6>${b.name}</h6><p class="tags">${b.tags||''}</p>
              </div></div>`).join("");
    } catch(e){ console.error(e); c.innerHTML = `<p class="text-danger text-center">Erro ao carregar profissionais.</p>`; }
};
window.selecionarBarbeiro = (id, evt) => {
    const b = window.mockBarbers.find(x => x.id===id); if(!b) return;
    window.appState.agendamento.barbeiroId   = id;
    window.appState.agendamento.barbeiroNome = b.name;
    window.appState.agendamento.barbeiro     = b;
    document.querySelectorAll(".barbeiro-card").forEach(c=>c.classList.remove("selected"));
    (evt?.target||event.target).closest(".barbeiro-card").classList.add("selected");
    document.getElementById("btn-next-barbeiro").disabled = false;
};

/* ── STEP 3 — data + horários ─────────────────────────────── */
window.gerarSlotsDisponiveis = async (barbeiro, data, duracaoMin) => {
    let inicio = toMin(barbeiro.escalaInicio);
    let fim    = toMin(barbeiro.escalaFim);
    const dow  = new Date(data+"T12:00:00").getDay();
    if (dow === 6) fim = Math.min(fim, 12*60); // sábado até 12h

    let agendados = [];
    try {
        const snap = await getDocs(collection(db,"agendamentos"));
        snap.forEach(d => {
            const ag = d.data();
            if (ag.barbeiroId===barbeiro.id && ag.data===data && !ag.cancelado) {
                const agIni = toMin(ag.horarioInicio);
                const agFim = ag.horarioFim ? toMin(ag.horarioFim) : agIni+(ag.duration||30);
                agendados.push({ ini:agIni, fim:agFim });
            }
        });
    } catch(e){ console.error("Erro slots:",e); }

    const agora = data===hojeISO() ? new Date().getHours()*60+new Date().getMinutes() : -1;

    const slots = [];
    for (let cur=inicio; cur+duracaoMin<=fim; cur+=15){
        const sf        = cur+duracaoMin;
        const noAlmoco  = cur < ALMOCO_FIM && sf > ALMOCO_INI;
        const ocupado   = agendados.some(ag => cur < ag.fim && sf > ag.ini);
        const passado   = cur <= agora;
        slots.push({ hhmm:toHHMM(cur), disponivel: !noAlmoco && !ocupado && !passado });
    }
    return slots;
};

window.renderizarHorarios = async () => {
    const grade = document.getElementById("grade-horarios");
    const hint  = document.getElementById("date-picker-hint");
    const data  = document.getElementById("horario-data-input")?.value;
    const b     = window.mockBarbers?.find(x => x.id===window.appState.agendamento.barbeiroId);
    const svc   = window.appState.agendamento.servico;
    if (!b||!svc) return;
    if (!data){
        grade.innerHTML = `<p class="text-muted" style="font-size:.875rem">Selecione uma data acima para ver os horários disponíveis.</p>`;
        document.getElementById("btn-next-horario").disabled = true; return;
    }
    if (!dataPermitida(data)){
        grade.innerHTML = `<p class="text-danger" style="font-size:.875rem"><i class="bi bi-x-circle"></i> Data não disponível para agendamento.</p>`;
        document.getElementById("btn-next-horario").disabled = true; return;
    }
    const dow = new Date(data+"T12:00:00").getDay();
    if (dow===0){
        grade.innerHTML = `<p class="text-danger fw-semibold text-center mt-3" style="font-size:.9rem"><i class="bi bi-calendar-x" style="font-size:1.5rem;display:block;margin-bottom:5px;"></i> Aos domingos estamos fechados.</p>`;
        document.getElementById("btn-next-horario").disabled = true; return;
    }
    if (hint){ hint.textContent = fmtData(data); hint.className = "cal-hint selected"; }
    window.appState.agendamento.data    = data;
    window.appState.agendamento.horario = null;
    document.getElementById("btn-next-horario").disabled = true;
    grade.innerHTML = `<div class="text-center my-2 w-100"><span class="spinner-border spinner-border-sm text-primary"></span> Verificando disponibilidade...</div>`;
    const slots = await window.gerarSlotsDisponiveis(b, data, svc.duration);
    if (!slots.length){ grade.innerHTML = `<p class="text-muted" style="font-size:.875rem">Nenhum horário gerado (verifique a escala).</p>`; return; }
    if (!slots.some(s => s.disponivel)){
        grade.innerHTML = `<p class="text-warning fw-semibold" style="font-size:.875rem"><i class="bi bi-exclamation-triangle"></i> Nenhum horário disponível neste dia. Escolha outra data.</p>`; return;
    }
    grade.innerHTML = slots.map(s => s.disponivel
        ? `<button class="horario-btn" onclick="window.selecionarHorario('${s.hhmm}',event)">${s.hhmm}</button>`
        : `<button class="horario-btn occupied" disabled title="Indisponível">${s.hhmm}</button>`
    ).join("");
};
window.selecionarHorario = (horario, evt) => {
    window.appState.agendamento.horario = horario;
    document.querySelectorAll(".horario-btn").forEach(b=>b.classList.remove("selected"));
    (evt?.target||event.target).classList.add("selected");
    document.getElementById("btn-next-horario").disabled = false;
};

/* ── STEP 4 — endereço ────────────────────────────────────── */
window.renderizarEnderecosCliente = async () => {
    const c = document.getElementById("lista-enderecos-cliente");
    c.innerHTML = `<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando endereços...</div>`;
    try {
        const snap = await getDocs(collection(db,"enderecos"));
        window._enderecosDisponiveis = [];
        snap.forEach(d => window._enderecosDisponiveis.push({ id:d.id, ...d.data() }));
        if (!window._enderecosDisponiveis.length){
            c.innerHTML = `<p class="text-muted text-center">Nenhum endereço cadastrado ainda.</p>`; return;
        }
        c.innerHTML = window._enderecosDisponiveis.map(e => `
            <div class="endereco-card" id="end-card-${e.id}" onclick="window.selecionarEndereco('${e.id}')">
                <div class="endereco-icon"><i class="bi bi-geo-alt-fill"></i></div>
                <div class="endereco-info"><strong>${e.rua}, ${e.numero}</strong><span>${e.bairro}</span></div>
            </div>`).join("");
        if (window._enderecosDisponiveis.length === 1)
            window.selecionarEndereco(window._enderecosDisponiveis[0].id);
    } catch(e){ console.error(e); c.innerHTML = `<p class="text-danger text-center">Erro ao carregar endereços.</p>`; }
};
window.selecionarEndereco = id => {
    const e = window._enderecosDisponiveis.find(x => x.id===id); if(!e) return;
    window.appState.agendamento.endereco = e;
    document.querySelectorAll(".endereco-card").forEach(c=>c.classList.remove("selected"));
    const card = document.getElementById(`end-card-${id}`);
    if (card) card.classList.add("selected");
    document.getElementById("btn-next-endereco").disabled = false;
};

/* ── STEP 5 — resumo ──────────────────────────────────────── */
window.atualizarResumo = () => {
    const ag  = window.appState.agendamento;
    const end = ag.endereco;
    document.getElementById("resumo-servico").textContent  = ag.servicoNome || "-";
    document.getElementById("resumo-barbeiro").textContent = ag.barbeiroNome || "-";
    document.getElementById("resumo-horario").textContent  = ag.horario ? `${fmtData(ag.data)}, às ${ag.horario}` : "-";
    document.getElementById("resumo-preco").textContent    = ag.servico ? `R$ ${Number(ag.servico.price).toFixed(2)}` : "-";
    const el = document.getElementById("resumo-local");
    if (el) el.textContent = end ? `${end.rua}, ${end.numero} — ${end.bairro}` : "-";
};

/* ── navegação ────────────────────────────────────────────── */
window.passarStep = n => {
    window.appState.currentStep = n;
    document.querySelectorAll(".wizard-step").forEach(s=>s.classList.remove("active"));
    const ids = ["step-servico","step-profissional","step-horario","step-endereco","step-resumo"];
    document.getElementById(ids[n-1]).classList.add("active");
    if      (n===1) window.renderizarServicos();
    else if (n===2) window.renderizarBarbeiros();
    else if (n===3) _entrarStepHorario();
    else if (n===4) window.renderizarEnderecosCliente();
    else if (n===5) window.atualizarResumo();
};
window.voltarStep = n => window.passarStep(n);

const _entrarStepHorario = () => {
    const inp  = document.getElementById("horario-data-input");
    const hint = document.getElementById("date-picker-hint");
    const grd  = document.getElementById("grade-horarios");
    if (inp)  inp.value = "";
    if (hint){ hint.textContent="Selecione uma data para ver os horários disponíveis"; hint.className="cal-hint"; }
    if (grd)  grd.innerHTML = `<p class="text-muted" style="font-size:.875rem">Selecione uma data acima para ver os horários disponíveis.</p>`;
    window.appState.agendamento.data    = null;
    window.appState.agendamento.horario = null;
    document.getElementById("btn-next-horario").disabled = true;
    _renderizarChips();
};

/* ── confirmação → Firestore ──────────────────────────────── */
window.confirmarAgendamento = async () => {
    const ag  = window.appState.agendamento;
    const cli = window.appState.clienteAtual;
    if (!ag.servicoId||!ag.barbeiroId||!ag.data||!ag.horario){
        alert("Por favor, complete todas as etapas antes de confirmar."); return;
    }
    const btn  = document.getElementById("btn-confirmar-agendamento");
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Confirmando...';
    btn.disabled  = true;
    const iniMin = toMin(ag.horario);
    const fimMin = iniMin + ag.servico.duration;
    const end    = ag.endereco;
    const novoAg = {
        clientName:     cli.nome,      clientTelefone: cli.telefone, clientEmail: cli.email,
        servicoId:      ag.servicoId,  servicoNome:    ag.servicoNome,
        barbeiroId:     ag.barbeiroId, barbeiroNome:   ag.barbeiroNome,
        horarioInicio:  ag.horario,    horarioFim:     toHHMM(fimMin),
        data:           ag.data,       price:          Number(ag.servico.price),
        duration:       ag.servico.duration,
        enderecoId:     end?.id || null,
        enderecoTexto:  end ? `${end.rua}, ${end.numero} — ${end.bairro}` : null,
        createdAt:      new Date().toISOString(),
        completed:      false, cancelado: false
    };
    try {
        const ref = await addDoc(collection(db,"agendamentos"), novoAg);
        console.log("✅ Agendamento salvo:", ref.id);
        if (window.mockBookings) window.mockBookings.push({ id:ref.id, ...novoAg });
        ["cliente-nome","cliente-telefone","cliente-email"].forEach(id => {
            const el = document.getElementById(id); if(el) el.value="";
        });
        window.abrirModalSucesso(novoAg, end);
    } catch(e){
        console.error("Erro ao salvar:", e);
        alert("Erro na ligação ao servidor.\nDetalhe: "+e.message);
    } finally { btn.innerHTML = orig; btn.disabled = false; }
};

/* ── reset ────────────────────────────────────────────────── */
window.resetarWizard = () => {
    window.appState.currentStep = 1;
    window.appState.agendamento = {
        servicoId:null, barbeiroId:null, horario:null,
        servicoNome:null, barbeiroNome:null,
        servico:null, barbeiro:null, data:null, endereco:null
    };
    document.querySelectorAll(".wizard-step").forEach(s=>s.classList.remove("active"));
    const first = document.getElementById("step-servico"); if(first) first.classList.add("active");
    document.querySelectorAll("#btn-next-servico,#btn-next-barbeiro,#btn-next-horario,#btn-next-endereco")
        .forEach(b=>b.disabled=true);
    const inp  = document.getElementById("horario-data-input"); if(inp) inp.value="";
    const grd  = document.getElementById("grade-horarios");     if(grd) grd.innerHTML="";
    const hint = document.getElementById("date-picker-hint");
    if(hint){ hint.textContent="Selecione uma data para ver os horários disponíveis"; hint.className="cal-hint"; }
};

/* ── DOMContentLoaded ─────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    const tel = document.getElementById("cliente-telefone");
    if (tel) aplicarMascara(tel);

    const emailInput = document.getElementById("cliente-email");
    if (emailInput) aplicarValidacaoEmail(emailInput);

    window.iniciarCalendario();

    document.getElementById("btn-iniciar-agendamento").addEventListener("click", window.iniciarAgendamento);
    document.getElementById("btn-next-servico").addEventListener("click",    () => window.passarStep(2));
    document.getElementById("btn-next-barbeiro").addEventListener("click",   () => window.passarStep(3));
    document.getElementById("btn-next-horario").addEventListener("click",    () => window.passarStep(4));
    document.getElementById("btn-next-endereco").addEventListener("click",   () => window.passarStep(5));
    document.getElementById("btn-voltar-barbeiro-wizard").addEventListener("click",  () => window.voltarStep(1));
    document.getElementById("btn-voltar-horario-wizard").addEventListener("click",   () => window.voltarStep(2));
    document.getElementById("btn-voltar-endereco-wizard").addEventListener("click",  () => window.voltarStep(3));
    document.getElementById("btn-voltar-resumo-wizard").addEventListener("click",    () => window.voltarStep(4));
    document.getElementById("btn-confirmar-agendamento").addEventListener("click",   window.confirmarAgendamento);
});
