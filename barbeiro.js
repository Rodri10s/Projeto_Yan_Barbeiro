/* ============================================================
   MÓDULO BARBEIRO — LEITURA, CONCLUSÃO E ENCAIXE DE SERVIÇOS
   ============================================================ */

// 1. LOGIN COM FIREBASE
window.fazerLoginBarbeiro = async () => {
    const username = document.getElementById("barbeiro-username").value.trim();
    const password = document.getElementById("barbeiro-password").value;
    const btn = document.getElementById("btn-login-barbeiro");
    const textoOriginal = btn.innerHTML;
    
    if (!username || !password) return alert("Preencha todos os campos!");
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';
    btn.disabled = true;

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "profissionais"));
        let barbeiroEncontrado = null;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name.toLowerCase() === username.toLowerCase() && data.password === password) {
                barbeiroEncontrado = { id: doc.id, ...data };
            }
        });

        if (barbeiroEncontrado) {
            if (barbeiroEncontrado.ativo === false) {
                alert("Sua conta está inativa. Procure o administrador.");
            } else {
                window.appState.usuarioAtual = { tipo: "barbeiro", name: barbeiroEncontrado.name, id: barbeiroEncontrado.id };
                window.mudarTela("view-barbeiro");
            }
        } else {
            alert("Nome de utilizador ou palavra-passe incorretos!");
        }
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        alert("Erro ao conectar com o banco de dados.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById("btn-login-barbeiro");
    if (btnLogin) {
        const novoBtn = btnLogin.cloneNode(true);
        btnLogin.parentNode.replaceChild(novoBtn, btnLogin);
        novoBtn.addEventListener("click", window.fazerLoginBarbeiro);
    }
});

// 2. RENDERIZAR AGENDA DO BARBEIRO
window.renderizarAgendaBarbeiro = async () => {
    const bid = window.appState.usuarioAtual?.id;
    if (!bid) return;

    document.getElementById("nome-barbeiro-header").textContent = window.appState.usuarioAtual?.name || "Barbeiro";
    document.getElementById("data-barbeiro-header").textContent = new Date().toLocaleDateString("pt-PT", { weekday:"long", day:"numeric", month:"long" });
    
    const c = document.getElementById("lista-agenda-barbeiro");
    c.innerHTML = '<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando a sua agenda...</div>';

    // Injeção do Modal de Encaixe
    if (!document.getElementById("modalEncaixe")) {
        const modalHTML = `
          <div class="modal fade" id="modalEncaixe" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Novo Encaixe (Avulso)</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <div class="mb-3"><label class="form-label">Nome do Cliente</label><input type="text" id="encaixe-nome" class="form-control" placeholder="Ex: Cliente Avulso" required /></div>
                  <div class="mb-3"><label class="form-label">Serviço</label><select id="encaixe-servico" class="form-control"></select></div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" onclick="bootstrap.Modal.getInstance(document.getElementById('modalEncaixe')).hide()">Cancelar</button>
                  <button type="button" class="btn btn-primary" onclick="window.salvarEncaixe()">Confirmar Encaixe</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHTML);
    }

    // Injeção do Modal de Informações do Cliente
    if (!document.getElementById("modalInfoCliente")) {
        const modalInfoHTML = `
          <div class="modal fade" id="modalInfoCliente" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Detalhes do Contato</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <p style="margin-bottom: 0.5rem;"><strong>Nome:</strong> <span id="info-cliente-nome"></span></p>
                  <p style="margin-bottom: 0.5rem;"><strong>Telefone:</strong> <span id="info-cliente-telefone"></span></p>
                  <p style="margin-bottom: 0;"><strong>Email:</strong> <span id="info-cliente-email"></span></p>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" onclick="bootstrap.Modal.getInstance(document.getElementById('modalInfoCliente')).hide()">Fechar</button>
                  <a href="#" id="btn-whatsapp-cliente" target="_blank" class="btn btn-success"><i class="bi bi-whatsapp"></i> WhatsApp</a>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalInfoHTML);
    }

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "agendamentos"));
        const todosAgendamentos = [];
        querySnapshot.forEach((doc) => todosAgendamentos.push({ id: doc.id, ...doc.data() }));

        const agendaHoje = todosAgendamentos.filter(b => String(b.barbeiroId) === String(bid) && b.completed === false);
        const concluidosHoje = todosAgendamentos.filter(b => String(b.barbeiroId) === String(bid) && b.completed === true);

        document.getElementById("total-atendimentos").textContent = concluidosHoje.length; 
        
        const faturamentoDiario = concluidosHoje.reduce((s, b) => s + (Number(b.price) || 0), 0);
        
        // Elemento de faturamento com correção para não estourar a caixa
        const faturamentoEl = document.getElementById("total-faturacao");
        faturamentoEl.textContent = window.formatarMoeda ? window.formatarMoeda(faturamentoDiario) : "R$ " + faturamentoDiario.toFixed(2);
        faturamentoEl.style.wordBreak = "break-word";
        faturamentoEl.style.fontSize = "clamp(1rem, 4vw, 1.5rem)";

        const btnEncaixeHTML = `
            <button class="btn btn-outline btn-sm w-100 mb-3" style="border-color: var(--primary); color: var(--primary);" onclick="window.abrirModalEncaixe()">
                <i class="bi bi-plus-circle"></i> Adicionar Encaixe (Cliente Avulso)
            </button>
        `;

        if (agendaHoje.length === 0) {
            c.innerHTML = btnEncaixeHTML + `<div class="empty-state"><i class="bi bi-calendar-check"></i><p>Nenhum agendamento pendente</p></div>`;
        } else {
            let htmlLista = agendaHoje.map(bk => {
                const sv = window.mockServices.find(s => String(s.id) === String(bk.serviceId)) || { name: bk.servicoNome || "Serviço" };
                
                // Tratamento do horário real de criação
                let criadoEm = "Não registrado";
                let horaCriacao = "";
                if(bk.createdAt) {
                    const dt = new Date(bk.createdAt);
                    horaCriacao = dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                    criadoEm = dt.toLocaleDateString('pt-BR') + ' às ' + horaCriacao;
                }

                // Lógica de definição da hora em que o corte vai ser feito:
                // Tenta puxar o horário agendado (horarioInicio) ou o time, se for encaixe, usa a hora de criação.
                let horarioAtendimento = bk.horarioInicio || bk.time || 'Avulso';
                if (bk.tipo === "Encaixe" && horaCriacao) {
                    horarioAtendimento = horaCriacao;
                }

                // Proteção contra aspas nos nomes para evitar quebra no clique
                const nomeSeguro = bk.clientName ? bk.clientName.replace(/'/g, "\\'") : 'Não informado';
                const foneSeguro = bk.clientPhone ? bk.clientPhone.replace(/'/g, "\\'") : 'Não informado';
                const emailSeguro = bk.clientEmail ? bk.clientEmail.replace(/'/g, "\\'") : 'Não informado';

                return `<div class="agenda-item">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div style="min-width: 150px;">
                            <div class="agenda-item-cliente" style="cursor:pointer; color: var(--primary); font-weight: 600;" onclick="window.abrirModalInfoCliente('${nomeSeguro}', '${foneSeguro}', '${emailSeguro}')" title="Clique para detalhes do contato">
                                👤 <span style="text-decoration: underline;">${bk.clientName}</span> <i class="bi bi-info-circle ms-1" style="font-size: 0.8rem;"></i>
                            </div>
                            <div class="agenda-item-servico"><i class="bi bi-scissors"></i> ${sv.name}</div>
                            <div class="agenda-item-hora"><i class="bi bi-clock"></i> Para: <strong>${horarioAtendimento}</strong></div>
                            <div class="agenda-item-criacao" style="font-size: 0.75rem; color: #6c757d; margin-top: 4px;">
                                <i class="bi bi-calendar-plus"></i> Criado: ${criadoEm}
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-danger btn-sm" style="padding: 0.45rem 0.8rem; font-size: 0.85rem;" onclick="window.cancelarAgendamento('${bk.id}')">
                                <i class="bi bi-x-circle"></i> Cancelar
                            </button>
                            <button class="btn btn-success btn-sm" style="padding: 0.45rem 0.8rem; font-size: 0.85rem;" onclick="window.abrirModalPagamento('${bk.id}')">
                                <i class="bi bi-check2-all"></i> Concluir
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join("");
            
            c.innerHTML = btnEncaixeHTML + htmlLista;
        }
    } catch (error) {
        console.error("Erro ao carregar agenda:", error);
        c.innerHTML = `<div class="text-danger text-center mt-3">Erro ao carregar agendamentos do Firebase.</div>`;
    }
};

// 3. FUNÇÕES DE EXIBIÇÃO DO CLIENTE E PAGAMENTO / CONCLUSÃO
window.abrirModalInfoCliente = (nome, telefone, email) => {
    document.getElementById("info-cliente-nome").textContent = nome;
    document.getElementById("info-cliente-telefone").textContent = telefone;
    document.getElementById("info-cliente-email").textContent = email;
    
    const btnWhats = document.getElementById("btn-whatsapp-cliente");
    if (telefone && telefone !== 'Não informado') {
        const numeroLimpo = telefone.replace(/\D/g, ''); // Remove formatação para o link do WhatsApp
        btnWhats.href = `https://wa.me/55${numeroLimpo}`;
        btnWhats.style.display = 'inline-block';
    } else {
        btnWhats.style.display = 'none';
    }
    
    new bootstrap.Modal(document.getElementById("modalInfoCliente")).show();
};

window.abrirModalPagamento = (id) => {
    window.appState.editingId = id; 
    new bootstrap.Modal(document.getElementById("modalPagamento")).show();
};

window.cancelarAgendamento = async (id) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    try {
        await window.deleteDoc(window.doc(window.db, "agendamentos", id));
        await window.renderizarAgendaBarbeiro();
    } catch (error) {
        console.error("Erro ao cancelar:", error);
        alert("Erro ao remover do banco.");
    }
};

window.confirmarPagamento = async () => {
    const forma = document.getElementById("forma-pagamento").value;
    const idAgendamento = window.appState.editingId;
    
    const btn = document.querySelector("#modalPagamento .btn-success");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Concluindo...';
    btn.disabled = true;

    try {
        await window.updateDoc(window.doc(window.db, "agendamentos", idAgendamento), {
            completed: true,
            completedAt: new Date().toISOString(),
            metodoPagamento: forma
        });
        
        bootstrap.Modal.getInstance(document.getElementById("modalPagamento")).hide();
        await window.renderizarAgendaBarbeiro();
        
        if(window.renderizarAdminFinanceiro) window.renderizarAdminFinanceiro();
        alert(`✅ Atendimento concluído com sucesso!`);
    } catch (error) {
        console.error("Erro ao concluir atendimento:", error);
        alert("Erro ao concluir o agendamento no banco de dados.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

// 4. FUNÇÕES DE ENCAIXE
window.abrirModalEncaixe = () => {
    const select = document.getElementById("encaixe-servico");
    select.innerHTML = window.mockServices.filter(s => s.ativo !== false).map(s => 
        `<option value="${s.id}">${s.name} - R$ ${s.price}</option>`
    ).join("");
    
    document.getElementById("encaixe-nome").value = "";
    new bootstrap.Modal(document.getElementById("modalEncaixe")).show();
};

window.salvarEncaixe = async () => {
    const nome = document.getElementById("encaixe-nome").value.trim() || "Cliente Avulso";
    const serviceId = document.getElementById("encaixe-servico").value;
    const servico = window.mockServices.find(s => String(s.id) === String(serviceId));
    
    if (!servico) return alert("Erro ao identificar o serviço selecionado.");

    const btn = document.querySelector("#modalEncaixe .btn-primary");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adicionando...';
    btn.disabled = true;

    try {
        const dataAgora = new Date();
        const novoAgendamento = {
            clientName: nome + " (Encaixe)",
            clientPhone: "Não informado", // Evita undefined ao abrir info
            clientEmail: "Não informado",
            serviceId: servico.id,
            servicoNome: servico.name,
            barbeiroId: window.appState.usuarioAtual.id,
            time: dataAgora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            price: servico.price,
            createdAt: dataAgora.toISOString(), // Usado para mostrar o tempo real de criação
            completed: false,
            tipo: "Encaixe"
        };

        await window.addDoc(window.collection(window.db, "agendamentos"), novoAgendamento);
        bootstrap.Modal.getInstance(document.getElementById("modalEncaixe")).hide();
        await window.renderizarAgendaBarbeiro();
        
    } catch (error) {
        console.error("Erro ao salvar encaixe:", error);
        alert("Erro ao salvar o encaixe.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};