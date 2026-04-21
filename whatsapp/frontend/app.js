
const API_BASE_URL = 'http://localhost:8000';
const USERNAME_STORAGE_KEY = 'whatsapp.username';

function load() {
    localStorage.clear();
    console.log('App loaded');
}

function getStoredUserName() {
    return localStorage.getItem(USERNAME_STORAGE_KEY);
}

function storeUserName(userName) {
    localStorage.setItem(USERNAME_STORAGE_KEY, userName);
}

function askUserName() {
    const enteredUserName = prompt('Please enter your user name:');
    return enteredUserName || '';
}

async function selectUser(userName) {
    const response = await fetch(`${API_BASE_URL}/users?username=${userName}`, {
        method: 'POST'
    });

    if (!response.ok) {
        throw new Error(`User API error (${response.status})`);
    }

    const user = await response.json();
    console.log(`User selected: ${user.username} (id=${user.id})`);
}

document.addEventListener('DOMContentLoaded', async () => {
    load();

    let userName = getStoredUserName();

    if (!userName) {
        userName = askUserName();
    }

    if (userName) {
        try {
            await selectUser(userName);
            storeUserName(userName);
        } catch (error) {
            console.error('Failed to select user:', error);
        }
    }
});