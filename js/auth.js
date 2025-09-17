// ===================================================================
// ARQUIVO DE AUTENTICAÇÃO - Controla o acesso de gestores.
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
    } catch (e) {
        console.error('Firebase já inicializado.');
    }

    const auth = firebase.auth();
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const loginError = document.getElementById('login-error');

    // Protege a página de admin
    if (document.body.id === 'admin-page') {
        auth.onAuthStateChanged(user => {
            if (!user) {
                console.log("Usuário não autenticado. Redirecionando para login.");
                window.location.replace('login.html');
            }
        });
    }

    // Lógica do formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            
            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    console.log("Login bem-sucedido:", userCredential.user.email);
                    window.location.href = 'admin.html';
                })
                .catch(error => {
                    console.error("Erro no login:", error);
                    loginError.textContent = "Email ou senha inválidos.";
                });
        });
    }

    // Lógica do botão de logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log("Logout realizado com sucesso.");
                window.location.href = 'login.html';
            }).catch(error => {
                console.error("Erro no logout:", error);
            });
        });
    }
});
