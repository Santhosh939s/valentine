const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = IS_LOCAL
    ? 'http://localhost:5001/api'
    : 'https://your-vercel-backend-url.vercel.app/api';
let token = localStorage.getItem('heartlink_token');
let user = JSON.parse(localStorage.getItem('heartlink_user'));
let socket = null;
let currentMatchId = null;

// Ensure auth
if (!token) {
    window.location.href = 'index.html';
}

// AES Encryption config
const SECRET_KEY = 'heartlink_super_secure_encryption_key_2026'; // Should ideally be fetched securely, or derived

const encryptMessage = (msg) => CryptoJS.AES.encrypt(msg, SECRET_KEY).toString();
const decryptMessage = (cipher) => CryptoJS.AES.decrypt(cipher, SECRET_KEY).toString(CryptoJS.enc.Utf8);

// Setup Socket
const initSocket = () => {
    const SOCKET_URL = IS_LOCAL ? 'http://localhost:5001' : window.location.origin;
    socket = io(SOCKET_URL);

    socket.on('message', (data) => {
        if (data.senderId === currentMatchId || data.senderId === user.id) {
            appendPrivateMessage(data.senderId === user.id, decryptMessage(data.encryptedMessage));
        }
    });

    socket.on('typing', (data) => {
        if (data.senderId === currentMatchId) {
            // Show typing indicator logic...
        }
    });

    socket.on('onlineUsersUpdate', (data) => {
        const el = document.getElementById('onlineCountBadge');
        if (el) el.innerText = data.count;
    });
};

const logout = () => {
    localStorage.clear();
    window.location.href = 'index.html';
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userName').innerText = user.name;

    // Show admin options if admin
    if (user.role && user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
    }

    loadProfileHeader();
    initSocket();
    loadView('chatbot', document.querySelector('.menu-item.active'));
});

async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (!res.ok && res.status === 401) logout();
    return res.json();
}

// UI Navigation
function loadView(viewId, el = null) {
    if (el) {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
    }

    const contentArea = document.getElementById('contentArea');
    const template = document.getElementById(`tpl-${viewId}`).content.cloneNode(true);
    contentArea.innerHTML = '';
    contentArea.appendChild(template);

    // Init specific logic
    if (viewId === 'profile') loadProfileForm();
    if (viewId === 'chatbot') loadChatbot();
    if (viewId === 'matches') loadMatches();
    if (viewId === 'requests') loadRequests();
    if (viewId === 'messages') loadMessageContacts();
    if (viewId === 'adminUsers') loadAdminUsers();
    if (viewId === 'adminFeedback') loadAdminFeedback();
}

// Profile Logic
async function loadProfileHeader() {
    const data = await apiCall('/profile');
    if (data.age && data.gender) {
        document.getElementById('userAgeGender').innerText = `${data.age} • ${data.gender}`;
        if (data.username) {
            document.getElementById('userUsername').innerText = `@${data.username}`;
        }
        if (data.profilePhoto && data.profilePhoto !== 'default-profile.png') {
            document.getElementById('profileImage').src = data.profilePhoto;
        }
    }
}

async function loadProfileForm() {
    const data = await apiCall('/profile');
    document.getElementById('pUsername').value = data.username ? `@${data.username}` : '';
    document.getElementById('pName').value = data.name || '';
    document.getElementById('pAge').value = data.age || '';
    document.getElementById('pLookingFor').value = data.lookingFor || '';
    document.getElementById('pInterests').value = data.interests ? data.interests.join(', ') : '';
    document.getElementById('pBio').value = data.bio || '';

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const updateData = {
            name: document.getElementById('pName').value,
            age: parseInt(document.getElementById('pAge').value),
            lookingFor: document.getElementById('pLookingFor').value,
            interests: document.getElementById('pInterests').value.split(',').map(i => i.trim()),
            bio: document.getElementById('pBio').value
        };
        await apiCall('/profile', 'PUT', updateData);
        alert('Profile updated successfully!');
        user.name = updateData.name;
        localStorage.setItem('heartlink_user', JSON.stringify(user));
        document.getElementById('userName').innerText = user.name;
    });

    document.getElementById('feedbackForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const message = document.getElementById('fMessage').value;
            await apiCall('/admin/feedback', 'POST', { message });
            alert('Thank you for the feedback!');
            document.getElementById('fMessage').value = '';
        } catch (err) {
            alert('Failed to send feedback.');
        } finally {
            btn.innerHTML = 'Submit Feedback';
        }
    });
}

// Chatbot Logic
async function loadChatbot() {
    const history = await apiCall('/chatbot/history');
    const box = document.getElementById('botChatBox');

    // Add history skipping the default first message if history exists
    if (history.length > 0) box.innerHTML = '';

    history.forEach(msg => {
        box.innerHTML += `<div class="message user"><div class="bubble">${msg.message}</div></div>`;
        box.innerHTML += `<div class="message bot"><div class="bubble">${msg.botReply}</div></div>`;
    });
    // Use an interval to ensure DOM is fully painted before scrolling
    setTimeout(() => { if (box) box.scrollTop = box.scrollHeight; }, 100);

    const input = document.getElementById('botInput');
    if (input) {
        // Remove existing listener if any to avoid duplicates
        input.replaceWith(input.cloneNode(true));
        const newInput = document.getElementById('botInput');
        newInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendBotMessage();
            }
        });
    }
}

async function sendBotMessage() {
    const input = document.getElementById('botInput');
    const text = input.value.trim();
    if (!text) return;

    const box = document.getElementById('botChatBox');
    box.innerHTML += `<div class="message user"><div class="bubble">${text}</div></div>`;
    input.value = '';
    box.scrollTop = box.scrollHeight;

    // Show typing
    const typingId = 'typing-' + Date.now();
    box.innerHTML += `<div class="message bot ${typingId}"><div class="bubble"><i class="fa-solid fa-ellipsis fa-fade"></i></div></div>`;
    box.scrollTop = box.scrollHeight;

    const res = await apiCall('/chatbot', 'POST', { message: text });

    // Replace typing
    document.querySelector(`.${typingId}`).remove();
    box.innerHTML += `<div class="message bot"><div class="bubble">${res.botReply}</div></div>`;
    box.scrollTop = box.scrollHeight;
}

// Matches Logic
let matchesCache = []; // Store them here for fast searching

async function loadMatches() {
    const matches = await apiCall('/matches');
    matchesCache = matches;
    renderMatchesGrid(matchesCache);
}

function renderMatchesGrid(data) {
    const grid = document.getElementById('matchesGrid');
    if (!grid) return;

    if (data.length === 0) {
        grid.innerHTML = '<p class="text-center w-100">No matching profiles found.</p>';
        return;
    }

    grid.innerHTML = data.map(m => `
        <div class="profile-card">
            <img src="${m.profilePhoto === 'default-profile.png' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + m.name : m.profilePhoto}">
            <h3>${m.name}, ${m.age}</h3>
            ${m.username ? `<p class="glow-text" style="font-size: 0.85rem; margin-top: -5px; margin-bottom: 5px;">@${m.username}</p>` : ''}
            <p class="text-muted" style="font-size:0.9rem; margin-top:5px;">${m.bio || 'Say hi!'}</p>
            <div class="match-pct">${m.matchPercentage || 10}% Match</div>
            
            <div style="margin-top: 15px; display:flex; gap:10px; justify-content:center;">
                <button class="btn-primary" onclick="sendReq('${m._id || m.id}')" style="padding: 8px 15px; font-size:0.9rem;">
                    Heart <i class="fa-solid fa-heart"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function filterMatches() {
    const searchVal = document.getElementById('matchSearchInput').value.toLowerCase();

    if (!searchVal) {
        renderMatchesGrid(matchesCache);
        return;
    }

    const filtered = matchesCache.filter(m => {
        return (
            (m.name && m.name.toLowerCase().includes(searchVal)) ||
            (m.username && m.username.toLowerCase().includes(searchVal)) ||
            (m.bio && m.bio.toLowerCase().includes(searchVal)) ||
            (m.interests && m.interests.join(' ').toLowerCase().includes(searchVal))
        );
    });

    renderMatchesGrid(filtered);
}

async function sendReq(receiverId) {
    try {
        const res = await apiCall('/request', 'POST', { receiverId });
        if (res.message) alert(res.message);
        else alert('Match request sent!');
    } catch (e) { console.error(e); }
}

// Requests Logic
async function loadRequests() {
    const res = await apiCall('/request');
    const list = document.getElementById('requestsList');

    if (res.incoming && res.incoming.length > 0) {
        list.innerHTML = res.incoming.map(r => `
            <div class="list-item">
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${r.senderId.profilePhoto === 'default-profile.png' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + r.senderId.name : r.senderId.profilePhoto}" style="width:40px; height:40px; border-radius:50%;">
                    <div>
                        <strong>${r.senderId.name}, ${r.senderId.age}</strong>
                        <p class="text-muted" style="font-size:0.8rem">Wants to connect!</p>
                    </div>
                </div>
                <div>
                    <button class="btn-primary" onclick="respondReq('${r._id}', 'accepted')" style="padding: 5px 15px; font-size:0.9rem;">Accept</button>
                    <button class="btn-outline" onclick="respondReq('${r._id}', 'rejected')" style="padding: 5px 15px; font-size:0.9rem;">Reject</button>
                </div>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p class="text-center w-100">No pending requests right now.</p>';
    }
}

async function respondReq(requestId, status) {
    try {
        const res = await apiCall('/request/respond', 'POST', { requestId, status });
        alert(res.message);
        loadRequests();
    } catch (e) { console.error(e); }
}

// Private Messages Logic
let contactsCache = [];

async function loadMessageContacts() {
    const res = await apiCall('/matches/mine');
    const list = document.getElementById('matchList');

    if (res.matches && res.matches.length > 0) {
        list.innerHTML = res.matches.map(m => `
            <div class="contact-item" onclick="openChat('${m.partnerId}', '${m.name}')">
                <strong><i class="fa-solid fa-heart glow-text"></i> ${m.name}</strong>
            </div>
        `).join('');
    } else {
        list.innerHTML = `<p class="text-center w-100">No active matches yet.</p>`;
    }
}

async function openChat(partnerId, partnerName) {
    document.querySelectorAll('.contact-item').forEach(i => i.classList.remove('active'));
    event.currentTarget.classList.add('active');

    currentMatchId = partnerId;
    document.getElementById('privateChatWindow').style.display = 'flex';
    document.getElementById('chatPartnerName').innerText = partnerName;

    socket.emit('joinRoom', { userId: user.id, matchId: partnerId });

    const messages = await apiCall(`/messages/${partnerId}`);
    const box = document.getElementById('privateChatBox');
    box.innerHTML = '';

    messages.forEach(msg => {
        const isMine = msg.senderId === user.id;
        const decrypted = decryptMessage(msg.encryptedMessage);
        appendPrivateMessage(isMine, decrypted);
    });

    // Binding send event
    const btn = document.getElementById('sendPrivateBtn');
    btn.onclick = () => sendPrivateMessage(partnerId);

    document.getElementById('privateInput').onkeypress = (e) => {
        if (e.key === 'Enter') sendPrivateMessage(partnerId);
        else socket.emit('typing', { senderId: user.id, receiverId: partnerId });
    };
}

function appendPrivateMessage(isMine, text) {
    const box = document.getElementById('privateChatBox');
    const cssClass = isMine ? 'user' : 'bot'; // recycling bot bubble style for partner
    box.innerHTML += `<div class="message ${cssClass}"><div class="bubble">${text}</div></div>`;
    box.scrollTop = box.scrollHeight;
}

async function sendPrivateMessage(receiverId) {
    const input = document.getElementById('privateInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const encrypted = encryptMessage(text);

    // Send to DB
    await apiCall('/messages', 'POST', { receiverId, encryptedMessage: encrypted });

    // Emit real-time
    socket.emit('chatMessage', {
        senderId: user.id,
        receiverId,
        message: 'encrypted', // optional
        encryptedMessage: encrypted
    });

    appendPrivateMessage(true, text);
}

// Admin Logic
async function loadAdminUsers() {
    const users = await apiCall('/admin/users');
    const list = document.getElementById('adminUsersList');

    if (users.length > 0) {
        list.innerHTML = users.map(u => `
            <div class="list-item">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div>
                        <strong>${u.name} (${u.role})</strong>
                        <p class="text-muted" style="font-size:0.8rem">${u.email} | Joined: ${new Date(u.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p class="text-center w-100">No users found.</p>';
    }
}

async function loadAdminFeedback() {
    const feedback = await apiCall('/admin/feedback');
    const list = document.getElementById('adminFeedbackList');

    if (feedback.length > 0) {
        list.innerHTML = feedback.map(f => `
            <div class="list-item" style="flex-direction:column; align-items:flex-start;">
                <strong>From: ${f.userId.name} (${f.userId.email})</strong>
                <p style="margin-top:5px; background:rgba(0,0,0,0.5); padding:10px; border-radius:5px; width:100%;">${f.message}</p>
                <small class="text-muted" style="margin-top:5px;">Submitted on: ${new Date(f.createdAt).toLocaleString()}</small>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p class="text-center w-100">No feedback found.</p>';
    }
}

