// ===================================================================
// ARQUIVO DE GESTÃO - Lógica do painel de administração (VERSÃO PROFISSIONAL V2.0)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!firebase.apps.length) { firebase.initializeApp(FIREBASE_CONFIG); }

    firebase.auth().onAuthStateChanged(user => {
        if (user) { 
            console.log("Admin autenticado:", user.email);
            initializeApp();
        } 
        else { 
            if (!window.location.pathname.endsWith('login.html')) { 
                window.location.href = 'login.html'; 
            } 
        }
    });

    function initializeApp() {
        const db = firebase.database();
        
        // Mapeamento de todos os elementos da página
        const raceForm = document.getElementById('race-form');
        const formTitle = document.getElementById('form-title');
        const raceIdInput = document.getElementById('race-id');
        const raceNameInput = document.getElementById('race-name');
        const raceCityInput = document.getElementById('race-city');
        const raceDateInput = document.getElementById('race-date');
        const raceLinkInput = document.getElementById('race-link');
        const raceCalendarSelect = document.getElementById('race-calendar');
        const copaRaceList = document.getElementById('copa-race-list');
        const geralRaceList = document.getElementById('geral-race-list');
        const resultsRaceSelect = document.getElementById('race-select-results');
        const uploadResultsButton = document.getElementById('upload-results-button');
        const resultsFileInput = document.getElementById('results-file');
        const uploadResultsStatus = document.getElementById('upload-results-status');
        const rankingFileInput = document.getElementById('ranking-file');
        const uploadRankingButton = document.getElementById('upload-ranking-button');
        const uploadRankingStatus = document.getElementById('upload-ranking-status');

        // Função principal que carrega os dados e adiciona os listeners
        loadAndDisplayRaces();
        addEventListeners();

        function addEventListeners() {
            raceForm.addEventListener('submit', handleRaceFormSubmit);
            document.getElementById('clear-form-button').addEventListener('click', clearForm);
            uploadResultsButton.addEventListener('click', handleResultsUpload);
            // Adicionar listener para o botão de ranking se necessário
        }

        function loadAndDisplayRaces() {
            db.ref('corridas').on('value', snapshot => {
                const allCorridas = snapshot.val() || {};
                const corridasArray = Object.values(allCorridas);

                const copaCorridas = corridasArray.filter(c => c.tipo === 'copaAlcer');
                const geralCorridas = corridasArray.filter(c => c.tipo === 'geral');

                renderRaceList(copaCorridas, copaRaceList, 'copaAlcer');
                renderRaceList(geralCorridas, geralRaceList, 'geral');
                
                // Popula o select com corridas que ainda não têm resultados
                populateResultsRaceSelect(corridasArray);
            });
        }

        function renderRaceList(races, element, calendar) {
            element.innerHTML = '';
            if (!races || races.length === 0) {
                element.innerHTML = '<p class="text-gray-500">Nenhuma corrida cadastrada.</p>';
                return;
            }
            const fragment = document.createDocumentFragment();
            races.forEach(race => {
                const item = document.createElement('div');
                item.className = 'bg-gray-700 p-3 rounded flex justify-between items-center';
                item.innerHTML = `
                    <div>
                        <p class="font-semibold">${race.nome}</p>
                        <p class="text-sm text-gray-400">${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')} - ${race.cidade}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="edit-btn text-blue-400 hover:text-blue-300" data-id="${race.id}" data-calendar="${calendar}"><i class='bx bx-pencil'></i></button>
                        <button class="delete-btn text-red-500 hover:text-red-400" data-id="${race.id}" data-calendar="${calendar}"><i class='bx bx-trash'></i></button>
                    </div>
                `;
                fragment.appendChild(item);
            });
            element.appendChild(fragment);

            element.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => populateRaceFormForEdit(btn.dataset.id, btn.dataset.calendar)));
            element.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteRace(btn.dataset.id, btn.dataset.calendar)));
        }

        function handleRaceFormSubmit(e) {
            e.preventDefault();
            const raceData = {
                nome: raceNameInput.value,
                cidade: raceCityInput.value,
                data: raceDateInput.value,
                linkInscricao: raceLinkInput.value,
                tipo: raceCalendarSelect.value, // 'copaAlcer' ou 'geral'
                status: 'agendada' // Sempre começa como agendada
            };
            const id = raceIdInput.value;
            const refPath = `corridas`;

            let promise;
            if (id) {
                promise = db.ref(`${refPath}/${id}`).update(raceData);
            } else {
                const newRaceRef = db.ref(refPath).push();
                raceData.id = newRaceRef.key;
                promise = newRaceRef.set(raceData);
            }

            promise.then(() => {
                console.log("Corrida salva com sucesso!");
                clearForm();
            }).catch(error => console.error("Erro ao salvar corrida:", error));
        }
        
        function populateRaceFormForEdit(id, calendar) {
            db.ref(`corridas/${id}`).once('value', snapshot => {
                const race = snapshot.val();
                if (race) {
                    formTitle.textContent = "Editando Corrida";
                    raceIdInput.value = id;
                    raceNameInput.value = race.nome;
                    raceCityInput.value = race.cidade;
                    raceDateInput.value = race.data;
                    raceLinkInput.value = race.linkInscricao || '';
                    raceCalendarSelect.value = race.tipo;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        function deleteRace(id) {
            if (confirm("Tem certeza que deseja excluir esta corrida?")) {
                db.ref(`corridas/${id}`).remove()
                  .catch(error => console.error("Erro ao excluir corrida:", error));
            }
        }
        
        function clearForm() {
            formTitle.textContent = "Cadastrar Nova Corrida";
            raceForm.reset();
            raceIdInput.value = '';
        }

        function populateResultsRaceSelect(races) {
            resultsRaceSelect.innerHTML = '<option value="">Selecione uma etapa</option>';
            if(!races) return;
            const sortedRaces = races.sort((a,b) => new Date(b.data) - new Date(a.data));
            sortedRaces.forEach(race => {
                const option = document.createElement('option');
                option.value = race.id;
                option.textContent = `${race.nome} (${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')})`;
                resultsRaceSelect.appendChild(option);
            });
        }

        function handleResultsUpload() {
            const raceId = resultsRaceSelect.value;
            const file = resultsFileInput.files[0];
            if (!raceId || !file) {
                updateStatus("Selecione uma corrida e um arquivo JSON.", "error", 'results');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const resultsData = JSON.parse(event.target.result);
                    processAndUploadResults(raceId, resultsData);
                } catch (error) {
                    updateStatus(`Erro no formato do JSON: ${error.message}`, "error", 'results');
                }
            };
            reader.readAsText(file);
        }

        async function processAndUploadResults(raceId, data) {
            updateStatus("Processando... Lendo atletas do JSON...", "loading", 'results');
            const atletasRef = db.ref('atletas');
            const resultadosRef = db.ref('resultados');
            
            const atletasSnapshot = await atletasRef.once('value');
            const atletasExistentes = atletasSnapshot.val() || {};
            
            let updates = {};
            let newAthleteCount = 0;

            for (const percurso in data) {
                for (const genero in data[percurso]) {
                    const atletasDaCategoria = data[percurso][genero];
                    for (const atletaJson of atletasDaCategoria) {
                        let atletaId = Object.keys(atletasExistentes).find(key => atletasExistentes[key].nome === atletaJson.nome);

                        if (!atletaId) {
                            atletaId = atletasRef.push().key;
                            updates[`/atletas/${atletaId}`] = { nome: atletaJson.nome.toUpperCase(), idade: atletaJson.idade };
                            atletasExistentes[atletaId] = { nome: atletaJson.nome.toUpperCase() };
                            newAthleteCount++;
                        }
                        
                        const resultadoId = resultadosRef.push().key;
                        updates[`/resultados/${resultadoId}`] = {
                            atletaId: atletaId,
                            corridaId: raceId,
                            percurso: percurso,
                            genero: genero,
                            classificacao: atletaJson.classificacao,
                            tempo: atletaJson.tempo,
                            assessoria: atletaJson.assessoria
                        };
                    }
                }
            }
            
            updates[`/corridas/${raceId}/status`] = 'realizada';
            
            updateStatus(`Enviando ${newAthleteCount} novos atletas e resultados...`, "loading", 'results');
            await db.ref().update(updates);
            updateStatus("Resultados enviados com sucesso!", "success", 'results');
        }

        function updateStatus(message, type, target) {
            const statusElement = target === 'ranking' ? uploadRankingStatus : uploadResultsStatus;
            statusElement.textContent = message;
            statusElement.className = 'text-center mt-4 ';
            if (type === 'success') statusElement.classList.add('text-green-400');
            else if (type === 'error') statusElement.classList.add('text-red-400');
            else statusElement.classList.add('text-yellow-400');
        }
    }
});
