// ===================================================================
// ARQUIVO DE CONFIGURAÇÃO - Contém as chaves de conexão do projeto.
// ===================================================================
// ATENÇÃO: Estas chaves são visíveis publicamente. Para um ambiente de
// produção, utilize as Regras de Segurança do Firebase para proteger
// seus dados e considere o uso de Cloud Functions para operações
// sensíveis. NÃO exponha chaves com privilégios de administrador aqui.
// ===================================================================

// Configuração do Firebase
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBppgEyO9visa_Bstktf_WFW80w-SOWG3M",
  authDomain: "corrida-rp.firebaseapp.com",
  databaseURL: "https://corrida-rp-default-rtdb.firebaseio.com",
  projectId: "corrida-rp",
  storageBucket: "corrida-rp.firebasestorage.app",
  messagingSenderId: "268310025993",
  appId: "1:268310025993:web:1134b24d09b54d3f8aa5d8"
};

// Configuração do Cloudinary (se necessário para upload de imagens de corridas)
const CLOUDINARY_CONFIG = {
  CLOUD_NAME: "dckxhoyug",
  UPLOAD_PRESET: "corrida"
};
