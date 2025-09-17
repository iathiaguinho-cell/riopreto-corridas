// ===================================================================
// ARQUIVO PRINCIPAL - Lógica da interface pública.
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {

    // Centraliza o estado da aplicação
    const appState = {
        rankingData: {},
        resultadosEtapas: {},
        allCorridas: {},
        rankingSortConfig: { column: 'classificacao', direction: 'asc' }
    };

    /**
     * Inicializa a aplicação e a conexão com o Firebase.
     */
    function initializeApp() {
        console.log("Portal das Corridas: Inicializando...");
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            console.log("Firebase inicializado com sucesso!");
            addEventListeners();
            fetchAllData();
        } catch (error) {
            console.error("Erro na inicialização do Firebase:", error);
            displayConnectionError();
        }
    }

    /**
     * Exibe mensagens de erro na UI em caso de falha de conexão.
     */
    function displayConnectionError() {
        const errorMessage = `<p class="loading-message error">Falha ao conectar com a base de dados.</p>`;
        document.getElementById('copa-container').innerHTML = errorMessage;
        document.getElementById('geral-container').innerHTML = errorMessage;
        document.getElementById('ranking-table-body').innerHTML = `<tr><td colspan="8" class="loading-message p-8 error">Falha ao conectar com a base de dados.</td></tr>`;
    }

    /**
     * Adiciona os listeners de eventos para os filtros.
     */
    function addEventListeners() {
        document.getElementById('filtro-percurso').addEventListener('change', updateRankingView);
        document.getElementById('filtro-genero').addEventListener('change', updateRankingView);
    }

    /**
     * Busca todos os dados essenciais do Firebase em tempo real.
     */
    function fetchAllData() {
        const db = firebase.database();
        
        db.ref('corridas').on('value', snapshot => {
            appState.allCorridas = snapshot.val() || {};
            renderAllCalendars();
        }, handleDbError);

        db.ref('resultadosEtapas').on('value', snapshot => {
            appState.resultadosEtapas = snapshot.val() || {};
            // Re-renderiza calendários para mostrar/ocultar botões de resultado
            renderAllCalendars(); 
        }, handleDbError);

        db.ref('rankingCopaAlcer').on('value', snapshot => {
            appState.rankingData = snapshot.val() || {};
            updateRankingView();
        }, handleDbError);
    }

    /**
     * Centraliza o tratamento de erros de leitura do banco de dados.
     * @param {Error} error Objeto de erro do Firebase.
     */
    function handleDbError(error) {
        console.error("Erro ao buscar dados do Firebase:", error);
        displayConnectionError();
    }

    /**
     * Renderiza ambos os calendários de corridas.
     */
    function renderAllCalendars() {
        if (!appState.allCorridas) return;
        renderCalendar(appState.allCorridas.copaAlcer, 'copa-container');
        renderCalendar(appState.allCorridas.geral, 'geral-container');
    }

    /**
     * Renderiza um calendário de corridas em um container específico.
     * @param {object} corridas - Objeto com os dados das corridas.
     * @param {string} containerId - ID do elemento container.
     */
    window.renderCalendar = function(corridas, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!corridas || Object.keys(corridas).length === 0) {
            container.innerHTML = `<p class="loading-message">Nenhuma corrida cadastrada nesta categoria.</p>`;
            return;
        }

        const corridasArray = Object.values(corridas).sort((a, b) => new Date(a.data) - new Date(b.data));
        
        // Usa document fragments para melhor performance
        const fragment = document.createDocumentFragment();
        corridasArray.forEach(corrida => {
            const wrapper = document.createElement('div');
            wrapper.className = 'race-card-wrapper';
            
            const dataObj = new Date(`${corrida.data}T12:00:00Z`);
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = dataObj.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
            
            const resultadosBtnHTML = appState.resultadosEtapas[corrida.id] ?
                `<button class="results-button" onclick="toggleResults('${corrida.id}')"><i class='bx bx-search-alt-2 mr-2'></i>Resultados</button>` :
                `<div class="race-button-disabled">Resultados em Breve</div>`;
            
            const inscricoesBtnHTML = corrida.linkInscricao ?
                `<a href="${corrida.linkInscricao}" target="_blank" rel="noopener noreferrer" class="inscricoes-button"><i class='bx bx-link-external mr-2'></i>Inscrições</a>` :
                `<div class="race-button-disabled">Inscrições Encerradas</div>`;

            wrapper.innerHTML = `
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
                </div>`;
            fragment.appendChild(wrapper);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    /**
     * Alterna a visibilidade do painel de resultados.
     * @param {string} raceId - ID da corrida.
     */
    window.toggleResults = function(raceId) {
        const panel = document.getElementById(`results-${raceId}`);
        if (panel) panel.classList.toggle('hidden');
    }

    /**
     * Procura por um atleta nos resultados de uma etapa específica.
     * @param {string} raceId - ID da corrida.
     */
    window.searchAthlete = function(raceId) {
        const input = document.getElementById(`search-input-${raceId}`);
        const output = document.getElementById(`results-output-${raceId}`);
        const searchTerm = input.value.trim().toUpperCase();

        if (searchTerm.length < 3) {
            output.innerHTML = `<div class="results-message warning">Digite pelo menos 3 letras.</div>`;
            return;
        }

        const etapaResultados = appState.resultadosEtapas[raceId];
        if (!etapaResultados) {
            output.innerHTML = `<div class="results-message error">Resultados para esta etapa não encontrados.</div>`;
            return;
        }

        let foundAthletes = [];
        for (const percurso in etapaResultados) {
            for (const genero in etapaResultados[percurso]) {
                const atletas = etapaResultados[percurso][genero];
                const filtered = atletas.filter(atleta => atleta.nome.toUpperCase().includes(searchTerm));
                filtered.forEach(atleta => foundAthletes.push({ ...atleta, genero, percurso }));
            }
        }

        if (foundAthletes.length === 0) {
            output.innerHTML = `<div class="results-message">Nenhum atleta encontrado com o nome "<strong>${input.value}</strong>".</div>`;
            return;
        }
        
        // Estrutura de exibição aprimorada
        const resultsHTML = foundAthletes.map(atleta => `
            <div class="athlete-card-small">
                <div class="font-semibold text-white">${atleta.nome}</div>
                <div class="text-xs text-gray-400">#${atleta.classificacao} | ${atleta.tempo} | ${atleta.percurso} ${atleta.genero}</div>
            </div>`).join('');
        output.innerHTML = `<div class="grid grid-cols-1 gap-2">${resultsHTML}</div>`;
    }

    /**
     * Atualiza a visualização da tabela de ranking com base nos filtros.
     */
    function updateRankingView() {
        const percurso = document.getElementById('filtro-percurso').value;
        const genero = document.getElementById('filtro-genero').value;
        const atletas = appState.rankingData[genero] ? (appState.rankingData[genero][percurso] || []) : [];
        renderRankingTable(atletas);
    }
    
    /**
     * Define a coluna e a direção da ordenação da tabela.
     * @param {string} column - A coluna a ser ordenada.
     */
    window.setSort = function(column) {
        const { rankingSortConfig } = appState;
        if (rankingSortConfig.column === column) {
            rankingSortConfig.direction = rankingSortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            rankingSortConfig.column = column;
            rankingSortConfig.direction = 'asc';
        }
        updateRankingView();
    }

    /**
     * Renderiza a tabela de ranking de atletas.
     * @param {Array} atletas - Array de objetos de atletas.
     */
    function renderRankingTable(atletas) {
        const tableBody = document.getElementById("ranking-table-body");
        const headerRow = document.getElementById("ranking-table-header");
        if (!tableBody || !headerRow) return;

        const { rankingSortConfig } = appState;
        const sortIndicator = (column) => rankingSortConfig.column === column ? (rankingSortConfig.direction === 'asc' ? '▲' : '▼') : '';
        
        headerRow.innerHTML = `
            <th class="px-6 py-3 sortable" onclick="setSort('classificacao')"># ${sortIndicator('classificacao')}</th>
            <th class="px-6 py-3 sortable" onclick="setSort('nome')">Atleta ${sortIndicator('nome')}</th>
            <th class="px-6 py-3">Assessoria</th>
            <th class="px-6 py-3 text-center sortable" onclick="setSort('etapa1')">Et. 1 ${sortIndicator('etapa1')}</th>
            <th class="px-6 py-3 text-center sortable" onclick="setSort('etapa2')">Et. 2 ${sortIndicator('etapa2')}</th>
            <th class="px-6 py-3 text-center sortable" onclick="setSort('etapa3')">Et. 3 ${sortIndicator('etapa3')}</th>
            <th class="px-6 py-3 text-center sortable" onclick="setSort('etapa4')">Et. 4 ${sortIndicator('etapa4')}</th>
            <th class="px-6 py-3 text-center sortable" onclick="setSort('acumulado')">Total ${sortIndicator('acumulado')}</th>
        `;

        if (!atletas || atletas.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-gray-400">Nenhum resultado para esta categoria.</td></tr>`;
            return;
        }

        const sortedAthletes = [...atletas].sort((a, b) => {
            const col = rankingSortConfig.column;
            const dir = rankingSortConfig.direction === 'asc' ? 1 : -1;
            // Garante que valores nulos ou indefinidos sejam tratados como 0 para números e string vazia para texto
            const valA = a[col] || (typeof a[col] === 'string' ? '' : 0);
            const valB = b[col] || (typeof b[col] === 'string' ? '' : 0);

            if (typeof valA === 'string') {
                return valA.localeCompare(valB) * dir;
            }
            return (valA - valB) * dir;
        });
        
        tableBody.innerHTML = sortedAthletes.map(atleta => `
            <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                <td class="px-6 py-4 font-medium text-white">${atleta.classificacao}</td>
                <td class="px-6 py-4">
                    <div class="font-semibold">${atleta.nome}</div>
                    <div class="text-xs text-gray-400">${atleta.idade} anos</div>
                </td>
                <td class="px-6 py-4">${atleta.assessoria || "Individual"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa1 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa2 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa3 || "-"}</td>
                <td class="px-6 py-4 text-center">${atleta.etapa4 || "-"}</td>
                <td class="px-6 py-4 text-center font-bold text-blue-400">${atleta.acumulado}</td>
            </tr>
        `).join("");
    }

    // Inicia a aplicação
    initializeApp();
});
