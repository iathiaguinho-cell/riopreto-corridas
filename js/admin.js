// ===================================================================
// ARQUIVO DE GESTÃO - Lógica do painel de administração (VERSÃO PROFISSIONAL)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificação de autenticação é a primeira coisa a ser feita
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            initializeApp();
        } else {
            // Se não estivermos na página de login, redireciona
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });

    function initializeApp() {
        const db = firebase.database();
        
        // Mapeamento centralizado dos elementos do DOM para fácil manutenção
        const elements = {
            // Formulário de Corridas
            raceForm: document.getElementById('race-form'),
            formTitle: document.getElementById('form-title'),
            raceIdInput: document.getElementById('race-id'),
            raceNameInput: document.getElementById('race-name'),
            raceCityInput: document.getElementById('race-city'),
            raceDateInput: document.getElementById('race-date'),
            raceLinkInput: document.getElementById('race-link'),
            raceCalendarSelect: document.getElementById('race-calendar'),
            
            // Listas de Corridas
            copaRaceList: document.getElementById('copa-race-list'),
            geralRaceList: document.getElementById('geral-race-list'),
            
            // Upload de Resultados
            resultsRaceSelect: document.getElementById('race-select-results'),
            uploadResultsButton: document.getElementById('upload-results-button'),
            resultsFileInput: document.getElementById('results-file'),
            uploadResultsStatus: document.getElementById('upload-results-status'),
            
            // Upload de Ranking
            rankingFileInput: document.getElementById('ranking-file'),
            uploadRankingButton: document.getElementById('upload-ranking-button'),
            uploadRankingStatus: document.getElementById('upload-ranking-status')
        };
        
        // --- Lógica Principal ---
        loadAndDisplayRaces();
        addEventListeners();

        function addEventListeners() {
            elements.raceForm.addEventListener('submit', handleRaceFormSubmit);
            document.getElementById('clear-form-button').addEventListener('click', clearForm);
            elements.uploadResultsButton.addEventListener('click', () => handleFileUpload('results'));
            elements.uploadRankingButton.addEventListener('click', () => handleFileUpload('ranking'));
        }

        function loadAndDisplayRaces() {
            db.ref('corridas').on('value', snapshot => {
                const allCorridas = snapshot.val() || { copaAlcer: {}, geral: {} };
                renderRaceList(allCorridas.copaAlcer, elements.copaRaceList, 'copaAlcer');
                renderRaceList(allCorridas.geral, elements.geralRaceList, 'geral');
                populateResultsRaceSelect({ ...allCorridas.copaAlcer, ...allCorridas.geral });
            });
        }

        function renderRaceList(races, element, calendar) {
            // (Esta função pode ser mantida como a original, ela já é eficiente)
            // ...
        }

        function handleRaceFormSubmit(e) {
            // (Esta função pode ser mantida como a original)
            // ...
        }
        
        function populateRaceFormForEdit(id, calendar) {
             // (Esta função pode ser mantida como a original)
            // ...
        }

        function deleteRace(id, calendar) {
             // (Esta função pode ser mantida como a original)
            // ...
        }
        
        function clearForm() {
            // (Esta função pode ser mantida como a original)
            // ...
        }

        function populateResultsRaceSelect(races) {
            elements.resultsRaceSelect.innerHTML = '<option value="">Selecione uma corrida</option>';
            if(!races) return;
            // Ordenar corridas por data para facilitar a seleção
            const sortedRaces = Object.values(races).sort((a,b) => new Date(b.data) - new Date(a.data));
            sortedRaces.forEach(race => {
                const option = document.createElement('option');
                option.value = race.id;
                option.textContent = `${race.nome} (${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')})`;
                elements.resultsRaceSelect.appendChild(option);
            });
        }

        function handleFileUpload(uploadType) {
            const fileInput = (uploadType === 'ranking') ? elements.rankingFileInput : elements.resultsFileInput;
            const statusElement = (uploadType === 'ranking') ? elements.uploadRankingStatus : elements.uploadResultsStatus;
            
            const file = fileInput.files[0];
            if (!file) {
                updateStatus(statusElement, "Por favor, selecione um arquivo JSON.", "error");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (uploadType === 'results') {
                        const raceId = elements.resultsRaceSelect.value;
                        if (!raceId) {
                            updateStatus(statusElement, "Selecione uma corrida para associar os resultados.", "error");
                            return;
                        }
                        if (!validateResultsData(data)) {
                             updateStatus(statusElement, "Erro: O arquivo de resultados não segue a estrutura profissional exigida.", "error");
                             return;
                        }
                        uploadDataToFirebase(`resultadosEtapas/${raceId}`, data, statusElement, "Resultados da etapa");
                    } 
                    
                    else if (uploadType === 'ranking') {
                        if (!validateRankingData(data)) {
                            updateStatus(statusElement, "Erro: O arquivo de ranking não segue a estrutura profissional exigida.", "error");
                             return;
                        }
                        uploadDataToFirebase('rankingCopaAlcer', data, statusElement, "Ranking da Copa");
                    }

                } catch (error) {
                    updateStatus(statusElement, `Erro no formato do arquivo JSON: ${error.message}`, "error");
                }
            };
            reader.readAsText(file);
        }

        function uploadDataToFirebase(path, data, statusElement, dataType) {
            updateStatus(statusElement, `Enviando ${dataType}...`, "loading");
            db.ref(path).set(data)
                .then(() => {
                    updateStatus(statusElement, `${dataType} enviado com sucesso!`, "success");
                })
                .catch(error => {
                    updateStatus(statusElement, `Falha no envio: ${error.message}`, "error");
                });
        }
        
        // --- FUNÇÕES DE VALIDAÇÃO DA ESTRUTURA DOS DADOS ---
        function validateResultsData(data) {
            if (!Array.isArray(data) || data.length === 0) return false;
            const firstAthlete = data[0];
            // Verifica se as chaves principais existem no primeiro atleta do array
            return 'numero_peito' in firstAthlete &&
                   'nome_completo' in firstAthlete &&
                   'distancia' in firstAthlete &&
                   'classificacoes' in firstAthlete &&
                   'geral' in firstAthlete.classificacoes;
        }

        function validateRankingData(data) {
            if (typeof data !== 'object' || Array.isArray(data)) return false;
            const firstKey = Object.keys(data)[0]; // Pega a primeira distância, ex: "5K"
            if (!data[firstKey] || !data[firstKey]['Masculino'] || !data[firstKey]['Feminino']) return false;
            
            const firstAthlete = data[firstKey]['Masculino'][0] || data[firstKey]['Feminino'][0];
            if (!firstAthlete) return true; // Pode ser um ranking vazio
            
            return 'nome_completo' in firstAthlete && 'pontos_acumulados' in firstAthlete;
        }

        function updateStatus(element, message, type) {
            if (!element) return;
            element.textContent = message;
            element.className = 'text-center mt-4 text-sm font-semibold ';
            
            const typeClasses = {
                success: 'text-green-400',
                error: 'text-red-400',
                loading: 'text-yellow-400',
                default: 'text-gray-400'
            };
            element.classList.add(typeClasses[type] || typeClasses.default);
        }
    }
});
