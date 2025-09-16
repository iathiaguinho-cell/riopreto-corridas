let rankingData = {};
let resultadosEtapas = {};
let rankingSortConfig = { column: 'classificacao', direction: 'asc' };

document.addEventListener('DOMContentLoaded', () => {
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        fetchAllData();
        document.getElementById('filtro-percurso').addEventListener('change', updateRankingView);
        document.getElementById('filtro-genero').addEventListener('change', updateRankingView);
    } catch (error) {
        console.error("Firebase Init Error:", error);
    }
});

function fetchAllData() {
    const db = firebase.database();
    const corridasRef = db.ref('corridas');
    const resultadosRef = db.ref('resultadosEtapas');
    const rankingRef = db.ref('rankingCopaAlcer');

    corridasRef.on('value', (snapshot) => {
        const allCorridas = snapshot.val() || {};
        renderCalendar(allCorridas.copaAlcer, 'copa-container');
        renderCalendar(allCorridas.geral, 'geral-container');
    });

    resultadosRef.on('value', (snapshot) => {
        resultadosEtapas = snapshot.val() || {};
        // Re-renderiza os calendários para garantir que os botões de resultado estejam corretos
        corridasRef.once('value', (s) => {
            const allCorridas = s.val() || {};
            renderCalendar(allCorridas.copaAlcer, 'copa-container');
            renderCalendar(allCorridas.geral, 'geral-container');
        });
    });

    rankingRef.on('value', (snapshot) => {
        rankingData = snapshot.val() || {};
        updateRankingView();
    });
}

function renderCalendar(corridas, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!corridas || Object.keys(corridas).length === 0) {
        container.innerHTML = `<p class="loading-message">Nenhuma corrida cadastrada nesta categoria.</p>`;
        return;
    }
    const corridasArray = Object.values(corridas).sort((a, b) => new Date(a.data) - new Date(b.data));
    corridasArray.forEach(corrida => {
        const dataObj = new Date(`${corrida.data}T12:00:00Z`);
        const dia = String(dataObj.getDate()).padStart(2, '0');
        const mes = dataObj.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
        
        const resultadosBtnHTML = resultadosEtapas[corrida.id] ?
            `<button class="results-button" onclick="toggleResults('${corrida.id}')"><i class='bx bx-search-alt-2 mr-2'></i>Resultados</button>` :
            `<div class="race-button-disabled">Resultados em Breve</div>`;
        
        const inscricoesBtnHTML = corrida.linkInscricao ?
            `<a href="${corrida.linkInscricao}" target="_blank" rel="noopener noreferrer" class="inscricoes-button"><i class='bx bx-link-external mr-2'></i>Inscrições</a>` :
            `<div class="race-button-disabled">Inscrições Encerradas</div>`;

        const cardHTML = `
            <div class="race-card-wrapper">
                <div class="race-card bg-gray-800">
                    <div class="race-date"><span class="text-3xl font-bold">${dia}</span><span>${mes}</span></div>
                    <div class="race-info">
                        <div>
                            <h3 class="font-bold text-lg text-white">${corrida.nome}</h3>
                            <p class="text-sm text-gray-400"><i class='bx bxs-map mr-1'></i>${corrida.cidade}</p>
                        </div>
                        <div class="race-buttons">
                            ${inscricoesBtnHTML}
                            ${resultadosBtnHTML}
                        </div>
                    </div>
                </div>
                <div id="results-${corrida.id}" class="results-panel hidden">
                    <div class="p-4">
                        <div class="flex gap-2">
                            <input type="text" id="search-input-${corrida.id}" placeholder="Digite o nome do atleta" class="search-input flex-grow">
                            <button class="search-button" onclick="searchAthlete('${corrida.id}')"><i class='bx bx-search'></i></button>
                        </div>
                        <div id="results-output-${corrida.id}" class="mt-4"></div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });
}

function toggleResults(raceId) {
    const panel = document.getElementById(`results-${raceId}`);
    if (panel) panel.classList.toggle('hidden');
}

function searchAthlete(raceId) {
    const input = document.getElementById(`search-input-${raceId}`);
    const output = document.getElementById(`results-output-${raceId}`);
    const searchTerm = input.value.trim().toUpperCase();

    if (searchTerm.length < 3) {
        output.innerHTML = `<div class="results-message warning">Digite pelo menos 3 letras.</div>`;
        return;
    }

    const etapaResultados = resultadosEtapas[raceId];
    if (!etapaResultados) {
        output.innerHTML = `<div class="results-message error">Resultados para esta etapa não encontrados.</div>`;
        return;
    }

    let foundAthletes = [];
    for (const genero in etapaResultados) {
        for (const percurso in etapaResultados[genero]) {
            const atletas = etapaResultados[genero][percurso];
            const filtered = atletas.filter(atleta => atleta.nome.toUpperCase().includes(searchTerm));
            filtered.forEach(atleta => foundAthletes.push({ ...atleta, genero, percurso }));
        }
    }

    if (foundAthletes.length === 0) {
        output.innerHTML = `<div class="results-message">Nenhum atleta encontrado com o nome "<strong>${input.value}</strong>".</div>`;
        return;
    }

    output.innerHTML = `<div class="grid grid-cols-1 gap-2">${foundAthletes.map(atleta => `<div class="athlete-card-small"><div class="font-semibold text-white">${atleta.nome}</div><div class="text-xs text-gray-400">#${atleta.classificacao} | ${atleta.tempo}</div></div>`).join('')}</div>`;
}

function updateRankingView() {
    const percurso = document.getElementById('filtro-percurso').value;
    const genero = document.getElementById('filtro-genero').value;
    const atletas = rankingData[genero] ? rankingData[genero][percurso] : [];
    renderRankingTable(atletas);
}

function setSort(column) {
    if (rankingSortConfig.column === column) {
        rankingSortConfig.direction = rankingSortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        rankingSortConfig.column = column;
        rankingSortConfig.direction = 'asc';
    }
    updateRankingView();
}

function renderRankingTable(atletas) {
    const tableBody = document.getElementById("ranking-table-body");
    const header = document.getElementById("ranking-table-header");
    if (!tableBody || !header) return;
    const sortIndicator = (column) => rankingSortConfig.column === column ? (rankingSortConfig.direction === 'asc' ? '▲' : '▼') : '';
    header.innerHTML = `<th class="px-6 py-3 sortable" onclick="setSort('classificacao')"># ${sortIndicator('classificacao')}</th><th class="px-6 py-3 sortable" onclick="setSort('nome')">Atleta ${sortIndicator('nome')}</th><th class="px-6 py-3">Assessoria</th><th class="px-6 py-3 text-center sortable" onclick="setSort('etapa1')">Et. 1 ${sortIndicator('etapa1')}</th><th class="px-6 py-3 text-center sortable" onclick="setSort('etapa2')">Et. 2 ${sortIndicator('etapa2')}</th><th class="px-6 py-3 text-center sortable" onclick="setSort('etapa3')">Et. 3 ${sortIndicator('etapa3')}</th><th class="px-6 py-3 text-center sortable" onclick="setSort('etapa4')">Et. 4 ${sortIndicator('etapa4')}</th><th class="px-6 py-3 text-center sortable" onclick="setSort('acumulado')">Total ${sortIndicator('acumulado')}</th>`;
    if (!atletas || atletas.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-gray-400">Nenhum resultado para esta categoria.</td></tr>`;
        return;
    }
    const sortedAthletes = [...atletas].sort((a, b) => {
        const col = rankingSortConfig.column;
        const dir = rankingSortConfig.direction === 'asc' ? 1 : -1;
        const valA = a[col] || (typeof a[col] === 'string' ? '' : 0);
        const valB = b[col] || (typeof b[col] === 'string' ? '' : 0);
        if (typeof valA === 'string') return valA.localeCompare(valB) * dir;
        return (valA - valB) * dir;
    });
    tableBody.innerHTML = sortedAthletes.map(atleta => `<tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600"><td class="px-6 py-4 font-medium text-white">${atleta.classificacao}</td><td class="px-6 py-4"><div class="font-semibold">${atleta.nome}</div><div class="text-xs text-gray-400">${atleta.idade} anos</div></td><td class="px-6 py-4">${atleta.assessoria || "Individual"}</td><td class="px-6 py-4 text-center">${atleta.etapa1 || "-"}</td><td class="px-6 py-4 text-center">${atleta.etapa2 || "-"}</td><td class="px-6 py-4 text-center">${atleta.etapa3 || "-"}</td><td class="px-6 py-4 text-center">${atleta.etapa4 || "-"}</td><td class="px-6 py-4 text-center font-bold text-blue-400">${atleta.acumulado}</td></tr>`).join("");
}
