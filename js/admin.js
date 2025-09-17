// ===================================================================
// ARQUIVO DE GESTÃO - Lógica do painel de administração.
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            initializeApp();
        }
    });

    const db = firebase.database();
    
    // Elementos do formulário de corridas
    const raceForm = document.getElementById('race-form');
    const formTitle = document.getElementById('form-title');
    const raceIdInput = document.getElementById('race-id');
    const raceNameInput = document.getElementById('race-name');
    const raceCityInput = document.getElementById('race-city');
    const raceDateInput = document.getElementById('race-date');
    const raceLinkInput = document.getElementById('race-link');
    const raceCalendarSelect = document.getElementById('race-calendar');

    // Elementos da lista de corridas
    const copaRaceList = document.getElementById('copa-race-list');
    const geralRaceList = document.getElementById('geral-race-list');
    
    // Elementos do upload de resultados de ETAPA
    const resultsRaceSelect = document.getElementById('race-select-results');
    const uploadResultsButton = document.getElementById('upload-results-button');
    const resultsFileInput = document.getElementById('results-file');
    const uploadResultsStatus = document.getElementById('upload-results-status');

    // NOVO: Elementos do upload de RANKING FINAL
    const rankingFileInput = document.getElementById('ranking-file');
    const uploadRankingButton = document.getElementById('upload-ranking-button');
    const uploadRankingStatus = document.getElementById('upload-ranking-status');


    function initializeApp() {
        console.log("Painel de Admin: Inicializado.");
        loadAndDisplayRaces();
        addEventListeners();
    }

    function addEventListeners() {
        raceForm.addEventListener('submit', handleRaceFormSubmit);
        document.getElementById('clear-form-button').addEventListener('click', clearForm);
        uploadResultsButton.addEventListener('click', handleResultsUpload);
        uploadRankingButton.addEventListener('click', handleRankingUpload); // NOVO
    }

    function loadAndDisplayRaces() {
        db.ref('corridas').on('value', snapshot => {
            const allCorridas = snapshot.val() || { copaAlcer: {}, geral: {} };
            renderRaceList(allCorridas.copaAlcer, copaRaceList, 'copaAlcer');
            renderRaceList(allCorridas.geral, geralRaceList, 'geral');
            populateResultsRaceSelect(allCorridas.copaAlcer);
        });
    }

    function renderRaceList(races, element, calendar) {
        element.innerHTML = '';
        if (!races) {
            element.innerHTML = '<p class="text-gray-500">Nenhuma corrida cadastrada.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        Object.keys(races).forEach(raceId => {
            const race = races[raceId];
            const item = document.createElement('div');
            item.className = 'bg-gray-700 p-3 rounded flex justify-between items-center';
            item.innerHTML = `
                <div>
                    <p class="font-semibold">${race.nome}</p>
                    <p class="text-sm text-gray-400">${new Date(race.data + 'T12:00:00Z').toLocaleDateString('pt-BR')} - ${race.cidade}</p>
                </div>
                <div class="flex gap-2">
                    <button class="edit-btn text-blue-400 hover:text-blue-300" data-id="${raceId}" data-calendar="${calendar}"><i class='bx bx-pencil'></i></button>
                    <button class="delete-btn text-red-500 hover:text-red-400" data-id="${raceId}" data-calendar="${calendar}"><i class='bx bx-trash'></i></button>
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
            linkInscricao: raceLinkInput.value
        };
        const id = raceIdInput.value;
        const calendar = raceCalendarSelect.value;
        const refPath = `corridas/${calendar}`;

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
        db.ref(`corridas/${calendar}/${id}`).once('value', snapshot => {
            const race = snapshot.val();
            if (race) {
                formTitle.textContent = "Editando Corrida";
                raceIdInput.value = id;
                raceNameInput.value = race.nome;
                raceCityInput.value = race.cidade;
                raceDateInput.value = race.data;
                raceLinkInput.value = race.linkInscricao || '';
                raceCalendarSelect.value = calendar;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    function deleteRace(id, calendar) {
        if (confirm("Tem certeza que deseja excluir esta corrida? Esta ação não pode ser desfeita.")) {
            db.ref(`corridas/${calendar}/${id}`).remove()
              .then(() => console.log("Corrida excluída com sucesso."))
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
        Object.keys(races).forEach(raceId => {
            const race = races[raceId];
            const option = document.createElement('option');
            option.value = raceId;
            option.textContent = race.nome;
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
        readFileAsJson(file, (data) => processAndUploadResults(raceId, data), 'results');
    }

    // NOVO: Handler para o upload do Ranking Final
    function handleRankingUpload() {
        const file = rankingFileInput.files[0];
        if (!file) {
            updateStatus("Selecione um arquivo JSON de ranking.", "error", 'ranking');
            return;
        }
        readFileAsJson(file, (data) => uploadFinalRanking(data), 'ranking');
    }

    function readFileAsJson(file, callback, type) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                callback(jsonData);
            } catch (error) {
                updateStatus(`Erro no formato do arquivo JSON: ${error.message}`, "error", type);
            }
        };
        reader.readAsText(file);
    }
    
    function processAndUploadResults(raceId, resultsData) {
        updateStatus("Enviando resultados da etapa...", "loading", 'results');
        db.ref('resultadosEtapas/' + raceId).set(resultsData)
            .then(() => updateStatus("Resultados da etapa atualizados com sucesso!", "success", 'results'))
            .catch(error => updateStatus(`Falha no envio: ${error.message}`, "error", 'results'));
    }

    // NOVO: Função para enviar o ranking final
    function uploadFinalRanking(rankingData) {
        updateStatus("Enviando ranking final...", "loading", 'ranking');
        db.ref('rankingCopaAlcer').set(rankingData)
            .then(() => updateStatus("Ranking final atualizado com sucesso!", "success", 'ranking'))
            .catch(error => updateStatus(`Falha no envio: ${error.message}`, "error", 'ranking'));
    }

    function updateStatus(message, type, target) {
        const statusElement = target === 'ranking' ? uploadRankingStatus : uploadResultsStatus;
        statusElement.textContent = message;
        statusElement.className = 'text-center mt-4 ';
        if (type === 'success') statusElement.classList.add('text-green-400');
        else if (type === 'error') statusElement.classList.add('text-red-400');
        else statusElement.classList.add('text-yellow-400');
    }
});
