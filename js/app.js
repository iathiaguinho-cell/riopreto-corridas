// ===================================================================
// SCRIPT PRINCIPAL DA APLICAÇÃO
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal das Corridas inicializado. Conectando com Firebase...");

    try {
        // A constante FIREBASE_CONFIG é lida do arquivo config.js
        firebase.initializeApp(FIREBASE_CONFIG);
        console.log("Firebase inicializado com sucesso!");
        
        fetchCalendarData();

    } catch (error) {
        const loading = document.getElementById('loading-calendario');
        if(loading) loading.innerText = "Erro ao conectar com a base de dados.";
        console.error("Ocorreu um erro ao inicializar o Firebase:", error);
    }
});

/**
 * Busca os dados das corridas do Firebase Realtime Database.
 */
function fetchCalendarData() {
    const db = firebase.database();
    const corridasRef = db.ref('corridas');

    corridasRef.on('value', (snapshot) => {
        const data = snapshot.val();
        renderCalendar(data); // Chama o renderizador mesmo que os dados sejam nulos
    }, (error) => {
        console.error("Erro ao buscar dados do Firebase:", error);
        renderCalendar(null, error); // Passa um erro para o renderizador
    });
}

/**
 * Renderiza os cards do calendário na tela.
 * @param {object | null} corridas - O objeto contendo todas as corridas, ou nulo se não houver dados.
 * @param {Error | null} error - Um objeto de erro, se a busca falhar.
 */
function renderCalendar(corridas, error = null) {
    const container = document.getElementById('calendario-container');

    // VERIFICAÇÃO DE SEGURANÇA: Se o container não existir no HTML, pare a execução e avise.
    if (!container) {
        console.error("O elemento #calendario-container não foi encontrado no DOM. Verifique seu arquivo HTML.");
        return;
    }

    container.innerHTML = ''; // Limpa o container (mensagens de erro ou loading)

    if (error) {
        container.innerHTML = '<p class="text-center col-span-full text-red-500">Não foi possível carregar o calendário.</p>';
        return;
    }
    
    if (!corridas) {
        container.innerHTML = '<p class="text-center col-span-full text-gray-400">Nenhuma corrida cadastrada no momento.</p>';
        return;
    }

    console.log("Dados do calendário recebidos, renderizando...");
    const corridasArray = Object.values(corridas).sort((a, b) => new Date(a.data) - new Date(b.data));

    corridasArray.forEach(corrida => {
        const dataObj = new Date(`${corrida.data}T12:00:00Z`);
        const dia = String(dataObj.getDate()).padStart(2, '0');
        const mes = dataObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

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
                    <a href="${corrida.linkInscricao || '#'}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       class="race-button mt-4 text-center font-semibold py-2 px-4 rounded transition-colors ${corrida.linkInscricao ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}">
                       ${corrida.linkInscricao ? 'Inscreva-se' : 'Em Breve'}
                    </a>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}
