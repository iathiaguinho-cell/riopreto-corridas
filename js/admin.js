// ===================================================================
// ARQUIVO DE GESTÃO - Lógica do painel de administração.
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o usuário esteja autenticado para executar qualquer função
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            initializeApp();
        }
    });

    const db = firebase.database();
    const raceSelect = document.getElementById('race-select');
    const uploadButton = document.getElementById('upload-button');
    const resultsFile = document.getElementById('results-file');
    const uploadStatus = document.getElementById('upload-status');
    let corridasCopa = {};

    function initializeApp() {
        console.log("Painel de Admin: Inicializado.");
        loadRaces();
        addEventListeners();
    }

    function addEventListeners() {
        uploadButton.addEventListener('click', handleUpload);
    }

    /**
     * Carrega as corridas da Copa Alcer para o seletor.
     */
    function loadRaces() {
        const corridasRef = db.ref('corridas/copaAlcer');
        corridasRef.once('value', snapshot => {
            corridasCopa = snapshot.val() || {};
            raceSelect.innerHTML = '<option value="">Selecione uma etapa</option>';
            for (const raceId in corridasCopa) {
                const race = corridasCopa[raceId];
                const option = document.createElement('option');
                option.value = raceId;
                option.textContent = race.nome;
                raceSelect.appendChild(option);
            }
        });
    }

    /**
     * Lida com o evento de clique no botão de upload.
     */
    function handleUpload() {
        const raceId = raceSelect.value;
        const file = resultsFile.files[0];

        if (!raceId) {
            updateStatus("Por favor, selecione uma corrida.", "error");
            return;
        }
        if (!file) {
            updateStatus("Por favor, selecione um arquivo JSON.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const resultsData = JSON.parse(event.target.result);
                processAndUploadResults(raceId, resultsData);
            } catch (error) {
                console.error("Erro ao processar o arquivo JSON:", error);
                updateStatus(`Erro no formato do arquivo JSON. ${error.message}`, "error");
            }
        };
        reader.readAsText(file);
    }

    /**
     * Processa os dados e envia para o Firebase.
     * @param {string} raceId - O ID da corrida selecionada.
     * @param {Array} resultsData - Os dados dos resultados do arquivo JSON.
     */
    function processAndUploadResults(raceId, resultsData) {
        updateStatus("Processando e enviando dados...", "loading");

        // Aqui, idealmente, você faria a transformação do JSON bruto (como o do arquivo de exemplo)
        // para a estrutura que seu `app.js` espera (`resultadosEtapas` e `rankingCopaAlcer`).
        // Por ora, vamos assumir que o JSON já está na estrutura correta para `resultadosEtapas`.
        
        // Exemplo: O JSON deve ser um objeto onde a chave é o ID da etapa
        // e o valor é o objeto de resultados.
        const dataToUpload = {
            // ... aqui vai a lógica para estruturar o `resultsData` para o formato do seu DB.
            // Exemplo simples:
            [raceId]: resultsData 
        };
        
        const resultadosRef = db.ref('resultadosEtapas/' + raceId);

        resultadosRef.set(dataToUpload[raceId])
            .then(() => {
                updateStatus("Resultados da etapa atualizados com sucesso!", "success");
                // Futuramente, aqui você pode chamar uma função para recalcular e atualizar o ranking.
                // Ex: updateRanking(raceId, resultsData);
            })
            .catch(error => {
                console.error("Erro ao enviar dados:", error);
                updateStatus(`Falha no envio: ${error.message}`, "error");
            });
    }

    /**
     * Atualiza a mensagem de status na tela.
     * @param {string} message - A mensagem a ser exibida.
     * @param {string} type - 'success', 'error', ou 'loading'.
     */
    function updateStatus(message, type) {
        uploadStatus.textContent = message;
        uploadStatus.className = 'text-center mt-4 ';
        if (type === 'success') {
            uploadStatus.classList.add('text-green-400');
        } else if (type === 'error') {
            uploadStatus.classList.add('text-red-400');
        } else {
            uploadStatus.classList.add('text-yellow-400');
        }
    }
});
