
const API_BASE_URL = 'http://localhost:8000';

// Global state variables
let currentUserId = null;
let currentUserName = null;
let currentRooms = [];
let activeRoomId = null;
let currentWs = null;

// Helper function to send POST requests with JSON payload
async function postJson(path, payload) {
    return fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
}

// Useless function, just to say that the app loaded
function load() {
    console.log('App loaded');
}

// Fetch the list of users from the backend API
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

// Show a dialog to select a user from the list and return the selected username
function askUserFromList(users) {
    return new Promise((resolve) => {
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
            // prevent the form from submitting and reloading the page
            event.preventDefault();
            const selectedUserName = userSelect.value;

            cleanup();
            dialog.close('submit');
            resolve(selectedUserName);
        };

        const onCancel = (event) => {
            // prevent the dialog from closing automatically
            // (the user has to choose an option)
            event.preventDefault();
        };

        // Cleanup function to remove event listeners after the dialog is closed
        function cleanup() {
            form.removeEventListener('submit', onSubmit);
            dialog.removeEventListener('cancel', onCancel);
        }

        form.addEventListener('submit', onSubmit);
        dialog.addEventListener('cancel', onCancel);

        // showModal in order to block the UI until the user selects an option
        dialog.showModal();
    });
}

// Returns the user object for the selected username, or throws an error if the API call fails
async function selectUser(userName) {
    const response = await postJson('/users', { username: userName });

    if (!response.ok) {
        throw new Error(`User API error (${response.status})`);
    }

    const user = await response.json();
    console.log(`User selected: ${user.username} (id=${user.id})`);
    return user;
}

// Update the UI to display the selected user's name and avatar (first letter of the name)
function updateUserNameDisplay(userName) {
    const userNameElement = document.getElementById('displayName');
    const userAvatarElement = document.getElementById('userAvatar');
    const safeUserName = userName || 'Unknown user';

    userNameElement.textContent = safeUserName;
    userAvatarElement.textContent = safeUserName.charAt(0).toUpperCase();
}

// Retrieve the list of available chat rooms from the backend API
async function fetchRooms() {
    const response = await fetch(`${API_BASE_URL}/rooms`);
    if (!response.ok) {
        throw new Error(`Rooms API error (${response.status})`);
    }
    return response.json();
}

// Retrieve the list of rooms the user is subscribed to from the backend API
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

    // First render the rooms the user is subscribed to, then the available ones
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

        // if the user is subscribed to the room, show it in the joined rooms list
        if (roomIdsSet.has(room.id)) {
            badge.textContent = 'Subscribed';
            badge.classList.add('on');

            if (activeRoomId === room.id) {
                listItem.classList.add('active');
            }

            roomsListElement.appendChild(listItem);
        }
        
        // if not, show it in the discover list with a join button
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

// Subscribe the user to a room when they click the join button in the available rooms list
// Then refresh the rooms lists
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
            const status = document.getElementById('status');
            status.textContent = `Failed to subscribe to room (${response.status})`;
            status.classList.add('error');
            return;
        }

        console.log(`Subscribed to room: ${selectedRoom.name} (id=${roomId})`);

        currentRooms = await fetchRooms();
        const subscriptions = await fetchSubscriptions(currentUserId);
        updateRoomsList(currentRooms, subscriptions);
    });
}

// Handle the selection of a joined room: mark it as active, update the UI, and load its messages
function handleJoinedRoomSelection(event, roomsListElement, activeRoomTitleElement, toggleSubscriptionButton) {
    const roomItem = event.target.closest('li');

    const previouslyActive = roomsListElement.querySelector('.room-item.active');

    if (previouslyActive) {
        // if there was a previously active room, remove the active class from it
        previouslyActive.classList.remove('active');
    }

    // add the active class to the newly selected room and update the UI
    roomItem.classList.add('active');

    activeRoomId = Number(roomItem.dataset.roomId);
    const room = currentRooms.find((entry) => entry.id === activeRoomId);

    activeRoomTitleElement.textContent = room.name;
    toggleSubscriptionButton.disabled = false;

    // enable the send message form (only when a room is active)
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = false;

    loadMessagesForActiveRoom();
}

// Unsubscribe the user from the currently active room when they click the unsubscribe button
// Then refresh the rooms lists
async function unsubscribeActiveRoom() {
    const response = await fetch(`${API_BASE_URL}/rooms/${activeRoomId}/subscribe`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: currentUserId }),
    });

    if (!response.ok) {
        const status = document.getElementById('status');
        status.textContent = `Failed to unsubscribe (${response.status})`;
        status.classList.add('error');
        return;
    }

    currentRooms = await fetchRooms();
    const subscriptions = await fetchSubscriptions(currentUserId);
    updateRoomsList(currentRooms, subscriptions);
}

// Load the messages for the currently active room from the backend API and render them in the UI
// Then connect to the WebSocket for that room to receive new messages
async function loadMessagesForActiveRoom() {
    const status = document.getElementById('status');
    const room = currentRooms.find((r) => r.id === activeRoomId);

    status.textContent = `Loading messages for room "${room?.name}"...`;
    status.classList.remove('error');

    const response = await fetch(`${API_BASE_URL}/messages/${activeRoomId}`);

    if (!response.ok) {
        status.textContent = `Failed to load messages (${response.status})`;
        status.classList.add('error');
        return;
    }

    const data = await response.json();

    console.log(`Loaded ${data.messages.length} messages for room id=${activeRoomId}`);
    
    renderMessages(data.messages);

    connectWebSocket(activeRoomId);
}

// Render the list of messages in the UI
// Just by appending them to the messages container
function renderMessages(messages) {
    const messagesEl = document.getElementById('messages');
    messagesEl.innerHTML = '';
    messages.forEach((msg) => appendMessage(msg));
}

// Manage the rendering of a single message in the UI, with different styles for incoming and outgoing messages
function appendMessage(msg) {
    const messagesEl = document.getElementById('messages');

    const div = document.createElement('div');
    div.classList.add('bubble');

    // check if the message is outgoing
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

    // scroll to the bottom of the messages container to show the latest message
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Connect to the WebSocket for the given room ID to receive new messages in real-time
function connectWebSocket(roomId) {
    // if there is an existing WebSocket connection, close it before opening a new one
    if (currentWs) {
        currentWs.close();
        currentWs = null;
    }

    const status = document.getElementById('status');
    status.textContent = `Connected to "${currentRooms.find((r) => r.id === roomId).name}"`;

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

        // prevent the user from trying to select a username if there are no users available
        // (e.g. if the backend is not running or the database is empty)
        if (!Array.isArray(users) || users.length === 0) {
            throw new Error('No users available. Create users first from backend/CLI.');
        }

        const userName = await askUserFromList(users);
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
        // trim the message content to avoid sending empty messages with only whitespace
        const content = messageInput.value.trim();

        const response = await postJson('/messages', {
            sender_id: currentUserId,
            room_id: activeRoomId,
            content,
        });

        if (!response.ok) {
            const status = document.getElementById('status');
            status.textContent = `Failed to send message (${response.status})`;
            status.classList.add('error');
            return;
        }

        messageInput.value = '';
    });
});