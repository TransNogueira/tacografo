// script.js - Lógica e Conexão Supabase do Módulo Selo Verde (Completo com Edição por Modal)

// =========================================================================
// CONFIGURAÇÃO SUPABASE
// =========================================================================
const SUPABASE_URL = 'https://kwrnstjjbrznpufoejmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cm5zdGpqYnJ6bnB1Zm9lam1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTQ3MDAsImV4cCI6MjEwODg3MDcwMH0.FXHi54k7cx5dPyQYBCHg6pz2uKp_o6mPuTxpBCY4Ero';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let vehicles = [];

// =========================================================================
// UTILITÁRIOS DE DATA
// =========================================================================
const today = new Date(); 
today.setHours(0,0,0,0);

const isoToday = () => { 
    let d = new Date(); 
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
};

const fmt = d => {
    if (!d || d === 'NAO AFERIDO') return '—';
    let parsed = new Date(d + 'T12:00:00');
    return isNaN(parsed) ? '—' : parsed.toLocaleDateString('pt-BR');
};

function getStatus(v) { 
    if (!v.validade || v.validade === 'NAO AFERIDO') return 'pending'; 
    let parsed = new Date(v.validade + 'T00:00:00');
    if (isNaN(parsed)) return 'pending'; 
    return parsed < today ? 'expired' : 'valid';
}

// =========================================================================
// INICIALIZAÇÃO
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    iniciarCarrossel();
    carregarDados();
    
    ['search', 'statusFilter', 'brandFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(id === 'search' ? 'input' : 'change', render);
        }
    });

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportarCSV);
    }
});

// Carregar Dados
async function carregarDados() {
    const { data, error } = await _supabase
        .from('selo_verde')
        .select('*')
        .order('placa', { ascending: true });

    if (error) {
        console.error("Erro Supabase:", error);
        return;
    }
    if (data) {
        vehicles = data;
        render();
    }
}

// Salvar Edição Rápida (Inline Data)
async function salvarEdicaoInline(placa, novaValidade, novaAtualizacao) {
    const { error } = await _supabase
        .from('selo_verde')
        .update({ validade: novaValidade, atualizacao: novaAtualizacao })
        .eq('placa', placa);

    if (error) alert("Erro ao sincronizar com banco de dados.");
}

// Renderizar Interface
function render() {
    let counts = { valid: 0, pending: 0, expired: 0 };
    vehicles.forEach(v => counts[getStatus(v)]++);
    
    let total = vehicles.length;
    let pct = n => total ? Math.round((n / total) * 100) : 0;
    
    // Cards KPI
    const elTotal = document.getElementById('total');
    if (elTotal) elTotal.textContent = total;
    
    const elApproved = document.getElementById('approved');
    if (elApproved) elApproved.textContent = counts.valid;
    
    const elPending = document.getElementById('pending');
    if (elPending) elPending.textContent = counts.pending;
    
    const elExpired = document.getElementById('expired');
    if (elExpired) elExpired.textContent = counts.expired;
    
    const elApprovedNote = document.getElementById('approvedNote');
    if (elApprovedNote) elApprovedNote.textContent = pct(counts.valid) + '% da frota';
    
    // Gráfico de Pizza
    let green = '#059669', yellow = '#fbbf24', red = '#f43f5e';
    const piePct = document.getElementById('piePct');
    if (piePct) piePct.textContent = pct(counts.valid) + '%';
    
    const pie = document.getElementById('pie');
    if (pie) {
        pie.style.background = `conic-gradient(${green} 0 ${pct(counts.valid)}%, ${yellow} ${pct(counts.valid)}% ${pct(counts.valid)+pct(counts.pending)}%, ${red} ${pct(counts.valid)+pct(counts.pending)}% 100%)`;
    }
    
    const legApproved = document.getElementById('legApproved');
    if (legApproved) legApproved.textContent = counts.valid;
    
    const legPending = document.getElementById('legPending');
    if (legPending) legPending.textContent = counts.pending;
    
    const legExpired = document.getElementById('legExpired');
    if (legExpired) legExpired.textContent = counts.expired;
    
    [['Approved', counts.valid], ['Pending', counts.pending], ['Expired', counts.expired]].forEach(([n, c]) => {
        let bar = document.getElementById('bar'+n);
        let barLabel = document.getElementById('bar'+n+'Label');
        if (bar) bar.style.width = pct(c) + '%';
        if (barLabel) barLabel.textContent = pct(c) + '%';
    });

    // Filtros
    let searchEl = document.getElementById('search');
    let statusFilterEl = document.getElementById('statusFilter');
    let brandFilterEl = document.getElementById('brandFilter');

    let q = searchEl ? searchEl.value.toLowerCase() : '';
    let sf = statusFilterEl ? statusFilterEl.value : 'all';
    let bf = brandFilterEl ? brandFilterEl.value : 'all';

    let rows = vehicles.map((v, i) => ({ v, i })).filter(({ v }) => 
        (!q || `${v.placa} ${v.marca} ${v.modelo}`.toLowerCase().includes(q)) &&
        (sf === 'all' || getStatus(v) === sf) &&
        (bf === 'all' || (v.marca && v.marca.toUpperCase() === bf.toUpperCase()))
    );

    // Tabela
    let tbody = document.getElementById('vehicleRows');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    rows.forEach(({ v, i }) => {
        let s = getStatus(v);
        let badge = '';
        
        if(s === 'valid') badge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">DENTRO DA VALIDADE</span>';
        else if(s === 'pending') badge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">NÃO AFERIDO</span>';
        else badge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">VENCIDO</span>';

        let validadeInput = (v.validade && v.validade !== 'NAO AFERIDO') ? v.validade : '';

        let tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
        tr.innerHTML = `
            <td class="py-3 px-5 font-bold text-slate-900">${v.placa || ''}</td>
            <td class="py-3 px-5 text-slate-600">${v.marca || '-'}</td>
            <td class="py-3 px-5 text-slate-600">${v.modelo || '-'}</td>
            <td class="py-3 px-5">
                <input class="border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-40 bg-white transition shadow-sm text-slate-700" type="date" value="${validadeInput}" data-index="${i}">
            </td>
            <td class="py-3 px-5">${badge}</td>
            <td class="py-3 px-5 text-slate-500">${fmt(v.atualizacao)}</td>
            <td class="py-3 px-4 text-right relative no-print">
                <!-- Botão Três Pontos -->
                <button onclick="toggleMenuSelo('${v.placa}')" class="p-2 text-slate-400 hover:text-slate-700 transition" title="Opções">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
                
                <!-- Menu Flutuante Oculto -->
                <div id="menu-selo-${v.placa}" class="menu-acoes-dropdown hidden absolute right-8 top-8 w-32 bg-white rounded-md shadow-lg border border-slate-200 z-50 overflow-hidden text-left">
                    <button onclick="abrirModalEditar('${v.placa}')" class="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
                        <i class="fa-solid fa-pen-to-square text-blue-600"></i> Editar
                    </button>
                    <button onclick="excluirVeiculoSelo('${v.placa}')" class="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2">
                        <i class="fa-solid fa-trash-can"></i> Excluir
                    </button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });

    const emptyState = document.getElementById('empty');
    if(emptyState) {
        if(rows.length === 0) emptyState.classList.remove('hidden');
        else emptyState.classList.add('hidden');
    }
    
    tbody.querySelectorAll('input[type="date"]').forEach(inp => {
        inp.addEventListener('change', async e => {
            let i = +e.target.dataset.index;
            let novaData = e.target.value;
            
            let validadeParaBanco = novaData ? novaData : 'NAO AFERIDO';
            let dataAtualizacao = novaData ? isoToday() : '';
            
            vehicles[i].validade = validadeParaBanco;
            vehicles[i].atualizacao = dataAtualizacao;
            render(); 
            await salvarEdicaoInline(vehicles[i].placa, validadeParaBanco, dataAtualizacao);
        });
    });
}

// =========================================================================
// MODAL DE NOVO VEÍCULO
// =========================================================================
function abrirModalNovo() {
    document.getElementById('regPlaca').value = '';
    document.getElementById('regMarca').value = '';
    document.getElementById('regModelo').value = '';
    document.getElementById('regValidade').value = '';
    const modal = document.getElementById('modalRegistro');
    if (modal) modal.classList.remove('hidden');
}

function fecharModal() {
    const modal = document.getElementById('modalRegistro');
    if (modal) modal.classList.add('hidden');
}

async function salvarNovoVeiculo(event) {
    event.preventDefault();
    
    const placa = document.getElementById('regPlaca').value.trim().toUpperCase();
    const marca = document.getElementById('regMarca').value.trim().toUpperCase();
    const modelo = document.getElementById('regModelo').value.trim().toUpperCase();
    const validade = document.getElementById('regValidade').value;
    
    const validadeParaBanco = validade ? validade : 'NAO AFERIDO';
    const atualizacao = validade ? isoToday() : '';

    const novoDado = { placa, marca, modelo, validade: validadeParaBanco, atualizacao };

    const { error } = await _supabase.from('selo_verde').insert([novoDado]);
    
    if (error) {
        if (error.code === '23505') {
            alert("Erro: A placa " + placa + " já está registrada no sistema.");
        } else {
            alert("Erro ao registrar veículo: " + error.message);
        }
        return;
    }

    fecharModal();
    await carregarDados(); 
    alert("Veículo registrado com sucesso!");
}

// =========================================================================
// MODAL DE EDITAR VEÍCULO COMPLETO
// =========================================================================
function abrirModalEditar(placa) {
    toggleMenuSelo(placa);
    const veiculo = vehicles.find(v => v.placa === placa);
    if (!veiculo) return;

    document.getElementById('editPlacaOriginal').value = veiculo.placa;
    document.getElementById('editPlaca').value = veiculo.placa;
    document.getElementById('editMarca').value = veiculo.marca || '';
    document.getElementById('editModelo').value = veiculo.modelo || '';
    document.getElementById('editValidade').value = (veiculo.validade && veiculo.validade !== 'NAO AFERIDO') ? veiculo.validade : '';

    const modal = document.getElementById('modalEditar');
    if (modal) modal.classList.remove('hidden');
}

function fecharModalEditar() {
    const modal = document.getElementById('modalEditar');
    if (modal) modal.classList.add('hidden');
}

async function salvarEdicaoCompleta(event) {
    event.preventDefault();

    const placaOriginal = document.getElementById('editPlacaOriginal').value;
    const novaPlaca = document.getElementById('editPlaca').value.trim().toUpperCase();
    const novaMarca = document.getElementById('editMarca').value.trim().toUpperCase();
    const novoModelo = document.getElementById('editModelo').value.trim().toUpperCase();
    const novaValidade = document.getElementById('editValidade').value;

    const validadeParaBanco = novaValidade ? novaValidade : 'NAO AFERIDO';
    // Atualiza a data se a validade mudou ou preencheu
    const dataAtualizacao = novaValidade ? isoToday() : '';

    const dadosAtualizados = {
        placa: novaPlaca,
        marca: novaMarca,
        modelo: novoModelo,
        validade: validadeParaBanco,
        atualizacao: dataAtualizacao
    };

    // Atualiza no Supabase considerando a placa original (caso a placa tenha sido modificada)
    const { error } = await _supabase
        .from('selo_verde')
        .update(dadosAtualizados)
        .eq('placa', placaOriginal);

    if (error) {
        alert("Erro ao atualizar veículo: " + error.message);
        return;
    }

    fecharModalEditar();
    await carregarDados();
    alert("Veículo atualizado com sucesso!");
}

// =========================================================================
// CONTROLE DO MENU DE TRÊS PONTOS
// =========================================================================
function toggleMenuSelo(placa) {
    document.querySelectorAll('.menu-acoes-dropdown').forEach(menu => {
        if (menu.id !== `menu-selo-${placa}`) {
            menu.classList.add('hidden');
        }
    });
    
    const menu = document.getElementById(`menu-selo-${placa}`);
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Fecha o menu ao clicar fora
document.addEventListener('click', function(event) {
    const isClickInsideMenu = event.target.closest('.menu-acoes-dropdown');
    const isClickOnButton = event.target.closest('button[onclick^="toggleMenuSelo"]');
    
    if (!isClickInsideMenu && !isClickOnButton) {
        document.querySelectorAll('.menu-acoes-dropdown').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});

async function excluirVeiculoSelo(placa) {
    toggleMenuSelo(placa);
    
    if (confirm(`Tem certeza que deseja excluir o veículo placa ${placa}?`)) {
        const { error } = await _supabase.from('selo_verde').delete().eq('placa', placa);
        
        if (error) {
            alert("Erro ao excluir o veículo: " + error.message);
        } else {
            alert("Veículo excluído com sucesso!");
            await carregarDados();
        }
    }
}

// =========================================================================
// EXPORTAÇÃO E CARROSSEL
// =========================================================================
function exportarCSV() {
    let cabecalho = ['Placa','Marca','Modelo','Validade Selo Verde','Status Atual','Ultima Atualizacao'].join(';');
    let linhas = vehicles.map(v => {
        let statusText = getStatus(v) === 'valid' ? 'Dentro da validade' : getStatus(v) === 'pending' ? 'Nao aferido' : 'Vencido';
        let validadeFmt = (v.validade && v.validade !== 'NAO AFERIDO') ? fmt(v.validade) : 'NAO AFERIDO';
        return [v.placa, v.marca, v.modelo, validadeFmt, statusText, fmt(v.atualizacao)].join(';');
    });

    let csvContent = [cabecalho, ...linhas].join('\n');
    let blob = new Blob(['\ufeff' + csvContent], {type: 'text/csv;charset=utf-8'});
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'controle_selo_verde.csv';
    a.click();
    URL.revokeObjectURL(a.href);
}

let slideIndex = 0;
function iniciarCarrossel() {
    const slides = document.querySelectorAll('.carousel-img');
    if (slides.length === 0) return;
    
    slides.forEach(slide => { 
        slide.classList.remove('opacity-100'); 
        slide.classList.add('opacity-0'); 
    });
    
    slideIndex++;
    if (slideIndex > slides.length) { slideIndex = 1; }
    
    if (slides[slideIndex - 1]) {
        slides[slideIndex - 1].classList.remove('opacity-0');
        slides[slideIndex - 1].classList.add('opacity-100');
    }
    
    setTimeout(iniciarCarrossel, 5000);
}