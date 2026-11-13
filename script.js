// =========================================================================
// CONFIGURAÇÃO DO SUPABASE
// =========================================================================
const SUPABASE_URL = 'https://kwrnstjjbrznpufoejmr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_a5Q3LZRPcls70JwMDRjy0g_BNAHfoY4';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let registros = [];
let slideIndex = 0;

// Verifica se já existe uma sessão ativa ao abrir a página
async function verificarSessao() {
    const { data: { session } } = await _supabase.auth.getSession();
    const modalLogin = document.getElementById('modalLogin');
    
    if (session) {
        // Se estiver logado: esconde o login e carrega os dados do banco
        modalLogin.classList.add('hidden');
        await iniciarSistema(); 
    } else {
        // Se não estiver logado: garante que o pop-up de login fica visível
        modalLogin.classList.remove('hidden');
    }
}

// Processa a tentativa de login
async function realizarLogin(event) {
    event.preventDefault(); // Evita que a página recarregue
    
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    const btnLogar = document.getElementById('btnLogar');
    const divErro = document.getElementById('loginErro');

    // Feedback visual de carregamento
    btnLogar.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Autenticando...';
    btnLogar.disabled = true;
    divErro.classList.add('hidden');

    // Chamada ao Supabase
    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        // Mostra a mensagem de erro e restaura o botão
        divErro.innerText = "Falha no login: " + (error.message === "Invalid login credentials" ? "Credenciais inválidas." : error.message);
        divErro.classList.remove('hidden');
        btnLogar.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar no Sistema';
        btnLogar.disabled = false;
    } else {
        // Sucesso: Limpa o formulário, esconde o modal e carrega o sistema
        document.getElementById('formLogin').reset();
        document.getElementById('modalLogin').classList.add('hidden');
        
        btnLogar.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar no Sistema';
        btnLogar.disabled = false;
        
        await iniciarSistema();
    }
}

async function realizarLogout() {
    const { error } = await _supabase.auth.signOut();
    if (error) {
        alert("Erro ao sair: " + error.message);
    } else {
        registros = [];
        renderizarTabelas(); // Limpa os dados da tela por segurança
    }
}

// Monitoriza alterações na conta (ex: sessão expirou ou fez logout)
_supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
        document.getElementById('modalLogin').classList.remove('hidden');
    }
});

async function iniciarSistema() {
    await carregarDadosSupabase();
}

function iniciarCarrossel() {
    const slides = document.querySelectorAll('.carousel-img');
    if (slides.length === 0) return;
    
    slides.forEach(slide => {
        slide.classList.remove('opacity-100');
        slide.classList.add('opacity-0');
    });
    
    slideIndex++;
    if (slideIndex > slides.length) { slideIndex = 1 }
    
    slides[slideIndex - 1].classList.remove('opacity-0');
    slides[slideIndex - 1].classList.add('opacity-100');
    
    setTimeout(iniciarCarrossel, 5000);
}

async function carregarDadosSupabase() {
    const { data, error } = await _supabase
        .from('frota')
        .select('*')
        .order('vencimento', { ascending: true });

    if (error) {
        console.error("Erro ao carregar dados do Supabase:", error.message);
        alert("Erro ao conectar com o banco de dados.");
        return;
    }

    if (data) {
        registros = data;
        renderizarTabelas();
    }
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
}

function calcularDiasRestantes(dataVencimentoStr) {
    if (!dataVencimentoStr) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimentoStr + 'T00:00:00');
    const diferencaTempo = vencimento - hoje;
    return Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));
}

function renderizarTabelas() {
    const termoPesquisa = document.getElementById('inputPesquisa').value.toLowerCase();
    const filtroSituacao = document.getElementById('filtroSituacao').value;
    const ordenacao = document.getElementById('ordenacao').value;

    let total = registros.length;
    let ok = 0;
    let preliminar = 0;
    let gru = 0;
    let terceirosCount = 0;

    const processados = registros.map((reg, index) => {
        const dias = calcularDiasRestantes(reg.vencimento);
        
        // Mudança automática da situação para VENCIDO se o prazo já expirou
        let situacaoEfetiva = reg.situacao;
        if (dias !== null && dias < 0) {
            situacaoEfetiva = 'VENCIDO';
        }

        if (situacaoEfetiva === 'OK') ok++;
        if (situacaoEfetiva && situacaoEfetiva.includes('PRELIMINAR')) preliminar++;
        if (situacaoEfetiva && situacaoEfetiva.includes('GRU')) gru++;
        if (reg.categoria === 'Veículos de Terceiros') terceirosCount++;

        return { ...reg, situacao: situacaoEfetiva, indexOriginal: index, diasRestantes: dias };
    });

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statOk').innerText = ok;
    document.getElementById('statPreliminar').innerText = preliminar;
    document.getElementById('statGru').innerText = gru;
    document.getElementById('statTerceiros').innerText = terceirosCount;

    let filtrados = processados.filter(item => {
        const matchTexto = (item.placa || '').toLowerCase().includes(termoPesquisa) ||
                           (item.renavam || '').toLowerCase().includes(termoPesquisa);
        if (!matchTexto) return false;
        if (filtroSituacao !== 'todos' && item.situacao !== filtroSituacao) return false;
        return true;
    });

    filtrados.sort((a, b) => {
        if (ordenacao === 'vencimento') {
            return (a.vencimento || '').localeCompare(b.vencimento || '');
        } else if (ordenacao === 'placa') {
            return (a.placa || '').localeCompare(b.placa || '');
        }
        return 0;
    });

    const listaFrota = filtrados.filter(i => i.categoria === 'Frota Principal');
    const listaTerceiros = filtrados.filter(i => i.categoria === 'Veículos de Terceiros');

    document.getElementById('contadorFrota').innerText = `${listaFrota.length} veículo(s)`;
    document.getElementById('contadorTerceiros').innerText = `${listaTerceiros.length} veículo(s)`;

    renderizarLinhasTabela('tabelaFrotaCorpo', 'estadoVazioFrota', listaFrota);
    renderizarLinhasTabela('tabelaTerceirosCorpo', 'estadoVazioTerceiros', listaTerceiros);
}

function renderizarLinhasTabela(tbodyId, vazioId, itens) {
    const tbody = document.getElementById(tbodyId);
    const vazio = document.getElementById(vazioId);
    tbody.innerHTML = '';

    if (itens.length === 0) {
        vazio.classList.remove('hidden');
        return;
    } else {
        vazio.classList.add('hidden');
    }

    itens.forEach(item => {
        const tr = document.createElement('tr');
        
        // Alerta visual de vencimento: 7 dias (uma semana) ou já vencido (< 0)
        const isAlertaVermelho = item.diasRestantes !== null && item.diasRestantes <= 7;
        
        tr.className = isAlertaVermelho 
            ? "bg-red-100 hover:bg-red-200 transition border-b border-red-200" 
            : "hover:bg-slate-50/80 transition border-b border-slate-100";

        let badgeDiasHtml = '-';
        if (item.diasRestantes !== null) {
            let corDias = "bg-emerald-50 text-emerald-800 border-emerald-200";
            let textoDias = `${item.diasRestantes} dia(s)`;
            
            if (item.diasRestantes < 0) {
                corDias = "bg-rose-100 text-rose-900 border-rose-300 font-bold";
                textoDias = `Vencido há ${Math.abs(item.diasRestantes)}d`;
            } else if (item.diasRestantes <= 7) {
                corDias = "bg-red-200 text-red-900 border-red-300 font-semibold";
            } else if (item.diasRestantes <= 30) {
                corDias = "bg-amber-50 text-amber-800 border-amber-200";
            }
            badgeDiasHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${corDias}">${textoDias}</span>`;
        }

        let badgeSituacaoHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">OK</span>`;
        if (item.situacao === 'CERTIFICADO PRELIMINAR DE ENSAIO') {
            badgeSituacaoHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">CERTIFICADO PRELIMINAR</span>`;
        } else if (item.situacao === 'GRU EMITIDA') {
            badgeSituacaoHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">GRU EMITIDA</span>`;
        } else if (item.situacao === 'VENCIDO') {
            badgeSituacaoHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 uppercase">VENCIDO</span>`;
        }

        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold ${isAlertaVermelho ? 'text-red-900' : 'text-slate-900'}">${item.placa || ''}</td>
            <td class="py-3 px-4 ${isAlertaVermelho ? 'text-red-800' : 'text-slate-600'} col-renavam">${item.renavam || ''}</td>
            <td class="py-3 px-4 ${isAlertaVermelho ? 'text-red-800' : 'text-slate-600'}">${formatarData(item.vencimento)}</td>
            <td class="py-3 px-4">${badgeDiasHtml}</td>
            <td class="py-3 px-4 col-situacao">${badgeSituacaoHtml}</td>
            <td class="py-3 px-4 text-right no-print space-x-1">
                <button onclick="abrirModalEditar(${item.indexOriginal})" class="p-1 ${isAlertaVermelho ? 'text-red-700 hover:text-red-900' : 'text-slate-400 hover:text-blue-600'} transition" title="Editar Veículo">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                </button>
                <button onclick="excluirRegistro(${item.indexOriginal})" class="p-1 ${isAlertaVermelho ? 'text-red-700 hover:text-red-900' : 'text-slate-400 hover:text-rose-600'} transition" title="Excluir Veículo">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalNovo() {
    document.getElementById('modalTitulo').innerText = 'Novo Veículo';
    document.getElementById('regId').value = '';
    document.getElementById('regPlaca').value = '';
    document.getElementById('regRenavam').value = '';
    document.getElementById('regVencimento').value = '';
    document.getElementById('regCategoria').value = 'Frota Principal';
    document.getElementById('regSituacao').value = 'OK';
    document.getElementById('modalRegistro').classList.remove('hidden');
}

function abrirModalEditar(index) {
    const reg = registros[index];
    if (!reg) return;
    document.getElementById('modalTitulo').innerText = 'Editar Veículo';
    document.getElementById('regId').value = reg.id;
    document.getElementById('regPlaca').value = reg.placa || '';
    document.getElementById('regRenavam').value = reg.renavam || '';
    document.getElementById('regVencimento').value = reg.vencimento || '';
    document.getElementById('regCategoria').value = reg.categoria || 'Frota Principal';
    document.getElementById('regSituacao').value = reg.situacao || 'OK';
    document.getElementById('modalRegistro').classList.remove('hidden');
}

function fecharModal() {
    document.getElementById('modalRegistro').classList.add('hidden');
}

async function salvarRegistro(event) {
    event.preventDefault();
    const id = document.getElementById('regId').value;
    const novoDado = {
        placa: document.getElementById('regPlaca').value.trim().toUpperCase(),
        renavam: document.getElementById('regRenavam').value.trim(),
        vencimento: document.getElementById('regVencimento').value,
        categoria: document.getElementById('regCategoria').value,
        situacao: document.getElementById('regSituacao').value
    };

    const regAtual = registros.find(r => String(r.id) === String(id));
    if (id === '' || (regAtual && regAtual.vencimento !== novoDado.vencimento)) {
        novoDado.alerta_enviado = false;
    }

    if (id === '') {
        const { error } = await _supabase.from('frota').insert([novoDado]);
        if (error) {
            alert("Erro ao salvar veículo: " + error.message);
            return;
        }
    } else {
        const { error } = await _supabase.from('frota').update(novoDado).eq('id', id);
        if (error) {
            alert("Erro ao atualizar veículo: " + error.message);
            return;
        }
    }

    fecharModal();
    await carregarDadosSupabase();
    alert("Veículo salvo e sincronizado com sucesso!");
}

async function excluirRegistro(index) {
    const reg = registros[index];
    if (!reg || !reg.id) return;

    if (confirm(`Deseja realmente excluir o veículo de placa ${reg.placa}?`)) {
        const { error } = await _supabase.from('frota').delete().eq('id', reg.id);
        
        if (error) {
            alert("Erro ao excluir veículo: " + error.message);
            return;
        }

        await carregarDadosSupabase();
        alert("Veículo excluído com sucesso!");
    }
}

function exportarImpressaoOuPDF() {
    window.print();
}

function exportarExcel() {
    const dadosExcel = registros.map(r => ({
        "placa": r.placa,
        "renavam": r.renavam,
        "vencimento": r.vencimento,
        "situacao": r.situacao,
        "categoria": r.categoria
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tacografos");
    XLSX.writeFile(workbook, "Controle_Tacografos_Frota.xlsx");
}

// Aguarda o HTML ser completamente carregado
document.addEventListener('DOMContentLoaded', async () => {
    iniciarCarrossel(); // O carrossel de fundo pode rodar
    
    // Verifica a autenticação ANTES de carregar a tabela
    await verificarSessao();
});