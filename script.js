// ============================================================
// CONFIGURAÇÃO DO FIREBASE (SEU BANCO DE DADOS)
// ============================================================
// Usamos links diretos (CDN) para funcionar no Vercel sem instalação
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Inicializa o Banco
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const produtosCollection = collection(db, "produtos"); // Cria a tabela 'produtos' automaticamente

// ============================================================
// DADOS DE BACKUP (SE A INTERNET FALHAR OU BANCO ESTIVER VAZIO)
// ============================================================
const cardapioInicial = [
    {
      
    }
];

// ============================================================
// FUNÇÕES DO BANCO DE DADOS (CR.U.D COM FIREBASE)
// ============================================================

// READ (LER)
async function getProdutos() {
    try {
        const querySnapshot = await getDocs(produtosCollection);
        let produtos = [];
        
        querySnapshot.forEach((doc) => {
            // O Firebase tem o ID separado dos dados. Aqui juntamos tudo.
            produtos.push({ id_firebase: doc.id, ...doc.data() });
        });

        // Se não tiver nada no banco online, retorna array vazio ou backup
        if (produtos.length === 0) return []; 
        
        return produtos;
    } catch (error) {
        console.error("Erro ao ler banco:", error);
        // Em caso de erro, não quebra o site, mostra lista vazia ou backup
        return cardapioInicial;
    }
}

// CREATE (CRIAR)
async function salvarProdutoNoBanco(produto) {
    try {
        await addDoc(produtosCollection, produto);
        showToast("Salvo na nuvem com sucesso!");
        // Espera 1s e recarrega para atualizar a lista
        setTimeout(() => location.reload(), 1000);
    } catch (e) {
        alert("Erro ao salvar no banco: " + e.message);
        console.error(e);
    }
}

// DELETE (EXCLUIR)
async function deletarProdutoDoBanco(idFirebase) {
    if(!idFirebase) return alert("Erro: Item sem ID.");
    
    try {
        await deleteDoc(doc(db, "produtos", idFirebase));
        showToast("Prato excluído!");
        setTimeout(() => location.reload(), 1000);
    } catch (e) {
        alert("Erro ao excluir: " + e.message);
    }
}

// UPDATE (EDITAR)
async function editarProdutoNoBanco(idFirebase, dadosAtualizados) {
    try {
        const produtoRef = doc(db, "produtos", idFirebase);
        await updateDoc(produtoRef, dadosAtualizados);
        showToast("Atualizado com sucesso!");
        setTimeout(() => location.reload(), 1000);
    } catch (e) {
        alert("Erro ao editar: " + e.message);
    }
}

// ============================================================
// VARIÁVEIS E HELPERS
// ============================================================
const listaCategorias = ["Entradas", "Massas", "Pizzas", "Pratos Principais", "Sobremesas", "Bebidas"];
let filtroAtivo = "Todos";
let idEdicaoFirebase = null; 
let idExclusaoFirebase = null;

function showToast(msg) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.innerText = msg;
        toast.className = "show";
        setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
    } else {
        alert(msg);
    }
}

function tratarImagem(img) {
    if (!img || img.trim() === "") return "assets/logo.jpg"; 
    return img;
}

// CARRINHO (Mantemos no LocalStorage do navegador pois é temporário)
const getCarrinho = () => JSON.parse(localStorage.getItem('db_carrinho')) ?? [];
const setCarrinho = (db) => localStorage.setItem('db_carrinho', JSON.stringify(db));


// ============================================================
// LÓGICA DE INICIALIZAÇÃO E RENDERIZAÇÃO
// ============================================================

async function inicializarSite() {
    // Busca os dados da nuvem
    const produtos = await getProdutos();
    
    // Verifica qual página está aberta
    const adminGrid = document.getElementById('adminGrid');
    const menuContainer = document.getElementById('menuContainer');
    
    if (adminGrid) renderAdmin(produtos);
    if (menuContainer) {
        renderFiltros();
        renderCardapioCategorizado(produtos);
    }
    updateContador();
}

// RENDER ADMIN
function renderAdmin(db) {
    const grid = document.getElementById('adminGrid');
    grid.innerHTML = '';
    
    if(db.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%">Nenhum prato cadastrado no banco.</p>';
        return;
    }
    
    db.forEach((p) => {
        // Truque para passar o objeto para o botão sem quebrar as aspas
        const pString = JSON.stringify(p).replace(/"/g, '&quot;');
        
        const div = document.createElement('div');
        div.className = 'produto-card';
        div.innerHTML = `
            <div class="produto-imagem-placeholder"><img src="${tratarImagem(p.imagem)}" onerror="this.src='assets/logo.jpg'"></div>
            <div class="produto-info">
                <small style="color:var(--primary-color); font-weight:bold; font-size:0.7rem;">${p.categoria || 'Geral'}</small>
                <h3>${p.nome}</h3>
                <div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</div>
                <div class="produto-actions">
                    <button class="btn-outline" onclick='prepararEdicao(${pString})'>Editar</button>
                    <button class="btn-danger" onclick="confirmarExclusao('${p.id_firebase}')">Excluir</button>
                </div>
            </div>`;
        grid.appendChild(div);
    });
}

// RENDER CLIENTE
function renderCardapioCategorizado(db) {
    const container = document.getElementById('menuContainer');
    container.innerHTML = '';
    
    if(db.length === 0) {
        container.innerHTML = '<p style="text-align:center;">Carregando cardápio ou vazio...</p>';
        return;
    }

    const categoriasParaMostrar = filtroAtivo === 'Todos' ? listaCategorias : [filtroAtivo];

    categoriasParaMostrar.forEach(categoria => {
        const produtosDaCategoria = db.filter(p => p.categoria === categoria);

        if(produtosDaCategoria.length > 0) {
            const titulo = document.createElement('h2');
            titulo.className = 'categoria-titulo';
            titulo.innerText = categoria;
            container.appendChild(titulo);

            const grid = document.createElement('section');
            grid.className = 'cardapio-grid';
            
            produtosDaCategoria.forEach(p => {
                const pString = JSON.stringify(p).replace(/"/g, '&quot;');
                
                const card = document.createElement('div');
                card.className = 'produto-card';
                card.innerHTML = `
                    <div class="produto-imagem-placeholder"><img src="${tratarImagem(p.imagem)}" onerror="this.src='assets/logo.jpg'"></div>
                    <div class="produto-info">
                        <h3>${p.nome}</h3>
                        <p>${p.descricao}</p>
                        <div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</div>
                        <div class="produto-actions">
                            <button class="btn-primary" style="width:100%" onclick='addCarrinho(${pString})'>Adicionar</button>
                        </div>
                    </div>`;
                grid.appendChild(card);
            });
            container.appendChild(grid);
        }
    });
}

function renderFiltros() {
    const container = document.getElementById('filtrosContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const btnTodos = document.createElement('button');
    btnTodos.innerText = "Todos";
    btnTodos.className = filtroAtivo === 'Todos' ? 'btn-filtro active' : 'btn-filtro';
    btnTodos.onclick = () => { filtroAtivo = 'Todos'; inicializarSite(); };
    container.appendChild(btnTodos);

    listaCategorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerText = cat;
        btn.className = filtroAtivo === cat ? 'btn-filtro active' : 'btn-filtro';
        btn.onclick = () => { filtroAtivo = cat; inicializarSite(); };
        container.appendChild(btn);
    });
}

// ============================================================
// EXPORTAR FUNÇÕES PARA O HTML (NECESSÁRIO POR CAUSA DO MODULE)
// ============================================================

window.abrirModalProduto = () => {
    document.getElementById('modalOverlayProduto').classList.add('active');
    document.getElementById('tituloModalProduto').innerText = 'Novo Prato';
    document.getElementById('formProduto').reset();
    document.getElementById('imagemBase64').value = "";
    document.getElementById('previewImagem').innerHTML = '<span>Nenhuma imagem selecionada</span>';
    idEdicaoFirebase = null;
};
window.fecharModalProduto = () => document.getElementById('modalOverlayProduto').classList.remove('active');

window.prepararEdicao = (produtoObj) => {
    document.getElementById('nomeProduto').value = produtoObj.nome;
    document.getElementById('descricaoProduto').value = produtoObj.descricao;
    document.getElementById('precoProduto').value = produtoObj.preco;
    document.getElementById('categoriaProduto').value = produtoObj.categoria;
    document.getElementById('imagemBase64').value = produtoObj.imagem;
    
    if(produtoObj.imagem) {
        document.getElementById('previewImagem').innerHTML = `<img src="${produtoObj.imagem}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
    }

    idEdicaoFirebase = produtoObj.id_firebase; 
    document.getElementById('tituloModalProduto').innerText = 'Editar Prato';
    document.getElementById('modalOverlayProduto').classList.add('active');
};

window.confirmarExclusao = (id) => {
    idExclusaoFirebase = id;
    document.getElementById('modalConfirmacao').classList.add('active');
};
window.fecharConfirmacao = () => document.getElementById('modalConfirmacao').classList.remove('active');
window.confirmarExclusaoReal = () => {
    if (idExclusaoFirebase) {
        deletarProdutoDoBanco(idExclusaoFirebase);
        fecharConfirmacao();
    }
};

window.logout = () => {
    localStorage.removeItem('admin_logado');
    window.location.href = 'login.html';
};

// FUNÇÕES DE CARRINHO
window.addCarrinho = (item) => {
    let carrinho = getCarrinho();
    const existe = carrinho.find(x => x.nome === item.nome);
    if(existe) existe.quantidade++;
    else carrinho.push({...item, quantidade: 1});
    setCarrinho(carrinho);
    updateContador();
    showToast(`${item.nome} adicionado!`);
};
window.abrirCarrinho = () => {
    document.getElementById('modalOverlayCarrinho').classList.add('active');
    renderModalCarrinho();
};
window.fecharCarrinho = () => document.getElementById('modalOverlayCarrinho').classList.remove('active');
window.finalizarPedido = () => {
    if(getCarrinho().length === 0) return showToast('Carrinho vazio!');
    showToast('Pedido Enviado!');
    setCarrinho([]);
    fecharCarrinho();
    updateContador();
};
window.alterarQtd = (i, q) => {
    let c = getCarrinho();
    c[i].quantidade += q;
    if(c[i].quantidade <= 0) c.splice(i, 1);
    setCarrinho(c);
    renderModalCarrinho();
    updateContador();
};
window.removeCarrinho = (i) => {
    let c = getCarrinho();
    c.splice(i, 1);
    setCarrinho(c);
    renderModalCarrinho();
    updateContador();
};

function renderModalCarrinho() {
    const lista = document.getElementById('listaCarrinho');
    const totalEl = document.getElementById('totalCarrinho');
    const carrinho = getCarrinho();
    lista.innerHTML = '';
    let total = 0;
    if(carrinho.length === 0) lista.innerHTML = '<p>Carrinho vazio.</p>';

    carrinho.forEach((item, i) => {
        total += item.preco * item.quantidade;
        lista.innerHTML += `
            <div class="carrinho-item">
                <div><strong>${item.nome}</strong><br><small>${item.quantidade}x R$ ${parseFloat(item.preco).toFixed(2)}</small></div>
                <div>
                    <button onclick="alterarQtd(${i}, -1)">-</button>
                    <button onclick="alterarQtd(${i}, 1)">+</button>
                    <button class="btn-danger" style="margin-left:5px" onclick="removeCarrinho(${i})">X</button>
                </div>
            </div>`;
    });
    totalEl.innerText = `Total: R$ ${total.toFixed(2)}`;
}
function updateContador() {
    const el = document.getElementById('contadorCarrinho');
    if(el) el.innerText = getCarrinho().reduce((acc, i) => acc + i.quantidade, 0);
}

// ============================================================
// EVENT LISTENERS (INÍCIO)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarSite(); 

    // Login Simples
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            // Senha fixa simples
            if (document.getElementById('usuario').value === 'admin' && 
                document.getElementById('senha').value === 'kisavita2025') {
                localStorage.setItem('admin_logado', 'true');
                window.location.href = 'admin.html';
            } else {
                document.getElementById('msgErro').style.display = 'block';
            }
        });
    }

    // Formulário de Cadastro/Edição
    const form = document.getElementById('formProduto');
    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const produto = {
                nome: document.getElementById('nomeProduto').value,
                descricao: document.getElementById('descricaoProduto').value,
                preco: parseFloat(document.getElementById('precoProduto').value),
                categoria: document.getElementById('categoriaProduto').value,
                imagem: document.getElementById('imagemBase64').value
            };

            if (idEdicaoFirebase) {
                editarProdutoNoBanco(idEdicaoFirebase, produto);
            } else {
                salvarProdutoNoBanco(produto);
            }
            window.fecharModalProduto();
        });
    }

    // Upload de Imagem
    const inputArquivo = document.getElementById('arquivoImagem');
    if (inputArquivo) {
        inputArquivo.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = function() {
                    document.getElementById('imagemBase64').value = reader.result;
                    document.getElementById('previewImagem').innerHTML = `<img src="${reader.result}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
                }
                reader.readAsDataURL(file);
            }
        });
    }
});