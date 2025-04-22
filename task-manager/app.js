const { MongoClient } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'taskManagerDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Valid status values for tasks
const VALID_STATUS = ['pending', 'done'];

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Task Manager ---');
      console.log('1. Add Task');
      console.log('2. List All Tasks');
      console.log('3. Update Task Status');
      console.log('4. Delete Task');
      console.log('5. List Tasks by Status');
      console.log('6. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await addTask(db);
          break;
        case '2':
          await listTasks(db);
          break;
        case '3':
          await updateTaskStatus(db);
          break;
        case '4':
          await deleteTask(db);
          break;
        case '5':
          await listTasksByStatus(db);
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

// Add a new task with validation
async function addTask(db) {
  return new Promise((resolve) => {
    rl.question('Enter task title: ', (title) => {
      rl.question('Enter status (pending/done) [pending]: ', async (status) => {
        const task = { title, status: status.trim() || 'pending' };
        const error = validateTask(task);
        if (error) {
          console.log('Error:', error);
        status = status.trim().toLowerCase() || 'pending';
        if (!VALID_STATUS.includes(status)) {
          console.log('Invalid status. Must be "pending" or "done".');
          return resolve();
        }
        const task = { title, status };
        await db.collection('tasks').insertOne(task);
        console.log('Task added!');
        resolve();
      });
    });
  });
}

// List all tasks
async function listTasks(db) {
  const tasks = await db.collection('tasks').find().toArray();
  if (tasks.length === 0) {
    console.log('No tasks found.');
  } else {
    console.log('\nTasks:');
    tasks.forEach((t, i) => {
      console.log(`${i + 1}. Title: ${t.title}, Status: ${t.status}`);
    });
  }
}

// Update the status of a task
async function updateTaskStatus(db) {
  return new Promise((resolve) => {
    rl.question('Enter task title to update: ', async (title) => {
      const task = await db.collection('tasks').findOne({ title });
      if (!task) {
        console.log('Task not found.');
        return resolve();
      }
      rl.question('Enter new status (pending/done): ', async (status) => {
        status = status.trim().toLowerCase();
        if (!VALID_STATUS.includes(status)) {
          console.log('Invalid status.');
          return resolve();
        }
        await db.collection('tasks').updateOne({ title }, { $set: { status } });
        console.log('Task status updated!');
        resolve();
      });
    });
  });
}

// Delete a task by title
async function deleteTask(db) {
  return new Promise((resolve) => {
    rl.question('Enter task title to delete: ', async (title) => {
      const result = await db.collection('tasks').deleteOne({ title });
      if (result.deletedCount > 0) {
        console.log('Task deleted!');
      } else {
        console.log('Task not found.');
      }
      resolve();
    });
  });
}

// List tasks by their status
async function listTasksByStatus(db) {
  return new Promise((resolve) => {
    rl.question('Enter status to filter (pending/done): ', async (status) => {
      status = status.trim().toLowerCase();
      if (!VALID_STATUS.includes(status)) {
        console.log('Invalid status.');
        return resolve();
      }
      const tasks = await db.collection('tasks').find({ status }).toArray();
      if (tasks.length === 0) {
        console.log('No tasks found with this status.');
      } else {
        console.log(`\nTasks with status '${status}':`);
        tasks.forEach((t, i) => {
          console.log(`${i + 1}. Title: ${t.title}`);
        });
      }
      resolve();
    });
  });
}

main();
