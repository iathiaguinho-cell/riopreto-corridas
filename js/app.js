document.addEventListener('DOMContentLoaded', () => {
    if (!firebase.apps.length) { firebase.initializeApp(FIREBASE_CONFIG); }

    const appState = {
        atletas: {},
        corridas: {},
        resultados: {},
        rankingData: {}
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
        geralContainer: document.getElementById('geral-container')
    };

    function initializeApp() {
        addEventListeners();
        fetchAllData();
    }

    function addEventListeners() {
        elements.globalSearchButton.addEventListener('click', performGlobalSearch);
        elements.globalSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performGlobalSearch(); });
        elements.modalOverlay.addEventListener('click', (e) => { if (e.target === elements.modalOverlay) closeResultsModal(); });
        // Add listeners para filtros de ranking se necessário
    }
    
    async function fetchAllData() {
        const db = firebase.database();
        const fetchData = (path) => db.ref(path).once('value').then(snap => snap.val() || {});

        [
            appState.atletas, 
            appState.corridas, 
            appState.resultados, 
            appState.rankingData
        ] = await Promise.all([
            fetchData('atletas'),
            fetchData('corridas'),
            fetchData('resultados'),
            fetchData('rankingCopaAlcer')
        ]);
        
        console.log("Dados carregados (nova estrutura):", appState);
        renderAllCalendars();
        // Chamar a renderização do ranking aqui
    }

    function renderAllCalendars() {
        const todasCorridas = Object.values(appState.corridas);
        // Filtra para mostrar apenas corridas agendadas no calendário
        const corridasCopa = todasCorridas.filter(c => c.tipo === 'copaAlcer' && c.status === 'agendada').sort((a,b) => new Date(a.data) - new Date(b.data));
        const corridasGerais = todasCorridas.filter(c => c.tipo === 'geral' && c.status === 'agendada').sort((a,b) => new Date(a.data) - new Date(b.data));

        renderCalendar(corridasCopa, elements.copaContainer);
        renderCalendar(corridasGerais, elements.geralContainer);
    }
    
    window.renderCalendar = function(corridas, container) {
        if (!container) return;
        if (corridas.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center col-span-full">Nenhuma corrida agendada.</p>`;
            return;
        }
        
        container.innerHTML = corridas.map(corrida => {
            const dataObj = new Date(`${corrida.data}T12:00:00Z`);
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = dataObj.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
            
            // Botão de resultados só aparece para corridas realizadas
            const resultadosBtnHTML = `<button class="results-button" onclick="showRaceResultsModal('${corrida.id}', event)"><i class='bx bx-table mr-2'></i>Resultados</button>`;
            
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
        
        const corrida = appState.corridas[raceId];
        const todosResultados = Object.values(appState.resultados);
        const resultadosDaCorrida = todosResultados.filter(r => r.corridaId === raceId);

        if (!corrida || resultadosDaCorrida.length === 0) {
            alert("Resultados para esta corrida ainda não foram publicados.");
            return;
        }

        elements.modalTitle.textContent = `Resultados - ${corrida.nome}`;
        let contentHTML = '';

        const groupedResults = resultadosDaCorrida.reduce((acc, res) => {
            const key = `${res.percurso} - ${res.genero}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(res);
            return acc;
        }, {});

        for (const groupKey in groupedResults) {
            contentHTML += `<h3 class="modal-category-title">${groupKey}</h3>`;
            const atletasDoGrupo = groupedResults[groupKey].sort((a,b) => a.classificacao - b.classificacao);
            
            contentHTML += `<div class="overflow-x-auto"><table class="w-full text-sm text-left text-gray-300 results-table">
                                <thead class="table-header"><tr><th class="px-4 py-2">#</th><th class="px-4 py-2">Atleta</th><th class="px-4 py-2">Equipe</th><th class="px-4 py-2">Tempo</th></tr></thead><tbody>`;
            atletasDoGrupo.forEach(resultado => {
                const atletaInfo = appState.atletas[resultado.atletaId];
                contentHTML += `<tr class="bg-gray-800 border-b border-gray-700">
                                    <td class="px-4 py-2 font-medium">${resultado.classificacao}</td>
                                    <td class="px-4 py-2">${atletaInfo.nome}</td>
                                    <td class="px-4 py-2 text-gray-400">${resultado.assessoria || 'Individual'}</td>
                                    <td class="px-4 py-2 font-mono">${resultado.tempo}</td>
                               </tr>`;
            });
            contentHTML += `</tbody></table></div>`;
        }
        
        elements.modalContent.innerHTML = contentHTML;
        elements.modalOverlay.classList.remove('hidden');
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

        const atletaIdsEncontrados = Object.keys(appState.atletas).filter(id => 
            appState.atletas[id].nome.toUpperCase().includes(searchTerm)
        );

        if (atletaIdsEncontrados.length === 0) {
            elements.globalSearchOutput.innerHTML = `<p class="text-red-400 text-center p-4">Nenhum atleta encontrado.</p>`;
            return;
        }
        
        const todosResultados = Object.values(appState.resultados);
        let html = '';

        atletaIdsEncontrados.forEach(atletaId => {
            const atletaInfo = appState.atletas[atletaId];
            const resultadosDoAtleta = todosResultados.filter(r => r.atletaId === atletaId);
            
            if (resultadosDoAtleta.length > 0) {
                html += `<div class="athlete-profile-card"><div class="athlete-profile-header">${atletaInfo.nome}</div><div>`;
                resultadosDoAtleta.forEach(res => {
                    const corridaInfo = appState.corridas[res.corridaId];
                    html += `
                        <div class="athlete-result-item">
                            <div><div class="result-label">Evento</div><div class="result-value">${corridaInfo.nome}</div></div>
                            <div><div class="result-label">Percurso</div><div class="result-value">${res.percurso} ${res.genero}</div></div>
                            <div><div class="result-label">Posição</div><div class="result-value">${res.classificacao}º</div></div>
                            <div><div class="result-label">Tempo</div><div class="result-value">${res.tempo}</div></div>
                        </div>`;
                });
                html += `</div></div>`;
            }
        });

        elements.globalSearchOutput.innerHTML = html || `<p class="text-red-400 text-center p-4">Nenhum resultado encontrado para este atleta.</p>`;
    }

    initializeApp();
});
