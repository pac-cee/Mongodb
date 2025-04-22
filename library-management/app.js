const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'libraryManagementDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// This project demonstrates indexing, performance, and security in MongoDB
async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Library Management ---');
      console.log('1. Add Book');
      console.log('2. Find Book by Title');
      console.log('3. List All Books');
      console.log('4. Borrow Book');
      console.log('5. Return Book');
      console.log('6. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await addBook(db);
          break;
        case '2':
          await findBook(db);
          break;
        case '3':
          await listBooks(db);
          break;
        case '4':
          await borrowBook(db);
          break;
        case '5':
          await returnBook(db);
          break;
        case '6':
          rl.close();
          await client.close();
          console.log('Goodbye!');
          return;
        default:
          console.log('Invalid option.');
      }
      showMenu();
    }

    // Create an index for fast book title search
    await db.collection('books').createIndex({ title: 1 });

    showMenu();
  } catch (err) {
    console.error('Error:', err);
    rl.close();
    await client.close();
  }
}

// Add a new book
async function addBook(db) {
  return new Promise((resolve) => {
    rl.question('Enter book title: ', (title) => {
      rl.question('Enter author: ', async (author) => {
        const book = { title, author, borrowed: false };
        await db.collection('books').insertOne(book);
        console.log('Book added!');
        resolve();
      });
    });
  });
}

// Find a book by title (uses index)
async function findBook(db) {
  return new Promise((resolve) => {
    rl.question('Enter book title to search: ', async (title) => {
      const book = await db.collection('books').findOne({ title });
      if (!book) {
        console.log('Book not found.');
      } else {
        console.log(`Found: ${book.title} by ${book.author} - ${book.borrowed ? 'Borrowed' : 'Available'}`);
      }
      resolve();
    });
  });
}

// List all books
async function listBooks(db) {
  const books = await db.collection('books').find().toArray();
  if (books.length === 0) {
    console.log('No books found.');
  } else {
    console.log('\nBooks:');
    books.forEach((b, i) => {
      console.log(`${i + 1}. Title: ${b.title}, Author: ${b.author}, Status: ${b.borrowed ? 'Borrowed' : 'Available'}`);
    });
  }
}

// Borrow a book (set borrowed = true)
async function borrowBook(db) {
  return new Promise((resolve) => {
    rl.question('Enter book title to borrow: ', async (title) => {
      const book = await db.collection('books').findOne({ title });
      if (!book) {
        console.log('Book not found.');
        return resolve();
      }
      if (book.borrowed) {
        console.log('Book is already borrowed.');
        return resolve();
      }
      await db.collection('books').updateOne({ _id: book._id }, { $set: { borrowed: true } });
      console.log('Book borrowed!');
      resolve();
    });
  });
}

// Return a book (set borrowed = false)
async function returnBook(db) {
  return new Promise((resolve) => {
    rl.question('Enter book title to return: ', async (title) => {
      const book = await db.collection('books').findOne({ title });
      if (!book) {
        console.log('Book not found.');
        return resolve();
      }
      if (!book.borrowed) {
        console.log('Book is not borrowed.');
        return resolve();
      }
      await db.collection('books').updateOne({ _id: book._id }, { $set: { borrowed: false } });
      console.log('Book returned!');
      resolve();
    });
  });
}

main();
