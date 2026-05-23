/* ============================================================
   CORE — CONFIGURAÇÃO FIREBASE E ESTADO GLOBAL
   ============================================================ */
// Nota: Usando links CDN diretamente para funcionar direto no navegador
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDe4OT6kL9m_tCGHtqpdgTnbl8tK_jlt6M",
  authDomain: "projeto-yan-barbeiro.firebaseapp.com",
  projectId: "projeto-yan-barbeiro",
  storageBucket: "projeto-yan-barbeiro.firebasestorage.app",
  messagingSenderId: "835967761157",
  appId: "1:835967761157:web:a02aac9bae48930418556c",
  measurementId: "G-D7SD6M9GG6"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Libera o banco de dados para os outros 3 arquivos da equipe usarem
window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.updateDoc = updateDoc;
window.doc = doc;
window.deleteDoc = deleteDoc;

/* ---- ESTADO GLOBAL E MOCKS (Até o grupo plugar o Firestore) ---- */
window.appState = {
    usuarioAtual: null,
    currentStep: 1,
    clienteAtual: { nome:null, telefone:null, email:null },
    agendamento:  { servicoId:null, barbeiroId:null, horario:null, servicoNome:null, barbeiroNome:null, servico:null, barbeiro:null },
    editingId: null
};

window.mockBarbers = [
    { id:1, name:"Yan", password:"123", img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80", tags:"Corte, Barba", escalaInicio:"09:00", escalaFim:"18:00" }
];

window.mockServices = [
    { id:1, name:"Contorno (Pezinho)",             price:10, duration:15, img:"https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=200&q=80" },
    { id:2, name:"Sobrancelha",                    price:10, duration:10, img:"https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?auto=format&fit=crop&w=200&q=80" },
    { id:3, name:"Barba",                          price:25, duration:30, img:"https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=200&q=80" },
    { id:4, name:"Corte Social (Máq/Tesoura)",     price:25, duration:30, img:"https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=200&q=80" },
    { id:5, name:"Corte Só na Tesoura",            price:30, duration:30, img:"https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=200&q=80" },
    { id:6, name:"Corte Degradê",                  price:30, duration:30, img:"https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=200&q=80" },
    { id:7, name:"Corte + Barba + Sobrancelha",    price:50, duration:70, img:"https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=200&q=80" }
];

window.mockBookings = [];
window.mockCompletedBookings = [];
window.mockAddresses = JSON.parse(localStorage.getItem("yanBarbeiro_enderecos") || "[]");

window.salvarEnderecosStorage = () => {
    localStorage.setItem("yanBarbeiro_enderecos", JSON.stringify(window.mockAddresses));
};

window.getEnderecoAtivo = () => window.mockAddresses.length ? window.mockAddresses[0] : null;

window.formatarMoeda = (value) => {
    // Usando pt-BR e BRL, o JavaScript formata perfeitamente como "R$ 10,00"
    return new Intl.NumberFormat("pt-BR", { 
        style: "currency", 
        currency: "BRL" 
    }).format(value);
};

/* ---- NAVEGAÇÃO E AUTENTICAÇÃO ---- */
window.mudarTela = (idTela) => {
    document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
    const sec = document.getElementById(idTela);
    if (sec) sec.classList.add("active");

    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    const navBtn = Array.from(document.querySelectorAll(".nav-btn")).find(b => b.getAttribute("onclick")?.includes(idTela));
    if (navBtn) navBtn.classList.add("active");

    // Aciona as funções de cada módulo, se já estiverem carregadas
    
    // Rota do Cliente
    if (idTela === "view-cliente") { 
        if (window.renderizarServicos) window.renderizarServicos(); 
        if (window.resetarWizard) window.resetarWizard(); 
        if (window.renderizarEnderecos) window.renderizarEnderecos(); // Puxa o endereço para o resumo
    }
    
    // Rota do Barbeiro
    if (idTela === "view-barbeiro") { 
        if (window.renderizarAgendaBarbeiro) window.renderizarAgendaBarbeiro(); 
    }
    
    // Rota do Administrador
    if (idTela === "view-admin") { 
        if(window.criarPainelAdminExtras) window.criarPainelAdminExtras(); 
        if(window.renderizarAdminFinanceiro) window.renderizarAdminFinanceiro(); 
        if(window.renderizarEnderecos) window.renderizarEnderecos(); 
        if(window.renderizarEquipa) window.renderizarEquipa(); 
        if(window.renderizarServicosAdmin) window.renderizarServicosAdmin(); 
        if(window.popularAnosRelatorio) window.popularAnosRelatorio(); 
    }
};

window.fazerLogin = (tipo) => {
    if (tipo === "admin") {
        const pw = document.getElementById("admin-password").value;
        if (pw === "password123") {
            window.appState.usuarioAtual = { tipo:"admin", name:"Administrador" };
            window.mudarTela("view-admin");
        } else { alert("Palavra-passe incorreta!"); }
    } else if (tipo === "barbeiro") {
        const username = document.getElementById("barbeiro-username").value.trim();
        const password = document.getElementById("barbeiro-password").value;
        const barbeiro = window.mockBarbers.find(b => b.name.toLowerCase() === username.toLowerCase() && b.password === password);
        if (barbeiro) {
            window.appState.usuarioAtual = { tipo:"barbeiro", name:barbeiro.name, id:barbeiro.id };
            window.mudarTela("view-barbeiro");
        } else { alert("Nome de utilizador ou palavra-passe incorretos!"); }
    }
};

window.fazerLogout = () => {
    window.appState.usuarioAtual = null;
    window.appState.agendamento = { servicoId:null, barbeiroId:null, horario:null, servicoNome:null, barbeiroNome:null, servico:null, barbeiro:null };
    if(window.resetarWizard) window.resetarWizard();
    window.mudarTela("view-cliente-form");
};

window.converterBase64 = (file) => new Promise((res,rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
});

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-login-barbeiro").addEventListener("click", () => window.fazerLogin("barbeiro"));
    document.getElementById("btn-voltar-barbeiro").addEventListener("click", () => window.mudarTela("view-cliente-form"));
    document.getElementById("btn-login-admin").addEventListener("click", () => window.fazerLogin("admin"));
    document.getElementById("btn-voltar-admin").addEventListener("click", () => window.mudarTela("view-cliente-form"));
    
    window.mudarTela("view-cliente-form");
    console.log("🔥 Core carregado: Firebase conectado e Módulos separados!");
});