let materials = [];
let filteredMaterials = [];
let currentPage = 1;
const itemsPerPage = 30;
let currentTab = 'recebimentos';

document.getElementById('abaRecebimentos').onclick = function(e) {
    e.preventDefault();
    displaySection('recebimentosSection');
    currentTab = 'recebimentos';
    this.classList.add('active');
    filteredMaterials = materials.slice();
    currentPage = 1;
    renderMaterialsList();
};

function displaySection(sectionId) {
    document.getElementById('recebimentosSection').style.display = '';
}

document.getElementById('searchGlobalInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('btnGlobalSearch').click();
    }
});

function fuzzySearch(string, searchTerm) {
    string = string.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    searchTerm = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (string.includes(searchTerm)) return true;
    let parts = searchTerm.split(/\s+/);
    return parts.every(part => string.includes(part));
}

function globalSearch(term) {
    if (!term || !term.trim()) {
        filteredMaterials = materials.slice();
    } else {
        let terms = term.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
        filteredMaterials = materials.filter(material => {
            let code = material.codigo.toLowerCase();
            let name = material.nome.toLowerCase();
            return terms.every(t =>
                fuzzySearch(code, t) || fuzzySearch(name, t)
            );
        });
    }
    currentPage = 1;
    renderMaterialsList();
}

document.getElementById('searchGlobalInput').addEventListener('input', function() {
    globalSearch(this.value);
});
document.getElementById('btnGlobalSearch').onclick = function() {
    globalSearch(document.getElementById('searchGlobalInput').value);
};

// Limpar pesquisa e voltar para a tela inicial (todas as páginas)
document.getElementById('btnClearSearch').addEventListener('click', function() {
    document.getElementById('searchGlobalInput').value = '';
    document.getElementById('searchGlobalInput').focus();
    filteredMaterials = materials.slice();
    currentPage = 1;
    renderMaterialsList();
});

function processCsvData(csv) {
    materials = [];
    let lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);

    lines.forEach(line => {
        let columns = line.includes(';') ? line.split(';') : line.split(',');
        let code = (columns[0] || '').trim();
        let name = columns.slice(1).join(',').trim();
        let date = new Date().toLocaleDateString('pt-BR');
        if (code && name) {
            materials.push({codigo: code, nome: name, data: date});
        }
    });

    materials = materials.filter(material => {
        let name = material.nome.trim().toUpperCase();
        return name !== "INATIVO" && name !== "INATIVOS";
    });

    materials.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', {numeric: true}));
    filteredMaterials = materials.slice();
    currentPage = 1;
    renderMaterialsList();
}

function toggleLoader(show = true) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

function showTemporaryMessage(message, backgroundColor="#2563eb", duration=1800) {
    var alertMessage = document.getElementById('mensagemAviso');
    if (!alertMessage) return;
    alertMessage.textContent = message;
    alertMessage.style.background = backgroundColor;
    alertMessage.style.display = "block";
    setTimeout(() => { alertMessage.style.display = "none"; }, duration);
}

function renderMaterialsList() {
    let htmlContent = `
    <div style="overflow-x:auto">
    <table class="material-table">
        <thead>
            <tr>
                <th>Código</th>
                <th style="width:70%;">Nome</th>
                <th style="text-align:center;">Ações</th>
            </tr>
        </thead>
        <tbody>
    `;
    const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const materialsOnPage = filteredMaterials.slice(start, end);

    materialsOnPage.forEach((material, index) => {
        htmlContent += `
        <tr${index === 0 ? ' class="selected"' : ''}>
            <td>${material.codigo}</td>
            <td>${material.nome}</td>
            <td style="text-align:center;">
                <button class="btn-copiar" data-codigo="${material.codigo}" aria-label="Copiar código ${material.codigo}" tabindex="3">Copiar código</button>
            </td>
        </tr>
        `;
    });
    htmlContent += `</tbody></table></div>`;

    htmlContent += `
    <div style="display:flex;justify-content:center;align-items:center;gap:16px;margin:24px 0;">
        <button class="btn" id="btnAnterior" ${currentPage === 1 ? 'disabled' : ''} aria-label="Página anterior" tabindex="4">Anterior</button>
        <span style="color:#fff;font-weight:bold;">Página ${currentPage} de ${totalPages}</span>
        <button class="btn" id="btnProxima" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} aria-label="Próxima página" tabindex="5">Próxima</button>
    </div>
    `;

    document.getElementById('listaMateriais').innerHTML = htmlContent;

    document.querySelectorAll('.btn-copiar').forEach(button => {
        button.onclick = function() {
            navigator.clipboard.writeText(this.getAttribute('data-codigo'));
            this.textContent = "Copiado!";
            setTimeout(() => { this.textContent = "Copiar código"; }, 1200);
        };
    });

    const previousButton = document.getElementById('btnAnterior');
    const nextButton = document.getElementById('btnProxima');
    if (previousButton) previousButton.onclick = function() {
        if (currentPage > 1) {
            currentPage--;
            renderMaterialsList();
        }
    };
    if (nextButton) nextButton.onclick = function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderMaterialsList();
        }
    };
}

toggleLoader(true);
fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQM-SRrwyiLPUd9KwddBmU3QlORnYJ07qGyDOdtY2ujcWQ1QXOfI1CLmFrUgzjK-SogI37KlnYNa7xZ/pub?output=csv')
    .then(response => {
        if (!response.ok) throw new Error("Erro HTTP: " + response.status);
        return response.text();
    })
    .then(csv => {
        if (csv) {
            processCsvData(csv);
            showTemporaryMessage("Dados importados automaticamente!", "#22c55e");
        } else {
            showTemporaryMessage("Não foi possível importar do Google Sheets. O arquivo está vazio.", "#f43f5e", 3500);
        }
    })
    .catch(error => {
        showTemporaryMessage("Erro ao importar dados: " + error.message, "#f43f5e", 4000);
    })
    .finally(() => {
        toggleLoader(false);
    });

displaySection('recebimentosSection');
document.getElementById('abaRecebimentos').classList.add('active');