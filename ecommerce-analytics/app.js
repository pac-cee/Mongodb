const { MongoClient } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'ecommerceAnalyticsDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// This project demonstrates aggregation and analytics in MongoDB
async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- E-commerce Analytics ---');
      console.log('1. Add Order');
      console.log('2. List Orders');
      console.log('3. Sales by Product');
      console.log('4. Top Customers');
      console.log('5. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await addOrder(db);
          break;
        case '2':
          await listOrders(db);
          break;
        case '3':
          await salesByProduct(db);
          break;
        case '4':
          await topCustomers(db);
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

// Add a new order
async function addOrder(db) {
  return new Promise((resolve) => {
    rl.question('Enter customer name: ', (customer) => {
      rl.question('Enter product name: ', (product) => {
        rl.question('Enter quantity: ', async (quantity) => {
          const order = {
            customer,
            product,
            quantity: parseInt(quantity, 10),
            date: new Date()
          };
          await db.collection('orders').insertOne(order);
          console.log('Order added!');
          resolve();
        });
      });
    });
  });
}

// List all orders
async function listOrders(db) {
  const orders = await db.collection('orders').find().toArray();
  if (orders.length === 0) {
    console.log('No orders found.');
  } else {
    console.log('\nOrders:');
    orders.forEach((o, i) => {
      console.log(`${i + 1}. Customer: ${o.customer}, Product: ${o.product}, Quantity: ${o.quantity}, Date: ${o.date.toLocaleString()}`);
    });
  }
}

// Aggregate sales by product
async function salesByProduct(db) {
  const results = await db.collection('orders').aggregate([
    { $group: {
        _id: '$product',
        totalSold: { $sum: '$quantity' }
      }
    },
    { $sort: { totalSold: -1 } }
  ]).toArray();
  if (results.length === 0) {
    console.log('No sales data.');
  } else {
    console.log('\nSales by Product:');
    results.forEach((r, i) => {
      console.log(`${i + 1}. Product: ${r._id}, Total Sold: ${r.totalSold}`);
    });
  }
}

// Aggregate top customers by total quantity ordered
async function topCustomers(db) {
  const results = await db.collection('orders').aggregate([
    { $group: {
        _id: '$customer',
        totalOrdered: { $sum: '$quantity' }
      }
    },
    { $sort: { totalOrdered: -1 } },
    { $limit: 5 }
  ]).toArray();
  if (results.length === 0) {
    console.log('No customer data.');
  } else {
    console.log('\nTop Customers:');
    results.forEach((r, i) => {
      console.log(`${i + 1}. Customer: ${r._id}, Total Ordered: ${r.totalOrdered}`);
    });
  }
}

main();
