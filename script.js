const API_URL = "http://localhost:5000/api";

let books = [];
let logs = [];

let registeredUsers = [
    { username: 'admin', pass: 'admin123', fullname: 'Admin Master', role: 'admin' },
    { username: 'student', pass: 'student123', fullname: 'Student User', role: 'student' }
];

let currentUser = null;
let viewMode = 'grid';
let wishlistFilterOnly = false;

// USER HANDLE COMPARISON (@student vs student vs Student)
function isSameUser(h1, h2) {
    if (!h1 || !h2) return false;
    const clean1 = h1.toString().replace(/^@/, '').toLowerCase().trim();
    const clean2 = h2.toString().replace(/^@/, '').toLowerCase().trim();
    return clean1 === clean2;
}

function loadStorageLogs() {
    const savedLogs = localStorage.getItem('aura_logs_db');
    logs = savedLogs ? JSON.parse(savedLogs) : [];
}

function saveStorageLogs() {
    localStorage.setItem('aura_logs_db', JSON.stringify(logs));
}

loadStorageLogs();

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function switchAuthTab(tab) {
    document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('tab-login-btn').classList.toggle('active', tab === 'login');
    document.getElementById('tab-reg-btn').classList.toggle('active', tab === 'register');
}

function quickLogin(role) {
    document.getElementById('login-user').value = role;
    document.getElementById('login-pass').value = role + '123';
    handleLogin(new Event('submit'));
}

function handleRegister(e) {
    e.preventDefault();
    const fullname = document.getElementById('reg-fullname').value.trim();
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const role = document.getElementById('reg-role').value;

    if (registeredUsers.some(u => u.username.toLowerCase() === user.toLowerCase())) {
        showToast('Username already exists!', 'danger');
        return;
    }

    registeredUsers.push({ username: user, pass: pass, fullname: fullname, role: role });
    addLog('REGISTER_USER', `Account '${user}' created as [${role.toUpperCase()}].`);
    showToast('Registration successful! Please login.', 'success');

    document.getElementById('login-user').value = user;
    document.getElementById('login-pass').value = pass;
    switchAuthTab('login');
}

function handleLogin(e) {
    if(e) e.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    const foundUser = registeredUsers.find(u => u.username === user && u.pass === pass);

    if (foundUser) {
        currentUser = { username: foundUser.fullname, role: foundUser.role, handle: `@${foundUser.username}` };
    } else {
        showToast('Invalid Username or Password!', 'danger');
        return;
    }

    document.getElementById('login-overlay').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'grid';
        showToast(`Welcome back, ${currentUser.username}!`, 'success');
        addLog('USER_LOGIN', `${currentUser.role.toUpperCase()} session started.`);

        wishlistFilterOnly = false;
        if (document.getElementById('search-input')) document.getElementById('search-input').value = '';
        if (document.getElementById('category-filter')) document.getElementById('category-filter').value = 'All';

        applyRolePermissions();
        loadBooksFromDB();
    }, 300);
}

function handleLogout() {
    currentUser = null;
    document.getElementById('login-overlay').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('login-overlay').style.opacity = '1';
        document.getElementById('app-container').style.display = 'none';
    }, 50);
    showToast('Session terminated.', 'info');
}

function addLog(action, detail) {
    const time = new Date().toLocaleTimeString();
    logs.unshift({ id: '#' + Math.floor(1000 + Math.random() * 9000), action, detail, time });
    saveStorageLogs();
}

function applyRolePermissions() {
    document.getElementById('user-display').innerText = `USER: ${currentUser.username.toUpperCase()} (${currentUser.role.toUpperCase()})`;

    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
        showView('view-dash', document.querySelectorAll('.nav-btn')[0]);
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'block');
        showView('view-matrix', document.querySelectorAll('.nav-btn')[1]);
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('btn-grid-view').classList.toggle('active', mode === 'grid');
    document.getElementById('btn-table-view').classList.toggle('active', mode === 'table');
    filterBooks();
}

// RESET FILTERS AND SHOW CATALOG
function showCatalog(btn) {
    wishlistFilterOnly = false;
    if (document.getElementById('search-input')) document.getElementById('search-input').value = '';
    if (document.getElementById('category-filter')) document.getElementById('category-filter').value = 'All';
    showView('view-matrix', btn);
    filterBooks();
}

function showWishlist(btn) {
    wishlistFilterOnly = true;
    showView('view-matrix', btn);
    filterBooks();
}

function toggleWishlist(id, event) {
    event.stopPropagation();
    const book = books.find(b => b.id === id);
    if (book) {
        book.favorited = !book.favorited;
        showToast(book.favorited ? 'Added to Wishlist!' : 'Removed from Wishlist!', 'info');
        renderAll();
    }
}

async function loadBooksFromDB() {
    try {
        const res = await fetch(`${API_URL}/books`);
        if (!res.ok) throw new Error('API server error');
        const rawBooks = await res.json();

        books = rawBooks.map(b => {
            let authorName = 'Unknown Author';
            if (typeof b.author === 'string' && b.author.trim() !== '') {
                authorName = b.author;
            } else if (b.author && typeof b.author === 'object') {
                authorName = b.author.name || 'Unknown Author';
            }

            let borrowedHandle = null;
            if (typeof b.borrowedBy === 'string' && b.borrowedBy.trim() !== '') {
                borrowedHandle = b.borrowedBy;
            } else if (b.borrowedBy && typeof b.borrowedBy === 'object') {
                borrowedHandle = b.borrowedBy.handle || b.borrowedBy.username || null;
            }

            return {
                id: b.id,
                title: b.title || 'Untitled',
                author: authorName,
                category: b.category || 'General',
                isbn: b.isbn || 'N/A',
                status: b.status || 'Available',
                borrowedBy: borrowedHandle,
                dueDate: b.dueDate || null,
                cover: b.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400',
                rating: b.rating || 4.5,
                description: b.description || '',
                favorited: false
            };
        });

        renderAll();
    } catch (err) {
        console.error("Fetch Error:", err);
        showToast("Backend Server Connection Error!", "danger");
    }
}

function filterBooks() {
    const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const category = (document.getElementById('category-filter')?.value || 'All').toLowerCase().trim();
    const sortVal = document.getElementById('sort-filter')?.value || 'default';

    let filtered = books.filter(b => {
        const titleStr = (b.title || '').toLowerCase();
        const authorStr = (typeof b.author === 'string' ? b.author : b.author?.name || '').toLowerCase();
        const catStr = (b.category || '').toLowerCase();

        const matchesQuery = !query || titleStr.includes(query) || authorStr.includes(query);
        const matchesCategory = (category === 'all') || (catStr === category);
        const matchesWishlist = !wishlistFilterOnly || b.favorited;

        return matchesQuery && matchesCategory && matchesWishlist;
    });

    if (sortVal === 'title-az') filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if (sortVal === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortVal === 'avail') filtered.sort((a, b) => (a.status === 'Available' ? -1 : 1));

    renderCatalog(filtered);
}

function renderCatalog(list) {
    const container = document.getElementById('books-container');
    if (!container) return;
    container.innerHTML = '';

    if (!list || list.length === 0) {
        container.innerHTML = `<div class="empty-state"><h4>No books found in this matrix view!</h4></div>`;
        return;
    }

    const userHandle = currentUser?.handle || '@student';
    const userRole = currentUser?.role || 'student';

    if (viewMode === 'grid') {
        container.className = 'grid-cards';
        list.forEach(book => {
            const isAvail = book.status === 'Available';
            const isMyBook = isSameUser(book.borrowedBy, userHandle);
            const bookCover = book.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400';
            const bookRating = book.rating || 4.5;

            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <button class="bookmark-btn ${book.favorited ? 'active' : ''}" onclick="toggleWishlist(${book.id}, event)">
                    <i class="fa-solid fa-heart"></i>
                </button>
                <div onclick="openBookModal(${book.id})">
                    <img src="${bookCover}" class="book-cover" alt="${book.title}" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400'">
                    <div class="badge-row">
                        <span class="badge ${isAvail ? 'badge-avail' : 'badge-issued'}">${book.status}</span>
                        <span class="badge badge-cat">${book.category}</span>
                    </div>
                    <h4 style="font-size: 15px; margin-bottom: 4px;">${book.title}</h4>
                    <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 6px;">By <strong>${book.author}</strong></p>
                    <div class="star-rating"><i class="fa-solid fa-star"></i> ${bookRating} / 5.0</div>
                </div>
                <button onclick="handleBookAction(${book.id})" class="btn-btn" ${!isAvail && !isMyBook && userRole === 'student' ? 'disabled' : ''}>
                    ${isAvail ? 'Borrow Book' : (isMyBook ? 'Return Book' : 'Force Return')}
                </button>
            `;
            container.appendChild(card);
        });
    } else {
        container.className = '';
        const table = document.createElement('table');
        
        let rowsHtml = '';
        list.forEach(book => {
            const isAvail = book.status === 'Available';
            const isMyBook = isSameUser(book.borrowedBy, userHandle);
            const bookCover = book.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400';
            const bookRating = book.rating || 4.5;
            
            rowsHtml += `
            <tr>
                <td><img src="${bookCover}" style="width:35px; height:45px; object-fit:cover; border-radius:4px;" onclick="openBookModal(${book.id})" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400'"></td>
                <td><strong>${book.title}</strong></td>
                <td>${book.author}</td>
                <td><span class="badge badge-cat">${book.category}</span></td>
                <td><i class="fa-solid fa-star" style="color:var(--amber);"></i> ${bookRating}</td>
                <td><span class="badge ${isAvail ? 'badge-avail' : 'badge-issued'}">${book.status}</span></td>
                <td>
                    <button onclick="handleBookAction(${book.id})" style="background:transparent; border:1px solid var(--amber); color:var(--amber); padding:6px 12px; border-radius:8px; cursor:pointer;" ${!isAvail && !isMyBook && userRole === 'student' ? 'disabled' : ''}>
                        ${isAvail ? 'Borrow' : (isMyBook ? 'Return' : 'Issued')}
                    </button>
                </td>
            </tr>
            `;
        });

        table.innerHTML = `
            <thead>
                <tr><th>COVER</th><th>TITLE</th><th>AUTHOR</th><th>CATEGORY</th><th>RATING</th><th>STATUS</th><th>ACTION</th></tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        `;
        container.appendChild(table);
    }
}

function openBookModal(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;

    document.getElementById('modal-img').src = book.cover;
    document.getElementById('modal-title').innerText = book.title;
    document.getElementById('modal-author').innerText = `By ${book.author}`;
    document.getElementById('modal-category').innerText = book.category;
    document.getElementById('modal-desc').innerText = book.description || 'No description available.';
    document.getElementById('modal-isbn').innerText = `ISBN: ${book.isbn}`;
    document.getElementById('modal-rating').innerHTML = `<i class="fa-solid fa-star"></i> ${book.rating} Rating Points`;

    const btn = document.getElementById('modal-action-btn');
    btn.onclick = () => { handleBookAction(book.id); closeBookModal(); };
    btn.innerText = book.status === 'Available' ? 'Borrow Book' : 'Return Book';

    document.getElementById('book-modal').classList.add('open');
}

function closeBookModal() {
    document.getElementById('book-modal').classList.remove('open');
}

async function handleBookAction(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const isBorrowing = book.status === 'Available';
    const userHandle = currentUser?.handle || '@student';

    if (isBorrowing && currentUser?.role === 'student') {
        const currentBorrowedCount = books.filter(b => isSameUser(b.borrowedBy, userHandle)).length;
        if (currentBorrowedCount >= 3) {
            showToast('Borrow limit reached! Maximum 3 books allowed.', 'danger');
            return;
        }
    }

    try {
        const res = await fetch(`${API_URL}/books/${bookId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: isBorrowing ? 'Issued' : 'Available',
                borrowedBy: isBorrowing ? userHandle : null
            })
        });

        if (res.ok) {
            addLog(
                isBorrowing ? 'BORROW_BOOK' : 'RETURN_BOOK',
                `Book '${book.title}' ${isBorrowing ? 'issued to ' + userHandle : 'returned to library'}.`
            );
            showToast(`Book '${book.title}' ${isBorrowing ? 'borrowed successfully!' : 'returned successfully!'}`, 'success');
            await loadBooksFromDB();
        } else {
            showToast('Database update failed!', 'danger');
        }
    } catch (err) {
        console.error("Action Error:", err);
        showToast('Server connection error!', 'danger');
    }
}

function renderStudentBooks() {
    const tbody = document.getElementById('my-books-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const userHandle = currentUser?.handle || '@student';
    const myBooks = books.filter(b => isSameUser(b.borrowedBy, userHandle));

    if (myBooks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">No active borrowed books found.</td></tr>`;
        return;
    }

    myBooks.forEach(book => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${book.cover}" style="width: 40px; height: 50px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400'"></td>
            <td><span class="badge badge-cat">${book.category}</span></td>
            <td style="font-family: monospace; color: var(--amber);">${book.isbn}</td>
            <td><strong>${book.title}</strong></td>
            <td>${book.author}</td>
            <td><span class="badge badge-due"><i class="fa-solid fa-clock"></i> Due: ${book.dueDate || '14 Days'}</span></td>
            <td>
                <button onclick="handleBookAction(${book.id})" style="background: transparent; border: 1px solid var(--amber); color: var(--amber); padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                    Return Book
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminTransactions() {
    const tbody = document.getElementById('tx-table-body');
    if (!tbody) return;
    tbody.innerHTML = books.map(book => `
        <tr>
            <td style="font-family: monospace; color: var(--amber);">${book.isbn}</td>
            <td><strong>${book.title}</strong></td>
            <td><span class="badge badge-cat">${book.category}</span></td>
            <td>${book.borrowedBy ? book.borrowedBy : '-'}</td>
            <td><span class="badge ${book.status === 'Available' ? 'badge-avail' : 'badge-issued'}">${book.status}</span></td>
            <td>
                <button onclick="handleBookAction(${book.id})" style="background: transparent; border: 1px solid var(--amber); color: var(--amber); padding: 6px 12px; border-radius: 8px; cursor: pointer;">
                    ${book.status === 'Available' ? 'Force Issue' : 'Force Return'}
                </button>
            </td>
        </tr>
    `).join('');
}

function exportCSV() {
    let csv = "ISBN,Title,Category,Status,BorrowedBy,DueDate\n";
    books.forEach(b => {
        csv += `"${b.isbn}","${b.title}","${b.category}","${b.status}","${b.borrowedBy || ''}","${b.dueDate || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Library_Transactions_Report.csv');
    a.click();
    addLog('EXPORT_REPORT', 'Downloaded CSV Transaction Report.');
    showToast('CSV Report Downloaded Successfully!', 'success');
}

function renderLogs() {
    const termEl = document.getElementById('telemetry-terminal');
    const dashEl = document.getElementById('dash-logs-body');
    if (termEl) termEl.innerHTML = logs.map(l => `<div>[${l.time}] ${l.action}: ${l.detail}</div>`).join('');
    if (dashEl) dashEl.innerHTML = logs.slice(0, 5).map(l => `
        <tr>
            <td style="font-family: monospace; color: var(--amber);">${l.id}</td>
            <td><strong>${l.action}</strong></td>
            <td>${l.detail}</td>
            <td style="color: var(--text-dim); font-size: 12px;">${l.time}</td>
        </tr>
    `).join('');
}

async function addBook(e) {
    e.preventDefault();
    const title = document.getElementById('new-title').value.trim();
    const author = document.getElementById('new-author').value.trim();
    const category = document.getElementById('new-category').value;
    const isbn = document.getElementById('new-isbn').value.trim();
    const cover = document.getElementById('new-cover').value.trim();
    const desc = document.getElementById('new-desc').value.trim();

    try {
        const res = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title, author, category, isbn,
                cover: cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400',
                description: desc
            })
        });

        if (res.ok) {
            addLog('ADD_BOOK', `Added new book '${title}' under [${category}].`);
            showToast('New book successfully saved to MySQL Database!', 'success');
            await loadBooksFromDB();
            showView('view-matrix', document.querySelectorAll('.nav-btn')[1]);
        } else {
            showToast('Failed to save book to MySQL Database!', 'danger');
        }
    } catch (err) {
        console.error("Add Book Error:", err);
        showToast('Server connection error while saving book!', 'danger');
    }
}

function renderAll() {
    const totalEl = document.getElementById('stat-total');
    const availEl = document.getElementById('stat-avail');
    const issuedEl = document.getElementById('stat-issued');

    if (totalEl) totalEl.innerText = books.length;
    if (availEl) availEl.innerText = books.filter(b => b.status === 'Available').length;
    
    if (currentUser && currentUser.role === 'admin') {
        if (issuedEl) issuedEl.innerText = books.filter(b => b.status === 'Issued').length;
        renderAdminTransactions();
        renderLogs();
    } else if (currentUser) {
        const userHandle = currentUser.handle || '@student';
        if (issuedEl) issuedEl.innerText = books.filter(b => isSameUser(b.borrowedBy, userHandle)).length;
        renderStudentBooks();
    }
    filterBooks();
}

function showView(viewId, btn) {
    if (viewId !== 'view-matrix') wishlistFilterOnly = false;
    document.querySelectorAll('.view-sec').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const targetView = document.getElementById(viewId);
    if(targetView) targetView.style.display = 'block';
    if (btn) btn.classList.add('active');
}

/* STABILIZED SPATIAL CANVAS BACKGROUND */
const canvas = document.getElementById('spatial-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let pts = [];

function resize() { 
    if (canvas) {
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
    }
}
window.addEventListener('resize', resize);
resize();

for(let i=0; i<25; i++) {
    pts.push({ 
        x: Math.random() * (window.innerWidth || 800), 
        y: Math.random() * (window.innerHeight || 600), 
        vx: (Math.random() - 0.5) * 0.3, 
        vy: (Math.random() - 0.5) * 0.3 
    });
}

function drawCanvas() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach(p => {
        p.x += p.vx; 
        p.y += p.vy;
        if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255, 183, 3, 0.3)'; 
        ctx.fill();
    });
    requestAnimationFrame(drawCanvas);
}
drawCanvas();

window.addEventListener('DOMContentLoaded', () => {
    loadBooksFromDB();
});