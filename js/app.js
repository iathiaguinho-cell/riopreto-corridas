// ===================================================================
// ARQUIVO PRINCIPAL - Lógica da interface pública.
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const appState = {
        rankingData: {},
        resultadosEtapas: {},
        allCorridas: {},
        rankingSortConfig: { column: 'classificacao', direction: 'asc' }
    };

    // NOVO: Elementos do Modal
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalCity = document.getElementById('modal-city');
    const modalLink = document.getElementById('modal-link');
    const modalContent = document.getElementById('modal-content');

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

    function displayConnectionError() {
        const errorMessage = `<p class="loading-message error">Falha ao conectar com a base de dados.</p>`;
        document.getElementById('copa-container').innerHTML = errorMessage;
        document.getElementById('geral-container').innerHTML = errorMessage;
        document.getElementById('ranking-table-body').innerHTML = `<tr><td colspan="8" class="loading-message p-8 error">Falha ao conectar.</td></tr>`;
    }

    function addEventListeners() {
        document.getElementById('filtro-percurso').addEventListener('change', updateRankingView);
        document.getElementById('filtro-genero').addEventListener('change', updateRankingView);
        document.getElementById('global-search-button').addEventListener('click', searchAthleteGlobally);
        document.getElementById('global-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchAthleteGlobally();
        });
        // NOVO: Listener para fechar o modal
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeRaceDetails();
            }
        });
    }

    function fetchAllData() {
        const db = firebase.database();
        
        db.ref('corridas').on('value', snapshot => {
            appState.allCorridas = snapshot.val() || {};
            renderAllCalendars();
        }, handleDbError);

        db.ref('resultadosEtapas').on('value', snapshot => {
            appState.resultadosEtapas = snapshot.val() || {};
            renderAllCalendars(); 
        }, handleDbError);

        db.ref('rankingCopaAlcer').on('value', snapshot => {
            appState.rankingData = snapshot.val() || {};
            updateRankingView();
        }, handleDbError);
    }

    function handleDbError(error) {
        console.error("Erro ao buscar dados do Firebase:", error);
        displayConnectionError();
    }

    function renderAllCalendars() {
        if (!appState.allCorridas) return;
        renderCalendar(appState.allCorridas.copaAlcer, 'copa-container');
        renderCalendar(appState.allCorridas.geral, 'geral-container');
    }

    window.renderCalendar = function(corridas, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!corridas || Object.keys(corridas).length === 0) {
            container.innerHTML = `<p class="loading-message">Nenhuma corrida cadastrada nesta categoria.</p>`;
            return;
        }

        const corridasArray = Object.values(corridas).sort((a, b) => new Date(a.data) - new Date(b.data));
        
        const fragment = document.createDocumentFragment();
        corridasArray.forEach(corrida => {
            const wrapper = document.createElement('div');
            // MODIFICADO: Adicionado onclick para abrir o modal de detalhes
            wrapper.className = 'race-card-wrapper';
            wrapper.setAttribute('onclick', `showRaceDetails('${corrida.id}', '${containerId.includes('copa') ? 'copaAlcer' : 'geral'}', event)`);
            
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

    // --- LÓGICA DO MODAL DE DETALHES DA CORRIDA ---
    
    window.showRaceDetails = function(raceId, calendar, event) {
        // Impede que o modal abra se o clique foi num botão dentro do card
        if (event.target.closest('a, button')) {
            return;
        }
        
        const race = appState.allCorridas[calendar]?.[raceId];
        if (!race) {
            console.error("Corrida não encontrada:", raceId);
            return;
        }
        
        const dataObj = new Date(`${race.data}T12:00:00Z`);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        
        modalTitle.textContent = race.nome;
        modalDate.innerHTML = `<i class='bx bx-calendar mr-2'></i>${dataFormatada}`;
        modalCity.innerHTML = `<i class='bx bxs-map mr-2'></i>${race.cidade}`;
        
        // Adicionar outras informações se existirem no banco de dados
        modalContent.innerHTML = race.detalhes ? `<p>${race.detalhes.replace(/\n/g, '<br>')}</p>` : '<p class="text-gray-400">Mais informações serão disponibilizadas em breve.</p>';

        if (race.linkInscricao) {
            modalLink.href = race.linkInscricao;
            modalLink.parentElement.classList.remove('hidden');
        } else {
             modalLink.parentElement.classList.add('hidden');
        }
        
        modalOverlay.classList.remove('hidden');
    }

    window.closeRaceDetails = function() {
        modalOverlay.classList.add('hidden');
    }

    // --- FIM DA LÓGICA DO MODAL ---


    window.toggleResults = function(raceId) {
        event.stopPropagation(); // Impede que o modal abra ao clicar no botão
        document.getElementById(`results-${raceId}`)?.classList.toggle('hidden');
    }

    window.searchAthlete = function(raceId) {
        event.stopPropagation();
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
        
        const resultsHTML = foundAthletes.map(atleta => `
            <div class="athlete-card-small">
                <div class="font-semibold text-white">${atleta.nome}</div>
                <div class="text-xs text-gray-400">#${atleta.classificacao} | ${atleta.tempo} | ${atleta.percurso} ${atleta.genero}</div>
            </div>`).join('');
        output.innerHTML = `<div class="grid grid-cols-1 gap-2">${resultsHTML}</div>`;
    }
    
    function searchAthleteGlobally() {
        const output = document.getElementById('global-search-output');
        const searchTerm = document.getElementById('global-search-input').value.trim().toUpperCase();

        if (searchTerm.length < 3) {
            output.innerHTML = `<div class="results-message warning">Digite pelo menos 3 letras.</div>`;
            return;
        }
        output.innerHTML = `<div class="results-message">Buscando...</div>`;

        let allResults = [];
        for (const raceId in appState.resultadosEtapas) {
            const raceName = appState.allCorridas.copaAlcer?.[raceId]?.nome || appState.allCorridas.geral?.[raceId]?.nome || `Etapa ${raceId}`;
            const etapaResultados = appState.resultadosEtapas[raceId];
            
            for (const percurso in etapaResultados) {
                for (const genero in etapaResultados[percurso]) {
                    const atletas = etapaResultados[percurso][genero];
                    const filtered = atletas.filter(atleta => atleta.nome.toUpperCase().includes(searchTerm));
                    filtered.forEach(atleta => allResults.push({ ...atleta, genero, percurso, raceName, raceId }));
                }
            }
        }

        if (allResults.length === 0) {
            output.innerHTML = `<div class="results-message error">Nenhum resultado encontrado para "<strong>${searchTerm}</strong>".</div>`;
            return;
        }

        displayGlobalResults(allResults);
    }
    
    function displayGlobalResults(results) {
        const output = document.getElementById('global-search-output');
        
        const athletes = results.reduce((acc, current) => {
            acc[current.nome] = acc[current.nome] || [];
            acc[current.nome].push(current);
            return acc;
        }, {});

        let html = '';
        for (const athleteName in athletes) {
            html += `
            <div class="athlete-profile-card">
                <div class="athlete-profile-header">${athleteName}</div>
                <div class="p-4">
            `;
            athletes[athleteName].forEach(result => {
                html += `
                    <div class="athlete-result-item">
                        <div>
                            <div class="result-label">Corrida</div>
                            <div class="result-value">${result.raceName}</div>
                        </div>
                         <div>
                            <div class="result-label">Percurso</div>
                            <div class="result-value">${result.percurso} ${result.genero}</div>
                        </div>
                        <div>
                            <div class="result-label">Posição Geral</div>
                            <div class="result-value">${result.classificacao}º</div>
                        </div>
                         <div>
                            <div class="result-label">Tempo</div>
                            <div class="result-value">${result.tempo}</div>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }
        output.innerHTML = html;
    }

    function updateRankingView() {
        const percurso = document.getElementById('filtro-percurso').value;
        const genero = document.getElementById('filtro-genero').value;
        const atletas = appState.rankingData[genero] ? (appState.rankingData[genero][percurso] || []) : [];
        renderRankingTable(atletas);
    }
    
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
            const valA = a[col] || (typeof a[col] === 'string' ? '' : 0);
            const valB = b[col] || (typeof b[col] === 'string' ? '' : 0);

            if (typeof valA === 'string') return valA.localeCompare(valB) * dir;
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

    initializeApp();
});
