
const API_BASE_URL = 'http://localhost:8000';

let currentUserId = null;
let currentUserName = null;
let currentRooms = [];
let activeRoomId = null;
let currentWs = null;

async function postJson(path, payload) {
    return fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
}

function load() {
    console.log('App loaded');
}

async function fetchUsers() {
    const response = await fetch(`${API_BASE_URL}/users`);

    if (!response.ok) {
        throw new Error(`Users API error (${response.status})`);
    }

    return response.json();
}

function isExistingUser(users, userName) {
    return users.some((user) => user.username === userName);
}

function askUserFromList(users, preselectedUserName = '') {
    return new Promise((resolve, reject) => {
        const dialog = document.getElementById('joinDialog');
        const form = document.getElementById('joinForm');
        const userSelect = document.getElementById('usernameSelect');

        userSelect.innerHTML = '';
        users.forEach((user) => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.username;
            userSelect.appendChild(option);
        });

        const onSubmit = (event) => {
            event.preventDefault();
            const selectedUserName = userSelect.value;

            cleanup();
            dialog.close('submit');
            resolve(selectedUserName);
        };

        const onCancel = (event) => {
            event.preventDefault();
        };

        function cleanup() {
            form.removeEventListener('submit', onSubmit);
            dialog.removeEventListener('cancel', onCancel);
        }

        form.addEventListener('submit', onSubmit);
        dialog.addEventListener('cancel', onCancel);

        dialog.showModal();
        return;
    });
}

async function selectUser(userName) {
    const response = await postJson('/users', { username: userName });

    if (!response.ok) {
        throw new Error(`User API error (${response.status})`);
    }

    const user = await response.json();
    console.log(`User selected: ${user.username} (id=${user.id})`);
    return user;
}

function updateUserNameDisplay(userName) {
    const userNameElement = document.getElementById('displayName');
    const userAvatarElement = document.getElementById('userAvatar');
    const safeUserName = userName || 'Unknown user';

    userNameElement.textContent = safeUserName;
    userAvatarElement.textContent = safeUserName.charAt(0).toUpperCase();
}

async function fetchRooms() {
    const response = await fetch(`${API_BASE_URL}/rooms`);
    if (!response.ok) {
        throw new Error(`Rooms API error (${response.status})`);
    }
    return response.json();
}

async function fetchSubscriptions(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/subscriptions`);
    if (!response.ok) {
        throw new Error(`Subscriptions API error (${response.status})`);
    }
    return response.json();
}

function updateRoomsList(rooms, subscriptions) {
    const availableRoomsListElement = document.getElementById('discoverRoomsList');
    const roomsListElement = document.getElementById('roomsList');
    const activeRoomTitleElement = document.getElementById('activeRoomTitle');
    const toggleSubscriptionButton = document.getElementById('toggleSubscriptionBtn');

    availableRoomsListElement.innerHTML = '';
    roomsListElement.innerHTML = '';

    const roomIdsSet = new Set(subscriptions.room_ids);

    rooms.forEach((room) => {
        const listItem = document.createElement('li');
        listItem.classList.add('room-item');

        const meta = document.createElement('div');
        meta.classList.add('meta');

        const roomName = document.createElement('strong');
        roomName.textContent = room.name;

        const badge = document.createElement('span');
        badge.classList.add('badge');

        meta.appendChild(roomName);
        meta.appendChild(badge);
        listItem.appendChild(meta);

        listItem.dataset.roomId = String(room.id);

        if (roomIdsSet.has(room.id)) {
            badge.textContent = 'Subscribed';
            badge.classList.add('on');

            if (activeRoomId === room.id) {
                listItem.classList.add('active');
            }

            roomsListElement.appendChild(listItem);
        }
        
        else {
            badge.textContent = 'Available';
            listItem.classList.add('discover-item');

            const joinButton = document.createElement('button');
            joinButton.type = 'button';
            joinButton.classList.add('join-btn');
            joinButton.textContent = 'Join';

            listItem.appendChild(joinButton);
            availableRoomsListElement.appendChild(listItem);
        }
    });
}

function subscribeToRoom(availableRoomsListElement) {
    availableRoomsListElement.addEventListener('click', async (event) => {
        // check if the clicked element is a join button
        if (!event.target.closest('.join-btn')) {
            return;
        }

        const roomItem = event.target.closest('li');

        const roomId = Number(roomItem.dataset.roomId);
        const selectedRoom = currentRooms.find((room) => room.id === roomId);

        console.log(`Attempting to subscribe to room: ${selectedRoom.name} (id=${roomId})`);

        const response = await postJson(`/rooms/${roomId}/subscribe`, {
            user_id: currentUserId,
            room_id: roomId,
        });

        if (!response.ok) {
            throw new Error(`Subscription API error (${response.status})`);
        }

        console.log(`Subscribed to room: ${selectedRoom.name} (id=${roomId})`);

        currentRooms = await fetchRooms();
        const subscriptions = await fetchSubscriptions(currentUserId);
        updateRoomsList(currentRooms, subscriptions);
    });
}

function handleJoinedRoomSelection(event, roomsListElement, activeRoomTitleElement, toggleSubscriptionButton) {
    const roomItem = event.target.closest('li');

    if (!roomItem) {
        return;
    }

    const previouslyActive = roomsListElement.querySelector('.room-item.active');

    if (previouslyActive) {
        previouslyActive.classList.remove('active');
    }

    roomItem.classList.add('active');

    activeRoomId = Number(roomItem.dataset.roomId);
    const room = currentRooms.find((entry) => entry.id === activeRoomId);

    activeRoomTitleElement.textContent = room.name;
    toggleSubscriptionButton.disabled = false;

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = false;

    loadMessagesForActiveRoom();
}

async function unsubscribeActiveRoom() {
    const response = await fetch(`${API_BASE_URL}/rooms/${activeRoomId}/subscribe`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: currentUserId }),
    });

    if (!response.ok) {
        throw new Error(`Unsubscribe API error (${response.status})`);
    }

    currentRooms = await fetchRooms();
    const subscriptions = await fetchSubscriptions(currentUserId);
    updateRoomsList(currentRooms, subscriptions);
}

async function loadMessagesForActiveRoom() {
    const status = document.getElementById('status');
    const room = currentRooms.find((r) => r.id === activeRoomId);

    status.textContent = `Loading messages for room "${room?.name}"...`;

    const response = await fetch(`${API_BASE_URL}/messages/${activeRoomId}`);

    if (!response.ok) {
        throw new Error(`Messages API error (${response.status})`);
    }

    const data = await response.json();

    console.log(`Loaded ${data.messages.length} messages for room id=${activeRoomId}`);
    
    renderMessages(data.messages);

    connectWebSocket(activeRoomId);
}

function renderMessages(messages) {
    const messagesEl = document.getElementById('messages');
    messagesEl.innerHTML = '';
    messages.forEach((msg) => appendMessage(msg));
}

function appendMessage(msg) {
    const messagesEl = document.getElementById('messages');

    const div = document.createElement('div');
    div.classList.add('bubble');

    if (msg.sender_id === currentUserId) {
        div.classList.add('outgoing');
    }

    const sender = document.createElement('span');
    sender.classList.add('msg-author');
    sender.textContent = msg.sender_username;


    const content = document.createElement('p');
    content.textContent = msg.content;

    div.appendChild(sender);
    div.appendChild(content);
    messagesEl.appendChild(div);

    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function connectWebSocket(roomId) {
    const status = document.getElementById('status');
    status.textContent = `Connected to room "${currentRooms.find((r) => r.id === roomId).name}"`;

    const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}`);

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        appendMessage(msg);
    };

    ws.onerror = (err) => console.error('WebSocket error:', err);

    currentWs = ws;
}

document.addEventListener('DOMContentLoaded', async () => {
    load();

    try {
        const users = await fetchUsers();

        if (!Array.isArray(users) || users.length === 0) {
            throw new Error('No users available. Create users first from backend/CLI.');
        }

        const userName = await askUserFromList(users);

        if (!isExistingUser(users, userName)) {
            throw new Error('Selected user is invalid.');
        }

        const user = await selectUser(userName);
        currentUserId = user.id;
        currentUserName = user.username;
        updateUserNameDisplay(currentUserName);
    }
    
    catch (error) {
        console.error('Failed to select user:', error);
        updateUserNameDisplay('Unknown user');
    }

    // load rooms
    try {
        currentRooms = await fetchRooms();
        const subscriptions = await fetchSubscriptions(currentUserId);
        updateRoomsList(currentRooms, subscriptions);
        
    }
    
    catch (error) {
        console.error('Failed to load rooms:', error);
    }

    // clicking on an available room should subscribe the user to it
    const availableRoomsListElement = document.getElementById('discoverRoomsList');
    subscribeToRoom(availableRoomsListElement);

    // clicking on a joined room should open the chat
    const roomsListElement = document.getElementById('roomsList');
    const activeRoomTitleElement = document.getElementById('activeRoomTitle');
    const toggleSubscriptionButton = document.getElementById('toggleSubscriptionBtn');

    roomsListElement.addEventListener('click', (event) => {
        handleJoinedRoomSelection(event, roomsListElement, activeRoomTitleElement, toggleSubscriptionButton);
    });

    toggleSubscriptionButton.addEventListener('click', unsubscribeActiveRoom);

    // send message on form submit
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');

    messageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const content = messageInput.value.trim();

        const response = await postJson('/messages', {
            sender_id: currentUserId,
            room_id: activeRoomId,
            content,
        });

        if (!response.ok) {
            console.error(`Send message error (${response.status})`);
            return;
        }

        messageInput.value = '';
    });

});