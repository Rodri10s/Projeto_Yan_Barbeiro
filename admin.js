window.converterBase64 = window.converterBase64 || ((file) => new Promise((res,rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
}));
window.appState = window.appState || { editingId: null, editingEnderecoId: null };

/* ============================================================
   1. LEITURA DE DADOS (READ) - EQUIPA E SERVIÇOS
   ============================================================ */
window.renderizarEquipa = async () => {
    const container = document.getElementById("lista-equipa");
    if(!container) return;
    container.innerHTML = '<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando equipa...</div>';

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "profissionais"));
        window.mockBarbers = []; 
        querySnapshot.forEach((doc) => { window.mockBarbers.push({ id: doc.id, ...doc.data() }); });

        if (window.mockBarbers.length === 0) return container.innerHTML = '<p class="text-muted text-center mt-3">Nenhum profissional cadastrado.</p>';

        container.innerHTML = window.mockBarbers.map(b => {
            const isAtivo = b.ativo !== false;
            const badge = isAtivo ? '<span class="badge bg-success ms-2" style="font-size:0.65rem;">Ativo</span>' : '<span class="badge bg-secondary ms-2" style="font-size:0.65rem;">Inativo</span>';
            const opacity = isAtivo ? '' : 'opacity-50';

            return `
            <div class="admin-item ${opacity}">
                <div style="flex:1">
                    <div class="admin-item-name">${b.name} ${badge}</div>
                    <div class="admin-item-meta"><i class="bi bi-clock"></i> ${b.escalaInicio} – ${b.escalaFim}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon" onclick="window.alternarStatusBarbeiro('${b.id}', ${isAtivo})" title="${isAtivo ? 'Desativar' : 'Ativar'}"><i class="bi ${isAtivo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
                    <button class="btn-icon" onclick="window.abrirModalBarbeiro('${b.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon" onclick="window.abrirModalEscala('${b.id}')" title="Escala"><i class="bi bi-calendar"></i></button>
                </div>
            </div>`;
        }).join("");
    } catch (error) { container.innerHTML = '<p class="text-danger text-center">Erro ao carregar equipa.</p>'; }
};

window.renderizarServicosAdmin = async () => {
    const container = document.getElementById("lista-servicos-admin");
    if(!container) return;
    container.innerHTML = '<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando serviços...</div>';

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "servicos"));
        window.mockServices = [];
        querySnapshot.forEach((doc) => { window.mockServices.push({ id: doc.id, ...doc.data() }); });

        if (window.mockServices.length === 0) return container.innerHTML = '<p class="text-muted text-center mt-3">Nenhum serviço cadastrado.</p>';

        container.innerHTML = window.mockServices.map(s => {
            const isAtivo = s.ativo !== false;
            const badge = isAtivo ? '<span class="badge bg-success ms-2" style="font-size:0.65rem;">Ativo</span>' : '<span class="badge bg-secondary ms-2" style="font-size:0.65rem;">Inativo</span>';
            const opacity = isAtivo ? '' : 'opacity-50';

            return `
            <div class="admin-item ${opacity}">
                <div style="flex:1">
                    <div class="admin-item-name">${s.name} ${badge}</div>
                    <div class="admin-item-desc">${window.formatarMoeda ? window.formatarMoeda(s.price) : 'R$ '+s.price} &bull; ${s.duration}min</div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon" onclick="window.alternarStatusServico('${s.id}', ${isAtivo})" title="${isAtivo ? 'Desativar' : 'Ativar'}"><i class="bi ${isAtivo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
                    <button class="btn-icon" onclick="window.abrirModalServico('${s.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
                </div>
            </div>`;
        }).join("");
    } catch (error) { container.innerHTML = '<p class="text-danger text-center">Erro ao carregar serviços.</p>'; }
};

window.alternarStatusBarbeiro = async (id, statusAtual) => {
    try { await window.updateDoc(window.doc(window.db, "profissionais", id), { ativo: !statusAtual }); window.renderizarEquipa(); } 
    catch (e) { alert("Erro ao alterar status."); }
};

window.alternarStatusServico = async (id, statusAtual) => {
    try { await window.updateDoc(window.doc(window.db, "servicos", id), { ativo: !statusAtual }); window.renderizarServicosAdmin(); } 
    catch (e) { alert("Erro ao alterar status."); }
};

/* ============================================================
   2. CRIAÇÃO E EDIÇÃO - EQUIPA E SERVIÇOS
   ============================================================ */
window.abrirModalBarbeiro = (id = null) => {
    window.appState.editingId = id;
    document.getElementById("barbeiro-nome").value = "";
    document.getElementById("barbeiro-senha").value = "";
    document.getElementById("barbeiro-tags").value = "";
    document.getElementById("barbeiro-horario-inicio").value = "";
    document.getElementById("barbeiro-horario-fim").value = "";
    document.getElementById("barbeiro-imagem").value = "";
    
    document.getElementById("modalBarbeiroTitle").textContent = id ? "Editar Profissional" : "Novo Profissional";
    
    if (id) {
        const b = window.mockBarbers.find(x => x.id === id);
        if (b) {
            document.getElementById("barbeiro-nome").value = b.name;
            document.getElementById("barbeiro-senha").value = b.password;
            document.getElementById("barbeiro-tags").value = b.tags || "";
            document.getElementById("barbeiro-horario-inicio").value = b.escalaInicio;
            document.getElementById("barbeiro-horario-fim").value = b.escalaFim;
        }
    }
    new bootstrap.Modal(document.getElementById("modalBarbeiro")).show();
};

window.salvarBarbeiro = async () => {
    const nome = document.getElementById("barbeiro-nome").value.trim(), senha = document.getElementById("barbeiro-senha").value;
    const tags = document.getElementById("barbeiro-tags").value.trim(), ini = document.getElementById("barbeiro-horario-inicio").value, fim = document.getElementById("barbeiro-horario-fim").value;
    const file = document.getElementById("barbeiro-imagem").files[0];
    if (!nome||!senha||!ini||!fim) return alert("Preencha todos os campos obrigatórios");
    
    const btn = document.querySelector("#modalBarbeiro .btn-primary");
    const textoOriginal = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; btn.disabled = true;

    try {
        let imgUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80";
        if (file) imgUrl = await window.converterBase64(file);
        else if (window.appState.editingId) { const b = window.mockBarbers.find(x => x.id === window.appState.editingId); if (b && b.img) imgUrl = b.img; }

        const dados = { name:nome, password:senha, tags, escalaInicio:ini, escalaFim:fim, img:imgUrl };
        if (window.appState.editingId) await window.updateDoc(window.doc(window.db, "profissionais", window.appState.editingId), dados);
        else { dados.ativo = true; await window.addDoc(window.collection(window.db, "profissionais"), dados); }
        
        bootstrap.Modal.getInstance(document.getElementById("modalBarbeiro")).hide();
        await window.renderizarEquipa();
    } catch (e) { alert("Erro ao salvar no banco."); } finally { btn.innerHTML = textoOriginal; btn.disabled = false; }
};

window.abrirModalServico = (id = null) => {
    window.appState.editingId = id;
    document.getElementById("servico-nome").value = "";
    document.getElementById("servico-preco").value = "";
    document.getElementById("servico-duracao").value = "";
    document.getElementById("servico-imagem").value = "";
    
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
    const nome = document.getElementById("servico-nome").value.trim(), preco = parseFloat(document.getElementById("servico-preco").value);
    const dur = parseInt(document.getElementById("servico-duracao").value), file = document.getElementById("servico-imagem").files[0];
    if (!nome||isNaN(preco)||isNaN(dur)) return alert("Preencha os campos corretamente");
    
    const btn = document.querySelector("#modalServico .btn-primary");
    const textoOriginal = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; btn.disabled = true;

    try {
        let imgUrl = "https://images.unsplash.com/photo-1599351431202-924373aed4ab?auto=format&fit=crop&w=200&q=80";
        if (file) imgUrl = await window.converterBase64(file);
        else if (window.appState.editingId) { const s = window.mockServices.find(x => x.id === window.appState.editingId); if (s && s.img) imgUrl = s.img; }

        const dados = { name:nome, price:preco, duration:dur, img:imgUrl };
        if (window.appState.editingId) await window.updateDoc(window.doc(window.db, "servicos", window.appState.editingId), dados);
        else { dados.ativo = true; await window.addDoc(window.collection(window.db, "servicos"), dados); }
        
        bootstrap.Modal.getInstance(document.getElementById("modalServico")).hide();
        await window.renderizarServicosAdmin(); 
    } catch (e) { alert("Erro ao salvar."); } finally { btn.innerHTML = textoOriginal; btn.disabled = false; }
};

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

window.salvarEscala = async () => {
    const ini = document.getElementById("escala-hora-inicio").value, fim = document.getElementById("escala-hora-fim").value;
    if (!ini||!fim) return alert("Preencha os horários");
    
    const btn = document.querySelector("#modalEscala .btn-primary");
    const textoOriginal = btn.innerHTML; btn.innerHTML = "Salvando..."; btn.disabled = true;

    try {
        await window.updateDoc(window.doc(window.db, "profissionais", window.appState.editingId), { escalaInicio: ini, escalaFim: fim });
        bootstrap.Modal.getInstance(document.getElementById("modalEscala")).hide();
        await window.renderizarEquipa();
    } catch (e) { alert("Erro na escala."); } finally { btn.innerHTML = textoOriginal; btn.disabled = false; }
};

/* ============================================================
   3. PAINEL FINANCEIRO E RELATÓRIOS
   ============================================================ */
window.criarPainelAdminExtras = () => {
    const adminBody = document.querySelector("#view-admin .section-body");
    if (!adminBody || document.getElementById("admin-financeiro-bloco")) return;

    const extraHTML = `
        <div class="admin-section" id="admin-financeiro-bloco">
          <p class="admin-section-title mb-3"><i class="bi bi-wallet2"></i> Relatórios Financeiros</p>
          <div class="row g-3 mb-4">
            <div class="col-12 col-md-6"><div class="stat-card"><div><p class="stat-label">Faturação Semanal</p><div class="stat-value" id="ganho-semanal">R$ 0,00</div></div></div></div>
            <div class="col-12 col-md-6"><div class="stat-card"><div><p class="stat-label">Faturação Mensal</p><div class="stat-value" id="ganho-mensal">R$ 0,00</div></div></div></div>
          </div>
          <div class="p-4 rounded" style="background: var(--bg); border: 1px solid var(--border);">
             <h6 class="mb-3" style="font-weight: 600;"><i class="bi bi-funnel"></i> Gerar Relatório Detalhado</h6>
             <div class="row g-2 mb-3">
                <div class="col-12 col-md-6">
                    <label class="form-label">Período</label>
                    <select id="filtro-periodo" class="form-control" onchange="window.toggleFiltroPersonalizado()">
                        <option value="hoje">Hoje</option><option value="semana">Últimos 7 dias</option><option value="mes" selected>Este Mês</option><option value="personalizado">Personalizado...</option>
                    </select>
                </div>
                <div class="col-12 col-md-6">
                    <label class="form-label">Profissional</label>
                    <select id="filtro-barbeiro-rel" class="form-control"><option value="todos">Todos os Profissionais</option></select>
                </div>
             </div>
             <div class="row g-2 mb-3" id="bloco-datas-custom" style="display:none;">
                 <div class="col-6"><label class="form-label">Data Inicial</label><input type="date" id="filtro-data-inicio" class="form-control"></div>
                 <div class="col-6"><label class="form-label">Data Final</label><input type="date" id="filtro-data-fim" class="form-control"></div>
             </div>
             <button class="btn btn-primary w-100" onclick="window.abrirRelatorio()" style="padding: 0.8rem; font-size: 1rem;"><i class="bi bi-bar-chart-line"></i> Gerar Relatório</button>
          </div>
        </div>
        <div class="admin-section" id="admin-endereco-bloco">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <p class="admin-section-title mb-0"><i class="bi bi-geo-alt"></i> Endereço da Barbearia</p>
            <button id="btn-novo-endereco" class="btn btn-accent btn-sm" onclick="window.abrirModalEndereco()" style="display:none;"><i class="bi bi-plus-circle"></i> Cadastrar</button>
          </div>
          <div class="admin-list" id="lista-enderecos"></div>
        </div>
    `;
    adminBody.insertAdjacentHTML("afterbegin", extraHTML);

    if (!document.getElementById("modalRelatorio")) {
        const modalHTML = `
          <div class="modal fade" id="modalRelatorio" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
              <div class="modal-content">
                <div class="modal-header"><h5 class="modal-title">Relatório de Faturação</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body" style="background: var(--bg); padding: 1rem;">
                  <div id="conteudo-relatorio-pdf" style="background: #fff; padding: 1.2rem; border-radius: 8px;"></div>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-outline" data-bs-dismiss="modal">Fechar</button><button type="button" class="btn btn-success" onclick="window.baixarPDFRelatorio()"><i class="bi bi-file-earmark-pdf"></i> Descarregar PDF</button></div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHTML);
    }
    if (!document.getElementById("modalEndereco")) {
        const modalEnderecoHTML = `
          <div class="modal fade" id="modalEndereco" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header"><h5 class="modal-title" id="modalEnderecoTitle">Endereço</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                  <div class="mb-3"><label class="form-label">Rua</label><input type="text" id="endereco-rua" class="form-control" placeholder="Ex: Rua das Flores" required /></div>
                  <div class="row g-2">
                    <div class="col-6"><label class="form-label">Número</label><input type="text" id="endereco-numero" class="form-control" required /></div>
                    <div class="col-6"><label class="form-label">Bairro</label><input type="text" id="endereco-bairro" class="form-control" required /></div>
                  </div>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-outline" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" onclick="window.salvarEndereco()">Guardar</button></div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalEnderecoHTML);
    }
    window.popularFiltroBarbeiros();

};

window.toggleFiltroPersonalizado = () => {
    document.getElementById("bloco-datas-custom").style.display = (document.getElementById("filtro-periodo").value === "personalizado") ? "flex" : "none";
};

window.popularFiltroBarbeiros = () => {
    const select = document.getElementById("filtro-barbeiro-rel");
    if (!select || !window.mockBarbers) return;
    select.innerHTML = '<option value="todos">Todos os Profissionais</option>' + window.mockBarbers.map(b => `<option value="${b.id}">${b.name}</option>`).join("");
};

window.gerarDadosFiccionaisFinanceiro = () => {
    if (window.mockCompletedBookings && window.mockCompletedBookings.length > 0) return;
    window.mockCompletedBookings = [];
    const metodos = ["PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito"];
    const hoje = new Date();

    for (let i = 0; i < 40; i++) {
        const dataFake = new Date(hoje);
        dataFake.setDate(hoje.getDate() - Math.floor(Math.random() * 30));
        const barbeiroReal = (window.mockBarbers && window.mockBarbers.length > 0) ? window.mockBarbers[Math.floor(Math.random() * window.mockBarbers.length)] : { id: "1", name: "Yan" };
        
        window.mockCompletedBookings.push({
            id: "mock_" + i,
            barbeiroId: barbeiroReal.id,
            price: [25, 30, 35, 50, 70][Math.floor(Math.random() * 5)],
            metodoPagamento: metodos[Math.floor(Math.random() * metodos.length)],
            completedAt: dataFake.toISOString()
        });
    }
};

window.calcularValoresFinanceiros = () => {
    window.gerarDadosFiccionaisFinanceiro();
    const agora = new Date(), seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000), comecoMes = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
    const weekTotal = window.mockCompletedBookings.reduce((acc, b) => { const d = new Date(b.completedAt || b.createdAt || agora); return d >= seteDiasAtras ? acc + b.price : acc; }, 0);
    const monthTotal = window.mockCompletedBookings.reduce((acc, b) => { const d = new Date(b.completedAt || b.createdAt || agora); return d >= comecoMes ? acc + b.price : acc; }, 0);
    return { weekTotal, monthTotal };
};

window.renderizarAdminFinanceiro = () => {
    const ganhoSemanal = document.getElementById("ganho-semanal"), ganhoMensal = document.getElementById("ganho-mensal");
    if (!ganhoSemanal || !ganhoMensal) return;
    const { weekTotal, monthTotal } = window.calcularValoresFinanceiros();
    ganhoSemanal.textContent = window.formatarMoeda ? window.formatarMoeda(weekTotal) : `R$ ${weekTotal}`;
    ganhoMensal.textContent = window.formatarMoeda ? window.formatarMoeda(monthTotal) : `R$ ${monthTotal}`;
};

window.abrirRelatorio = () => {
    window.gerarDadosFiccionaisFinanceiro();
    const periodo = document.getElementById("filtro-periodo").value, barbeiroId = document.getElementById("filtro-barbeiro-rel").value;
    const dataInicioInput = document.getElementById("filtro-data-inicio").value, dataFimInput = document.getElementById("filtro-data-fim").value;
    const agora = new Date(); let dataInicio, dataFim = agora;

    if (periodo === "hoje") dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    else if (periodo === "semana") dataInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (periodo === "mes") dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    else if (periodo === "personalizado") {
        if(!dataInicioInput || !dataFimInput) return alert("Preencha as datas.");
        dataInicio = new Date(dataInicioInput + "T00:00:00"); dataFim = new Date(dataFimInput + "T23:59:59");
    }

    const dadosFiltrados = window.mockCompletedBookings.filter(b => {
        const d = new Date(b.completedAt || b.createdAt);
        return (d >= dataInicio && d <= dataFim) && (barbeiroId === "todos" || String(b.barbeiroId) === String(barbeiroId));
    });

    let totalFaturado = 0; const pagamentos = { "PIX": 0, "Dinheiro": 0, "Cartão de Débito": 0, "Cartão de Crédito": 0 }, barbeirosFaturamento = {};
    dadosFiltrados.forEach(b => {
        totalFaturado += b.price;
        if (b.metodoPagamento) pagamentos[b.metodoPagamento] += b.price;
        const bInfo = window.mockBarbers.find(x => String(x.id) === String(b.barbeiroId));
        const bNome = bInfo ? bInfo.name : "Desconhecido";
        if (!barbeirosFaturamento[bNome]) barbeirosFaturamento[bNome] = 0;
        barbeirosFaturamento[bNome] += b.price;
    });

    const totalAtendimentos = dadosFiltrados.length, ticketMedio = totalAtendimentos > 0 ? (totalFaturado / totalAtendimentos) : 0;
    const periodoTexto = periodo === "personalizado" ? `${new Date(dataInicioInput).toLocaleDateString('pt-BR')} a ${new Date(dataFimInput).toLocaleDateString('pt-BR')}` : document.getElementById("filtro-periodo").options[document.getElementById("filtro-periodo").selectedIndex].text;

    // LAYOUT BLINDADO: Bootstrap para as caixas, Tabelas HTML puras para as listas.
    const html = `
        <div style="background-color: #ffffff; padding: 15px; color: #202124; font-family: sans-serif;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e8eaed; padding-bottom: 15px;">
                <h3 style="margin: 0; color: #202124; font-size: 1.3rem;">✂ Yan Barbeiro</h3>
                <p style="margin: 5px 0 0; color: #5f6368; font-size: 0.85rem;">Relatório de Faturação: <strong>${periodoTexto}</strong></p>
            </div>
            
            <div class="row g-2 mb-4 text-center">
                <div class="col-12">
                    <div style="background: #e8f0fe; padding: 15px; border-radius: 8px; border: 1px solid #c6dafc;">
                        <p style="margin:0; font-size:0.75rem; color:#5f6368; text-transform:uppercase; font-weight:600;">Faturação Total</p>
                        <h4 style="margin:5px 0 0; color:#1a73e8; font-weight:700; font-size: 1.5rem;">${window.formatarMoeda ? window.formatarMoeda(totalFaturado) : 'R$ '+totalFaturado.toFixed(2)}</h4>
                    </div>
                </div>
                <div class="col-6">
                    <div style="background: #ffffff; border: 1px solid #e8eaed; padding: 12px; border-radius: 8px; height: 100%;">
                        <p style="margin:0; font-size:0.7rem; color:#5f6368; text-transform:uppercase; font-weight:600;">Atendimentos</p>
                        <h4 style="margin:5px 0 0; color:#202124; font-weight:700; font-size: 1.2rem;">${totalAtendimentos}</h4>
                    </div>
                </div>
                <div class="col-6">
                    <div style="background: #ffffff; border: 1px solid #e8eaed; padding: 12px; border-radius: 8px; height: 100%;">
                        <p style="margin:0; font-size:0.7rem; color:#5f6368; text-transform:uppercase; font-weight:600;">Ticket Médio</p>
                        <h4 style="margin:5px 0 0; color:#202124; font-weight:700; font-size: 1.2rem;">${window.formatarMoeda ? window.formatarMoeda(ticketMedio) : 'R$ '+ticketMedio.toFixed(2)}</h4>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-12">
                    <h6 style="border-bottom: 1px solid #e8eaed; padding-bottom: 8px; margin-bottom: 10px; font-size: 0.9rem; font-weight: 600; margin-top:0;">Por Forma de Pagamento</h6>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                        ${Object.entries(pagamentos).map(([metodo, valor]) => `
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; text-align: left; color: #5f6368;">${metodo}</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; text-align: right; font-weight: 600; color: #202124;">${window.formatarMoeda ? window.formatarMoeda(valor) : 'R$ '+valor.toFixed(2)}</td>
                            </tr>
                        `).join("")}
                    </table>
                </div>
                <div class="col-12">
                    <h6 style="border-bottom: 1px solid #e8eaed; padding-bottom: 8px; margin-bottom: 10px; font-size: 0.9rem; font-weight: 600; margin-top:0;">Por Profissional</h6>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                        ${Object.entries(barbeirosFaturamento).map(([nome, valor]) => `
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; text-align: left; color: #5f6368;">👤 ${nome}</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #f1f3f4; text-align: right; font-weight: 600; color: #202124;">${window.formatarMoeda ? window.formatarMoeda(valor) : 'R$ '+valor.toFixed(2)}</td>
                            </tr>
                        `).join("")}
                    </table>
                </div>
            </div>
            
            <div style="margin-top: 30px; font-size: 0.65rem; color: #9aa0a6; text-align: center;">
                Gerado pelo sistema Yan Barbeiro em ${new Date().toLocaleString('pt-BR')}
            </div>
        </div>
    `;

    document.getElementById("conteudo-relatorio-pdf").innerHTML = html;
    new bootstrap.Modal(document.getElementById("modalRelatorio")).show();
};

window.baixarPDFRelatorio = () => {
    const elemento = document.getElementById("conteudo-relatorio-pdf");
    const periodo = document.getElementById("filtro-periodo").value;
    
    const opt = { 
        margin: 10, 
        filename: `relatorio_financeiro_${periodo}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 }, 
        // windowWidth garante que o PDF finja ser um ecrã de computador, não sobrepondo os itens
        html2canvas: { scale: 2, useCORS: true, windowWidth: 800 }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    const btn = document.querySelector("#modalRelatorio .btn-success");
    const textoOriginal = btn.innerHTML; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> A Gerar...'; 
    btn.disabled = true;
    
    html2pdf().set(opt).from(elemento).save().then(() => { 
        btn.innerHTML = textoOriginal; 
        btn.disabled = false; 
    });
};

/* ============================================================
   4. ENDEREÇOS
   ============================================================ */
window.renderizarEnderecos = async () => {
    const container = document.getElementById("lista-enderecos"), btnNovo = document.getElementById("btn-novo-endereco");
    if (!container) return; container.innerHTML = '<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando endereço...</div>';
    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "enderecos"));
        window.mockAddresses = []; querySnapshot.forEach((doc) => { window.mockAddresses.push({ id: doc.id, ...doc.data() }); });
        if (btnNovo) btnNovo.style.display = window.mockAddresses.length === 0 ? "block" : "none";
        if (window.mockAddresses.length === 0) return container.innerHTML = `<div class="empty-state"><i class="bi bi-geo-alt"></i><p>Nenhum endereço cadastrado. Clique em 'Cadastrar'.</p></div>`;
        const endereco = window.mockAddresses[0];
        container.innerHTML = `<div class="admin-item"><div style="flex:1"><div class="admin-item-name">${endereco.rua}, ${endereco.numero}</div><div class="admin-item-desc">${endereco.bairro}</div></div><div class="admin-item-actions"><button class="btn-icon" onclick="window.abrirModalEndereco('${endereco.id}')" title="Editar Endereço"><i class="bi bi-pencil"></i></button></div></div>`;
    } catch (error) { container.innerHTML = '<p class="text-danger text-center">Erro ao carregar endereço.</p>'; }
};

window.abrirModalEndereco = (id = null) => {
    window.appState.editingEnderecoId = id; const endereco = id ? window.mockAddresses.find(x => x.id === id) : null;
    document.getElementById("modalEnderecoTitle").textContent = endereco ? "Editar Endereço" : "Cadastrar Endereço";
    document.getElementById("endereco-rua").value = endereco?.rua || ""; document.getElementById("endereco-numero").value = endereco?.numero || ""; document.getElementById("endereco-bairro").value = endereco?.bairro || "";
    new bootstrap.Modal(document.getElementById("modalEndereco")).show();
};

window.salvarEndereco = async () => {
    const rua = document.getElementById("endereco-rua").value.trim(), numero = document.getElementById("endereco-numero").value.trim(), bairro = document.getElementById("endereco-bairro").value.trim();
    if (!rua || !numero || !bairro) return alert("Por favor, preencha rua, número e bairro.");
    const btn = document.querySelector("#modalEndereco .btn-primary"); const textoOriginal = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; btn.disabled = true;
    try {
        const dados = { rua, numero, bairro };
        if (window.appState.editingEnderecoId) await window.updateDoc(window.doc(window.db, "enderecos", window.appState.editingEnderecoId), dados);
        else await window.addDoc(window.collection(window.db, "enderecos"), dados);
        bootstrap.Modal.getInstance(document.getElementById("modalEndereco")).hide(); await window.renderizarEnderecos(); 
    } catch (e) { alert("Erro no banco."); } finally { btn.innerHTML = textoOriginal; btn.disabled = false; }
};