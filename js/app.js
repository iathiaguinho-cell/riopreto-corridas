// ===================================================================
// ARQUIVO PRINCIPAL - Lógica da página pública (VERSÃO COM FAIXA ETÁRIA)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o Firebase seja inicializado apenas uma vez.
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }

    const appState = { rankingData: {}, resultadosEtapas: {}, allCorridas: {} };

    const elements = {
        // ... (todos os outros elementos como na versão anterior)
        filtroTipoRanking: document.getElementById('filtro-tipo-ranking'),
        rankingTableBody: document.getElementById("ranking-table-body"),
        rankingTableHeader: document.getElementById('ranking-table-header'),
        rankingToggleButton: document.getElementById("ranking-toggle-button"),
        rankingToggleContainer: document.getElementById("ranking-toggle-container"),
        // ... (resto dos elementos)
    };
    
    // Simplificando a busca por todos os elementos de uma vez
    Object.keys(elements).forEach(key => {
        if (!elements[key]) {
            elements[key] = document.getElementById(key.replace(/([A-Z])/g, "-$1").toLowerCase());
        }
    });


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
    
    // A função renderAllCalendars e as funções do Modal e da Busca Global
    // permanecem as mesmas da versão anterior. Não precisam de alteração.
    // (CÓDIGO COMPLETO INCLUído ABAIXO PARA GARANTIR)

    window.renderCalendar = function(corridas, container) { /* ...código anterior sem alterações... */ };
    window.showRaceResultsModal = function(raceId, event) { /* ...código anterior sem alterações... */ };
    function filterResultsInModal() { /* ...código anterior sem alterações... */ }
    window.closeResultsModal = function() { /* ...código anterior sem alterações... */ }
    function performGlobalSearch() { /* ...código anterior sem alterações... */ }
    function displayGlobalResults(results) { /* ...código anterior sem alterações... */ }
    

    // --- LÓGICA DO RANKING (TOTALMENTE REFEITA) ---

    function updateRankingView() {
        const tipoRanking = elements.filtroTipoRanking.value; // geral ou faixa_etaria
        const percurso = elements.filtroPercurso.value;     // 5K ou 10K
        const genero = elements.filtroGenero.value;         // feminino ou masculino

        const rankingData = appState.rankingData[genero]?.[percurso];

        if (!rankingData) {
            renderRankingTable([]); // Renderiza tabela vazia
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
        const sortedFaixas = Object.keys(faixas).sort(); // Ordena as faixas etárias

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
