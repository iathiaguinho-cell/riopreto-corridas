// ===================================================================
// ARQUIVO PRINCIPAL - Lógica da página pública (VERSÃO FINAL E ESTÁVEL)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }

    const appState = {
        rankingData: {},
        resultadosEtapas: {},
        allCorridas: {}
    };

    const elements = {
        modalOverlay: document.getElementById('modal-overlay'),
        modalTitle: document.getElementById('modal-title'),
        modalContent: document.getElementById('modal-content'),
        modalSearchInput: document.getElementById('modal-search-input'),
        rankingTableBody: document.getElementById("ranking-table-body"),
        rankingToggleButton: document.getElementById("ranking-toggle-button"),
        rankingToggleContainer: document.getElementById("ranking-toggle-container"),
        globalSearchInput: document.getElementById('global-search-input'),
        globalSearchButton: document.getElementById('global-search-button'),
        globalSearchOutput: document.getElementById('global-search-output'),
        filtroPercurso: document.getElementById('filtro-percurso'),
        filtroGenero: document.getElementById('filtro-genero'),
        copaContainer: document.getElementById('copa-container'),
        geralContainer: document.getElementById('geral-container'),
        resultadosContainer: document.getElementById('resultados-container') // Novo container
    };

    function initializeApp() {
        addEventListeners();
        fetchAllData();
    }

    function addEventListeners() {
        elements.filtroPercurso.addEventListener('change', updateRankingView);
        elements.filtroGenero.addEventListener('change', updateRankingView);
        elements.globalSearchButton.addEventListener('click', performGlobalSearch);
        elements.globalSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performGlobalSearch(); });
        elements.rankingToggleButton.addEventListener('click', toggleRankingExpansion);
        elements.modalOverlay.addEventListener('click', (e) => { if (e.target === elements.modalOverlay) closeResultsModal(); });
    }

    function fetchAllData() {
        const db = firebase.database();
        
        db.ref().on('value', snapshot => {
            const data = snapshot.val() || {};
            appState.allCorridas = data.corridas || { copaAlcer: {}, geral: {} };
            appState.resultadosEtapas = data.resultadosEtapas || {};
            appState.rankingData = data.rankingCopaAlcer || {};
            
            console.log("Dados carregados com sucesso:", appState);
            renderContent();
        }, error => {
            console.error("Falha ao carregar dados do Firebase:", error);
        });
    }

    function renderContent() {
        const todasCorridasCopa = Object.values(appState.allCorridas.copaAlcer || {});
        const todasCorridasGerais = Object.values(appState.allCorridas.geral || {});
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Separa corridas da Copa em agendadas e realizadas
        const corridasAgendadasCopa = todasCorridasCopa.filter(c => new Date(c.data) >= hoje);
        const corridasRealizadas = todasCorridasCopa.filter(c => new Date(c.data) < hoje);
        
        // Renderiza calendários de corridas futuras
        renderCalendar(corridasAgendadasCopa, elements.copaContainer, 'inscrições');
        renderCalendar(todasCorridasGerais, elements.geralContainer, 'inscrições');

        // Renderiza a lista de corridas com resultados
        renderCalendar(corridasRealizadas, elements.resultadosContainer, 'resultados');
        
        updateRankingView();
    }

    function renderCalendar(corridas, container, buttonType) {
        if (!container) return;
        if (!corridas || corridas.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center col-span-full">Nenhuma corrida nesta categoria.</p>`;
            return;
        }
        
        const sortedCorridas = corridas.sort((a, b) => new Date(a.data) - new Date(b.data));
        container.innerHTML = sortedCorridas.map(corrida => {
            const dataObj = new Date(`${corrida.data}T12:00:00Z`);
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = dataObj.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
            
            let actionButtonHTML = '';
            if (buttonType === 'inscrições') {
                actionButtonHTML = corrida.linkInscricao ?
                    `<a href="${corrida.linkInscricao}" target="_blank" rel="noopener noreferrer" class="inscricoes-button"><i class='bx bx-link-external mr-2'></i>Inscrições</a>` :
                    `<div class="race-button-disabled">Inscrições Encerradas</div>`;
            } else { // 'resultados'
                actionButtonHTML = appState.resultadosEtapas[corrida.id] ?
                    `<button class="results-button" onclick="showRaceResultsModal('${corrida.id}', event)"><i class='bx bx-table mr-2'></i>Ver Resultados</button>` :
                    `<div class="race-button-disabled">Resultados em Breve</div>`;
            }

            return `
                <div class="race-card-wrapper">
                    <div class="race-card bg-gray-800">
                        <div class="race-date"><span class="text-3xl font-bold">${dia}</span><span>${mes}</span></div>
                        <div class="race-info">
                            <div>
                                <h3 class="font-bold text-lg text-white">${corrida.nome}</h3>
                                <p class="text-sm text-gray-400"><i class='bx bxs-map mr-1'></i>${corrida.cidade}</p>
                            </div>
                            <div class="race-buttons">
                                ${actionButtonHTML}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    window.showRaceResultsModal = function(raceId, event) {
        if (event) event.stopPropagation();
        
        const race = appState.allCorridas.copaAlcer?.[raceId] || appState.allCorridas.geral?.[raceId];
        const results = appState.resultadosEtapas[raceId];

        if (!race || !results) {
            console.error("Dados da corrida ou resultados não encontrados para o ID:", raceId);
            return;
        }

        elements.modalTitle.textContent = `Resultados - ${race.nome}`;
        
        let contentHTML = '';
        for (const percurso in results) {
            for (const genero in results[percurso]) {
                const atletas = results[percurso][genero];
                if (atletas && atletas.length > 0) {
                    contentHTML += `<h3 class="modal-category-title">${percurso} - ${genero.charAt(0).toUpperCase() + genero.slice(1)}</h3>`;
                    contentHTML += `
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left text-gray-300 results-table">
                                <thead class="table-header"><tr><th class="px-4 py-2">#</th><th class="px-4 py-2">Atleta</th><th class="px-4 py-2">Equipe</th><th class="px-4 py-2">Tempo</th></tr></thead>
                                <tbody>
                                    ${atletas.map(atleta => `
                                        <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                                            <td class="px-4 py-2 font-medium">${atleta.classificacao}</td>
                                            <td class="px-4 py-2">${atleta.nome}</td>
                                            <td class="px-4 py-2 text-gray-400">${atleta.assessoria || 'Individual'}</td>
                                            <td class="px-4 py-2 font-mono">${atleta.tempo}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>`;
                }
            }
        }
        elements.modalContent.innerHTML = contentHTML;
        elements.modalSearchInput.value = '';
        elements.modalSearchInput.onkeyup = () => filterResultsInModal();
        elements.modalOverlay.classList.remove('hidden');
    }
    
    function filterResultsInModal() {
        const searchTerm = elements.modalSearchInput.value.toUpperCase();
        elements.modalContent.querySelectorAll('.results-table tbody tr').forEach(row => {
            const athleteName = row.cells[1].textContent.toUpperCase();
            row.style.display = athleteName.includes(searchTerm) ? '' : 'none';
        });
    }

    window.closeResultsModal = function() {
        elements.modalOverlay.classList.add('hidden');
    }

    function performGlobalSearch() {
        const searchTerm = elements.globalSearchInput.value.trim().toUpperCase();
        if (searchTerm.length < 3) {
            elements.globalSearchOutput.innerHTML = `<p class="text-yellow-400 text-center p-4">Digite pelo menos 3 caracteres.</p>`;
            return;
        }
        elements.globalSearchOutput.innerHTML = `<p class="text-gray-400 text-center p-4">Buscando...</p>`;
        
        let allResults = [];
        const allRaces = { ...appState.allCorridas.copaAlcer, ...appState.allCorridas.geral };

        for (const raceId in appState.resultadosEtapas) {
            const raceName = allRaces[raceId]?.nome || `Etapa`;
            for (const percurso in appState.resultadosEtapas[raceId]) {
                for (const genero in appState.resultadosEtapas[raceId][percurso]) {
                    const atletas = appState.resultadosEtapas[raceId][percurso][genero];
                    if (Array.isArray(atletas)) {
                        const filtered = atletas.filter(atleta => atleta.nome?.toUpperCase().includes(searchTerm));
                        filtered.forEach(atleta => allResults.push({ ...atleta, tipo: 'corrida', genero, percurso, raceName }));
                    }
                }
            }
        }
        
        for (const genero in appState.rankingData) {
            for (const percurso in appState.rankingData[genero]) {
                const atletas = appState.rankingData[genero][percurso];
                if (Array.isArray(atletas)) {
                    const filtered = atletas.filter(atleta => atleta.nome?.toUpperCase().includes(searchTerm));
                    filtered.forEach(atleta => allResults.push({ ...atleta, tipo: 'ranking', genero, percurso, raceName: 'Copa Alcer' }));
                }
            }
        }

        displayGlobalResults(allResults);
    }

    function displayGlobalResults(results) {
        if (results.length === 0) {
            elements.globalSearchOutput.innerHTML = `<p class="text-red-400 text-center p-4">Nenhum resultado encontrado.</p>`;
            return;
        }
        const groupedByAthlete = results.reduce((acc, result) => {
            (acc[result.nome] = acc[result.nome] || []).push(result);
            return acc;
        }, {});

        let html = '';
        for (const athleteName in groupedByAthlete) {
            html += `<div class="athlete-profile-card"><div class="athlete-profile-header">${athleteName}</div><div>`;
            groupedByAthlete[athleteName].forEach(res => {
                if (res.tipo === 'corrida') {
                    html += `
                        <div class="athlete-result-item">
                            <div><div class="result-label">Evento</div><div class="result-value">${res.raceName}</div></div>
                            <div><div class="result-label">Percurso</div><div class="result-value">${res.percurso} ${res.genero}</div></div>
                            <div><div class="result-label">Posição</div><div class="result-value">${res.classificacao}º</div></div>
                            <div><div class="result-label">Tempo</div><div class="result-value">${res.tempo}</div></div>
                        </div>`;
                } else if (res.tipo === 'ranking') {
                     html += `
                        <div class="athlete-result-item" style="background-color: #2d3748;">
                            <div><div class="result-label">Evento</div><div class="result-value text-blue-400">${res.raceName}</div></div>
                            <div><div class="result-label">Percurso</div><div class="result-value">${res.percurso} ${res.genero}</div></div>
                            <div><div class="result-label">Pos. no Ranking</div><div class="result-value">${res.classificacao}º</div></div>
                            <div><div class="result-label">Pontos</div><div class="result-value">${res.acumulado}</div></div>
                        </div>`;
                }
            });
            html += `</div></div>`;
        }
        elements.globalSearchOutput.innerHTML = html;
    }

    function updateRankingView() {
        const percurso = elements.filtroPercurso.value;
        const genero = elements.filtroGenero.value;
        const atletas = appState.rankingData[genero]?.[percurso] || [];
        renderRankingTable(atletas);
    }
    
    function renderRankingTable(atletas) {
        if (!elements.rankingTableBody) return;
        const header = document.getElementById('ranking-table-header');
        header.innerHTML = `
            <th class="px-6 py-3">Pos.</th><th class="px-6 py-3">Atleta</th>
            <th class="px-6 py-3 text-center">Etapa 1</th><th class="px-6 py-3 text-center">Etapa 2</th>
            <th class="px-6 py-3 text-center">Etapa 3</th><th class="px-6 py-3 text-center">Etapa 4</th>
            <th class="px-6 py-3 text-center">Pontos</th>
        `;
        
        const sortedAthletes = [...atletas].sort((a, b) => (a.classificacao || 999) - (b.classificacao || 999));
        
        elements.rankingTableBody.innerHTML = sortedAthletes.map(atleta => `
            <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                <td class="px-6 py-4 font-medium text-white">${atleta.classificacao}</td>
                <td class="px-6 py-4"><div class="font-semibold">${atleta.nome}</div><div class="text-xs text-gray-400">${atleta.idade} anos</div></td>
                <td class="px-6 py-4 text-center">${atleta.etapa1 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa2 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa3 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa4 || "-"}</td>
                <td class="px-6 py-4 text-center font-bold text-blue-400">${atleta.acumulado}</td>
            </tr>
        `).join("");

        if (sortedAthletes.length > 10) {
            elements.rankingToggleContainer.classList.remove('hidden');
            elements.rankingTableBody.classList.add('collapsed');
            elements.rankingToggleButton.textContent = 'Ver Ranking Completo';
        } else {
            elements.rankingToggleContainer.classList.add('hidden');
            elements.rankingTableBody.classList.remove('collapsed');
        }
    }

    function toggleRankingExpansion() {
        elements.rankingTableBody.classList.toggle('collapsed');
        elements.rankingToggleButton.textContent = elements.rankingTableBody.classList.contains('collapsed') ? 'Ver Ranking Completo' : 'Mostrar Menos';
    }

    initializeApp();
});
