// === CASA DE KISAVITA - SCRIPT SIMPLIFICADO ===

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SUAS CHAVES (Já configuradas)
const firebaseConfig = {
  apiKey: "AIzaSyDISNKVoXJUM6gbISL0KscGwwdRWHvT30A",
  authDomain: "pizzaria-kisavita.firebaseapp.com",
  projectId: "pizzaria-kisavita",
  storageBucket: "pizzaria-kisavita.firebasestorage.app",
  messagingSenderId: "1039266109546",
  appId: "1:1039266109546:web:e5115137ee0a8060c3d213",
  measurementId: "G-L1XW9N5PBQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const produtosCollection = collection(db, "produtos");

// === DADOS ===
let produtos = []; 
let carrinho = JSON.parse(localStorage.getItem('db_carrinho')) || [];

// === CARRINHO ===
function salvarCarrinho() {
    localStorage.setItem('db_carrinho', JSON.stringify(carrinho));
    atualizarContador();
}

window.addCarrinho = (index) => {
    const item = produtos[index];
    if(!item) return;
    const existe = carrinho.find(x => x.id_firebase === item.id_firebase);
    if(existe) existe.quantidade++;
    else carrinho.push({...item, quantidade: 1});
    salvarCarrinho();
    showToast(`${item.nome} adicionado! 🍕`);
}

window.removeCarrinho = (idFirebase) => {
    carrinho = carrinho.filter(x => x.id_firebase !== idFirebase);
    salvarCarrinho();
    renderCarrinho(); 
}

window.alterarQtd = (idFirebase, delta) => {
    const item = carrinho.find(x => x.id_firebase === idFirebase);
    if(item) {
        item.quantidade += delta;
        if(item.quantidade <= 0) carrinho = carrinho.filter(x => x.id_firebase !== idFirebase);
        salvarCarrinho();
        renderCarrinho();
    }
}

// === FINALIZAR PEDIDO (SIMPLIFICADO E SEM ALERT) ===
window.finalizarPedidoSimples = () => {
    if(carrinho.length === 0) return showToast("Seu carrinho está vazio!", "warning");

    // Muda o texto do botão para dar feedback visual
    const btn = document.querySelector("#modalOverlayCarrinho .btn-primary");
    if(btn) {
        btn.innerText = "Finalizando...";
        btn.disabled = true;
    }

    // Simula um pequeno tempo de processamento
    setTimeout(() => {
        // Limpa carrinho
        carrinho = [];
        salvarCarrinho();
        renderCarrinho(); // Limpa a lista visual no modal
        
        // Fecha o modal do carrinho
        window.fecharCarrinho();

        // Mostra a notificação bonita (Toast) em vez do alert()
        showToast("Seu pedido está sendo finalizado! 🍕", "success");

        // Restaura o botão para o próximo pedido
        if(btn) {
            btn.innerText = "Finalizar Pedido";
            btn.disabled = false;
        }
    }, 1500);
}

// === VISUAL ===
async function carregarCardapio() {
    const container = document.getElementById("menuContainer");
    if(!container) return;
    try {
        const q = await getDocs(produtosCollection);
        produtos = [];
        q.forEach(doc => produtos.push({ id_firebase: doc.id, ...doc.data() }));
        renderizarCardapio();
    } catch (e) { console.error(e); }
}

function renderizarCardapio() {
    const container = document.getElementById("menuContainer");
    if(!container) return;
    container.innerHTML = "";
    const categorias = ["Pizzas Tradicionais", "Pizzas Especiais", "Bebidas", "Sobremesas"];
    categorias.forEach(cat => {
        const itens = produtos.filter(p => p.categoria === cat);
        if(itens.length > 0) {
            container.innerHTML += `<h2 class="categoria-titulo">${cat}</h2>`;
            const grid = document.createElement('div');
            grid.className = 'cardapio-grid';
            itens.forEach(p => {
                const idx = produtos.indexOf(p);
                grid.innerHTML += `
                    <div class="produto-card">
                        <div class="produto-imagem-placeholder"><img src="${p.imagem||'assets/logo.jpg'}" onerror="this.src='assets/logo.jpg'"></div>
                        <div class="produto-info">
                            <h3>${p.nome}</h3><p>${p.desc || ''}</p><div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</div>
                            <button class="btn-primary" onclick="addCarrinho(${idx})">Adicionar</button>
                        </div>
                    </div>`;
            });
            container.appendChild(grid);
        }
    });
}

function renderCarrinho() {
    const lista = document.getElementById("listaCarrinho");
    const totalEl = document.getElementById("totalCarrinho");
    if(!lista) return;
    lista.innerHTML = "";
    let total = 0;

    if(carrinho.length === 0) {
        lista.innerHTML = "<p style='text-align:center'>Carrinho vazio.</p>";
        totalEl.innerText = "Total: R$ 0.00";
        return;
    }

    carrinho.forEach(item => {
        total += item.preco * item.quantidade;
        lista.innerHTML += `
            <div class="carrinho-item">
                <div><strong>${item.nome}</strong><br><small>R$ ${item.preco.toFixed(2)} x ${item.quantidade}</small></div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <button class="btn-qty" onclick="alterarQtd('${item.id_firebase}', -1)">-</button>
                    <span>${item.quantidade}</span>
                    <button class="btn-qty" onclick="alterarQtd('${item.id_firebase}', 1)">+</button>
                    <button class="btn-remove" onclick="removeCarrinho('${item.id_firebase}')">&times;</button>
                </div>
            </div>`;
    });
    totalEl.innerText = `Total: R$ ${total.toFixed(2)}`;
}

// Helpers
function showToast(msg, tipo="success") {
    const t = document.getElementById("toast");
    if(!t) return;
    t.innerText = msg; 
    t.className = "show";
    
    // Define a cor com base no tipo
    if(tipo === "warning") {
        t.style.backgroundColor = "#ff9800"; // Laranja
    } else if (tipo === "success") {
        t.style.backgroundColor = "#388e3c"; // Verde (cor secundária da pizzaria)
    } else {
        t.style.backgroundColor = "#d32f2f"; // Vermelho padrão
    }
    
    setTimeout(() => t.className = t.className.replace("show", ""), 3000);
}

function atualizarContador() {
    const el = document.getElementById('contadorCarrinho');
    if(el) el.innerText = carrinho.reduce((acc, i) => acc + i.quantidade, 0);
}

// Init
document.addEventListener("DOMContentLoaded", () => {
    carregarCardapio();
    renderCarrinho();
    atualizarContador();
    window.abrirCarrinho = () => { document.getElementById('modalOverlayCarrinho').classList.add('active'); renderCarrinho(); }
    window.fecharCarrinho = () => { document.getElementById('modalOverlayCarrinho').classList.remove('active'); }
});