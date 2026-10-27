const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Serve Static Frontend Files
app.use(express.static(__dirname));

// XAMPP MySQL Connection Pool
const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'aura_lms',
  port: 3307,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test Database Connection
db.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL Database (aura_lms) Successfully!');
    conn.release();
  })
  .catch(err => console.error('❌ Database Connection Error:', err));

// Helper: Create System Audit Log
async function createLog(action, detail) {
  try {
    await db.query('INSERT INTO logs (action, detail) VALUES (?, ?)', [action, detail]);
  } catch (err) {
    console.error('Log Error:', err);
  }
}

// REST APIs
// 1. Get All Books
app.get('/api/books', async (req, res) => {
  try {
    const [books] = await db.query('SELECT * FROM books ORDER BY id DESC');
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add New Book
app.post('/api/books', async (req, res) => {
  try {
    const { title, author, category, isbn, cover, description } = req.body;
    await db.query(
      'INSERT INTO books (title, author, category, isbn, cover, description) VALUES (?, ?, ?, ?, ?, ?)',
      [title, author, category, isbn, cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400', description || '']
    );
    await createLog('ADD_BOOK', `Added '${title}' to database.`);
    res.status(201).json({ success: true, message: 'Book saved to MySQL!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Status (Borrow / Return)
app.put('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { status, borrowedBy } = req.body;

    if (typeof borrowedBy === 'object' && borrowedBy !== null) {
      borrowedBy = borrowedBy.handle || borrowedBy.username || null;
    }

    const isBorrowing = status === 'Issued';
    const targetDate = isBorrowing 
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
      : null;

    const finalBorrowedBy = isBorrowing ? (borrowedBy || '@student') : null;

    const [result] = await db.query(
      'UPDATE books SET status = ?, borrowedBy = ?, dueDate = ? WHERE id = ?',
      [status, finalBorrowedBy, targetDate, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    await createLog(
      isBorrowing ? 'BORROW_BOOK' : 'RETURN_BOOK',
      `Book ID ${id} ${isBorrowing ? 'issued to ' + finalBorrowedBy : 'returned'}.`
    );

    res.json({ success: true, message: 'Book status updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('🚀 Server running on http://localhost:5000'));