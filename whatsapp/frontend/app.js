
const API_BASE_URL = 'http://localhost:8000';

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
    const response = await fetch(`${API_BASE_URL}/users?username=${encodeURIComponent(userName)}`, {
        method: 'POST'
    });

    if (!response.ok) {
        throw new Error(`User API error (${response.status})`);
    }

    const user = await response.json();
    console.log(`User selected: ${user.username} (id=${user.id})`);
}

function updateUserNameDisplay(userName) {
    const userNameElement = document.getElementById('displayName');
    const userAvatarElement = document.getElementById('userAvatar');
    const safeUserName = userName || 'Unknown user';

    userNameElement.textContent = safeUserName;
    userAvatarElement.textContent = safeUserName.charAt(0).toUpperCase();
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

        await selectUser(userName);
        updateUserNameDisplay(userName);
    } catch (error) {
        console.error('Failed to select user:', error);
        updateUserNameDisplay('Unknown user');
    }
});