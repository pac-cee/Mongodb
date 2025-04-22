const { MongoClient } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'contactBookDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Contact Book ---');
      console.log('1. Add Contact');
      console.log('2. List Contacts');
      console.log('3. Delete Contact');
      console.log('4. Search Contact');
      console.log('5. Update Contact');
      console.log('6. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await addContact(db);
          break;
        case '2':
          await listContacts(db);
          break;
        case '3':
          await deleteContact(db);
          break;
        case '4':
          await searchContact(db);
          break;
        case '5':
          await updateContact(db);
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

async function addContact(db) {
  return new Promise((resolve) => {
    rl.question('Enter name: ', async (name) => {
      // Prevent duplicate contacts by name
      const existing = await db.collection('contacts').findOne({ name });
      if (existing) {
        console.log('Contact with this name already exists.');
        return resolve();
      }
      rl.question('Enter phone: ', (phone) => {
        rl.question('Enter email: ', async (email) => {
          const contact = { name, phone, email };
          await db.collection('contacts').insertOne(contact);
          console.log('Contact added!');
          resolve();
        });
      });
    });
  });
}

async function searchContact(db) {
  return new Promise((resolve) => {
    rl.question('Enter name to search (partial match): ', async (name) => {
      // Case-insensitive partial match
      const contacts = await db.collection('contacts').find({ name: { $regex: name, $options: 'i' } }).toArray();
      if (contacts.length === 0) {
        console.log('No contacts found.');
      } else {
        console.log('\nFound contacts:');
        contacts.forEach((c, i) => {
          console.log(`${i + 1}. Name: ${c.name}, Phone: ${c.phone}, Email: ${c.email}`);
        });
      }
      resolve();
    });
  });
}

async function updateContact(db) {
  return new Promise((resolve) => {
    rl.question('Enter name of contact to update: ', async (name) => {
      const contact = await db.collection('contacts').findOne({ name });
      if (!contact) {
        console.log('Contact not found.');
        return resolve();
      }
      rl.question(`Enter new phone [${contact.phone}]: `, (phone) => {
        rl.question(`Enter new email [${contact.email}]: `, async (email) => {
          const updated = {
            phone: phone.trim() !== '' ? phone : contact.phone,
            email: email.trim() !== '' ? email : contact.email
          };
          await db.collection('contacts').updateOne({ name }, { $set: updated });
          console.log('Contact updated!');
          resolve();
        });
      });
    });
  });
}

async function listContacts(db) {
  const contacts = await db.collection('contacts').find().toArray();
  if (contacts.length === 0) {
    console.log('No contacts found.');
  } else {
    console.log('\nContacts:');
    contacts.forEach((c, i) => {
      console.log(`${i + 1}. Name: ${c.name}, Phone: ${c.phone}, Email: ${c.email}`);
    });
  }
}

async function deleteContact(db) {
  return new Promise((resolve) => {
    rl.question('Enter name of contact to delete: ', async (name) => {
      const result = await db.collection('contacts').deleteOne({ name });
      if (result.deletedCount > 0) {
        console.log('Contact deleted!');
      } else {
        console.log('Contact not found.');
      }
      resolve();
    });
  });
}

main();
