const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

const uri = 'mongodb://localhost:27017';
const dbName = 'blogPlatformDB';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Blog posts can have comments and an author
async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    const db = client.db(dbName);

    function showMenu() {
      console.log('\n--- Blog Platform ---');
      console.log('1. Add Author');
      console.log('2. Add Post');
      console.log('3. List Posts');
      console.log('4. Add Comment to Post');
      console.log('5. List Comments for a Post');
      console.log('6. Exit');
      rl.question('Choose an option: ', handleMenu);
    }

    async function handleMenu(option) {
      switch (option.trim()) {
        case '1':
          await addAuthor(db);
          break;
        case '2':
          await addPost(db);
          break;
        case '3':
          await listPosts(db);
          break;
        case '4':
          await addComment(db);
          break;
        case '5':
          await listComments(db);
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

// Add an author
async function addAuthor(db) {
  return new Promise((resolve) => {
    rl.question('Enter author name: ', async (name) => {
      if (!name.trim()) {
        console.log('Author name is required.');
        return resolve();
      }
      await db.collection('authors').insertOne({ name });
      console.log('Author added!');
      resolve();
    });
  });
}

// Add a blog post with reference to author
async function addPost(db) {
  return new Promise((resolve) => {
    rl.question('Enter post title: ', (title) => {
      rl.question('Enter post content: ', async (content) => {
        rl.question('Enter author name: ', async (authorName) => {
          const author = await db.collection('authors').findOne({ name: authorName });
          if (!author) {
            console.log('Author not found.');
            return resolve();
          }
          const post = {
            title,
            content,
            authorId: author._id,
            createdAt: new Date(),
            comments: [] // Embedded comments
          };
          await db.collection('posts').insertOne(post);
          console.log('Post added!');
          resolve();
        });
      });
    });
  });
}

// List all posts with author info
async function listPosts(db) {
  const posts = await db.collection('posts').aggregate([
    { $lookup: {
        from: 'authors',
        localField: 'authorId',
        foreignField: '_id',
        as: 'author'
      }
    }
  ]).toArray();
  if (posts.length === 0) {
    console.log('No posts found.');
  } else {
    console.log('\nPosts:');
    posts.forEach((p, i) => {
      const authorName = p.author[0]?.name || 'Unknown';
      console.log(`${i + 1}. Title: ${p.title}, Author: ${authorName}, Posted: ${p.createdAt.toLocaleString()}`);
    });
  }
}

// Add a comment to a post (embedded)
async function addComment(db) {
  return new Promise((resolve) => {
    rl.question('Enter post title to comment on: ', async (title) => {
      const post = await db.collection('posts').findOne({ title });
      if (!post) {
        console.log('Post not found.');
        return resolve();
      }
      rl.question('Enter commenter name: ', (commenter) => {
        rl.question('Enter comment: ', async (commentText) => {
          const comment = {
            commenter,
            comment: commentText,
            createdAt: new Date()
          };
          await db.collection('posts').updateOne(
            { _id: post._id },
            { $push: { comments: comment } }
          );
          console.log('Comment added!');
          resolve();
        });
      });
    });
  });
}

// List comments for a post
async function listComments(db) {
  return new Promise((resolve) => {
    rl.question('Enter post title to view comments: ', async (title) => {
      const post = await db.collection('posts').findOne({ title });
      if (!post) {
        console.log('Post not found.');
        return resolve();
      }
      if (!post.comments || post.comments.length === 0) {
        console.log('No comments for this post.');
      } else {
        console.log(`\nComments for '${post.title}':`);
        post.comments.forEach((c, i) => {
          console.log(`${i + 1}. By: ${c.commenter}, ${c.createdAt.toLocaleString()}\n   ${c.comment}`);
        });
      }
      resolve();
    });
  });
}

main();
