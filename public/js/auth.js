const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : 'https://your-vercel-backend-url.vercel.app/api'; // The user will replace this when they deploy

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    const data = {
        name: document.getElementById('regName').value,
        username: document.getElementById('regUsername').value,
        age: parseInt(document.getElementById('regAge').value),
        gender: document.getElementById('regGender').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        interests: [], // Will be updated in dashboard
        lookingFor: '',
        bio: ''
    };

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            alert('Registration Successful! Please login.');
            toggleAuthForm('login');
        } else {
            document.getElementById('regError').innerText = result.message || 'Registration failed';
        }
    } catch (err) {
        document.getElementById('regError').innerText = 'Network error. Try again.';
    } finally {
        btn.innerHTML = 'Create Profile <i class="fa-solid fa-heart"></i>';
        btn.disabled = false;
    }
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    const data = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
    };

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            localStorage.setItem('heartlink_token', result.token);
            localStorage.setItem('heartlink_user', JSON.stringify({ id: result._id, name: result.name }));
            window.location.href = 'dashboard.html';
        } else {
            document.getElementById('loginError').innerText = result.message || 'Invalid credentials';
        }
    } catch (err) {
        document.getElementById('loginError').innerText = 'Network error. Try again.';
    } finally {
        btn.innerHTML = 'Login <i class="fa-solid fa-arrow-right"></i>';
        btn.disabled = false;
    }
});

// Check if already logged in on index page
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    if (localStorage.getItem('heartlink_token')) {
        window.location.href = 'dashboard.html';
    }
}
