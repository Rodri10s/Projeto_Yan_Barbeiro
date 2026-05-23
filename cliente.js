/* ============================================================
   MÓDULO CLIENTE — WIZARD DE AGENDAMENTO COM FIREBASE
   ============================================================ */
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyDe4OT6kL9m_tCGHtqpdgTnbl8tK_jlt6M",
    authDomain: "projeto-yan-barbeiro.firebaseapp.com",
    projectId: "projeto-yan-barbeiro",
    storageBucket: "projeto-yan-barbeiro.firebasestorage.app",
    messagingSenderId: "835967761157",
    appId: "1:835967761157:web:a02aac9bae48930418556c"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ── helpers de tempo ─────────────────────────────────────── */
const toMin  = (hhmm) => { const [h,m] = hhmm.split(":").map(Number); return h*60+m; };
const toHHMM = (mins) => `${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
const hojeISO = () => new Date().toISOString().split("T")[0];

/* ── TELA INICIAL ─────────────────────────────────────────── */
window.iniciarAgendamento = () => {
    const nome     = document.getElementById("cliente-nome").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const email    = document.getElementById("cliente-email").value.trim();
    if (!nome || !telefone || !email) { alert("Por favor, preencha todos os campos"); return; }
    window.appState.clienteAtual = { nome, telefone, email };
    window.mudarTela("view-cliente");
    window.resetarWizard();
    window.renderizarServicos();
};

/* ── STEP 1: serviços ─────────────────────────────────────── */
window.renderizarServicos = async () => {
    const container = document.getElementById("lista-servicos");
    container.innerHTML = `<div class="col-12 text-center my-3">
        <span class="spinner-border spinner-border-sm text-primary"></span> Carregando serviços...
    </div>`;
    try {
        const snap = await getDocs(collection(db, "servicos"));
        window.mockServices = [];
        snap.forEach(d => window.mockServices.push({ id: d.id, ...d.data() }));

        const ativos = window.mockServices.filter(s => s.ativo !== false);
        if (!ativos.length) {
            container.innerHTML = `<p class="text-muted text-center mt-3">Nenhum serviço disponível no momento.</p>`;
            return;
        }
        container.innerHTML = ativos.map(s => `
            <div class="col-6 col-md-4 mb-3">
                <div class="service-card" onclick="window.selecionarServico('${s.id}', event)">
                    <img src="${s.img||''}" class="service-icon" alt="${s.name}" onerror="this.style.display='none'">
                    <h6>${s.name}</h6>
                    <p class="price">R$ ${Number(s.price).toFixed(2)}</p>
                    <small class="duration"><i class="bi bi-clock"></i> ${s.duration}min</small>
                </div>
            </div>`).join("");
    } catch(err) {
        console.error("Erro serviços:", err);
        container.innerHTML = `<p class="text-danger text-center">Erro ao carregar serviços. Tente novamente.</p>`;
    }
};

window.selecionarServico = (id, evt) => {
    const s = window.mockServices.find(x => x.id === id);
    if (!s) return;
    window.appState.agendamento.servicoId   = id;
    window.appState.agendamento.servicoNome = s.name;
    window.appState.agendamento.servico     = s;
    document.querySelectorAll(".service-card").forEach(c => c.classList.remove("selected"));
    (evt?.target||event.target).closest(".service-card").classList.add("selected");
    document.getElementById("btn-next-servico").disabled = false;
};

/* ── STEP 2: barbeiros ────────────────────────────────────── */
window.renderizarBarbeiros = async () => {
    const container = document.getElementById("lista-barbeiros");
    container.innerHTML = `<div class="col-12 text-center my-3">
        <span class="spinner-border spinner-border-sm text-primary"></span> Carregando profissionais...
    </div>`;
    try {
        const snap = await getDocs(collection(db, "profissionais"));
        window.mockBarbers = [];
        snap.forEach(d => window.mockBarbers.push({ id: d.id, ...d.data() }));

        const ativos = window.mockBarbers.filter(b => b.ativo !== false);
        if (!ativos.length) {
            container.innerHTML = `<p class="text-muted text-center mt-3">Nenhum profissional disponível no momento.</p>`;
            return;
        }
        container.innerHTML = ativos.map(b => `
            <div class="col-6 col-md-4">
                <div class="barbeiro-card" onclick="window.selecionarBarbeiro('${b.id}', event)">
                    <img src="${b.img||''}" class="barbeiro-img" alt="${b.name}" onerror="this.textContent='👤'">
                    <h6>${b.name}</h6>
                    <p class="tags">${b.tags||''}</p>
                </div>
            </div>`).join("");
    } catch(err) {
        console.error("Erro barbeiros:", err);
        container.innerHTML = `<p class="text-danger text-center">Erro ao carregar profissionais. Tente novamente.</p>`;
    }
};

window.selecionarBarbeiro = (id, evt) => {
    const b = window.mockBarbers.find(x => x.id === id);
    if (!b) return;
    window.appState.agendamento.barbeiroId   = id;
    window.appState.agendamento.barbeiroNome = b.name;
    window.appState.agendamento.barbeiro     = b;
    document.querySelectorAll(".barbeiro-card").forEach(c => c.classList.remove("selected"));
    (evt?.target||event.target).closest(".barbeiro-card").classList.add("selected");
    document.getElementById("btn-next-barbeiro").disabled = false;
};

/* ── STEP 3: data + horários ──────────────────────────────── */

/* Busca agendamentos do barbeiro na data e retorna slots disponíveis */
window.gerarSlotsDisponiveis = async (barbeiro, dataSelecionada, duracaoMin) => {
    const inicio = toMin(barbeiro.escalaInicio);
    const fim    = toMin(barbeiro.escalaFim);

    let agendados = [];
    try {
        const snap = await getDocs(collection(db, "agendamentos"));
        snap.forEach(d => {
            const ag = d.data();
            if (ag.barbeiroId === barbeiro.id && ag.data === dataSelecionada && !ag.cancelado) {
                agendados.push({ inicio: toMin(ag.horarioInicio), fim: toMin(ag.horarioFim) });
            }
        });
    } catch(err) { console.error("Erro ao buscar agendamentos:", err); }

    const slots = [];
    for (let cur = inicio; cur + duracaoMin <= fim; cur += 15) {
        const slotFim = cur + duracaoMin;
        const ocupado = agendados.some(ag => cur < ag.fim && slotFim > ag.inicio);
        slots.push({ hhmm: toHHMM(cur), disponivel: !ocupado });
    }
    return slots;
};

/* Verifica se uma data tem pelo menos 1 slot disponível */
window.dataTemDisponibilidade = async (barbeiro, dataISO, duracaoMin) => {
    const slots = await window.gerarSlotsDisponiveis(barbeiro, dataISO, duracaoMin);
    return slots.some(s => s.disponivel);
};

window.renderizarHorarios = async () => {
    const container       = document.getElementById("grade-horarios");
    const dataSelecionada = document.getElementById("horario-data-input")?.value;
    const b               = window.mockBarbers.find(x => x.id === window.appState.agendamento.barbeiroId);
    const servico         = window.appState.agendamento.servico;

    if (!b || !servico) return;

    if (!dataSelecionada) {
        container.innerHTML = `<p class="text-muted" style="font-size:.875rem">Selecione uma data acima para ver os horários disponíveis.</p>`;
        document.getElementById("btn-next-horario").disabled = true;
        return;
    }

    // Bloqueia datas passadas (segunda verificação de segurança)
    if (dataSelecionada < hojeISO()) {
        container.innerHTML = `<p class="text-danger" style="font-size:.875rem">Não é possível agendar para datas passadas.</p>`;
        document.getElementById("btn-next-horario").disabled = true;
        return;
    }

    window.appState.agendamento.data    = dataSelecionada;
    window.appState.agendamento.horario = null;
    document.getElementById("btn-next-horario").disabled = true;

    container.innerHTML = `<div class="text-center my-2 w-100">
        <span class="spinner-border spinner-border-sm text-primary"></span> Verificando disponibilidade...
    </div>`;

    const slots = await window.gerarSlotsDisponiveis(b, dataSelecionada, servico.duration);

    if (!slots.length) {
        container.innerHTML = `<p class="text-muted" style="font-size:.875rem">Barbeiro sem escala configurada.</p>`;
        return;
    }
    if (!slots.some(s => s.disponivel)) {
        container.innerHTML = `<p class="text-warning fw-semibold" style="font-size:.875rem">
            <i class="bi bi-exclamation-triangle"></i> Todos os horários estão ocupados neste dia. Escolha outra data.
        </p>`;
        return;
    }

    container.innerHTML = slots.map(s => s.disponivel
        ? `<button class="horario-btn" onclick="window.selecionarHorario('${s.hhmm}', event)">${s.hhmm}</button>`
        : `<button class="horario-btn occupied" disabled title="Ocupado">${s.hhmm}</button>`
    ).join("");
};

window.selecionarHorario = (horario, evt) => {
    window.appState.agendamento.horario = horario;
    document.querySelectorAll(".horario-btn").forEach(b => b.classList.remove("selected"));
    (evt?.target||event.target).classList.add("selected");
    document.getElementById("btn-next-horario").disabled = false;
};

/* ── navegação entre steps ────────────────────────────────── */
window.passarStep = (n) => {
    window.appState.currentStep = n;
    document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
    const ids = ["step-servico","step-profissional","step-horario","step-resumo"];
    document.getElementById(ids[n-1]).classList.add("active");

    if (n === 1) window.renderizarServicos();
    else if (n === 2) window.renderizarBarbeiros();
    else if (n === 3) {
        // Limpa seleção anterior ao entrar no step de horário
        const dataInput = document.getElementById("horario-data-input");
        if (dataInput) dataInput.value = "";
        window.appState.agendamento.data    = null;
        window.appState.agendamento.horario = null;
        document.getElementById("grade-horarios").innerHTML =
            `<p class="text-muted" style="font-size:.875rem">Selecione uma data acima para ver os horários disponíveis.</p>`;
        document.getElementById("btn-next-horario").disabled = true;
    }
    else if (n === 4) window.atualizarResumo();
};

window.voltarStep = (n) => window.passarStep(n);

/* ── STEP 4: resumo ───────────────────────────────────────── */
window.atualizarResumo = () => {
    const ag = window.appState.agendamento;
    const dataFormatada = ag.data
        ? new Date(ag.data + "T12:00:00").toLocaleDateString("pt-BR",
            { weekday:"long", day:"numeric", month:"long", year:"numeric" })
        : "-";

    document.getElementById("resumo-servico").textContent  = ag.servicoNome || "-";
    document.getElementById("resumo-barbeiro").textContent = ag.barbeiroNome || "-";
    document.getElementById("resumo-horario").textContent  = ag.horario
        ? `${dataFormatada}, às ${ag.horario}`
        : "-";
    document.getElementById("resumo-preco").textContent = ag.servico
        ? `R$ ${Number(ag.servico.price).toFixed(2)}`
        : "-";

    const endereco = window.getEnderecoAtivo();
    const localEl  = document.getElementById("resumo-local");
    if (localEl) localEl.textContent = endereco
        ? `${endereco.rua}, ${endereco.numero} — ${endereco.bairro}`
        : "-";
};

/* ── confirmação: salva no Firestore diretamente ──────────── */
window.confirmarAgendamento = async () => {
    const ag      = window.appState.agendamento;
    const cliente = window.appState.clienteAtual;

    if (!ag.servicoId || !ag.barbeiroId || !ag.data || !ag.horario) {
        alert("Por favor, complete todas as etapas antes de confirmar.");
        return;
    }

    const btn = document.getElementById("btn-confirmar-agendamento");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Confirmando...';
    btn.disabled  = true;

    const inicioMin = toMin(ag.horario);
    const fimMin    = inicioMin + ag.servico.duration;

    const novoAgendamento = {
        clientName:     cliente.nome,
        clientTelefone: cliente.telefone,
        clientEmail:    cliente.email,
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
        // Salva diretamente usando o db local deste módulo
        const docRef = await addDoc(collection(db, "agendamentos"), novoAgendamento);
        console.log("✅ Agendamento salvo com ID:", docRef.id);

        // Mantém mockBookings sincronizado para barbeiro.js
        window.mockBookings.push({ id: docRef.id, ...novoAgendamento });

        const endereco      = window.getEnderecoAtivo();
        const enderecoTexto = endereco
            ? `A barbearia está localizada em:\n${endereco.rua}, ${endereco.numero} — ${endereco.bairro}`
            : "O endereço da barbearia ainda não foi cadastrado.";

        const dataFormatada = new Date(ag.data + "T12:00:00")
            .toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });

        alert(`✅ Agendamento confirmado!\n\n📅 ${dataFormatada} às ${ag.horario}\n✂️  ${ag.servicoNome} com ${ag.barbeiroNome}\n💰 R$ ${Number(ag.servico.price).toFixed(2)}\n\n${enderecoTexto}`);

        document.getElementById("cliente-nome").value     = "";
        document.getElementById("cliente-telefone").value = "";
        document.getElementById("cliente-email").value    = "";
        window.resetarWizard();
        window.mudarTela("view-cliente-form");

    } catch(err) {
        console.error("Erro ao salvar agendamento:", err);
        alert("Erro ao confirmar agendamento. Verifique sua conexão e tente novamente.\n\n" + err.message);
        btn.innerHTML = textoOriginal;
        btn.disabled  = false;
    }
};

/* ── reset do wizard ──────────────────────────────────────── */
window.resetarWizard = () => {
    window.appState.currentStep = 1;
    window.appState.agendamento = {
        servicoId:null, barbeiroId:null, horario:null,
        servicoNome:null, barbeiroNome:null,
        servico:null, barbeiro:null, data:null
    };
    document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
    const first = document.getElementById("step-servico");
    if (first) first.classList.add("active");
    document.querySelectorAll("#btn-next-servico,#btn-next-barbeiro,#btn-next-horario")
        .forEach(b => b.disabled = true);

    const dataInput = document.getElementById("horario-data-input");
    if (dataInput) dataInput.value = "";
    const gradeHorarios = document.getElementById("grade-horarios");
    if (gradeHorarios) gradeHorarios.innerHTML = "";
};

/* ── eventos ──────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    // Define data mínima como hoje (impede selecionar datas passadas)
    const dataInput = document.getElementById("horario-data-input");
    if (dataInput) {
        dataInput.min = hojeISO();
        dataInput.addEventListener("change", window.renderizarHorarios);
    }

    document.getElementById("btn-iniciar-agendamento").addEventListener("click", window.iniciarAgendamento);
    document.getElementById("btn-next-servico").addEventListener("click", () => window.passarStep(2));
    document.getElementById("btn-next-barbeiro").addEventListener("click", () => window.passarStep(3));
    document.getElementById("btn-next-horario").addEventListener("click", () => window.passarStep(4));
    document.getElementById("btn-voltar-barbeiro-wizard").addEventListener("click", () => window.voltarStep(1));
    document.getElementById("btn-voltar-horario-wizard").addEventListener("click", () => window.voltarStep(2));
    document.getElementById("btn-voltar-resumo-wizard").addEventListener("click", () => window.voltarStep(3));
    document.getElementById("btn-confirmar-agendamento").addEventListener("click", window.confirmarAgendamento);
});