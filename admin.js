/* ============================================================
   MÓDULO ADMIN — GESTÃO DO SALÃO
   ============================================================ */
/* ============================================================
   MÓDULO ADMIN — EXTRAS (FINANCEIRO E ENDEREÇO)
   ============================================================ */
window.criarPainelAdminExtras = () => {
    const adminBody = document.querySelector("#view-admin .section-body");
    if (!adminBody || document.getElementById("admin-financeiro-bloco")) return;

    const extraHTML = `
        <div class="admin-section" id="admin-financeiro-bloco">
          <p class="admin-section-title mb-3"><i class="bi bi-wallet2"></i> Financeiro</p>
          <div class="row g-2 mb-4">
            <div class="col-12 col-md-4">
              <label class="form-label" style="font-size: 0.85rem;">Dia</label>
              <input type="date" id="filtro-relatorio-dia" class="form-control" onchange="window.aplicarFiltroRelatorio()" />
              <small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-top: 0.25rem;">Deixe vazio para todos os dias</small>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label" style="font-size: 0.85rem;">Mês</label>
              <select id="filtro-relatorio-mes" class="form-control" onchange="window.aplicarFiltroRelatorio()">
                <option value="">Todos os meses</option>
                <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
                <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
                <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
                <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label" style="font-size: 0.85rem;">Ano</label>
              <select id="filtro-relatorio-ano" class="form-control" onchange="window.aplicarFiltroRelatorio()">
                <option value="">Todos os anos</option>
              </select>
            </div>
          </div>
          <div class="row g-3">
            <div class="col-6">
              <div class="stat-card"><div><p class="stat-label">Ganhos Semanais</p><div class="stat-value" id="ganho-semanal">R$ 0,00</div></div></div>
            </div>
            <div class="col-6">
              <div class="stat-card"><div><p class="stat-label">Ganhos Mensais</p><div class="stat-value" id="ganho-mensal">R$ 0,00</div></div></div>
            </div>
          </div>
          <div class="row g-2 mt-4">
            <div class="col-12 col-md-6"><button class="btn btn-primary w-100" onclick="window.gerarRelatórioMensal()"><i class="bi bi-file-earmark-pdf"></i> Gerar Relatório Mensal</button></div>
            <div class="col-12 col-md-6"><button class="btn btn-primary w-100" onclick="window.gerarRelatórioAnual()"><i class="bi bi-file-earmark-pdf"></i> Gerar Relatório Anual</button></div>
          </div>
        </div>
        <div class="admin-section" id="admin-endereco-bloco">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <p class="admin-section-title mb-0"><i class="bi bi-geo-alt"></i> Endereços</p>
            <button class="btn btn-accent btn-sm" onclick="window.abrirModalEndereco()"><i class="bi bi-plus-circle"></i> Novo</button>
          </div>
          <div class="admin-list" id="lista-enderecos"></div>
        </div>
    `;
    adminBody.insertAdjacentHTML("afterbegin", extraHTML);

    if (!document.getElementById("modalEndereco")) {
        const modalHTML = `
          <div class="modal fade" id="modalEndereco" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header"><h5 class="modal-title" id="modalEnderecoTitle">Novo Endereço</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                  <div class="mb-3"><label class="form-label">Rua</label><input type="text" id="endereco-rua" class="form-control" placeholder="Ex: Rua das Flores" required /></div>
                  <div class="row g-2">
                    <div class="col-6"><label class="form-label">Número</label><input type="text" id="endereco-numero" class="form-control" placeholder="Ex: 120" required /></div>
                    <div class="col-6"><label class="form-label">Bairro</label><input type="text" id="endereco-bairro" class="form-control" placeholder="Ex: Centro" required /></div>
                  </div>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-outline" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" onclick="window.salvarEndereco()">Guardar</button></div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHTML);
    }
};

window.calcularValoresFinanceiros = () => {
    const agora = new Date();
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const comecoMes = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);

    const weekTotal = window.mockCompletedBookings.reduce((acc, b) => {
        const data = new Date(b.completedAt || b.createdAt || agora);
        return data >= seteDiasAtras ? acc + b.price : acc;
    }, 0);

    const monthTotal = window.mockCompletedBookings.reduce((acc, b) => {
        const data = new Date(b.completedAt || b.createdAt || agora);
        return data >= comecoMes ? acc + b.price : acc;
    }, 0);

    return { weekTotal, monthTotal };
};

window.renderizarAdminFinanceiro = () => {
    const ganhoSemanal = document.getElementById("ganho-semanal");
    const ganhoMensal = document.getElementById("ganho-mensal");
    if (!ganhoSemanal || !ganhoMensal) return;
    const { weekTotal, monthTotal } = window.calcularValoresFinanceiros();
    ganhoSemanal.textContent = window.formatarMoeda(weekTotal);
    ganhoMensal.textContent = window.formatarMoeda(monthTotal);
};

window.renderizarEnderecos = () => {
    const container = document.getElementById("lista-enderecos");
    if (!container) return;
    if (!window.mockAddresses.length) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-geo-alt"></i><p>Nenhum endereço cadastrado</p></div>`;
        return;
    }
    container.innerHTML = window.mockAddresses.map((endereco, index) => `
        <div class="admin-item">
          <div style="flex:1"><div class="admin-item-name">${endereco.rua}, ${endereco.numero}</div><div class="admin-item-desc">${endereco.bairro}</div></div>
          <div class="admin-item-actions">
            <button class="btn-icon" onclick="window.abrirModalEndereco(${index})" title="Editar"><i class="bi bi-pencil"></i></button>
            <button class="btn-icon" onclick="window.removerEndereco(${index})" title="Remover"><i class="bi bi-trash"></i></button>
          </div>
        </div>
    `).join("");
};

window.abrirModalEndereco = (index = null) => {
    window.appState.editingEnderecoIndex = index;
    const endereco = typeof index === "number" ? window.mockAddresses[index] : null;
    document.getElementById("modalEnderecoTitle").textContent = endereco ? "Editar Endereço" : "Novo Endereço";
    document.getElementById("endereco-rua").value = endereco?.rua || "";
    document.getElementById("endereco-numero").value = endereco?.numero || "";
    document.getElementById("endereco-bairro").value = endereco?.bairro || "";
    
    // TODO Membro da Equipe: Após migrar para o Firebase, usar a documentRef para carregar dados
    new bootstrap.Modal(document.getElementById("modalEndereco")).show();
};

window.salvarEndereco = () => {
    const rua = document.getElementById("endereco-rua").value.trim();
    const numero = document.getElementById("endereco-numero").value.trim();
    const bairro = document.getElementById("endereco-bairro").value.trim();
    if (!rua || !numero || !bairro) return alert("Por favor, preencha rua, número e bairro.");
    
    const endereco = { rua, numero, bairro };
    
    // TODO Membro da Equipe: Substituir por addDoc/updateDoc na collection "enderecos"
    if (typeof window.appState.editingEnderecoIndex === "number") {
        window.mockAddresses[window.appState.editingEnderecoIndex] = endereco;
    } else {
        window.mockAddresses.push(endereco);
    }

    window.salvarEnderecosStorage();
    window.renderizarEnderecos();
    bootstrap.Modal.getInstance(document.getElementById("modalEndereco")).hide();
};

window.removerEndereco = (index) => {
    // TODO Membro da Equipe: Substituir por deleteDoc
    window.mockAddresses.splice(index, 1);
    window.salvarEnderecosStorage();
    window.renderizarEnderecos();
};

/* ---- FUNÇÕES DOS RELATÓRIOS ---- */
window.popularAnosRelatorio = () => {
    const selectAno = document.getElementById("filtro-relatorio-ano");
    if (!selectAno) return;
    const anoAtual = new Date().getFullYear();
    while (selectAno.options.length > 1) selectAno.remove(1);
    for (let i = 0; i < 5; i++) {
        const option = document.createElement("option");
        option.value = anoAtual - i; option.textContent = anoAtual - i;
        selectAno.appendChild(option);
    }
};

window.gerarRelatórioMensal = () => alert("⏳ Relatório Mensal - Integração em desenvolvimento");
window.gerarRelatórioAnual = () => alert("⏳ Relatório Anual - Integração em desenvolvimento");
window.aplicarFiltroRelatorio = () => console.log("Filtro Aplicado");

   window.renderizarEquipa = () => {
    const container = document.getElementById("lista-equipa");
    container.innerHTML = window.mockBarbers.map(b => `
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

window.renderizarServicosAdmin = () => {
    document.getElementById("lista-servicos-admin").innerHTML = window.mockServices.map(s => `
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

/* --- Funções do Profissional --- */
window.abrirModalBarbeiro = (id = null) => {
    window.appState.editingId = id;
    document.getElementById("form-barbeiro-admin")?.reset();
    document.getElementById("modalBarbeiroTitle").textContent = id ? "Editar Profissional" : "Novo Profissional";
    
    if (id) {
        const b = window.mockBarbers.find(x => x.id === id);
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
    
    const img = file ? await window.converterBase64(file) : "https://via.placeholder.com/200";
    const dados = { name:nome, password:senha, tags, escalaInicio:ini, escalaFim:fim, img };
    
    // TODO Membro da Equipe: Substituir este mock por addDoc/updateDoc na collection "profissionais"
    if (window.appState.editingId) {
        const i = window.mockBarbers.findIndex(b => b.id === window.appState.editingId);
        if (i>-1) window.mockBarbers[i] = {...window.mockBarbers[i], ...dados};
    } else {
        window.mockBarbers.push({ id: Math.max(...window.mockBarbers.map(b=>b.id),0)+1, ...dados });
    }
    bootstrap.Modal.getInstance(document.getElementById("modalBarbeiro")).hide();
    window.renderizarEquipa();
};

/* --- Funções de Serviço --- */
window.abrirModalServico = (id = null) => {
    window.appState.editingId = id;
    document.getElementById("form-servico-admin")?.reset();
    document.getElementById("modalServicoTitle").textContent = id ? "Editar Serviço" : "Novo Serviço";
    
    if (id) {
        const s = window.mockServices.find(x => x.id === id);
        if (s) {
            document.getElementById("servico-nome").value = s.name;
            document.getElementById("servico-preco").value = s.price;
            document.getElementById("servico-duracao").value = s.duration;
        }
    }
    new bootstrap.Modal(document.getElementById("modalServico")).show();
};

window.salvarServico = async () => {
    const nome  = document.getElementById("servico-nome").value.trim();
    const preco = parseFloat(document.getElementById("servico-preco").value);
    const dur   = parseInt(document.getElementById("servico-duracao").value);
    const file  = document.getElementById("servico-imagem").files[0];
    
    if (!nome||isNaN(preco)||isNaN(dur)) { alert("Preencha todos os campos corretamente"); return; }
    
    const img = file ? await window.converterBase64(file) : "https://via.placeholder.com/200";
    const dados = { name:nome, price:preco, duration:dur, img };
    
    // TODO Membro da Equipe: Substituir por addDoc/updateDoc na collection "servicos"
    if (window.appState.editingId) {
        const i = window.mockServices.findIndex(s => s.id === window.appState.editingId);
        if (i>-1) window.mockServices[i] = {...window.mockServices[i], ...dados};
    } else {
        window.mockServices.push({ id: Math.max(...window.mockServices.map(s=>s.id),0)+1, ...dados });
    }
    bootstrap.Modal.getInstance(document.getElementById("modalServico")).hide();
    window.renderizarServicosAdmin();
};

/* --- Funções de Escala --- */
window.abrirModalEscala = (id) => {
    window.appState.editingId = id;
    const b = window.mockBarbers.find(x => x.id === id);
    if (b) {
        document.getElementById("escala-barbeiro-nome").textContent = `Profissional: ${b.name}`;
        document.getElementById("escala-hora-inicio").value = b.escalaInicio;
        document.getElementById("escala-hora-fim").value = b.escalaFim;
    }
    new bootstrap.Modal(document.getElementById("modalEscala")).show();
};

window.salvarEscala = () => {
    const ini = document.getElementById("escala-hora-inicio").value;
    const fim = document.getElementById("escala-hora-fim").value;
    
    if (!ini||!fim) { alert("Preencha os horários"); return; }
    
    const b = window.mockBarbers.find(x => x.id === window.appState.editingId);
    if (b) { b.escalaInicio = ini; b.escalaFim = fim; }
    
    bootstrap.Modal.getInstance(document.getElementById("modalEscala")).hide();
    window.renderizarEquipa();
};