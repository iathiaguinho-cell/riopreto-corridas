// ===================================================================
// ARQUIVO PRINCIPAL - Lógica da página pública (VERSÃO DEFINITIVA COM FAIXA ETÁRIA)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o Firebase seja inicializado apenas uma vez.
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }

    const appState = { rankingData: {}, resultadosEtapas: {}, allCorridas: {} };

    const elements = {
        modalOverlay: document.getElementById('modal-overlay'),
        modalTitle: document.getElementById('modal-title'),
        modalContent: document.getElementById('modal-content'),
        modalSearchInput: document.getElementById('modal-search-input'),
        rankingTableBody: document.getElementById("ranking-table-body"),
        rankingTableHeader: document.getElementById('ranking-table-header'),
        rankingToggleButton: document.getElementById("ranking-toggle-button"),
        rankingToggleContainer: document.getElementById("ranking-toggle-container"),
        globalSearchInput: document.getElementById('global-search-input'),
        globalSearchButton: document.getElementById('global-search-button'),
        globalSearchOutput: document.getElementById('global-search-output'),
        filtroPercurso: document.getElementById('filtro-percurso'),
        filtroGenero: document.getElementById('filtro-genero'),
        filtroTipoRanking: document.getElementById('filtro-tipo-ranking'),
        copaContainer: document.getElementById('copa-container'),
        geralContainer: document.getElementById('geral-container')
    };

    function initializeApp() {
        console.log("App público inicializado.");
        addEventListeners();
        fetchAllData();
    }

    function addEventListeners() {
        elements.filtroTipoRanking.addEventListener('change', updateRankingView);
        elements.filtroPercurso.addEventListener('change', updateRankingView);
        elements.filtroGenero.addEventListener('change', updateRankingView);
        elements.globalSearchButton.addEventListener('click', performGlobalSearch);
        elements.globalSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performGlobalSearch(); });
        elements.rankingToggleButton.addEventListener('click', toggleRankingExpansion);
        elements.modalOverlay.addEventListener('click', (e) => { if (e.target === elements.modalOverlay) closeResultsModal(); });
    }

    function fetchAllData() {
        const db = firebase.database();
        const fetchData = (path, stateKey) => db.ref(path).once('value').then(snap => {
            appState[stateKey] = snap.val() || {};
        });

        Promise.all([
            fetchData('corridas', 'allCorridas'),
            fetchData('resultadosEtapas', 'resultadosEtapas'),
            fetchData('rankingCopaAlcer', 'rankingData')
        ]).then(() => {
            console.log("Dados carregados do Firebase:", appState);
            renderAllCalendars();
            updateRankingView();
        }).catch(err => {
            console.error("Falha ao carregar dados essenciais:", err);
        });
    }

    function renderAllCalendars() {
        const { copaAlcer, geral } = appState.allCorridas;
        renderCalendar(copaAlcer, elements.copaContainer);
        renderCalendar(geral, elements.geralContainer);
    }

    window.renderCalendar = function(corridas, container) {
        if (!container) return;
        if (!corridas || Object.keys(corridas).length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center col-span-full">Nenhuma corrida agendada neste calendário.</p>`;
            return;
        }
        
        const corridasArray = Object.values(corridas).sort((a, b) => new Date(a.data) - new Date(b.data));
        container.innerHTML = corridasArray.map(corrida => {
            const dataObj = new Date(`${corrida.data}T12:00:00Z`);
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = dataObj.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
            
            const resultadosBtnHTML = appState.resultadosEtapas[corrida.id] ?
                `<button class="results-button" onclick="showRaceResultsModal('${corrida.id}', event)"><i class='bx bx-table mr-2'></i>Resultados</button>` :
                `<div class="race-button-disabled">Resultados em Breve</div>`;
            
            const inscricoesBtnHTML = corrida.linkInscricao ?
                `<a href="${corrida.linkInscricao}" target="_blank" rel="noopener noreferrer" class="inscricoes-button"><i class='bx bx-link-external mr-2'></i>Inscrições</a>` :
                `<div class="race-button-disabled">Inscrições Encerradas</div>`;

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
                                ${inscricoesBtnHTML}
                                ${resultadosBtnHTML}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    };

    window.showRaceResultsModal = function(raceId, event) {
        if (event) event.stopPropagation();
        
        const race = appState.allCorridas.copaAlcer?.[raceId] || appState.allCorridas.geral?.[raceId];
        const resultsByCourse = appState.resultadosEtapas[raceId];

        if (!race || !resultsByCourse) {
            console.error("Resultados não encontrados para a corrida:", raceId);
            return;
        }

        elements.modalTitle.textContent = `Resultados - ${race.nome}`;
        
        let contentHTML = '';
        for (const percurso in resultsByCourse) {
            for (const genero in resultsByCourse[percurso]) {
                const atletas = resultsByCourse[percurso][genero];
                 if (atletas && atletas.length > 0) {
                    contentHTML += `<h3 class="modal-category-title">${percurso} - ${genero.charAt(0).toUpperCase() + genero.slice(1)}</h3>`;
                    contentHTML += `
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left text-gray-300 results-table">
                                <thead class="table-header">
                                    <tr>
                                        <th class="px-4 py-2">#</th>
                                        <th class="px-4 py-2">Atleta</th>
                                        <th class="px-4 py-2">Equipe</th>
                                        <th class="px-4 py-2">Tempo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${atletas.map(atleta => `
                                        <tr class="bg-gray-800 border-b border-gray-700">
                                            <td class="px-4 py-2 font-medium">${atleta.classificacao}</td>
                                            <td class="px-4 py-2">${atleta.nome}</td>
                                            <td class="px-4 py-2 text-gray-400">${atleta.assessoria || 'Individual'}</td>
                                            <td class="px-4 py-2 font-mono">${atleta.tempo}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
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
        const tables = elements.modalContent.querySelectorAll('.results-table tbody');
        tables.forEach(tbody => {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                const athleteName = row.cells[1].textContent.toUpperCase();
                const teamName = row.cells[2].textContent.toUpperCase();
                row.style.display = (athleteName.includes(searchTerm) || teamName.includes(searchTerm)) ? '' : 'none';
            });
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
        for (const raceId in appState.resultadosEtapas) {
            const raceName = appState.allCorridas.copaAlcer?.[raceId]?.nome || appState.allCorridas.geral?.[raceId]?.nome || `Etapa ${raceId}`;
            const etapaResultados = appState.resultadosEtapas[raceId];
            
            for (const percurso in etapaResultados) {
                for (const genero in etapaResultados[percurso]) {
                    const atletas = etapaResultados[percurso][genero];
                    if (atletas && Array.isArray(atletas)) {
                        const filtered = atletas.filter(atleta => atleta.nome && atleta.nome.toUpperCase().includes(searchTerm));
                        filtered.forEach(atleta => allResults.push({ ...atleta, genero, percurso, raceName, raceId }));
                    }
                }
            }
        }

        if (allResults.length === 0) {
            elements.globalSearchOutput.innerHTML = `<p class="text-red-400 text-center p-4">Nenhum resultado encontrado para "<strong>${elements.globalSearchInput.value}</strong>".</p>`;
            return;
        }

        displayGlobalResults(allResults);
    }

    function displayGlobalResults(results) {
        const groupedByAthlete = results.reduce((acc, result) => {
            if (!acc[result.nome]) { acc[result.nome] = []; }
            acc[result.nome].push(result);
            return acc;
        }, {});

        let html = '';
        for (const athleteName in groupedByAthlete) {
            html += `<div class="athlete-profile-card"><div class="athlete-profile-header">${athleteName}</div><div>`;
            groupedByAthlete[athleteName].forEach(res => {
                html += `
                    <div class="athlete-result-item">
                        <div><div class="result-label">Corrida</div><div class="result-value">${res.raceName}</div></div>
                        <div><div class="result-label">Percurso</div><div class="result-value">${res.percurso} ${res.genero}</div></div>
                        <div><div class="result-label">Posição</div><div class="result-value pos">${res.classificacao}º</div></div>
                        <div><div class="result-label">Tempo</div><div class="result-value">${res.tempo}</div></div>
                    </div>`;
            });
            html += `</div></div>`;
        }
        elements.globalSearchOutput.innerHTML = html;
    }

    function updateRankingView() {
        const tipoRanking = elements.filtroTipoRanking.value;
        const percurso = elements.filtroPercurso.value;
        const genero = elements.filtroGenero.value;

        const rankingData = appState.rankingData[genero]?.[percurso];

        if (!rankingData) {
            renderRankingGeral([]); // Usa a função geral para mostrar tabela vazia
            return;
        }

        if (tipoRanking === 'geral') {
            renderRankingGeral(rankingData.geral || []);
        } else {
            renderRankingFaixaEtaria(rankingData.faixas_etarias || {});
        }
    }

    function renderRankingGeral(athletes) {
        elements.rankingTableHeader.innerHTML = `
            <th class="px-6 py-3">Pos.</th>
            <th class="px-6 py-3">Atleta</th>
            <th class="px-6 py-3 text-center">Etapa 1</th>
            <th class="px-6 py-3 text-center">Etapa 2</th>
            <th class="px-6 py-3 text-center">Etapa 3</th>
            <th class="px-6 py-3 text-center">Etapa 4</th>
            <th class="px-6 py-3 text-center">Pontos</th>
        `;

        const sortedAthletes = [...athletes].sort((a, b) => (a.classificacao || 9999) - (b.classificacao || 9999));

        if (sortedAthletes.length === 0) {
            showEmptyRanking(7);
            return;
        }

        elements.rankingTableBody.innerHTML = sortedAthletes.map(atleta => `
            <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                <td class="px-6 py-4 font-medium text-white">${atleta.classificacao}º</td>
                <td class="px-6 py-4">
                    <div class="font-semibold text-white">${atleta.nome}</div>
                    <div class="text-xs text-gray-400">${atleta.assessoria || "Individual"}</div>
                </td>
                <td class="px-6 py-4 text-center">${atleta.etapa1 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa2 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa3 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa4 || "-"}</td>
                <td class="px-6 py-4 text-center font-bold text-blue-400 text-lg">${atleta.acumulado}</td>
            </tr>
        `).join("");
        
        handleTableExpansion(sortedAthletes.length);
    }

    function renderRankingFaixaEtaria(faixas) {
        elements.rankingTableHeader.innerHTML = `
            <th class="px-6 py-3">Pos. Faixa</th>
            <th class="px-6 py-3">Atleta</th>
            <th class="px-6 py-3">Idade</th>
            <th class="px-6 py-3 text-center">Pontos</th>
        `;

        let html = '';
        let totalAthletes = 0;
        const sortedFaixas = Object.keys(faixas).sort();

        for (const faixa of sortedFaixas) {
            const athletes = faixas[faixa];
            totalAthletes += athletes.length;
            
            html += `<tr class="bg-gray-700"><td colspan="4" class="px-6 py-2 font-bold text-blue-400">Faixa Etária: ${faixa} anos</td></tr>`;
            
            athletes.forEach(atleta => {
                html += `
                    <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                        <td class="px-6 py-4 font-medium text-white">${atleta.classificacao_faixa}º</td>
                        <td class="px-6 py-4">
                            <div class="font-semibold text-white">${atleta.nome}</div>
                            <div class="text-xs text-gray-400">${atleta.assessoria || "Individual"}</div>
                        </td>
                        <td class="px-6 py-4 text-center">${atleta.idade}</td>
                        <td class="px-6 py-4 text-center font-bold text-blue-400 text-lg">${atleta.acumulado}</td>
                    </tr>
                `;
            });
        }
        
        if (totalAthletes === 0) {
            showEmptyRanking(4);
            return;
        }

        elements.rankingTableBody.innerHTML = html;
        handleTableExpansion(totalAthletes);
    }
    
    function showEmptyRanking(colspan) {
        elements.rankingTableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center p-8 text-gray-400">Nenhum atleta no ranking para esta seleção.</td></tr>`;
        elements.rankingToggleContainer.classList.add('hidden');
    }

    function handleTableExpansion(count) {
        if (count > 10) {
            elements.rankingToggleContainer.classList.remove('hidden');
            elements.rankingTableBody.classList.add('collapsed');
            elements.rankingToggleButton.textContent = 'Ver Ranking Completo';
        } else {
            elements.rankingToggleContainer.classList.add('hidden');
            elements.rankingTableBody.classList.remove('collapsed');
        }
    }

    function toggleRankingExpansion() {
        const isCollapsed = elements.rankingTableBody.classList.toggle('collapsed');
        elements.rankingToggleButton.textContent = isCollapsed ? 'Ver Ranking Completo' : 'Mostrar Menos';
    }

    initializeApp();
});
