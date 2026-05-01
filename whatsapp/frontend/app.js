
const API_BASE_URL = 'http://localhost:8000';

let currentUserId = null;
let currentUserName = null;
let currentRooms = [];

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
    const RoomsListElement = document.getElementById('roomsList');

    availableRoomsListElement.innerHTML = '';
    RoomsListElement.innerHTML = '';

    rooms.forEach((room) => {
        const listItem = document.createElement('li');
        listItem.textContent = room.name;
        
        if (subscriptions.room_ids.includes(room.id)) {
            RoomsListElement.appendChild(listItem);
        }
        
        else {
            availableRoomsListElement.appendChild(listItem);
        }
    });
}

function subscribeToRoom(availableRoomsListElement) {
    availableRoomsListElement.addEventListener('click', async (event) => {
        if (event.target.tagName === 'LI') {
            const roomName = event.target.textContent;
            const selectedRoom = currentRooms.find((room) => room.name === roomName);

            const roomId = selectedRoom.id;

            console.log(`Attempting to subscribe to room: ${roomName} (id=${roomId})`);

            const response = await postJson(`/rooms/${roomId}/subscribe`,
                { user_id: currentUserId, room_id: roomId });

            if (!response.ok) {
                throw new Error(`Subscription API error (${response.status})`);
            }

            console.log(`Subscribed to room: ${roomName} (id=${roomId})`);

            // Refresh rooms list after subscribing
            currentRooms = await fetchRooms();
            const subscriptions = await fetchSubscriptions(currentUserId);
            updateRoomsList(currentRooms, subscriptions);
        }
    });
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
});