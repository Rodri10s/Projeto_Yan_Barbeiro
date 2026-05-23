/* ============================================================
   1. LEITURA DE DADOS (READ) - COM STATUS ATIVO/INATIVO
   ============================================================ */
window.renderizarEquipa = async () => {
    const container = document.getElementById("lista-equipa");
    container.innerHTML = '<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando equipa...</div>';

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "profissionais"));
        window.mockBarbers = []; 
        querySnapshot.forEach((doc) => { window.mockBarbers.push({ id: doc.id, ...doc.data() }); });

        if (window.mockBarbers.length === 0) return container.innerHTML = '<p class="text-muted text-center mt-3">Nenhum profissional cadastrado.</p>';

        container.innerHTML = window.mockBarbers.map(b => {
            const isAtivo = b.ativo !== false; // Se não tiver a propriedade, considera true
            const badge = isAtivo ? '<span class="badge bg-success ms-2" style="font-size:0.65rem;">Ativo</span>' : '<span class="badge bg-secondary ms-2" style="font-size:0.65rem;">Inativo</span>';
            const opacity = isAtivo ? '' : 'opacity-50';

            return `
            <div class="admin-item ${opacity}">
                <div style="flex:1">
                    <div class="admin-item-name">${b.name} ${badge}</div>
                    <div class="admin-item-meta"><i class="bi bi-clock"></i> ${b.escalaInicio} – ${b.escalaFim}</div>
                    <div class="mt-1">${(b.tags || "").split(",").map(t=>`<span class="badge-tag">${t.trim()}</span>`).join("")}</div>
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
                    <div class="admin-item-desc">R$ ${Number(s.price).toFixed(2)} &bull; ${s.duration}min</div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-icon" onclick="window.alternarStatusServico('${s.id}', ${isAtivo})" title="${isAtivo ? 'Desativar' : 'Ativar'}"><i class="bi ${isAtivo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
                    <button class="btn-icon" onclick="window.abrirModalServico('${s.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
                </div>
            </div>`;
        }).join("");
    } catch (error) { container.innerHTML = '<p class="text-danger text-center">Erro ao carregar serviços.</p>'; }
};

/* ============================================================
   FUNÇÕES DE ATIVAR / DESATIVAR NO FIREBASE
   ============================================================ */
window.alternarStatusBarbeiro = async (id, statusAtual) => {
    try {
        await window.updateDoc(window.doc(window.db, "profissionais", id), { ativo: !statusAtual });
        window.renderizarEquipa();
    } catch (e) { alert("Erro ao alterar status."); }
};

window.alternarStatusServico = async (id, statusAtual) => {
    try {
        await window.updateDoc(window.doc(window.db, "servicos", id), { ativo: !statusAtual });
        window.renderizarServicosAdmin();
    } catch (e) { alert("Erro ao alterar status."); }
};

/* ============================================================
   2. CRIAÇÃO E EDIÇÃO (Com injeção da propriedade 'ativo')
   ============================================================ */
window.salvarBarbeiro = async () => {
    const nome = document.getElementById("barbeiro-nome").value.trim(), senha = document.getElementById("barbeiro-senha").value;
    const tags = document.getElementById("barbeiro-tags").value.trim(), ini = document.getElementById("barbeiro-horario-inicio").value, fim = document.getElementById("barbeiro-horario-fim").value;
    const file = document.getElementById("barbeiro-imagem").files[0];
    if (!nome||!senha||!tags||!ini||!fim) return alert("Preencha todos os campos obrigatórios");
    
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
    } catch (e) { alert("Erro ao comunicar com a base de dados."); } finally { btn.innerHTML = textoOriginal; btn.disabled = false; }
};

window.salvarServico = async () => {
    const nome = document.getElementById("servico-nome").value.trim(), preco = parseFloat(document.getElementById("servico-preco").value);
    const dur = parseInt(document.getElementById("servico-duracao").value), file = document.getElementById("servico-imagem").files[0];
    if (!nome||isNaN(preco)||isNaN(dur)) return alert("Preencha todos os campos corretamente");
    
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
    } catch (e) { alert("Erro ao comunicar com a base de dados."); } finally { btn.innerHTML = textoOriginal; btn.disabled = false; }
};

/* ============================================================
   3. CRIAÇÃO E EDIÇÃO (CREATE / UPDATE) - SERVIÇOS
   ============================================================ */
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
    const nome  = document.getElementById("servico-nome").value.trim();
    const preco = parseFloat(document.getElementById("servico-preco").value);
    const dur   = parseInt(document.getElementById("servico-duracao").value);
    const file  = document.getElementById("servico-imagem").files[0];
    
    if (!nome||isNaN(preco)||isNaN(dur)) { alert("Preencha todos os campos corretamente"); return; }
    
    const btn = document.querySelector("#modalServico .btn-primary");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
    btn.disabled = true;

    try {
        let imgUrl = "https://images.unsplash.com/photo-1599351431202-924373aed4ab?auto=format&fit=crop&w=200&q=80";
        if (file) {
            imgUrl = await window.converterBase64(file);
        } else if (window.appState.editingId) {
            const s = window.mockServices.find(x => x.id === window.appState.editingId);
            if (s && s.img) imgUrl = s.img;
        }

        const dados = { name:nome, price:preco, duration:dur, img:imgUrl };
        
        if (window.appState.editingId) {
            await window.updateDoc(window.doc(window.db, "servicos", window.appState.editingId), dados);
        } else {
            await window.addDoc(window.collection(window.db, "servicos"), dados);
        }
        
        bootstrap.Modal.getInstance(document.getElementById("modalServico")).hide();
        await window.renderizarServicosAdmin(); 
        
    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Erro ao comunicar com a base de dados.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

/* ============================================================
   4. ATUALIZAÇÃO RÁPIDA (ESCALA)
   ============================================================ */
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
    const ini = document.getElementById("escala-hora-inicio").value;
    const fim = document.getElementById("escala-hora-fim").value;
    
    if (!ini||!fim) { alert("Preencha os horários"); return; }
    
    const btn = document.querySelector("#modalEscala .btn-primary");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "Salvando..."; btn.disabled = true;

    try {
        // Atualiza apenas os campos da escala diretamente no documento específico
        await window.updateDoc(window.doc(window.db, "profissionais", window.appState.editingId), {
            escalaInicio: ini,
            escalaFim: fim
        });
        
        bootstrap.Modal.getInstance(document.getElementById("modalEscala")).hide();
        await window.renderizarEquipa();
    } catch (e) {
        console.error(e);
        alert("Erro ao atualizar escala.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

/* ============================================================
   MÓDULO ADMIN — EXTRAS (FINANCEIRO E ENDEREÇO) - MANTIDOS INTACTOS
   ============================================================ */
/* ============================================================
   MÓDULO ADMIN — EXTRAS (FINANCEIRO E ENDEREÇO ÚNICO)
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
              <select id="filtro-relatorio-ano" class="form-control" onchange="window.aplicarFiltroRelatorio()"><option value="">Todos os anos</option></select>
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

    if (!document.getElementById("modalEndereco")) {
        const modalHTML = `
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
        document.body.insertAdjacentHTML("beforeend", modalHTML);
    }
};

window.renderizarEnderecos = async () => {
    const container = document.getElementById("lista-enderecos");
    const btnNovo = document.getElementById("btn-novo-endereco");
    if (!container) return;
    
    container.innerHTML = '<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando endereço...</div>';

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "enderecos"));
        window.mockAddresses = [];
        
        querySnapshot.forEach((doc) => {
            window.mockAddresses.push({ id: doc.id, ...doc.data() });
        });

        // LÓGICA DE TRAVA: Se não tem endereço, mostra o botão "Cadastrar". Se já tem, esconde.
        if (btnNovo) {
            btnNovo.style.display = window.mockAddresses.length === 0 ? "block" : "none";
        }

        if (window.mockAddresses.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="bi bi-geo-alt"></i><p>Nenhum endereço cadastrado. Clique em 'Cadastrar' para adicionar.</p></div>`;
            return;
        }

        // Bloqueia a lista: pega sempre o índice [0] (o único endereço) e gera o HTML sem o botão de lixeira
        const endereco = window.mockAddresses[0];

        container.innerHTML = `
            <div class="admin-item">
              <div style="flex:1">
                <div class="admin-item-name">${endereco.rua}, ${endereco.numero}</div>
                <div class="admin-item-desc">${endereco.bairro}</div>
              </div>
              <div class="admin-item-actions">
                <button class="btn-icon" onclick="window.abrirModalEndereco('${endereco.id}')" title="Editar Endereço"><i class="bi bi-pencil"></i></button>
              </div>
            </div>
        `;
    } catch (error) {
        console.error("Erro ao buscar endereços:", error);
        container.innerHTML = '<p class="text-danger text-center">Erro ao carregar endereço.</p>';
    }
};

window.abrirModalEndereco = (id = null) => {
    window.appState.editingEnderecoId = id; 
    const endereco = id ? window.mockAddresses.find(x => x.id === id) : null;
    
    document.getElementById("modalEnderecoTitle").textContent = endereco ? "Editar Endereço" : "Cadastrar Endereço";
    document.getElementById("endereco-rua").value = endereco?.rua || "";
    document.getElementById("endereco-numero").value = endereco?.numero || "";
    document.getElementById("endereco-bairro").value = endereco?.bairro || "";
    
    new bootstrap.Modal(document.getElementById("modalEndereco")).show();
};

window.salvarEndereco = async () => {
    const rua = document.getElementById("endereco-rua").value.trim();
    const numero = document.getElementById("endereco-numero").value.trim();
    const bairro = document.getElementById("endereco-bairro").value.trim();
    if (!rua || !numero || !bairro) return alert("Por favor, preencha rua, número e bairro.");
    
    const btn = document.querySelector("#modalEndereco .btn-primary");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
    btn.disabled = true;

    try {
        const dados = { rua, numero, bairro };
        
        if (window.appState.editingEnderecoId) {
            // Atualiza o único endereço existente
            await window.updateDoc(window.doc(window.db, "enderecos", window.appState.editingEnderecoId), dados);
        } else {
            // Cria pela primeira (e única) vez
            await window.addDoc(window.collection(window.db, "enderecos"), dados);
        }

        bootstrap.Modal.getInstance(document.getElementById("modalEndereco")).hide();
        await window.renderizarEnderecos(); 
    } catch (e) {
        console.error("Erro ao salvar endereço:", e);
        alert("Erro ao comunicar com a base de dados.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

/* --- MANTENHA AS FUNÇÕES DE RELATÓRIO AQUI ABAIXO (calcularValoresFinanceiros, popularAnosRelatorio, etc) --- */

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

/* ============================================================
   FUNÇÕES DE ENDEREÇO ÚNICO CONECTADAS AO FIREBASE
   ============================================================ */
window.renderizarEnderecos = async () => {
    const container = document.getElementById("lista-enderecos");
    const btnNovo = document.getElementById("btn-novo-endereco");
    if (!container) return;
    
    container.innerHTML = '<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando endereço...</div>';

    try {
        // Busca os endereços reais salvos no Firebase
        const querySnapshot = await window.getDocs(window.collection(window.db, "enderecos"));
        window.mockAddresses = [];
        
        querySnapshot.forEach((doc) => {
            window.mockAddresses.push({ id: doc.id, ...doc.data() });
        });

        // TRAVA DE SEGURANÇA: Mostra o botão "Cadastrar" apenas se não houver nenhum endereço no banco
        if (btnNovo) {
            btnNovo.style.display = window.mockAddresses.length === 0 ? "block" : "none";
        }

        // Se estiver vazio
        if (window.mockAddresses.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="bi bi-geo-alt"></i><p>Nenhum endereço cadastrado. Clique em 'Cadastrar' para adicionar.</p></div>`;
            return;
        }

        // Bloqueia a lista: pega sempre o primeiro endereço e gera o HTML sem o botão de excluir
        const endereco = window.mockAddresses[0];

        container.innerHTML = `
            <div class="admin-item">
              <div style="flex:1">
                <div class="admin-item-name">${endereco.rua}, ${endereco.numero}</div>
                <div class="admin-item-desc">${endereco.bairro}</div>
              </div>
              <div class="admin-item-actions">
                <button class="btn-icon" onclick="window.abrirModalEndereco('${endereco.id}')" title="Editar Endereço"><i class="bi bi-pencil"></i></button>
              </div>
            </div>
        `;
    } catch (error) {
        console.error("Erro ao buscar endereços:", error);
        container.innerHTML = '<p class="text-danger text-center">Erro ao carregar endereço.</p>';
    }
};

window.abrirModalEndereco = (id = null) => {
    window.appState.editingEnderecoId = id; 
    const endereco = id ? window.mockAddresses.find(x => x.id === id) : null;
    
    document.getElementById("modalEnderecoTitle").textContent = endereco ? "Editar Endereço" : "Cadastrar Endereço";
    document.getElementById("endereco-rua").value = endereco?.rua || "";
    document.getElementById("endereco-numero").value = endereco?.numero || "";
    document.getElementById("endereco-bairro").value = endereco?.bairro || "";
    
    new bootstrap.Modal(document.getElementById("modalEndereco")).show();
};

window.salvarEndereco = async () => {
    const rua = document.getElementById("endereco-rua").value.trim();
    const numero = document.getElementById("endereco-numero").value.trim();
    const bairro = document.getElementById("endereco-bairro").value.trim();
    if (!rua || !numero || !bairro) return alert("Por favor, preencha rua, número e bairro.");
    
    const btn = document.querySelector("#modalEndereco .btn-primary");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
    btn.disabled = true;

    try {
        const dados = { rua, numero, bairro };
        
        if (window.appState.editingEnderecoId) {
            // Atualiza o único endereço existente no Firebase
            await window.updateDoc(window.doc(window.db, "enderecos", window.appState.editingEnderecoId), dados);
        } else {
            // Cria o endereço pela primeira e única vez no Firebase
            await window.addDoc(window.collection(window.db, "enderecos"), dados);
        }

        bootstrap.Modal.getInstance(document.getElementById("modalEndereco")).hide();
        await window.renderizarEnderecos(); 
    } catch (e) {
        console.error("Erro ao salvar endereço:", e);
        alert("Erro ao comunicar com a base de dados.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

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