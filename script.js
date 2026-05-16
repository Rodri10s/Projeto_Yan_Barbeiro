/* ============================================================
   YAN BARBEIRO — SCRIPT PRINCIPAL
   ============================================================ */

// TODO: Importar Firestore aqui na Fase 2
// import { ... } from "firebase/firestore";

/* ---- MOCK DATA ---- */
const mockBarbers = [
    { id:1, name:"Yan", password:"123", img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", tags:"Corte, Barba", escalaInicio:"09:00", escalaFim:"18:00" }
];

const mockServices = [
    { id:1, name:"Contorno (Pezinho)",             price:10, duration:15, img:"https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=200&q=80" },
    { id:2, name:"Sobrancelha",                    price:10, duration:10, img:"https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?auto=format&fit=crop&w=200&q=80" },
    { id:3, name:"Barba",                          price:25, duration:30, img:"https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=200&q=80" },
    { id:4, name:"Corte Social (Máq/Tesoura)",     price:25, duration:30, img:"https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=200&q=80" },
    { id:5, name:"Corte Só na Tesoura",            price:30, duration:30, img:"https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=200&q=80" },
    { id:6, name:"Corte Degradê",                  price:30, duration:30, img:"https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=200&q=80" },
    { id:7, name:"Corte + Barba + Sobrancelha",    price:50, duration:70, img:"https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=200&q=80" }
];

const mockBookings = [
    { id:1, clientName:"Carlos Costa",   serviceId:1, barbeiroId:1, time:"09:30", price:15 },
    { id:2, clientName:"Tiago Ferreira", serviceId:2, barbeiroId:1, time:"11:00", price:20 }
];

/* ---- ESTADO ---- */
const appState = {
    usuarioAtual: null,
    currentStep: 1,
    clienteAtual: { nome:null, telefone:null, email:null },
    agendamento:  { servicoId:null, barbeiroId:null, horario:null, servicoNome:null, barbeiroNome:null, servico:null, barbeiro:null },
    editingId: null,
    editingType: null
};

/* ---- NAVEGAÇÃO ---- */
window.mudarTela = (idTela) => {
    document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
    const sec = document.getElementById(idTela);
    if (sec) sec.classList.add("active");

    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    const navBtn = Array.from(document.querySelectorAll(".nav-btn")).find(b =>
        b.getAttribute("onclick")?.includes(idTela)
    );
    if (navBtn) navBtn.classList.add("active");

    if (idTela === "view-cliente")  { renderizarServicos(); resetarWizard(); }
    if (idTela === "view-barbeiro") { renderizarAgendaBarbeiro(); }
    if (idTela === "view-admin")    { renderizarEquipa(); renderizarServicosAdmin(); }
};

/* ---- AUTENTICAÇÃO ---- */
window.iniciarAgendamento = () => {
    const nome     = document.getElementById("cliente-nome").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const email    = document.getElementById("cliente-email").value.trim();

    if (!nome || !telefone || !email) { alert("Por favor, preencha todos os campos"); return; }
    
    appState.clienteAtual = { nome, telefone, email };
    mudarTela("view-cliente");
};

window.fazerLogin = (tipo) => {
    if (tipo === "admin") {
        const pw = document.getElementById("admin-password").value;
        if (pw === "password123") {
            appState.usuarioAtual = { tipo:"admin", name:"Administrador" };
            mudarTela("view-admin");
        } else { alert("Palavra-passe incorreta!"); }

    } else if (tipo === "barbeiro") {
        const username = document.getElementById("barbeiro-username").value.trim();
        const password = document.getElementById("barbeiro-password").value;

        // Compara pelo primeiro nome OU nome completo, sem distinção de maiúsculas
        const barbeiro = mockBarbers.find(b => {
            const firstName = b.name.split(" ")[0].toLowerCase();
            const fullName  = b.name.toLowerCase();
            const input     = username.toLowerCase();
            return (input === firstName || input === fullName) && b.password === password;
        });

        if (barbeiro) {
            appState.usuarioAtual = { tipo:"barbeiro", name:barbeiro.name, id:barbeiro.id };
            mudarTela("view-barbeiro");
        } else {
            alert("Nome de utilizador ou palavra-passe incorretos!");
        }
    }
};

window.fazerLogout = () => {
    appState.usuarioAtual = null;
    appState.agendamento  = { servicoId:null, barbeiroId:null, horario:null, servicoNome:null, barbeiroNome:null, servico:null, barbeiro:null };
    resetarWizard();
    mudarTela("view-cliente-form");
};

/* ---- WIZARD ---- */
const renderizarServicos = () => {
    document.getElementById("lista-servicos").innerHTML = mockServices.map(s => `
        <div class="col-6 col-md-4 mb-3">
            <div class="service-card" onclick="window.selecionarServico(${s.id}, event)">
                <img src="${s.img}" class="service-icon" alt="${s.name}" onerror="this.style.display='none'">
                <h6>${s.name}</h6>
                <p class="price">R$ ${s.price}</p>
                <small class="duration"><i class="bi bi-clock"></i> ${s.duration}min</small>
            </div>
        </div>`).join("");
};

window.selecionarServico = (id, evt) => {
    appState.agendamento.servicoId   = id;
    const s = mockServices.find(x => x.id === id);
    appState.agendamento.servicoNome = s.name;
    appState.agendamento.servico     = s;

    document.querySelectorAll(".service-card").forEach(c => c.classList.remove("selected"));
    (evt?.target || event.target).closest(".service-card").classList.add("selected");
    document.getElementById("btn-next-servico").disabled = false;
};

const renderizarBarbeiros = () => {
    document.getElementById("lista-barbeiros").innerHTML = mockBarbers.map(b => `
        <div class="col-6 col-md-4">
            <div class="barbeiro-card" onclick="window.selecionarBarbeiro(${b.id}, event)">
                <img src="${b.img}" class="barbeiro-img" alt="${b.name}" onerror="this.textContent='👤'">
                <h6>${b.name}</h6>
                <p class="tags">${b.tags}</p>
            </div>
        </div>`).join("");
};

window.selecionarBarbeiro = (id, evt) => {
    appState.agendamento.barbeiroId   = id;
    const b = mockBarbers.find(x => x.id === id);
    appState.agendamento.barbeiroNome = b.name;
    appState.agendamento.barbeiro     = b;

    document.querySelectorAll(".barbeiro-card").forEach(c => c.classList.remove("selected"));
    (evt?.target || event.target).closest(".barbeiro-card").classList.add("selected");
    document.getElementById("btn-next-barbeiro").disabled = false;
};

const renderizarHorarios = () => {
    const b = mockBarbers.find(x => x.id === appState.agendamento.barbeiroId);
    if (!b) return;

    const slots = gerarHorarios(b.escalaInicio, b.escalaFim);
    document.getElementById("grade-horarios").innerHTML = slots.map(h =>
        `<button class="horario-btn" onclick="window.selecionarHorario('${h}', event)">${h}</button>`
    ).join("");
};

const gerarHorarios = (inicio, fim) => {
    const r = [];
    let [h,m] = inicio.split(":").map(Number);
    const [fh,fm] = fim.split(":").map(Number);
    let cur = h*60+m, end = fh*60+fm;

    while(cur < end){
        r.push(`${String(Math.floor(cur/60)).padStart(2,"0")}:${String(cur%60).padStart(2,"0")}`);
        cur += 30;
    }
    return r;
};

window.selecionarHorario = (horario, evt) => {
    appState.agendamento.horario = horario;
    document.querySelectorAll(".horario-btn").forEach(b => b.classList.remove("selected"));
    (evt?.target || event.target).classList.add("selected");
    document.getElementById("btn-next-horario").disabled = false;
};

window.passarStep = (n) => {
    appState.currentStep = n;
    document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
    const ids = ["step-servico","step-profissional","step-horario","step-resumo"];
    document.getElementById(ids[n-1]).classList.add("active");
    if (n===2) renderizarBarbeiros();
    else if (n===3) renderizarHorarios();
    else if (n===4) atualizarResumo();
};

window.voltarStep = (n) => window.passarStep(n);

const atualizarResumo = () => {
    document.getElementById("resumo-servico").textContent  = appState.agendamento.servicoNome || "-";
    document.getElementById("resumo-barbeiro").textContent = appState.agendamento.barbeiroNome || "-";
    document.getElementById("resumo-horario").textContent  = appState.agendamento.horario ? `Hoje, ${appState.agendamento.horario}` : "-";
    document.getElementById("resumo-preco").textContent = appState.agendamento.servico ? `R$ ${appState.agendamento.servico.price}` : "-";
};

window.confirmarAgendamento = () => {
    alert(`✅ Agendamento confirmado para ${appState.agendamento.horario}!\n\nEm breve receberá confirmação por SMS.`);
    // TODO: Substituir por addDoc no Firestore na Fase 2
    mockBookings.push({
        id: mockBookings.length+1,
        clientName: appState.clienteAtual.nome,
        serviceId:  appState.agendamento.servicoId,
        barbeiroId: appState.agendamento.barbeiroId,
        time:       appState.agendamento.horario,
        price:      appState.agendamento.servico.price
    });

    document.getElementById("cliente-nome").value = "";
    document.getElementById("cliente-telefone").value = "";
    document.getElementById("cliente-email").value = "";
    resetarWizard();
    mudarTela("view-cliente-form");
};

const resetarWizard = () => {
    appState.currentStep = 1;
    appState.agendamento = { servicoId:null, barbeiroId:null, horario:null, servicoNome:null, barbeiroNome:null, servico:null, barbeiro:null };
    document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
    const first = document.getElementById("step-servico");
    if (first) first.classList.add("active");
    document.querySelectorAll("#btn-next-servico,#btn-next-barbeiro,#btn-next-horario").forEach(b => b.disabled = true);
};

/* ---- PAINEL BARBEIRO ---- */
/* ---- PAINEL BARBEIRO ---- */
const renderizarAgendaBarbeiro = () => {
    const bid = appState.usuarioAtual?.id;
    const hoje = mockBookings.filter(b => b.barbeiroId === bid);
    
    document.getElementById("nome-barbeiro-header").textContent = appState.usuarioAtual?.name || "Barbeiro";
    document.getElementById("data-barbeiro-header").textContent = new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"});
    document.getElementById("total-atendimentos").textContent = hoje.length;
    document.getElementById("total-faturacao").textContent = "R$ " + hoje.reduce((s,b) => s+b.price, 0);
    
    const c = document.getElementById("lista-agenda-barbeiro");
    if (hoje.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-check"></i><p>Nenhum agendamento para hoje</p></div>`;
    } else {
        c.innerHTML = hoje.map(bk => {
            const sv = mockServices.find(s => s.id === bk.serviceId);
            return `<div class="agenda-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="agenda-item-cliente">👤 ${bk.clientName}</div>
                        <div class="agenda-item-servico"><i class="bi bi-scissors"></i> ${sv?.name||"Serviço"}</div>
                        <div class="agenda-item-hora"><i class="bi bi-clock"></i> ${bk.time}</div>
                    </div>
                    <button class="btn btn-success btn-sm" style="padding: 0.35rem 0.6rem; font-size: 0.8rem;" onclick="window.abrirModalPagamento(${bk.id})">
                        <i class="bi bi-check2-all"></i> Concluir
                    </button>
                </div>
            </div>`;
        }).join("");
    }
};

/* ---- ADMIN ---- */
const renderizarEquipa = () => {
    const container = document.getElementById("lista-equipa");
    container.innerHTML = mockBarbers.map(b => `
        <div class="admin-item">
            <div style="flex:1">
                <div class="admin-item-name">${b.name}</div>
                <div class="admin-item-meta"><i class="bi bi-clock"></i> ${b.escalaInicio} – ${b.escalaFim}</div>
                <div class="mt-1">${b.tags.split(",").map(t=>`<span class="badge-tag">${t.trim()}</span>`).join("")}</div>
            </div>
            <div class="admin-item-actions">
                <button class="btn-icon" onclick="window.abrirModalBarbeiro(${b.id})" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon" onclick="window.abrirModalEscala(${b.id})" title="Escala"><i class="bi bi-calendar"></i></button>
            </div>
        </div>`).join("");
};

const renderizarServicosAdmin = () => {
    document.getElementById("lista-servicos-admin").innerHTML = mockServices.map(s => `
        <div class="admin-item">
            <div style="flex:1">
                <div class="admin-item-name">${s.name}</div>
                <div class="admin-item-desc">R$ ${s.price} &bull; ${s.duration}min</div>
            </div>
            <div class="admin-item-actions">
                <button class="btn-icon" onclick="window.abrirModalServico(${s.id})" title="Editar"><i class="bi bi-pencil"></i></button>
            </div>
        </div>`).join("");
};

/* ---- MODAL: BARBEIRO ---- */
window.abrirModalBarbeiro = (id = null) => {
    appState.editingId = id;
    document.getElementById("form-barbeiro-admin")?.reset();
    document.getElementById("modalBarbeiroTitle").textContent = id ? "Editar Profissional" : "Novo Profissional";
    
    if (id) {
        const b = mockBarbers.find(x => x.id === id);
        if (b) {
            document.getElementById("barbeiro-nome").value = b.name;
            document.getElementById("barbeiro-senha").value = b.password;
            document.getElementById("barbeiro-tags").value = b.tags;
            document.getElementById("barbeiro-horario-inicio").value = b.escalaInicio;
            document.getElementById("barbeiro-horario-fim").value = b.escalaFim;
        }
    }
    new bootstrap.Modal(document.getElementById("modalBarbeiro")).show();
};

window.salvarBarbeiro = async () => {
    const nome  = document.getElementById("barbeiro-nome").value.trim();
    const senha = document.getElementById("barbeiro-senha").value;
    const tags  = document.getElementById("barbeiro-tags").value.trim();
    const ini   = document.getElementById("barbeiro-horario-inicio").value;
    const fim   = document.getElementById("barbeiro-horario-fim").value;
    const file  = document.getElementById("barbeiro-imagem").files[0];
    
    if (!nome||!senha||!tags||!ini||!fim) { alert("Preencha todos os campos obrigatórios"); return; }
    
    const img = file ? await converterBase64(file) : "https://via.placeholder.com/200";
    const dados = { name:nome, password:senha, tags, escalaInicio:ini, escalaFim:fim, img };
    
    // TODO: Substituir por updateDoc/addDoc no Firestore na Fase 2
    if (appState.editingId) {
        const i = mockBarbers.findIndex(b => b.id === appState.editingId);
        if (i>-1) mockBarbers[i] = {...mockBarbers[i], ...dados};
    } else {
        mockBarbers.push({ id: Math.max(...mockBarbers.map(b=>b.id),0)+1, ...dados });
    }
    bootstrap.Modal.getInstance(document.getElementById("modalBarbeiro")).hide();
    renderizarEquipa();
};

/* ---- MODAL: SERVIÇO ---- */
window.abrirModalServico = (id = null) => {
    appState.editingId = id;
    document.getElementById("form-servico-admin")?.reset();
    document.getElementById("modalServicoTitle").textContent = id ? "Editar Serviço" : "Novo Serviço";
    
    if (id) {
        const s = mockServices.find(x => x.id === id);
        if (s) {
            document.getElementById("servico-nome").value = s.name;
            document.getElementById("servico-preco").value = s.price;
            document.getElementById("servico-duracao").value = s.duration;
        }
    }
    new bootstrap.Modal(document.getElementById("modalServico")).show();
};

window.salvarServico = async () => {
    const nome   = document.getElementById("servico-nome").value.trim();
    const preco  = parseFloat(document.getElementById("servico-preco").value);
    const dur    = parseInt(document.getElementById("servico-duracao").value);
    const file   = document.getElementById("servico-imagem").files[0];
    
    if (!nome||isNaN(preco)||isNaN(dur)) { alert("Preencha todos os campos corretamente"); return; }
    
    const img = file ? await converterBase64(file) : "https://via.placeholder.com/200";
    const dados = { name:nome, price:preco, duration:dur, img };
    
    // TODO: Substituir por updateDoc/addDoc no Firestore na Fase 2
    if (appState.editingId) {
        const i = mockServices.findIndex(s => s.id === appState.editingId);
        if (i>-1) mockServices[i] = {...mockServices[i], ...dados};
    } else {
        mockServices.push({ id: Math.max(...mockServices.map(s=>s.id),0)+1, ...dados });
    }
    bootstrap.Modal.getInstance(document.getElementById("modalServico")).hide();
    renderizarServicosAdmin();
};

/* ---- MODAL: ESCALA ---- */
window.abrirModalEscala = (id) => {
    appState.editingId = id;
    const b = mockBarbers.find(x => x.id === id);
    if (b) {
        document.getElementById("escala-barbeiro-nome").textContent = `Profissional: ${b.name}`;
        document.getElementById("escala-hora-inicio").value = b.escalaInicio;
        document.getElementById("escala-hora-fim").value = b.escalaFim;
    }
    new bootstrap.Modal(document.getElementById("modalEscala")).show();
};

/* ---- MODAL: PAGAMENTO ---- */
window.abrirModalPagamento = (id) => {
    appState.editingId = id; // Guarda qual agendamento estamos a concluir
    new bootstrap.Modal(document.getElementById("modalPagamento")).show();
};

window.confirmarPagamento = () => {
    const forma = document.getElementById("forma-pagamento").value;
    
    // Simula a conclusão: remove o agendamento da lista falsa
    const index = mockBookings.findIndex(b => b.id === appState.editingId);
    if (index > -1) {
        mockBookings.splice(index, 1);
    }
    
    bootstrap.Modal.getInstance(document.getElementById("modalPagamento")).hide();
    renderizarAgendaBarbeiro(); // Atualiza a tela para o cartão sumir
    alert(`✅ Atendimento concluído com sucesso!\nForma de pagamento: ${forma}`);
};

/* ---- UTILITÁRIOS ---- */
const converterBase64 = (file) => new Promise((res,rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
});

/* ---- INIT ---- */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-iniciar-agendamento").addEventListener("click", window.iniciarAgendamento);
    document.getElementById("btn-next-servico").addEventListener("click", () => window.passarStep(2));
    document.getElementById("btn-next-barbeiro").addEventListener("click", () => window.passarStep(3));
    document.getElementById("btn-next-horario").addEventListener("click", () => window.passarStep(4));
    document.getElementById("btn-voltar-barbeiro-wizard").addEventListener("click", () => window.voltarStep(1));
    document.getElementById("btn-voltar-horario-wizard").addEventListener("click", () => window.voltarStep(2));
    document.getElementById("btn-voltar-resumo-wizard").addEventListener("click", () => window.voltarStep(3));
    document.getElementById("btn-confirmar-agendamento").addEventListener("click", window.confirmarAgendamento);
    
    document.getElementById("btn-login-barbeiro").addEventListener("click", () => window.fazerLogin("barbeiro"));
    document.getElementById("btn-voltar-barbeiro").addEventListener("click", () => window.mudarTela("view-cliente-form"));
    document.getElementById("btn-login-admin").addEventListener("click", () => window.fazerLogin("admin"));
    document.getElementById("btn-voltar-admin").addEventListener("click", () => window.mudarTela("view-cliente-form"));

    mudarTela("view-cliente-form");
    console.log("🎉 Yan Barbeiro carregado!");
    console.log("🔑 Admin: password123 | Barbeiro: Yan + 123");
});