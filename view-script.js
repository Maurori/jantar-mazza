
const firebaseConfig = {
    apiKey: "AIzaSyD3ubPasKzWLU5FWJrpyAy5XaNSusJpzrg", // Sua chave API
    authDomain: "jantar-7b5dc.firebaseapp.com",
    projectId: "jantar-7b5dc",
    storageBucket: "jantar-7b5dc.firebasestorage.app",
    messagingSenderId: "928302254271",
    appId: "1:928302254271:web:acdcef781620b7c6239e0a",
    measurementId: "G-MRCR4F7QJJ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Referências aos elementos do DOM
const eventsListDiv = document.getElementById('eventsList');
const loadingEventsState = document.getElementById('loadingEvents');
const noEventsMessage = document.getElementById('noEventsMessage');
const feedbackMessageDiv = document.getElementById('feedbackMessage'); // Mantido para mensagens gerais

// --- Funções de UI e Utilidade ---

// Função para exibir mensagens de feedback (se necessário para erros de carregamento)
function showFeedback(message, type) {
    feedbackMessageDiv.textContent = message;
    feedbackMessageDiv.className = `feedback-message show ${type}`;
    setTimeout(() => {
        feedbackMessageDiv.classList.remove('show');
        feedbackMessageDiv.textContent = '';
    }, 5000);
}

// Função para formatar a data
function formatEventDate(dateString) {
    if (!dateString) return 'Data não informada';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// --- Funções de Eventos (Apenas Leitura) ---

async function loadEventsForPublicView() {
    eventsListDiv.innerHTML = '';
    loadingEventsState.classList.remove('hidden');
    noEventsMessage.classList.add('hidden');

    try {
        // Assume que as regras do Firestore permitirão leitura sem autenticação
        const snapshot = await db.collection('events').orderBy('date', 'asc').get();
        loadingEventsState.classList.add('hidden');

        if (snapshot.empty) {
            noEventsMessage.classList.remove('hidden');
            return;
        }

        snapshot.forEach(doc => {
            const event = doc.data();
            const eventItem = document.createElement('div');
            eventItem.classList.add('event-item');
            // Sem botões de editar/excluir nesta view
            eventItem.innerHTML = `
                <p><strong>Data:</strong> ${formatEventDate(event.date)}</p>
                <p><strong>Descrição:</strong> ${event.description}</p>
            `;
            eventsListDiv.appendChild(eventItem);
        });

    } catch (error) {
        console.error("Erro ao carregar eventos para consulta: ", error);
        loadingEventsState.classList.add('hidden');
        showFeedback('Erro ao carregar eventos. Verifique as regras de segurança do Firebase.', 'error');
    }
}

// Carrega os eventos assim que o script é executado
document.addEventListener('DOMContentLoaded', loadEventsForPublicView);
