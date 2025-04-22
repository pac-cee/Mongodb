const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'inventorySystemDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// This project demonstrates stock management, transactions, and reporting in MongoDB
async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Inventory System ---');
      console.log('1. Add Product');
      console.log('2. Update Stock');
      console.log('3. List Products');
      console.log('4. Product Report');
      console.log('5. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await addProduct(db);
          break;
        case '2':
          await updateStock(db);
          break;
        case '3':
          await listProducts(db);
          break;
        case '4':
          await productReport(db);
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

// Add a new product
async function addProduct(db) {
  return new Promise((resolve) => {
    rl.question('Enter product name: ', (name) => {
      rl.question('Enter initial stock: ', async (stock) => {
        stock = parseInt(stock, 10);
        if (isNaN(stock) || stock < 0) {
          console.log('Invalid stock value.');
          return resolve();
        }
        await db.collection('products').insertOne({ name, stock });
        console.log('Product added!');
        resolve();
      });
    });
  });
}

// Update stock for a product
async function updateStock(db) {
  return new Promise((resolve) => {
    rl.question('Enter product name: ', async (name) => {
      const product = await db.collection('products').findOne({ name });
      if (!product) {
        console.log('Product not found.');
        return resolve();
      }
      rl.question('Enter stock change (+/-): ', async (change) => {
        change = parseInt(change, 10);
        if (isNaN(change)) {
          console.log('Invalid change value.');
          return resolve();
        }
        const newStock = product.stock + change;
        if (newStock < 0) {
          console.log('Stock cannot be negative.');
          return resolve();
        }
        await db.collection('products').updateOne({ _id: product._id }, { $set: { stock: newStock } });
        console.log('Stock updated!');
        resolve();
      });
    });
  });
}

// List all products
async function listProducts(db) {
  const products = await db.collection('products').find().toArray();
  if (products.length === 0) {
    console.log('No products found.');
  } else {
    console.log('\nProducts:');
    products.forEach((p, i) => {
      console.log(`${i + 1}. Name: ${p.name}, Stock: ${p.stock}`);
    });
  }
}

// Product report: show products with low stock
async function productReport(db) {
  const products = await db.collection('products').find({ stock: { $lt: 5 } }).toArray();
  if (products.length === 0) {
    console.log('No products with low stock.');
  } else {
    console.log('\nLow Stock Products:');
    products.forEach((p, i) => {
      console.log(`${i + 1}. Name: ${p.name}, Stock: ${p.stock}`);
    });
  }
}

main();
