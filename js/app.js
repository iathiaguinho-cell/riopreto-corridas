document.addEventListener('DOMContentLoaded', () => {
    const appState = {
        rankingData: {},
        resultadosEtapas: {},
        allCorridas: {},
        rankingSortConfig: { column: 'classificacao', direction: 'asc' }
    };

    // --- Elementos do DOM ---
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalSearchInput = document.getElementById('modal-search-input');
    const rankingTableBody = document.getElementById("ranking-table-body");
    const rankingToggleButton = document.getElementById("ranking-toggle-button");
    const rankingToggleContainer = document.getElementById("ranking-toggle-container");


    function initializeApp() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            addEventListeners();
            fetchAllData();
        } catch (error) {
            console.error("Firebase Init Error:", error);
        }
    }

    function addEventListeners() {
        document.getElementById('filtro-percurso').addEventListener('change', updateRankingView);
        document.getElementById('filtro-genero').addEventListener('change', updateRankingView);
        document.getElementById('global-search-button').addEventListener('click', searchAthleteGlobally);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeResultsModal();
        });
        rankingToggleButton.addEventListener('click', toggleRankingExpansion);
    }

    function fetchAllData() {
        const db = firebase.database();
        db.ref('corridas').on('value', s => { appState.allCorridas = s.val() || {}; renderAllCalendars(); });
        db.ref('resultadosEtapas').on('value', s => { appState.resultadosEtapas = s.val() || {}; renderAllCalendars(); });
        db.ref('rankingCopaAlcer').on('value', s => { appState.rankingData = s.val() || {}; updateRankingView(); });
    }
    
    function renderAllCalendars() {
        if (!appState.allCorridas) return;
        renderCalendar(appState.allCorridas.copaAlcer, 'copa-container');
        renderCalendar(appState.allCorridas.geral, 'geral-container');
    }

    window.renderCalendar = function(corridas, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !corridas) return;
        
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

    // --- NOVO: LÓGICA DO MODAL DE RESULTADOS DE ETAPA ---
    window.showRaceResultsModal = function(raceId, event) {
        if (event) event.stopPropagation();
        
        const race = appState.allCorridas.copaAlcer?.[raceId] || appState.allCorridas.geral?.[raceId];
        const results = appState.resultadosEtapas[raceId];

        if (!race || !results) return;

        modalTitle.textContent = `Resultados - ${race.nome}`;
        
        let contentHTML = '';
        for (const percurso in results) {
            for (const genero in results[percurso]) {
                const atletas = results[percurso][genero];
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
        modalContent.innerHTML = contentHTML;
        modalSearchInput.value = '';
        modalSearchInput.onkeyup = () => filterResultsInModal();
        modalOverlay.classList.remove('hidden');
    }
    
    function filterResultsInModal() {
        const searchTerm = modalSearchInput.value.toUpperCase();
        const tables = modalContent.querySelectorAll('.results-table tbody');
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
        modalOverlay.classList.add('hidden');
    }

    // --- LÓGICA DO RANKING E BUSCA GLOBAL (SEM ALTERAÇÕES SIGNIFICATIVAS) ---
    function updateRankingView() {
        const percurso = document.getElementById('filtro-percurso').value;
        const genero = document.getElementById('filtro-genero').value;
        const atletas = appState.rankingData[genero] ? (appState.rankingData[genero][percurso] || []) : [];
        renderRankingTable(atletas);
    }
    
    function renderRankingTable(atletas) {
        if (!rankingTableBody) return;
        
        const sortedAthletes = [...(atletas || [])].sort((a, b) => {
            // Lógica de ordenação...
            return (a.classificacao || 0) - (b.classificacao || 0);
        });
        
        rankingTableBody.innerHTML = sortedAthletes.map(atleta => `
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

        // NOVO: Lógica para mostrar/esconder botão de expandir
        if (sortedAthletes.length > 10) {
            rankingToggleContainer.classList.remove('hidden');
            rankingTableBody.classList.add('collapsed');
            rankingToggleButton.textContent = 'Ver Ranking Completo';
        } else {
            rankingToggleContainer.classList.add('hidden');
            rankingTableBody.classList.remove('collapsed');
        }
    }

    // NOVO: Função para expandir/recolher o ranking
    function toggleRankingExpansion() {
        rankingTableBody.classList.toggle('collapsed');
        if (rankingTableBody.classList.contains('collapsed')) {
            rankingToggleButton.textContent = 'Ver Ranking Completo';
        } else {
            rankingToggleButton.textContent = 'Mostrar Menos';
        }
    }
    
    function searchAthleteGlobally() {
        // Lógica da busca global...
    }

    initializeApp();
});
