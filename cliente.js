/* ============================================================
   MÓDULO CLIENTE — LÓGICA DO WIZARD DE AGENDAMENTO
   ============================================================ */
window.iniciarAgendamento = () => {
    const nome = document.getElementById("cliente-nome").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const email = document.getElementById("cliente-email").value.trim();

    if (!nome || !telefone || !email) { alert("Por favor, preencha todos os campos"); return; }
    
    window.appState.clienteAtual = { nome, telefone, email };
    window.mudarTela("view-cliente");
};

window.renderizarServicos = () => {
    // Filtra os serviços que têm o ativo falso
    const servicosAtivos = window.mockServices.filter(s => s.ativo !== false);
    
    document.getElementById("lista-servicos").innerHTML = servicosAtivos.map(s => `
        <div class="col-6 col-md-4 mb-3">
            <div class="service-card" onclick="window.selecionarServico('${s.id}', event)">
                <img src="${s.img}" class="service-icon" alt="${s.name}" onerror="this.style.display='none'">
                <h6>${s.name}</h6>
                <p class="price">R$ ${s.price}</p>
                <small class="duration"><i class="bi bi-clock"></i> ${s.duration}min</small>
            </div>
        </div>`).join("");
};

window.selecionarServico = (id, evt) => {
    window.appState.agendamento.servicoId = id;
    const s = window.mockServices.find(x => x.id === id);
    window.appState.agendamento.servicoNome = s.name;
    window.appState.agendamento.servico = s;

    document.querySelectorAll(".service-card").forEach(c => c.classList.remove("selected"));
    (evt?.target || event.target).closest(".service-card").classList.add("selected");
    document.getElementById("btn-next-servico").disabled = false;
};

window.renderizarBarbeiros = () => {
    // Filtra os profissionais que têm o ativo falso
    const barbeirosAtivos = window.mockBarbers.filter(b => b.ativo !== false);
    
    document.getElementById("lista-barbeiros").innerHTML = barbeirosAtivos.map(b => `
        <div class="col-6 col-md-4">
            <div class="barbeiro-card" onclick="window.selecionarBarbeiro('${b.id}', event)">
                <img src="${b.img}" class="barbeiro-img" alt="${b.name}" onerror="this.textContent='👤'">
                <h6>${b.name}</h6>
                <p class="tags">${b.tags}</p>
            </div>
        </div>`).join("");
};

window.selecionarBarbeiro = (id, evt) => {
    window.appState.agendamento.barbeiroId = id;
    const b = window.mockBarbers.find(x => x.id === id);
    window.appState.agendamento.barbeiroNome = b.name;
    window.appState.agendamento.barbeiro = b;

    document.querySelectorAll(".barbeiro-card").forEach(c => c.classList.remove("selected"));
    (evt?.target || event.target).closest(".barbeiro-card").classList.add("selected");
    document.getElementById("btn-next-barbeiro").disabled = false;
};

window.renderizarHorarios = () => {
    const b = window.mockBarbers.find(x => x.id === window.appState.agendamento.barbeiroId);
    if (!b) return;

    const slots = window.gerarHorarios(b.escalaInicio, b.escalaFim);
    document.getElementById("grade-horarios").innerHTML = slots.map(h =>
        `<button class="horario-btn" onclick="window.selecionarHorario('${h}', event)">${h}</button>`
    ).join("");
};

window.gerarHorarios = (inicio, fim) => {
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
    window.appState.agendamento.horario = horario;
    document.querySelectorAll(".horario-btn").forEach(b => b.classList.remove("selected"));
    (evt?.target || event.target).classList.add("selected");
    document.getElementById("btn-next-horario").disabled = false;
};

window.passarStep = (n) => {
    window.appState.currentStep = n;
    document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
    const ids = ["step-servico","step-profissional","step-horario","step-resumo"];
    document.getElementById(ids[n-1]).classList.add("active");
    if (n===2) window.renderizarBarbeiros();
    else if (n===3) window.renderizarHorarios();
    else if (n===4) window.atualizarResumo();
};

window.voltarStep = (n) => window.passarStep(n);

window.atualizarResumo = () => {
    document.getElementById("resumo-servico").textContent = window.appState.agendamento.servicoNome || "-";
    document.getElementById("resumo-barbeiro").textContent = window.appState.agendamento.barbeiroNome || "-";
    document.getElementById("resumo-horario").textContent = window.appState.agendamento.horario ? `Hoje, ${window.appState.agendamento.horario}` : "-";
    document.getElementById("resumo-preco").textContent = window.appState.agendamento.servico ? `R$ ${window.appState.agendamento.servico.price}` : "-";
    
    const endereco = window.getEnderecoAtivo();
    const localEl = document.getElementById("resumo-local");
    if (localEl) localEl.textContent = endereco ? `${endereco.rua}, ${endereco.numero} — ${endereco.bairro}` : "-";
};

window.confirmarAgendamento = () => {
    window.mockBookings.push({
        id: window.mockBookings.length+1,
        clientName: window.appState.clienteAtual.nome,
        serviceId: window.appState.agendamento.servicoId,
        barbeiroId: window.appState.agendamento.barbeiroId,
        time: window.appState.agendamento.horario,
        price: window.appState.agendamento.servico.price,
        createdAt:  new Date().toISOString(),
        completed:  false
    });

    const endereco = window.getEnderecoAtivo();
    const enderecoTexto = endereco ? `A barbearia está localizada em:\n${endereco.rua}, ${endereco.numero} — ${endereco.bairro}` : "O endereço da barbearia ainda não foi cadastrado.";
    alert(`✅ Agendamento confirmado para ${window.appState.agendamento.horario}!\n\n${enderecoTexto}`);

    document.getElementById("cliente-nome").value = "";
    document.getElementById("cliente-telefone").value = "";
    document.getElementById("cliente-email").value = "";
    window.resetarWizard();
    window.mudarTela("view-cliente-form");
};

window.resetarWizard = () => {
    window.appState.currentStep = 1;
    window.appState.agendamento = { servicoId:null, barbeiroId:null, horario:null, servicoNome:null, barbeiroNome:null, servico:null, barbeiro:null };
    document.querySelectorAll(".wizard-step").forEach(s => s.classList.remove("active"));
    const first = document.getElementById("step-servico");
    if (first) first.classList.add("active");
    document.querySelectorAll("#btn-next-servico,#btn-next-barbeiro,#btn-next-horario").forEach(b => b.disabled = true);
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-iniciar-agendamento").addEventListener("click", window.iniciarAgendamento);
    document.getElementById("btn-next-servico").addEventListener("click", () => window.passarStep(2));
    document.getElementById("btn-next-barbeiro").addEventListener("click", () => window.passarStep(3));
    document.getElementById("btn-next-horario").addEventListener("click", () => window.passarStep(4));
    document.getElementById("btn-voltar-barbeiro-wizard").addEventListener("click", () => window.voltarStep(1));
    document.getElementById("btn-voltar-horario-wizard").addEventListener("click", () => window.voltarStep(2));
    document.getElementById("btn-voltar-resumo-wizard").addEventListener("click", () => window.voltarStep(3));
    document.getElementById("btn-confirmar-agendamento").addEventListener("click", window.confirmarAgendamento);
});