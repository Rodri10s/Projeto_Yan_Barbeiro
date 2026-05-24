/* ============================================================
   MÓDULO BARBEIRO — LEITURA, CONCLUSÃO, ENCAIXE E RELATÓRIO
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

// 2. RENDERIZAR AGENDA DO BARBEIRO COM FILTRO DE DATA
window.renderizarAgendaBarbeiro = async () => {
    const bid = window.appState.usuarioAtual?.id;
    if (!bid) return;

    // LÓGICA DO FILTRO DE DATA
    const inputData = document.getElementById("filtro-data-agenda");
    const hojeISO = new Date().toISOString().split("T")[0];
    
    if (inputData && !inputData.value) inputData.value = hojeISO;
    const dataSelecionada = inputData ? inputData.value : hojeISO;

    const [ano, mes, dia] = dataSelecionada.split('-');
    const dataFormatada = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });

    document.getElementById("nome-barbeiro-header").textContent = window.appState.usuarioAtual?.name || "Barbeiro";
    document.getElementById("data-barbeiro-header").textContent = dataFormatada;
    
    const c = document.getElementById("lista-agenda-barbeiro");
    c.innerHTML = '<div class="text-center my-3"><span class="spinner-border spinner-border-sm text-primary"></span> Carregando a sua agenda...</div>';

    // MODAL DE ENCAIXE
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

    // MODAL DE INFORMAÇÕES DO CLIENTE
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

    // NOVO: MODAL DE RELATÓRIO DO BARBEIRO
    if (!document.getElementById("modalRelatorioBarbeiro")) {
        const modalRelatorioHTML = `
          <div class="modal fade" id="modalRelatorioBarbeiro" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-bar-chart-line"></i> Meu Relatório</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-2 mb-3">
                        <div class="col-12">
                            <label class="form-label">Período</label>
                            <select id="barbeiro-filtro-periodo" class="form-control" onchange="window.toggleFiltroPersonalizadoBarbeiro()">
                                <option value="hoje">Hoje</option>
                                <option value="semana">Últimos 7 dias</option>
                                <option value="mes" selected>Este Mês</option>
                                <option value="personalizado">Personalizado...</option>
                            </select>
                        </div>
                    </div>
                    <div class="row g-2 mb-3" id="barbeiro-bloco-datas-custom" style="display:none;">
                        <div class="col-6">
                            <label class="form-label">Data Inicial</label>
                            <input type="date" id="barbeiro-filtro-data-inicio" class="form-control">
                        </div>
                        <div class="col-6">
                            <label class="form-label">Data Final</label>
                            <input type="date" id="barbeiro-filtro-data-fim" class="form-control">
                        </div>
                    </div>
                    <button class="btn btn-primary w-100 mb-4" onclick="window.gerarResultadoRelatorioBarbeiro()">
                        <i class="bi bi-search"></i> Gerar Relatório
                    </button>
                    
                    <div id="resultado-relatorio-barbeiro"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline w-100" data-bs-dismiss="modal">Fechar</button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalRelatorioHTML);
    }

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "agendamentos"));
        const todosAgendamentos = [];
        querySnapshot.forEach((doc) => todosAgendamentos.push({ id: doc.id, ...doc.data() }));

        const agendaHoje = todosAgendamentos.filter(b => 
            String(b.barbeiroId) === String(bid) && 
            b.completed === false && 
            (b.data === dataSelecionada || (b.tipo === "Encaixe" && b.createdAt?.startsWith(dataSelecionada)))
        );
        
        const concluidosHoje = todosAgendamentos.filter(b => 
            String(b.barbeiroId) === String(bid) && 
            b.completed === true && 
            (b.data === dataSelecionada || (b.tipo === "Encaixe" && b.createdAt?.startsWith(dataSelecionada)))
        );

        const totalAtendimentosDia = agendaHoje.length + concluidosHoje.length;
        document.getElementById("total-atendimentos").textContent = totalAtendimentosDia; 
        
        const faturamentoDiario = concluidosHoje.reduce((s, b) => s + (Number(b.price) || 0), 0);
        
        const faturamentoEl = document.getElementById("total-faturacao");
        faturamentoEl.textContent = window.formatarMoeda ? window.formatarMoeda(faturamentoDiario) : "R$ " + faturamentoDiario.toFixed(2);
        faturamentoEl.style.wordBreak = "break-word";
        faturamentoEl.style.fontSize = "clamp(1rem, 4vw, 1.5rem)";

        // BOTÕES LADO A LADO NA TELA DO BARBEIRO
        const btnAcoesHTML = `
            <div class="d-flex gap-2 mb-3">
                <button class="btn btn-outline btn-sm flex-grow-1" style="border-color: var(--primary); color: var(--primary);" onclick="window.abrirModalEncaixe()">
                    <i class="bi bi-plus-circle"></i> Novo Encaixe
                </button>
                <button class="btn btn-primary btn-sm flex-grow-1" onclick="window.abrirModalRelatorioBarbeiro()">
                    <i class="bi bi-bar-chart-line"></i> Relatório
                </button>
            </div>
        `;

        if (agendaHoje.length === 0) {
            c.innerHTML = btnAcoesHTML + `<div class="empty-state"><i class="bi bi-calendar-check"></i><p>Nenhum agendamento para este dia</p></div>`;
        } else {
            agendaHoje.sort((a, b) => {
                const horaA = a.horarioInicio || a.time || "23:59";
                const horaB = b.horarioInicio || b.time || "23:59";
                return horaA.localeCompare(horaB);
            });

            let htmlLista = agendaHoje.map(bk => {
                const sv = window.mockServices.find(s => String(s.id) === String(bk.serviceId)) || { name: bk.servicoNome || "Serviço" };
                
                let criadoEm = "Não registrado";
                let horaCriacao = "";
                if(bk.createdAt) {
                    const dt = new Date(bk.createdAt);
                    horaCriacao = dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                    criadoEm = dt.toLocaleDateString('pt-BR') + ' às ' + horaCriacao;
                }

                let horarioAtendimento = bk.horarioInicio || bk.time || 'Avulso';
                if (bk.tipo === "Encaixe" && horaCriacao) {
                    horarioAtendimento = horaCriacao;
                }

                const nomeSeguro = bk.clientName ? String(bk.clientName).replace(/'/g, "\\'") : 'Não informado';
                const telefoneReal = bk.clientTelefone || bk.clientPhone; 
                const foneSeguro = telefoneReal ? String(telefoneReal).replace(/'/g, "\\'") : 'Não informado';
                const emailSeguro = bk.clientEmail ? String(bk.clientEmail).replace(/'/g, "\\'") : 'Não informado';

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
            
            c.innerHTML = btnAcoesHTML + htmlLista;
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
        const numeroLimpo = telefone.replace(/\D/g, ''); 
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
    
    const inputData = document.getElementById("filtro-data-agenda");
    const dataSelecionada = inputData ? inputData.value : new Date().toISOString().split("T")[0];
    
    if (!servico) return alert("Erro ao identificar o serviço selecionado.");

    const btn = document.querySelector("#modalEncaixe .btn-primary");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adicionando...';
    btn.disabled = true;

    try {
        const dataAgora = new Date();
        const novoAgendamento = {
            clientName: nome + " (Encaixe)",
            clientPhone: "Não informado", 
            clientEmail: "Não informado",
            serviceId: servico.id,
            servicoNome: servico.name,
            barbeiroId: window.appState.usuarioAtual.id,
            data: dataSelecionada,
            time: dataAgora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            price: servico.price,
            createdAt: dataAgora.toISOString(), 
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

// 5. RELATÓRIO INDIVIDUAL DO BARBEIRO
window.abrirModalRelatorioBarbeiro = () => {
    document.getElementById("resultado-relatorio-barbeiro").innerHTML = ""; 
    new bootstrap.Modal(document.getElementById("modalRelatorioBarbeiro")).show();
};

window.toggleFiltroPersonalizadoBarbeiro = () => {
    const val = document.getElementById("barbeiro-filtro-periodo").value;
    document.getElementById("barbeiro-bloco-datas-custom").style.display = (val === "personalizado") ? "flex" : "none";
};

window.gerarResultadoRelatorioBarbeiro = async () => {
    const btn = document.querySelector("#modalRelatorioBarbeiro .btn-primary");
    const textoOrig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Calculando...';
    btn.disabled = true;

    try {
        const periodo = document.getElementById("barbeiro-filtro-periodo").value;
        const dataInicioInput = document.getElementById("barbeiro-filtro-data-inicio").value;
        const dataFimInput = document.getElementById("barbeiro-filtro-data-fim").value;
        const agora = new Date();
        let dataInicio, dataFim = agora;

        if (periodo === "hoje") dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        else if (periodo === "semana") dataInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (periodo === "mes") dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        else if (periodo === "personalizado") {
            if(!dataInicioInput || !dataFimInput) {
                alert("Por favor, preencha as datas inicial e final.");
                btn.innerHTML = textoOrig; btn.disabled = false;
                return;
            }
            dataInicio = new Date(dataInicioInput + "T00:00:00");
            dataFim = new Date(dataFimInput + "T23:59:59");
        }

        const bid = window.appState.usuarioAtual.id;
        const snap = await window.getDocs(window.collection(window.db, "agendamentos"));
        const concluidos = [];
        
        snap.forEach(doc => {
            const d = doc.data();
            // Puxa apenas os agendamentos que já foram concluídos E que pertencem a este barbeiro
            if (d.completed && String(d.barbeiroId) === String(bid)) {
                const dataAtendimento = new Date(d.completedAt || d.createdAt);
                if (dataAtendimento >= dataInicio && dataAtendimento <= dataFim) {
                    concluidos.push(d);
                }
            }
        });

        let totalFaturado = 0;
        const pagamentos = { "PIX": 0, "Dinheiro": 0, "Cartão de Débito": 0, "Cartão de Crédito": 0 };
        
        concluidos.forEach(b => {
            totalFaturado += (Number(b.price) || 0);
            if (b.metodoPagamento) {
                if (pagamentos[b.metodoPagamento] === undefined) pagamentos[b.metodoPagamento] = 0;
                pagamentos[b.metodoPagamento] += (Number(b.price) || 0);
            }
        });

        const totalAtendimentos = concluidos.length;
        const ticketMedio = totalAtendimentos > 0 ? (totalFaturado / totalAtendimentos) : 0;
        
        const periodoTexto = periodo === "personalizado" 
            ? `${new Date(dataInicioInput).toLocaleDateString('pt-BR')} a ${new Date(dataFimInput).toLocaleDateString('pt-BR')}`
            : document.getElementById("barbeiro-filtro-periodo").options[document.getElementById("barbeiro-filtro-periodo").selectedIndex].text;

        const html = `
            <div style="background-color: #ffffff; padding: 15px; color: #202124; font-family: sans-serif; border: 1px solid var(--border); border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e8eaed; padding-bottom: 15px;">
                    <h3 style="margin: 0; color: #202124; font-size: 1.2rem;">✂ Meu Faturamento</h3>
                    <p style="margin: 5px 0 0; color: #5f6368; font-size: 0.85rem;">Período: <strong>${periodoTexto}</strong></p>
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
                </div>
            </div>
        `;
        document.getElementById("resultado-relatorio-barbeiro").innerHTML = html;

    } catch(e) {
        console.error("Erro ao gerar relatório:", e);
        alert("Erro ao buscar dados do relatório.");
    } finally {
        btn.innerHTML = textoOrig;
        btn.disabled = false;
    }
};