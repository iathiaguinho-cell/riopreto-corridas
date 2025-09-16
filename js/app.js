// ===================================================================
// SCRIPT PRINCIPAL DA APLICAÇÃO
// ===================================================================

let rankingData = {}; // Armazena dados do ranking da copa
let resultadosEtapas = {}; // Armazena dados de resultados por etapa

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal das Corridas inicializado. Conectando com Firebase...");

    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        console.log("Firebase inicializado com sucesso!");
        
        // --- BUSCA DE DADOS INICIAIS ---
        fetchCalendarData();
        fetchRankingData();
        fetchEtapasData(); // Nova função para buscar dados das etapas

        // --- LISTENERS DE EVENTOS ---
        document.getElementById('filtro-percurso').addEventListener('change', updateRankingView);
        document.getElementById('filtro-genero').addEventListener('change', updateRankingView);
        document.getElementById('search-button').addEventListener('click', searchAthleteResults);
        document.getElementById('search-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchAthleteResults();
            }
        });

    } catch (error) {
        console.error("Ocorreu um erro ao inicializar o Firebase:", error);
        // Tratamento de erro visual para o usuário
        const loadingCal = document.getElementById('loading-calendario');
        if (loadingCal) loadingCal.innerText = "Erro ao conectar com a base de dados.";
        const rankingBody = document.getElementById('ranking-table-body');
        if (rankingBody) rankingBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-red-500">Erro ao inicializar o Firebase.</td></tr>`;
    }
});

// --- FUNÇÕES DO CALENDÁRIO ---
function fetchCalendarData() {
    const corridasRef = firebase.database().ref('corridas');
    corridasRef.on('value', (snapshot) => renderCalendar(snapshot.val()), (error) => renderCalendar(null, error));
}

function renderCalendar(corridas, error = null) {
    const container = document.getElementById('calendario-container');
    if (!container) {
        console.error("O elemento #calendario-container não foi encontrado.");
        return;
    }
    container.innerHTML = '';
    if (error) {
        container.innerHTML = '<p class="text-center col-span-full text-red-500">Não foi possível carregar o calendário.</p>';
        return;
    }
    if (!corridas) {
        container.innerHTML = '<p class="text-center col-span-full text-gray-400">Nenhuma corrida cadastrada.</p>';
        return;
    }
    const corridasArray = Object.values(corridas).sort((a, b) => new Date(a.data) - new Date(b.data));
    corridasArray.forEach(corrida => {
        const dataObj = new Date(`${corrida.data}T12:00:00Z`);
        const dia = String(dataObj.getDate()).padStart(2, '0');
        const mes = dataObj.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
        const cardHTML = `
            <div class="race-card bg-gray-800 rounded-lg shadow-lg overflow-hidden flex transform transition-transform hover:scale-105">
                <div class="race-date bg-blue-600 text-white p-4 flex flex-col items-center justify-center text-center">
                    <span class="text-3xl font-bold">${dia}</span>
                    <span class="font-semibold">${mes}</span>
                </div>
                <div class="p-4 flex flex-col justify-between flex-grow">
                    <div>
                        <h3 class="font-bold text-lg text-white">${corrida.nome}</h3>
                        <p class="text-sm text-gray-400 flex items-center mt-1"><i class='bx bxs-map mr-1'></i>${corrida.cidade}</p>
                    </div>
                    <a href="${corrida.linkInscricao || '#'}" target="_blank" rel="noopener noreferrer" class="race-button mt-4 text-center font-semibold py-2 px-4 rounded transition-colors ${corrida.linkInscricao ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}">
                       ${corrida.linkInscricao ? 'Inscreva-se' : 'Em Breve'}
                    </a>
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });
}

// --- FUNÇÕES DO RANKING DA COPA ALCER ---
function fetchRankingData() {
    const rankingRef = firebase.database().ref('rankingCopaAlcer');
    rankingRef.on('value', (snapshot) => {
        rankingData = snapshot.val() || {};
        updateRankingView();
    }, (error) => {
        const tableBody = document.getElementById('ranking-table-body');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-red-500">Erro ao carregar o ranking.</td></tr>`;
    });
}

function updateRankingView() {
    const percurso = document.getElementById('filtro-percurso').value;
    const genero = document.getElementById('filtro-genero').value;
    const atletas = rankingData[genero] ? rankingData[genero][percurso] : null;
    renderRankingTable(atletas);
}

function renderRankingTable(atletas) {
    const tableBody = document.getElementById("ranking-table-body");
    const header = document.getElementById("ranking-table-header");

    if (!tableBody || !header) {
        console.error("Elementos da tabela de ranking não encontrados.");
        return;
    }

    header.innerHTML = `
        <th scope="col" class="px-6 py-3">#</th>
        <th scope="col" class="px-6 py-3">Atleta</th>
        <th scope="col" class="px-6 py-3">Assessoria</th>
        <th scope="col" class="px-6 py-3 text-center">Et. 1</th>
        <th scope="col" class="px-6 py-3 text-center">Et. 2</th>
        <th scope="col" class="px-6 py-3 text-center">Et. 3</th>
        <th scope="col" class="px-6 py-3 text-center">Et. 4</th>
        <th scope="col" class="px-6 py-3 text-center">Total</th>
    `;

    if (!atletas || atletas.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-gray-400">Nenhum resultado encontrado para esta categoria.</td></tr>`;
        return;
    }

    tableBody.innerHTML = atletas.map(atleta => `
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

// ===================================================================
// FUNÇÕES - CALCULADORA DE RESULTADOS POR ETAPA
// ===================================================================

function fetchEtapasData() {
    const etapasRef = firebase.database().ref('resultadosEtapas');
    etapasRef.on('value', (snapshot) => {
        resultadosEtapas = snapshot.val() || {};
        console.log("Dados de resultados por etapa recebidos:", resultadosEtapas);
    }, (error) => {
        console.error("Erro ao buscar dados das etapas:", error);
    });
}

function searchAthleteResults() {
    const searchName = document.getElementById('search-name').value.trim().toUpperCase();
    const resultsContainer = document.getElementById('search-results-container');
    
    if (searchName.length < 3) {
        resultsContainer.innerHTML = `<div class="results-message warning">Digite pelo menos 3 letras para buscar.</div>`;
        return;
    }

    const etapaData = resultadosEtapas['corrida_pf_2025'];
    if (!etapaData) {
        resultsContainer.innerHTML = `<div class="results-message error">Dados da etapa não encontrados.</div>`;
        return;
    }

    let foundAthletes = [];
    for (const genero in etapaData) {
        for (const percurso in etapaData[genero]) {
            const atletas = etapaData[genero][percurso];
            const filtered = atletas.filter(atleta => atleta.nome.toUpperCase().includes(searchName));
            filtered.forEach(atleta => {
                foundAthletes.push({ ...atleta, genero, percurso });
            });
        }
    }

    renderSearchResults(foundAthletes, searchName);
}

function renderSearchResults(athletes, searchTerm) {
    const container = document.getElementById('search-results-container');
    if (!athletes || athletes.length === 0) {
        container.innerHTML = `<div class="results-message">Nenhum atleta encontrado com o nome "<strong>${searchTerm}</strong>" na 1ª Etapa.</div>`;
        return;
    }

    container.innerHTML = `
        <h3 class="text-xl font-semibold text-center mb-4 text-gray-300">Resultados encontrados para "<strong>${searchTerm}</strong>":</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${athletes.map(atleta => `
                <div class="athlete-card">
                    <div class="athlete-header">
                        <div class="athlete-name">${atleta.nome}</div>
                        <div class="athlete-rank">#${atleta.classificacao}</div>
                    </div>
                    <div class="athlete-body">
                        <div class="athlete-detail">
                            <i class='bx bx-run'></i>
                            <span>${atleta.percurso} ${atleta.genero.charAt(0).toUpperCase() + atleta.genero.slice(1)}</span>
                        </div>
                        <div class="athlete-detail">
                            <i class='bx bx-time-five'></i>
                            <span>${atleta.tempo}</span>
                        </div>
                        <div class="athlete-detail">
                            <i class='bx bxs-group'></i>
                            <span>${atleta.equipe || 'Individual'}</span>
                        </div>
                        <div class="athlete-detail">
                            <i class='bx bxs-award'></i>
                            <span>${atleta.pontos} pts</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
