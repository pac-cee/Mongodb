const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'studentManagementDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// This project demonstrates managing students, grades, and class assignments in MongoDB
async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Student Management ---');
      console.log('1. Add Student');
      console.log('2. Assign Grade');
      console.log('3. List Students');
      console.log('4. List Grades for Student');
      console.log('5. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await addStudent(db);
          break;
        case '2':
          await assignGrade(db);
          break;
        case '3':
          await listStudents(db);
          break;
        case '4':
          await listGrades(db);
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

// Add a new student
async function addStudent(db) {
  return new Promise((resolve) => {
    rl.question('Enter student name: ', async (name) => {
      if (!name.trim()) {
        console.log('Student name required.');
        return resolve();
      }
      await db.collection('students').insertOne({ name });
      console.log('Student added!');
      resolve();
    });
  });
}

// Assign a grade to a student
async function assignGrade(db) {
  return new Promise((resolve) => {
    rl.question('Enter student name: ', async (name) => {
      const student = await db.collection('students').findOne({ name });
      if (!student) {
        console.log('Student not found.');
        return resolve();
      }
      rl.question('Enter subject: ', (subject) => {
        rl.question('Enter grade: ', async (grade) => {
          await db.collection('grades').insertOne({ studentId: student._id, subject, grade });
          console.log('Grade assigned!');
          resolve();
        });
      });
    });
  });
}

// List all students
async function listStudents(db) {
  const students = await db.collection('students').find().toArray();
  if (students.length === 0) {
    console.log('No students found.');
  } else {
    console.log('\nStudents:');
    students.forEach((s, i) => {
      console.log(`${i + 1}. Name: ${s.name}`);
    });
  }
}

// List grades for a student
async function listGrades(db) {
  return new Promise((resolve) => {
    rl.question('Enter student name: ', async (name) => {
      const student = await db.collection('students').findOne({ name });
      if (!student) {
        console.log('Student not found.');
        return resolve();
      }
      const grades = await db.collection('grades').find({ studentId: student._id }).toArray();
      if (grades.length === 0) {
        console.log('No grades found for this student.');
      } else {
        console.log(`\nGrades for ${student.name}:`);
        grades.forEach((g, i) => {
          console.log(`${i + 1}. Subject: ${g.subject}, Grade: ${g.grade}`);
        });
      }
      resolve();
    });
  });
}

main();
