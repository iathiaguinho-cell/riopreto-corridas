// ===================================================================
// SCRIPT PRINCIPAL DA APLICAÇÃO
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal inicializado. Aguardando conexão com Firebase...");

    try {
        if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey !== "AIzaSyBppgEyO9visa_Bstktf_WFW80w-SOWG3M") {
            firebase.initializeApp(FIREBASE_CONFIG);
            const db = firebase.database();
            const auth = firebase.auth();
            
            console.log("Firebase inicializado com sucesso!");
            
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.innerHTML = `<h1 class="text-3xl font-bold text-center text-blue-400">Portal das Corridas de Rio Preto Carregado com Sucesso!</h1>`;
            }

        } else {
            console.error("As configurações do Firebase não foram preenchidas no arquivo js/config.js");
            alert("ERRO: Configure o arquivo js/config.js antes de continuar.");
        }
    } catch (error) {
        console.error("Ocorreu um erro ao inicializar o Firebase:", error);
        alert("Ocorreu um erro ao conectar com o Firebase. Verifique o console para mais detalhes.");
    }
});
