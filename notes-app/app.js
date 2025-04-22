const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'notesAppDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// This project demonstrates authentication, note sharing, and search in MongoDB
async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Notes App ---');
      console.log('1. Register User');
      console.log('2. Add Note');
      console.log('3. List My Notes');
      console.log('4. Share Note');
      console.log('5. Search Notes');
      console.log('6. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await registerUser(db);
          break;
        case '2':
          await addNote(db);
          break;
        case '3':
          await listMyNotes(db);
          break;
        case '4':
          await shareNote(db);
          break;
        case '5':
          await searchNotes(db);
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

    showMenu();
  } catch (err) {
    console.error('Error:', err);
    rl.close();
    await client.close();
  }
}

// Register a new user
async function registerUser(db) {
  return new Promise((resolve) => {
    rl.question('Enter username: ', async (username) => {
      if (!username.trim()) {
        console.log('Username required.');
        return resolve();
      }
      const exists = await db.collection('users').findOne({ username });
      if (exists) {
        console.log('Username already taken.');
        return resolve();
      }
      await db.collection('users').insertOne({ username });
      console.log('User registered!');
      resolve();
    });
  });
}

// Add a note
async function addNote(db) {
  return new Promise((resolve) => {
    rl.question('Your username: ', async (username) => {
      const user = await db.collection('users').findOne({ username });
      if (!user) {
        console.log('User not found.');
        return resolve();
      }
      rl.question('Enter note: ', async (note) => {
        await db.collection('notes').insertOne({ owner: username, note, sharedWith: [] });
        console.log('Note added!');
        resolve();
      });
    });
  });
}

// List my notes (owned or shared)
async function listMyNotes(db) {
  return new Promise((resolve) => {
    rl.question('Your username: ', async (username) => {
      const notes = await db.collection('notes').find({ $or: [ { owner: username }, { sharedWith: username } ] }).toArray();
      if (notes.length === 0) {
        console.log('No notes found.');
      } else {
        console.log('\nYour Notes:');
        notes.forEach((n, i) => {
          console.log(`${i + 1}. ${n.note} ${n.owner !== username ? '(shared)' : ''}`);
        });
      }
      resolve();
    });
  });
}

// Share a note with another user
async function shareNote(db) {
  return new Promise((resolve) => {
    rl.question('Your username: ', async (username) => {
      rl.question('Note text to share: ', async (noteText) => {
        rl.question('Share with username: ', async (shareWith) => {
          const note = await db.collection('notes').findOne({ owner: username, note: noteText });
          if (!note) {
            console.log('Note not found.');
            return resolve();
          }
          const user = await db.collection('users').findOne({ username: shareWith });
          if (!user) {
            console.log('User to share with not found.');
            return resolve();
          }
          if (note.sharedWith.includes(shareWith)) {
            console.log('Already shared with this user.');
            return resolve();
          }
          await db.collection('notes').updateOne({ _id: note._id }, { $push: { sharedWith: shareWith } });
          console.log('Note shared!');
          resolve();
        });
      });
    });
  });
}

// Search notes by keyword (owned or shared)
async function searchNotes(db) {
  return new Promise((resolve) => {
    rl.question('Your username: ', async (username) => {
      rl.question('Enter search keyword: ', async (keyword) => {
        const notes = await db.collection('notes').find({
          $and: [
            { $or: [ { owner: username }, { sharedWith: username } ] },
            { note: { $regex: keyword, $options: 'i' } }
          ]
        }).toArray();
        if (notes.length === 0) {
          console.log('No notes found.');
        } else {
          console.log('\nSearch Results:');
          notes.forEach((n, i) => {
            console.log(`${i + 1}. ${n.note} ${n.owner !== username ? '(shared)' : ''}`);
          });
        }
        resolve();
      });
    });
  });
}

main();
