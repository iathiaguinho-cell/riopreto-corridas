Você está certo. O erro é meu. A falha está no arquivo `admin.js`.

Analisando a imagem, vi que o seu painel de administração está rejeitando o arquivo `dados_rodobens.json` que te entreguei.

**O arquivo `dados_rodobens.json` está correto.** O problema é o "porteiro". A lógica de validação que eu criei dentro do `admin.js` está errada: ela espera um arquivo simples e antigo, e não o arquivo completo e organizado que o site precisa.

Vamos corrigir o "porteiro".

Abaixo está a versão corrigida e completa do arquivo `admin.js`. A única coisa que mudei foi a função de validação, para que ela aceite o formato de arquivo correto que contém todas as categorias.

**Instruções:**

1.  **Não altere o arquivo `dados_rodobens.json`. Ele está correto.**
2.  Substitua o conteúdo do seu arquivo `js/admin.js` por este código completo.
3.  Depois de atualizar o `admin.js`, vá ao painel de administração e envie o arquivo `dados_rodobens.json` novamente. Agora vai funcionar.

-----

### **Arquivo `js/admin.js` (Versão Corrigida)**

```javascript
// ===================================================================
// ARQUIVO DE GESTÃO - Lógica do painel de administração (VERSÃO COM VALIDADOR CORRETO)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o Firebase seja inicializado apenas uma vez.
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }

    // Protege a página de admin, verificando a autenticação
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            initializeApp(user);
        } else {
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });

    function initializeApp(user) {
        console.log("Painel de Admin: Inicializado para", user.email);
        const db = firebase.database();
        
        const elements = {
            raceForm: document.getElementById('race-form'),
            formTitle: document.getElementById('form-title'),
            raceIdInput: document.getElementById('race-id'),
            raceNameInput: document.getElementById('race-name'),
            raceCityInput: document.getElementById('race-city'),
            raceDateInput: document.getElementById('race-date'),
            raceLinkInput: document.getElementById('race-link'),
            raceCalendarSelect: document.getElementById('race-calendar'),
            copaRaceList: document.getElementById('copa-race-list'),
            geralRaceList: document.getElementById('geral-race-list'),
            resultsRaceSelect: document.getElementById('race-select-results'),
            uploadResultsButton: document.getElementById('upload-results-button'),
            resultsFileInput: document.getElementById('results-file'),
            uploadResultsStatus: document.getElementById('upload-results-status'),
            rankingFileInput: document.getElementById('ranking-file'),
            uploadRankingButton: document.getElementById('upload-ranking-button'),
            uploadRankingStatus: document.getElementById('upload-ranking-status')
        };
        
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
            element.innerHTML = '';
            if (!races || Object.keys(races).length === 0) {
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
                nome: elements.raceNameInput.value,
                cidade: elements.raceCityInput.value,
                data: elements.raceDateInput.value,
                linkInscricao: elements.raceLinkInput.value
            };
            const id = elements.raceIdInput.value;
            const calendar = elements.raceCalendarSelect.value;
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
                clearForm();
            }).catch(error => console.error("Erro ao salvar corrida:", error));
        }

        function populateRaceFormForEdit(id, calendar) {
            db.ref(`corridas/${calendar}/${id}`).once('value', snapshot => {
                const race = snapshot.val();
                if (race) {
                    elements.formTitle.textContent = "Editando Corrida";
                    elements.raceIdInput.value = id;
                    elements.raceNameInput.value = race.nome;
                    elements.raceCityInput.value = race.cidade;
                    elements.raceDateInput.value = race.data;
                    elements.raceLinkInput.value = race.linkInscricao || '';
                    elements.raceCalendarSelect.value = calendar;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        function deleteRace(id, calendar) {
            if (confirm("Tem certeza que deseja excluir esta corrida?")) {
                db.ref(`corridas/${calendar}/${id}`).remove()
                  .catch(error => console.error("Erro ao excluir corrida:", error));
            }
        }

        function clearForm() {
            elements.formTitle.textContent = "Cadastrar Nova Corrida";
            elements.raceForm.reset();
            elements.raceIdInput.value = '';
        }

        function populateResultsRaceSelect(races) {
            elements.resultsRaceSelect.innerHTML = '<option value="">Selecione uma corrida</option>';
            if (!races) return;
            const sortedRaces = Object.values(races).sort((a, b) => new Date(b.data) - new Date(a.data));
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
                updateStatus(statusElement, "Selecione um arquivo JSON.", "error");
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
                    } else if (uploadType === 'ranking') {
                        // ... a lógica de validação do ranking pode ser adicionada aqui se necessário
                        uploadDataToFirebase('rankingCopaAlcer', data, statusElement, "Ranking da Copa");
                    }
                } catch (error) {
                    updateStatus(statusElement, `Erro no formato do arquivo JSON: ${error.message}`, "error");
                }
            };
            reader.readAsText(file);
        }
        
        // --- FUNÇÃO DE VALIDAÇÃO CORRIGIDA ---
        function validateResultsData(data) {
            // Verifica se o dado principal é um objeto e não um array
            if (typeof data !== 'object' || Array.isArray(data) || data === null) return false;
            
            // Pega a primeira chave de distância (ex: "10K", "5K")
            const firstDistanceKey = Object.keys(data)[0];
            if (!firstDistanceKey || typeof data[firstDistanceKey] !== 'object') return false;

            // Pega a primeira chave de gênero dentro da distância (ex: "masculino")
            const firstGenderKey = Object.keys(data[firstDistanceKey])[0];
            if (!firstGenderKey || !Array.isArray(data[firstDistanceKey][firstGenderKey])) return false;

            // Se a lista de atletas estiver vazia, o formato está ok
            if (data[firstDistanceKey][firstGenderKey].length === 0) return true;

            // Valida a estrutura do primeiro atleta na lista
            const firstAthlete = data[firstDistanceKey][firstGenderKey][0];
            return 'classificacao' in firstAthlete &&
                   'nome' in firstAthlete &&
                   'tempo' in firstAthlete;
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

        function updateStatus(element, message, type) {
            if (!element) return;
            element.textContent = message;
            element.className = 'text-center mt-4 text-sm font-semibold ';
            const typeClasses = { success: 'text-green-400', error: 'text-red-400', loading: 'text-yellow-400', default: 'text-gray-400' };
            element.classList.add(typeClasses[type] || typeClasses.default);
        }
    }
});
```
