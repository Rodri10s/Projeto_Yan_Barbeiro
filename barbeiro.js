/* ============================================================
   MÓDULO BARBEIRO — LEITURA E CONCLUSÃO DE SERVIÇOS
   ============================================================ */
window.renderizarAgendaBarbeiro = () => {
    const bid = window.appState.usuarioAtual?.id;
    // TODO Membro da Equipe: Substituir este filter() por um getDocs() na collection de agendamentos filtrando pelo ID
    const hoje = window.mockBookings.filter(b => b.barbeiroId === bid);
    
    document.getElementById("nome-barbeiro-header").textContent = window.appState.usuarioAtual?.name || "Barbeiro";
    document.getElementById("data-barbeiro-header").textContent = new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"});
    document.getElementById("total-atendimentos").textContent = hoje.length;
    document.getElementById("total-faturacao").textContent = "R$ " + hoje.reduce((s,b) => s+b.price, 0);
    
    const c = document.getElementById("lista-agenda-barbeiro");
    if (hoje.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-check"></i><p>Nenhum agendamento para hoje</p></div>`;
    } else {
        c.innerHTML = hoje.map(bk => {
            const sv = window.mockServices.find(s => s.id === bk.serviceId);
            return `<div class="agenda-item">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div style="min-width: 150px;">
                        <div class="agenda-item-cliente">👤 ${bk.clientName}</div>
                        <div class="agenda-item-servico"><i class="bi bi-scissors"></i> ${sv?.name||"Serviço"}</div>
                        <div class="agenda-item-hora"><i class="bi bi-clock"></i> ${bk.time}</div>
                    </div>
                    <button class="btn btn-success btn-sm flex-shrink-0" style="padding: 0.45rem 0.8rem; font-size: 0.85rem;" onclick="window.abrirModalPagamento(${bk.id})">
                        <i class="bi bi-check2-all"></i> Concluir
                    </button>
                </div>
            </div>`;
        }).join("");
    }
};

window.abrirModalPagamento = (id) => {
    window.appState.editingId = id; 
    new bootstrap.Modal(document.getElementById("modalPagamento")).show();
};

window.confirmarPagamento = () => {
    const forma = document.getElementById("forma-pagamento").value;
    const index = window.mockBookings.findIndex(b => b.id === window.appState.editingId);
    if (index > -1) {
        const item = window.mockBookings[index];
        window.mockCompletedBookings.push({ ...item, completed: true, completedAt: new Date().toISOString() });
        window.mockBookings.splice(index, 1);
    }
    
    bootstrap.Modal.getInstance(document.getElementById("modalPagamento")).hide();
    window.renderizarAgendaBarbeiro(); 
    if(window.renderizarAdminFinanceiro) window.renderizarAdminFinanceiro();
    alert(`✅ Atendimento concluído com sucesso!\nForma de pagamento: ${forma}`);
};