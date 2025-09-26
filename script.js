
const firebaseConfig = {
    apiKey: "AIzaSyD3ubPasKzWLU5FWJrpyAy5XaNSusJpzrg",
    authDomain: "jantar-7b5dc.firebaseapp.com",
    projectId: "jantar-7b5dc",
    storageBucket: "jantar-7b5dc.firebasestorage.app",
    messagingSenderId: "928302254271",
    appId: "1:928302254271:web:acdcef781620b7c6239e0a",
    measurementId: "G-MRCR4F7QJJ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); // Inicializa o Firebase Authentication

// Referências aos elementos do DOM
const eventForm = document.getElementById('eventForm');
const eventDateInput = document.getElementById('eventDate');
const eventDescriptionInput = document.getElementById('eventDescription');
const eventsListDiv = document.getElementById('eventsList');
const feedbackMessageDiv = document.getElementById('feedbackMessage');
const saveEventBtn = document.getElementById('saveEventBtn');
const buttonText = document.getElementById('buttonText');
const loadingSpinner = document.getElementById('loadingSpinner');
const loadingEventsState = document.getElementById('loadingEvents');
const noEventsMessage = document.getElementById('noEventsMessage');

// Elementos de Autenticação
const authScreen = document.getElementById('authScreen');
const appContent = document.getElementById('appContent');
const authForm = document.getElementById('authForm');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loggedInUserSpan = document.getElementById('loggedInUser');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const eventFormContainer = document.getElementById('eventFormContainer'); // O novo container do formulário de eventos

let editingEventId = null; // Armazena o ID do evento que está sendo editado
let currentUserRole = 'common'; // Assume 'common' por padrão até o usuário logar e seu papel ser carregado

// --- Funções de UI e Utilidade ---

// Função para exibir mensagens de feedback
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

// Função para alternar o estado do botão (spinner)
function toggleButtonLoading(button, isLoading, initialText, loadingText = '') {
    const textSpan = button.querySelector('#buttonText') || button; // Se não tiver span, usa o próprio botão
    const spinnerSpan = button.querySelector('#loadingSpinner');

    if (isLoading) {
        button.disabled = true;
        if (textSpan) textSpan.classList.add('hidden');
        if (spinnerSpan) spinnerSpan.classList.remove('hidden');
    } else {
        button.disabled = false;
        if (textSpan) {
            textSpan.classList.remove('hidden');
            textSpan.textContent = initialText; // Restaura o texto original
        }
        if (spinnerSpan) spinnerSpan.classList.add('hidden');
    }
}

// --- Funções de Autenticação ---

async function registerUser(email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        // Salva o papel do usuário no Firestore. Por padrão, o registro aqui cria um 'master'.
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            role: 'master', // Define o papel como 'master' para o primeiro registro/admin
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showFeedback('Usuário Master registrado com sucesso! Faça login.', 'success');
        authForm.reset(); // Limpa o formulário após o registro
    } catch (error) {
        console.error("Erro ao registrar usuário: ", error);
        showFeedback(`Erro ao registrar: ${error.message}`, 'error');
    }
}

async function loginUser(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showFeedback('Login realizado com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao fazer login: ", error);
        showFeedback(`Erro ao fazer login: ${error.message}`, 'error');
    }
}

async function logoutUser() {
    try {
        await auth.signOut();
        showFeedback('Você foi desconectado.', 'success');
    } catch (error) {
        console.error("Erro ao fazer logout: ", error);
        showFeedback(`Erro ao fazer logout: ${error.message}`, 'error');
    }
}

// Observador de estado de autenticação
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Usuário logado
        loggedInUserSpan.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        authScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        userEmailDisplay.textContent = user.email;

        // Carregar o papel do usuário
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUserRole = userDoc.data().role;
            } else {
                // Se não existir, é um usuário comum por padrão (ou pode ser criado se for o caso)
                // Para este exemplo, vamos criar um 'comum' se não tiver papel, embora o registro crie 'master'
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: 'common', // Define como 'common' se não foi definido no registro
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }); // Usar merge para não sobrescrever dados existentes
                currentUserRole = 'common';
            }
            updateUIForRole(); // Atualiza a UI com base no papel
            loadEvents(); // Carrega os eventos após o login e definição do papel
        } catch (error) {
            console.error("Erro ao carregar papel do usuário: ", error);
            showFeedback('Erro ao carregar permissões do usuário.', 'error');
            currentUserRole = 'common'; // Garante um papel padrão em caso de erro
            updateUIForRole();
            loadEvents();
        }

    } else {
        // Usuário não logado
        loggedInUserSpan.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        authScreen.classList.remove('hidden');
        appContent.classList.add('hidden');
        userEmailDisplay.textContent = '';
        currentUserRole = 'common'; // Reseta o papel
        updateUIForRole(); // Garante que a UI esteja limpa para não logados
        eventsListDiv.innerHTML = ''; // Limpa a lista de eventos
        loadingEventsState.classList.add('hidden');
        noEventsMessage.classList.add('hidden');
    }
});

// --- Controle de UI por Papel ---

function updateUIForRole() {
    // Esconde/mostra o formulário de evento
    if (currentUserRole === 'master') {
        eventFormContainer.classList.remove('hidden');
    } else {
        eventFormContainer.classList.add('hidden');
    }

    // A lista de eventos será renderizada com base nas permissões dentro de loadEvents
    // ou seja, os botões de editar/excluir só aparecerão se for master.
}

// --- Funções de Eventos (CRUD) ---

async function loadEvents() {
    eventsListDiv.innerHTML = '';
    loadingEventsState.classList.remove('hidden');
    noEventsMessage.classList.add('hidden');

    try {
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
            eventItem.setAttribute('data-id', doc.id);

            let actionButtons = '';
            if (currentUserRole === 'master') { // Apenas Master pode ver/usar os botões de ação
                actionButtons = `
                    <div class="event-actions">
                        <button class="edit-btn">Editar</button>
                        <button class="delete-btn">Excluir</button>
                    </div>
                `;
            }

            eventItem.innerHTML = `
                <p><strong>Data:</strong> ${formatEventDate(event.date)}</p>
                <p><strong>Descrição:</strong> ${event.description}</p>
                ${actionButtons}
            `;
            eventsListDiv.appendChild(eventItem);
        });

        // Adiciona event listeners APENAS se o usuário for master
        if (currentUserRole === 'master') {
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const eventId = e.target.closest('.event-item').getAttribute('data-id');
                    editEvent(eventId);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const eventId = e.target.closest('.event-item').getAttribute('data-id');
                    deleteEvent(eventId);
                });
            });
        }

    } catch (error) {
        console.error("Erro ao carregar eventos: ", error);
        loadingEventsState.classList.add('hidden');
        showFeedback('Erro ao carregar eventos. Tente novamente mais tarde.', 'error');
    }
}

async function editEvent(id) {
    if (currentUserRole !== 'master') {
        showFeedback('Você não tem permissão para editar eventos.', 'error');
        return;
    }
    try {
        const doc = await db.collection('events').doc(id).get();
        if (doc.exists) {
            const event = doc.data();
            eventDateInput.value = event.date;
            eventDescriptionInput.value = event.description;
            editingEventId = id;
            buttonText.textContent = 'Atualizar Evento';
            showFeedback('Edite os campos e clique em "Atualizar Evento".', 'success');
        } else {
            showFeedback('Evento não encontrado para edição.', 'error');
        }
    } catch (error) {
        console.error("Erro ao buscar evento para edição: ", error);
        showFeedback('Erro ao preparar evento para edição.', 'error');
    }
}

async function deleteEvent(id) {
    if (currentUserRole !== 'master') {
        showFeedback('Você não tem permissão para excluir eventos.', 'error');
        return;
    }
    if (!confirm('Tem certeza que deseja excluir este evento?')) {
        return;
    }

    try {
        await db.collection('events').doc(id).delete();
        showFeedback('Evento excluído com sucesso!', 'success');
        loadEvents();
    } catch (error) {
        console.error("Erro ao excluir evento: ", error);
        showFeedback('Erro ao excluir evento. Tente novamente.', 'error');
    }
}

// --- Event Listeners ---

// Formulário de Autenticação
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await loginUser(authEmailInput.value, authPasswordInput.value);
});

//registerBtn.addEventListener('click', async () => {
    //await registerUser(authEmailInput.value, authPasswordInput.value);
//});

logoutBtn.addEventListener('click', logoutUser);

// Formulário de Cadastro/Atualização de Eventos
eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (currentUserRole !== 'master') {
        showFeedback('Você não tem permissão para salvar/atualizar eventos.', 'error');
        return;
    }

    const date = eventDateInput.value;
    const description = eventDescriptionInput.value;

    if (!date || !description) {
        showFeedback('Por favor, preencha todos os campos.', 'error');
        return;
    }

    toggleButtonLoading(saveEventBtn, true, buttonText.textContent);

    try {
        if (editingEventId) {
            await db.collection('events').doc(editingEventId).update({
                date: date,
                description: description,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showFeedback('Evento atualizado com sucesso!', 'success');
            editingEventId = null;
            buttonText.textContent = 'Salvar Evento';
        } else {
            await db.collection('events').add({
                date: date,
                description: description,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showFeedback('Evento salvo com sucesso!', 'success');
        }
        
        eventDateInput.value = '';
        eventDescriptionInput.value = '';
        loadEvents();

    } catch (error) {
        console.error("Erro ao salvar/atualizar evento: ", error);
        showFeedback('Erro ao salvar/atualizar evento. Verifique o console para mais detalhes.', 'error');
    } finally {
        toggleButtonLoading(saveEventBtn, false, buttonText.textContent);
        if (!editingEventId) { // Se não estiver em modo de edição, restaura o texto do botão
            buttonText.textContent = 'Salvar Evento';
        }
    }
});

// Nenhuma chamada a loadEvents() ou updateUIForRole() aqui,
// pois onAuthStateChanged() irá lidar com isso.