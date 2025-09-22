// ===================================================================
// ARQUIVO PRINCIPAL - Lógica da página pública (VERSÃO PROFISSIONAL COMPLETA)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Estado centralizado da aplicação para guardar todos os dados
    const appState = {
        rankingData: {},
        resultadosEtapas: {},
        allCorridas: {}
    };

    // Mapeamento dos elementos do DOM
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
        geralContainer: document.getElementById('geral-container')
    };

    function initializeApp() {
        try {
            // A inicialização do Firebase já deve ter sido feita pelo config.js
            // e auth.js, mas garantimos aqui
            if (!firebase.apps.length) {
                 firebase.initializeApp(FIREBASE_CONFIG);
            }
            addEventListeners();
            fetchAllData();
        } catch (error) {
            console.error("Erro na inicialização do Firebase:", error);
            elements.globalSearchOutput.innerHTML = `<p class="text-red-500 text-center">Não foi possível conectar ao banco de dados.</p>`;
        }
    }

    function addEventListeners() {
        elements.filtroPercurso.addEventListener('change', updateRankingView);
        elements.filtroGenero.addEventListener('change', updateRankingView);
        
        elements.globalSearchButton.addEventListener('click', performGlobalSearch);
        elements.globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performGlobalSearch();
        });
        
        elements.rankingToggleButton.addEventListener('click', toggleRankingExpansion);

        elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === elements.modalOverlay) closeResultsModal();
        });
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
            renderAllCalendars();
            updateRankingView();
            renderRankingTableHeader(); // Renderiza o cabeçalho do ranking
        }).catch(err => {
            console.error("Falha ao carregar dados essenciais:", err);
            elements.globalSearchOutput.innerHTML = `<p class="text-red-500 text-center p-4">Falha ao carregar dados. Tente recarregar a página.</p>`;
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
        const results = appState.resultadosEtapas[raceId];

        if (!race || !results || !Array.isArray(results)) return;

        elements.modalTitle.textContent = `Resultados - ${race.nome}`;
        
        // Agrupar resultados por distância
        const groupedByDistance = results.reduce((acc, athlete) => {
            const dist = athlete.distancia || 'N/A';
            if (!acc[dist]) acc[dist] = [];
            acc[dist].push(athlete);
            return acc;
        }, {});

        let contentHTML = '';
        for (const distancia in groupedByDistance) {
            contentHTML += `<h3 class="modal-category-title">${distancia}</h3>`;
            contentHTML += `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left text-gray-300 results-table">
                        <thead class="table-header">
                            <tr>
                                <th class="px-4 py-2">Pos. Geral</th>
                                <th class="px-4 py-2">Atleta</th>
                                <th class="px-4 py-2">Equipe</th>
                                <th class="px-4 py-2">Tempo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${groupedByDistance[distancia].sort((a,b) => a.classificacoes.geral - b.classificacoes.geral).map(atleta => `
                                <tr class="bg-gray-800 border-b border-gray-700">
                                    <td class="px-4 py-2 font-medium text-center">${atleta.classificacoes.geral}º</td>
                                    <td class="px-4 py-2">${atleta.nome_completo}</td>
                                    <td class="px-4 py-2 text-gray-400">${atleta.equipe || 'Individual'}</td>
                                    <td class="px-4 py-2 font-mono">${atleta.tempo_liquido}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
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

    // --- LÓGICA DO BUSCADOR GERAL ---
    function performGlobalSearch() {
        const searchTerm = elements.globalSearchInput.value.trim().toUpperCase();
        if (searchTerm.length < 3) {
            elements.globalSearchOutput.innerHTML = `<p class="text-yellow-400 text-center p-4">Digite pelo menos 3 caracteres.</p>`;
            return;
        }
        elements.globalSearchOutput.innerHTML = `<p class="text-gray-400 text-center p-4">Buscando...</p>`;

        let allResults = [];
        for (const raceId in appState.resultadosEtapas) {
            const raceData = appState.resultadosEtapas[raceId];
            if (Array.isArray(raceData)) {
                const raceInfo = appState.allCorridas.copaAlcer?.[raceId] || appState.allCorridas.geral?.[raceId];
                const foundAthletes = raceData.filter(athlete =>
                    athlete.nome_completo.toUpperCase().includes(searchTerm)
                );
                foundAthletes.forEach(athlete => allResults.push({ ...athlete, raceInfo }));
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
            if (!acc[result.nome_completo]) {
                acc[result.nome_completo] = [];
            }
            acc[result.nome_completo].push(result);
            return acc;
        }, {});

        let html = '';
        for (const athleteName in groupedByAthlete) {
            html += `
            <div class="athlete-profile-card">
                <div class="athlete-profile-header">${athleteName}</div>
                <div class="">`; // Removido p-4 e space-y-3 para dar mais controle ao item
            
            groupedByAthlete[athleteName].forEach(res => {
                html += `
                    <div class="athlete-result-item">
                        <div>
                            <div class="result-label">Corrida</div>
                            <div class="result-value">${res.raceInfo?.nome || 'Corrida sem nome'}</div>
                        </div>
                        <div>
                            <div class="result-label">Distância</div>
                            <div class="result-value">${res.distancia}</div>
                        </div>
                         <div>
                            <div class="result-label">Pos. Geral</div>
                            <div class="result-value pos">${res.classificacoes.geral}º</div>
                        </div>
                        <div>
                            <div class="result-label">Pos. Faixa Etária</div>
                            <div class="result-value pos">${res.classificacoes.faixa_etaria.posicao}º (${res.classificacoes.faixa_etaria.faixa})</div>
                        </div>
                        <div>
                            <div class="result-label">Tempo</div>
                            <div class="result-value">${res.tempo_liquido}</div>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }
        elements.globalSearchOutput.innerHTML = html;
    }

    // --- LÓGICA DO RANKING ---
    function renderRankingTableHeader() {
        const header = document.getElementById('ranking-table-header');
        if (header) {
            header.innerHTML = `
                <th class="px-6 py-3">Pos.</th>
                <th class="px-6 py-3">Atleta</th>
                <th class="px-6 py-3 text-center">Etapas</th>
                <th class="px-6 py-3 text-center">Pontos</th>
            `;
        }
    }

    function updateRankingView() {
        const percurso = elements.filtroPercurso.value; // "5K"
        const genero = elements.filtroGenero.value; // "Masculino"
        
        const rankingForDistance = appState.rankingData[percurso];
        const athletes = rankingForDistance ? (rankingForDistance[genero] || []) : [];
        
        renderRankingTable(athletes);
    }

    function renderRankingTable(athletes) {
        if (!elements.rankingTableBody) return;
        
        const sortedAthletes = [...athletes].sort((a, b) => b.pontos_acumulados - a.pontos_acumulados);
        
        if (sortedAthletes.length === 0) {
            elements.rankingTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-400">Nenhum atleta no ranking para esta seleção.</td></tr>`;
            elements.rankingToggleContainer.classList.add('hidden');
            return;
        }

        elements.rankingTableBody.innerHTML = sortedAthletes.map((atleta, index) => `
            <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                <td class="px-6 py-4 font-medium text-white">${index + 1}º</td>
                <td class="px-6 py-4">
                    <div class="font-semibold text-white">${atleta.nome_completo}</div>
                    <div class="text-xs text-gray-400">${atleta.equipe || "Individual"}</div>
                </td>
                <td class="px-6 py-4 text-center">${Object.keys(atleta.pontos_por_etapa).length}</td>
                <td class="px-6 py-4 text-center font-bold text-blue-400 text-lg">${atleta.pontos_acumulados}</td>
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
        const isCollapsed = elements.rankingTableBody.classList.toggle('collapsed');
        elements.rankingToggleButton.textContent = isCollapsed ? 'Ver Ranking Completo' : 'Mostrar Menos';
    }

    initializeApp();
});
