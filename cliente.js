/* ============================================================
   MÓDULO CLIENTE — WIZARD DE AGENDAMENTO COM FIREBASE
   Coleções Firestore:
     • servicos       — name, price, duration, img, ativo
     • profissionais  — name, ativo, escalaInicio, escalaFim, img, tags
     • agendamentos   — clientName, clientTelefone, clientEmail,
                        servicoId, servicoNome, barbeiroId, barbeiroNome,
                        horarioInicio, horarioFim, data, price, duration,
                        createdAt, completed, cancelado
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

/* ── máscara de telefone (xx) xxxxx-xxxx ──────────────────── */
const aplicarMascara = (input) => {
    input.addEventListener("input", () => {
        let v = input.value.replace(/\D/g,"").slice(0,11);
        if (v.length <= 10) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/,"($1) $2-$3");
        else                v = v.replace(/^(\d{2})(\d{5})(\d{0,4})$/,"($1) $2-$3");
        input.value = v.replace(/-$/,"");
    });
};

/* ── modal de sucesso ─────────────────────────────────────── */
window.abrirModalSucesso = (ag, endereco) => {
    const endTxt = endereco
        ? `${endereco.rua}, ${endereco.numero} — ${endereco.bairro}`
        : "Endereço não cadastrado";

    document.getElementById("sucesso-detalhes").innerHTML = `
        <div class="sucesso-linha">
            <i class="bi bi-scissors"></i>
            <div><strong>${ag.servicoNome}</strong><span>${ag.duration} minutos</span></div>
        </div>
        <div class="sucesso-linha">
            <i class="bi bi-person"></i>
            <div><strong>${ag.barbeiroNome}</strong><span>Profissional</span></div>
        </div>
        <div class="sucesso-linha">
            <i class="bi bi-calendar-event"></i>
            <div><strong>${fmtData(ag.data)}</strong><span>às ${ag.horarioInicio} — ${ag.horarioFim}</span></div>
        </div>
        <div class="sucesso-linha">
            <i class="bi bi-cash"></i>
            <div><strong>R$ ${Number(ag.price).toFixed(2)}</strong><span>Valor do serviço</span></div>
        </div>
        <div class="sucesso-linha">
            <i class="bi bi-geo-alt"></i>
            <div><strong>${endTxt}</strong><span>Local</span></div>
        </div>`;

    const modal = document.getElementById("modal-sucesso");
    modal.classList.add("visible");
    modal.style.display = "flex";
};

window.fecharModalSucesso = () => {
    const modal = document.getElementById("modal-sucesso");
    modal.classList.remove("visible");
    modal.style.display = "none";
    window.resetarWizard();
    window.mudarTela("view-cliente-form");
};

/* ── tela inicial ─────────────────────────────────────────── */
window.iniciarAgendamento = () => {
    const nome     = document.getElementById("cliente-nome").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const email    = document.getElementById("cliente-email").value.trim();
    if (!nome||!telefone||!email){ alert("Por favor, preencha todos os campos"); return; }
    window.appState.clienteAtual = { nome, telefone, email };
    window.mudarTela("view-cliente");
    window.resetarWizard();
    window.renderizarServicos();
};

/* ── STEP 1 — serviços ────────────────────────────────────── */
window.renderizarServicos = async () => {
    const c = document.getElementById("lista-servicos");
    c.innerHTML = `<div class="col-12 text-center my-3">
        <span class="spinner-border spinner-border-sm text-primary"></span> Carregando serviços...
    </div>`;
    try {
        const snap = await getDocs(collection(db,"servicos"));
        window.mockServices = [];
        snap.forEach(d => window.mockServices.push({ id:d.id, ...d.data() }));
        const ativos = window.mockServices.filter(s => s.ativo !== false);
        if (!ativos.length){
            c.innerHTML = `<p class="text-muted text-center mt-3">Nenhum serviço disponível no momento.</p>`;
            return;
        }
        c.innerHTML = ativos.map(s => `
            <div class="col-6 col-md-4 mb-3">
              <div class="service-card" onclick="window.selecionarServico('${s.id}',event)">
                <img src="${s.img||''}" class="service-icon" alt="${s.name}" onerror="this.style.display='none'">
                <h6>${s.name}</h6>
                <p class="price">R$ ${Number(s.price).toFixed(2)}</p>
                <small class="duration"><i class="bi bi-clock"></i> ${s.duration}min</small>
              </div>
            </div>`).join("");
    } catch(e){
        console.error(e);
        c.innerHTML = `<p class="text-danger text-center">Erro ao carregar serviços.</p>`;
    }
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
    c.innerHTML = `<div class="col-12 text-center my-3">
        <span class="spinner-border spinner-border-sm text-primary"></span> Carregando profissionais...
    </div>`;
    try {
        const snap = await getDocs(collection(db,"profissionais"));
        window.mockBarbers = [];
        snap.forEach(d => window.mockBarbers.push({ id:d.id, ...d.data() }));
        const ativos = window.mockBarbers.filter(b => b.ativo !== false);
        if (!ativos.length){
            c.innerHTML = `<p class="text-muted text-center mt-3">Nenhum profissional disponível no momento.</p>`;
            return;
        }
        c.innerHTML = ativos.map(b => `
            <div class="col-6 col-md-4">
              <div class="barbeiro-card" onclick="window.selecionarBarbeiro('${b.id}',event)">
                <img src="${b.img||''}" class="barbeiro-img" alt="${b.name}" onerror="this.textContent='👤'">
                <h6>${b.name}</h6>
                <p class="tags">${b.tags||''}</p>
              </div>
            </div>`).join("");
    } catch(e){
        console.error(e);
        c.innerHTML = `<p class="text-danger text-center">Erro ao carregar profissionais.</p>`;
    }
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

/*
  gerarSlotsDisponiveis:
  1. Lê escala do barbeiro (escalaInicio / escalaFim)
  2. Busca agendamentos do barbeiro na data no Firestore
  3. Gera slots de 15 em 15 min; bloqueia colisões e horários passados
  4. Cada barbeiro tem agenda totalmente independente
*/
window.gerarSlotsDisponiveis = async (barbeiro, data, duracaoMin) => {
    const inicio = toMin(barbeiro.escalaInicio);
    const fim    = toMin(barbeiro.escalaFim);

    let agendados = [];
    try {
        const snap = await getDocs(collection(db,"agendamentos"));
        snap.forEach(d => {
            const ag = d.data();
            if (ag.barbeiroId===barbeiro.id && ag.data===data && !ag.cancelado)
                agendados.push({ ini: toMin(ag.horarioInicio), fim: toMin(ag.horarioFim) });
        });
    } catch(e){ console.error("Erro slots:",e); }

    // Bloqueia horários que já passaram quando a data for hoje
    const agora = data === hojeISO()
        ? new Date().getHours()*60 + new Date().getMinutes()
        : -1;

    const slots = [];
    for (let cur=inicio; cur+duracaoMin<=fim; cur+=15){
        const sf      = cur + duracaoMin;
        const ocupado = agendados.some(ag => cur < ag.fim && sf > ag.ini);
        const passado = cur <= agora;
        slots.push({ hhmm: toHHMM(cur), disponivel: !ocupado && !passado });
    }
    return slots;
};

window.renderizarHorarios = async () => {
    const grade = document.getElementById("grade-horarios");
    const hint  = document.getElementById("date-picker-hint");
    const data  = document.getElementById("horario-data-input")?.value;
    const b     = window.mockBarbers?.find(x => x.id===window.appState.agendamento.barbeiroId);
    const svc   = window.appState.agendamento.servico;

    if (!b || !svc) return;

    if (!data){
        grade.innerHTML = `<p class="text-muted" style="font-size:.875rem">Selecione uma data acima para ver os horários disponíveis.</p>`;
        document.getElementById("btn-next-horario").disabled = true;
        return;
    }

    if (data < hojeISO()){
        grade.innerHTML = `<p class="text-danger" style="font-size:.875rem"><i class="bi bi-x-circle"></i> Não é possível agendar para datas passadas.</p>`;
        document.getElementById("btn-next-horario").disabled = true;
        if (hint){ hint.textContent="Data inválida"; hint.className="date-picker-hint"; }
        return;
    }

    if (hint){ hint.textContent = fmtData(data); hint.className="date-picker-hint selected"; }

    window.appState.agendamento.data    = data;
    window.appState.agendamento.horario = null;
    document.getElementById("btn-next-horario").disabled = true;

    grade.innerHTML = `<div class="text-center my-2 w-100">
        <span class="spinner-border spinner-border-sm text-primary"></span> Verificando disponibilidade...
    </div>`;

    const slots = await window.gerarSlotsDisponiveis(b, data, svc.duration);

    if (!slots.length){
        grade.innerHTML = `<p class="text-muted" style="font-size:.875rem">Barbeiro sem escala configurada.</p>`;
        return;
    }
    if (!slots.some(s => s.disponivel)){
        grade.innerHTML = `<p class="text-warning fw-semibold" style="font-size:.875rem">
            <i class="bi bi-exclamation-triangle"></i> Nenhum horário disponível neste dia. Escolha outra data.</p>`;
        return;
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

/* ── navegação ────────────────────────────────────────────── */
window.passarStep = (n) => {
    window.appState.currentStep = n;
    document.querySelectorAll(".wizard-step").forEach(s=>s.classList.remove("active"));
    const ids = ["step-servico","step-profissional","step-horario","step-resumo"];
    document.getElementById(ids[n-1]).classList.add("active");
    if      (n===1) window.renderizarServicos();
    else if (n===2) window.renderizarBarbeiros();
    else if (n===3) _entrarStepHorario();
    else if (n===4) window.atualizarResumo();
};
window.voltarStep = n => window.passarStep(n);

const _entrarStepHorario = () => {
    const inp  = document.getElementById("horario-data-input");
    const hint = document.getElementById("date-picker-hint");
    const grd  = document.getElementById("grade-horarios");
    if (inp)  inp.value = "";
    if (hint){ hint.textContent="Selecione uma data para ver os horários disponíveis"; hint.className="date-picker-hint"; }
    if (grd)  grd.innerHTML = `<p class="text-muted" style="font-size:.875rem">Selecione uma data acima para ver os horários disponíveis.</p>`;
    window.appState.agendamento.data    = null;
    window.appState.agendamento.horario = null;
    document.getElementById("btn-next-horario").disabled = true;
};

/* ── STEP 4 — resumo ──────────────────────────────────────── */
window.atualizarResumo = async () => {
    const ag = window.appState.agendamento;
    document.getElementById("resumo-servico").textContent  = ag.servicoNome || "-";
    document.getElementById("resumo-barbeiro").textContent = ag.barbeiroNome || "-";
    document.getElementById("resumo-horario").textContent  = ag.horario ? `${fmtData(ag.data)}, às ${ag.horario}` : "-";
    document.getElementById("resumo-preco").textContent = ag.servico ? `R$ ${Number(ag.servico.price).toFixed(2)}` : "-";
    
    const el = document.getElementById("resumo-local");
    if (el) el.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span> Buscando...';

    try {
        // Puxa o endereço DIRETAMENTE do banco de dados em tempo real
        const snap = await getDocs(collection(db, "enderecos"));
        if (!snap.empty) {
            const end = snap.docs[0].data();
            window.appState.enderecoAtivo = end; // Guarda na memória para o modal usar
            if (el) el.textContent = `${end.rua}, ${end.numero} — ${end.bairro}`;
        } else {
            window.appState.enderecoAtivo = null;
            if (el) el.textContent = "Endereço não cadastrado";
        }
    } catch (e) {
        console.error("Erro ao buscar endereço:", e);
        if (el) el.textContent = "Erro ao carregar local";
    }
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
    
    // Inicia a roleta de carregamento
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Confirmando...';
    btn.disabled  = true;

    const iniMin = toMin(ag.horario);
    const fimMin = iniMin + ag.servico.duration;

    const novoAg = {
        clientName:     cli.nome,
        clientTelefone: cli.telefone,
        clientEmail:    cli.email,
        servicoId:      ag.servicoId,
        servicoNome:    ag.servicoNome,
        barbeiroId:     ag.barbeiroId,
        barbeiroNome:   ag.barbeiroNome,
        horarioInicio:  ag.horario,
        horarioFim:     toHHMM(fimMin),
        data:           ag.data,
        price:          Number(ag.servico.price),
        duration:       ag.servico.duration,
        createdAt:      new Date().toISOString(),
        completed:      false,
        cancelado:      false
    };

    try {
        // Tenta gravar no Firebase
        const ref = await addDoc(collection(db,"agendamentos"), novoAg);
        console.log("✅ Agendamento salvo com ID:", ref.id);
        
        if (window.mockBookings) window.mockBookings.push({ id:ref.id, ...novoAg });

        // Limpa os campos do formulário inicial
        ["cliente-nome","cliente-telefone","cliente-email"].forEach(id => {
            const input = document.getElementById(id);
            if(input) input.value="";
        });

        // Invoca a sua janela modal personalizada com o endereço correto
        window.abrirModalSucesso(novoAg, window.appState.enderecoAtivo);

    } catch(e) {
        console.error("Erro ao salvar:", e);
        // Se houver um bloqueio (seja da net ou do servidor), o cliente é avisado
        alert("Erro na ligação ao servidor.\nVerifique a sua internet ou as Regras do Firestore.\nDetalhe: " + e.message);
    } finally {
        // O FINALLY GARANTE QUE O BOTÃO PARA DE GIRAR, QUER DÊ SUCESSO OU ERRO!
        btn.innerHTML = orig;
        btn.disabled  = false;
    }
};

/* ── reset ────────────────────────────────────────────────── */
window.resetarWizard = () => {
    window.appState.currentStep = 1;
    window.appState.agendamento = {
        servicoId:null, barbeiroId:null, horario:null,
        servicoNome:null, barbeiroNome:null,
        servico:null, barbeiro:null, data:null
    };
    document.querySelectorAll(".wizard-step").forEach(s=>s.classList.remove("active"));
    const first = document.getElementById("step-servico");
    if (first) first.classList.add("active");
    document.querySelectorAll("#btn-next-servico,#btn-next-barbeiro,#btn-next-horario")
        .forEach(b=>b.disabled=true);
    const inp  = document.getElementById("horario-data-input");
    if (inp) inp.value="";
    const grd  = document.getElementById("grade-horarios");
    if (grd) grd.innerHTML="";
    const hint = document.getElementById("date-picker-hint");
    if (hint){ hint.textContent="Selecione uma data para ver os horários disponíveis"; hint.className="date-picker-hint"; }
};

/* ── DOMContentLoaded ─────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    const tel = document.getElementById("cliente-telefone");
    if (tel) aplicarMascara(tel);

    const inp = document.getElementById("horario-data-input");
    if (inp){
        inp.min = hojeISO();
        inp.addEventListener("change", window.renderizarHorarios);
    }

    document.getElementById("btn-iniciar-agendamento").addEventListener("click", window.iniciarAgendamento);
    document.getElementById("btn-next-servico").addEventListener("click",    () => window.passarStep(2));
    document.getElementById("btn-next-barbeiro").addEventListener("click",   () => window.passarStep(3));
    document.getElementById("btn-next-horario").addEventListener("click",    () => window.passarStep(4));
    document.getElementById("btn-voltar-barbeiro-wizard").addEventListener("click", () => window.voltarStep(1));
    document.getElementById("btn-voltar-horario-wizard").addEventListener("click",  () => window.voltarStep(2));
    document.getElementById("btn-voltar-resumo-wizard").addEventListener("click",   () => window.voltarStep(3));
    document.getElementById("btn-confirmar-agendamento").addEventListener("click",  window.confirmarAgendamento);
});
