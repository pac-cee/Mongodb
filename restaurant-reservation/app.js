const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'restaurantReservationDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// This project demonstrates reservation management and time slot handling in MongoDB
async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Restaurant Reservation ---');
      console.log('1. Add Table');
      console.log('2. Make Reservation');
      console.log('3. List Reservations');
      console.log('4. Cancel Reservation');
      console.log('5. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await addTable(db);
          break;
        case '2':
          await makeReservation(db);
          break;
        case '3':
          await listReservations(db);
          break;
        case '4':
          await cancelReservation(db);
          break;
        case '5':
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

// Add a new table
async function addTable(db) {
  return new Promise((resolve) => {
    rl.question('Enter table number: ', async (number) => {
      number = parseInt(number, 10);
      if (isNaN(number) || number <= 0) {
        console.log('Invalid table number.');
        return resolve();
      }
      await db.collection('tables').insertOne({ number });
      console.log('Table added!');
      resolve();
    });
  });
}

// Make a reservation
async function makeReservation(db) {
  return new Promise((resolve) => {
    rl.question('Enter customer name: ', (customer) => {
      rl.question('Enter table number: ', (number) => {
        rl.question('Enter date (YYYY-MM-DD): ', (date) => {
          rl.question('Enter time (HH:MM): ', async (time) => {
            number = parseInt(number, 10);
            if (isNaN(number) || number <= 0) {
              console.log('Invalid table number.');
              return resolve();
            }
            const table = await db.collection('tables').findOne({ number });
            if (!table) {
              console.log('Table not found.');
              return resolve();
            }
            // Check for conflicting reservation
            const exists = await db.collection('reservations').findOne({ tableNumber: number, date, time });
            if (exists) {
              console.log('Table already reserved for this slot.');
              return resolve();
            }
            await db.collection('reservations').insertOne({ customer, tableNumber: number, date, time });
            console.log('Reservation made!');
            resolve();
          });
        });
      });
    });
  });
}

// List all reservations
async function listReservations(db) {
  const reservations = await db.collection('reservations').find().toArray();
  if (reservations.length === 0) {
    console.log('No reservations found.');
  } else {
    console.log('\nReservations:');
    reservations.forEach((r, i) => {
      console.log(`${i + 1}. Customer: ${r.customer}, Table: ${r.tableNumber}, Date: ${r.date}, Time: ${r.time}`);
    });
  }
}

// Cancel a reservation
async function cancelReservation(db) {
  return new Promise((resolve) => {
    rl.question('Enter customer name: ', (customer) => {
      rl.question('Enter table number: ', (number) => {
        rl.question('Enter date (YYYY-MM-DD): ', (date) => {
          rl.question('Enter time (HH:MM): ', async (time) => {
            number = parseInt(number, 10);
            if (isNaN(number) || number <= 0) {
              console.log('Invalid table number.');
              return resolve();
            }
            const result = await db.collection('reservations').deleteOne({ customer, tableNumber: number, date, time });
            if (result.deletedCount > 0) {
              console.log('Reservation cancelled!');
            } else {
              console.log('Reservation not found.');
            }
            resolve();
          });
        });
      });
    });
  });
}

main();
