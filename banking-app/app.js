const { MongoClient } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'bankingAppDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// This project demonstrates transactions, replication, and sharding in MongoDB
async function main() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Banking App ---');
      console.log('1. Create Account');
      console.log('2. Deposit');
      console.log('3. Withdraw');
      console.log('4. Transfer');
      console.log('5. Show Accounts');
      console.log('6. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await createAccount(db);
          break;
        case '2':
          await deposit(db);
          break;
        case '3':
          await withdraw(db);
          break;
        case '4':
          await transfer(db, client);
          break;
        case '5':
          await showAccounts(db);
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

// Create a new account
async function createAccount(db) {
  return new Promise((resolve) => {
    rl.question('Enter account holder name: ', async (name) => {
      const account = { name, balance: 0 };
      await db.collection('accounts').insertOne(account);
      console.log('Account created!');
      resolve();
    });
  });
}

// Deposit money
async function deposit(db) {
  return new Promise((resolve) => {
    rl.question('Enter account holder name: ', async (name) => {
      rl.question('Enter amount to deposit: ', async (amount) => {
        amount = parseFloat(amount);
        if (isNaN(amount) || amount <= 0) {
          console.log('Invalid amount.');
          return resolve();
        }
        const result = await db.collection('accounts').updateOne(
          { name },
          { $inc: { balance: amount } }
        );
        if (result.matchedCount === 0) {
          console.log('Account not found.');
        } else {
          console.log('Deposit successful!');
        }
        resolve();
      });
    });
  });
}

// Withdraw money
async function withdraw(db) {
  return new Promise((resolve) => {
    rl.question('Enter account holder name: ', async (name) => {
      rl.question('Enter amount to withdraw: ', async (amount) => {
        amount = parseFloat(amount);
        if (isNaN(amount) || amount <= 0) {
          console.log('Invalid amount.');
          return resolve();
        }
        const account = await db.collection('accounts').findOne({ name });
        if (!account) {
          console.log('Account not found.');
          return resolve();
        }
        if (account.balance < amount) {
          console.log('Insufficient funds.');
          return resolve();
        }
        await db.collection('accounts').updateOne(
          { name },
          { $inc: { balance: -amount } }
        );
        console.log('Withdrawal successful!');
        resolve();
      });
    });
  });
}

// Transfer money between accounts using a transaction
async function transfer(db, client) {
  return new Promise((resolve) => {
    rl.question('Enter sender name: ', (sender) => {
      rl.question('Enter receiver name: ', (receiver) => {
        rl.question('Enter amount to transfer: ', async (amount) => {
          amount = parseFloat(amount);
          if (isNaN(amount) || amount <= 0) {
            console.log('Invalid amount.');
            return resolve();
          }
          const session = client.startSession();
          let success = false;
          try {
            await session.withTransaction(async () => {
              const senderAcc = await db.collection('accounts').findOne({ name: sender }, { session });
              const receiverAcc = await db.collection('accounts').findOne({ name: receiver }, { session });
              if (!senderAcc || !receiverAcc) {
                throw new Error('Sender or receiver account not found.');
              }
              if (senderAcc.balance < amount) {
                throw new Error('Insufficient funds.');
              }
              await db.collection('accounts').updateOne(
                { name: sender },
                { $inc: { balance: -amount } },
                { session }
              );
              await db.collection('accounts').updateOne(
                { name: receiver },
                { $inc: { balance: amount } },
                { session }
              );
            });
            console.log('Transfer successful!');
            success = true;
          } catch (err) {
            console.log('Transfer failed:', err.message);
          } finally {
            await session.endSession();
            resolve();
          }
        });
      });
    });
  });
}

// Show all accounts
async function showAccounts(db) {
  const accounts = await db.collection('accounts').find().toArray();
  if (accounts.length === 0) {
    console.log('No accounts found.');
  } else {
    console.log('\nAccounts:');
    accounts.forEach((a, i) => {
      console.log(`${i + 1}. Name: ${a.name}, Balance: $${a.balance.toFixed(2)}`);
    });
  }
}

main();
