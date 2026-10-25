// Порівняння документного читання MongoDB з еквівалентним JOIN у SQLite.
// PostgreSQL на порту 5432 не використовується: його займає інша лабораторна.
// Пінкевич Артем Романович, ІПЗ-32, Луцьк, 2026.

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { DatabaseSync } = require("node:sqlite");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/?directConnection=true";

function msSince(start) {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

async function timeAsync(times, fn) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < times; i++) await fn();
  return Number((msSince(start) / times).toFixed(3));
}

function timeSync(times, fn) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < times; i++) fn();
  return Number((msSince(start) / times).toFixed(3));
}

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db("blog");
  const posts = await db.collection("posts").find({ status: "published" }).toArray();
  if (posts.length < 50) throw new Error("У базі blog менше 50 постів");
  const sampleId = posts[0]._id;

  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE users (user_id TEXT PRIMARY KEY, username TEXT);
    CREATE TABLE categories (category_id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE posts (
      post_id TEXT PRIMARY KEY,
      title TEXT,
      user_id TEXT,
      category_id TEXT,
      views INTEGER,
      likes INTEGER
    );
    CREATE TABLE comments (
      comment_id TEXT PRIMARY KEY,
      post_id TEXT,
      username TEXT,
      status TEXT,
      parent_id TEXT
    );
    CREATE TABLE post_tags (post_id TEXT, tag TEXT);
  `);
  const insUser = sqlite.prepare("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)");
  const insCat = sqlite.prepare("INSERT OR IGNORE INTO categories (category_id, name) VALUES (?, ?)");
  const insPost = sqlite.prepare("INSERT INTO posts (post_id, title, user_id, category_id, views, likes) VALUES (?, ?, ?, ?, ?, ?)");
  const insComment = sqlite.prepare("INSERT INTO comments (comment_id, post_id, username, status, parent_id) VALUES (?, ?, ?, ?, ?)");
  const insTag = sqlite.prepare("INSERT INTO post_tags (post_id, tag) VALUES (?, ?)");

  let commentRows = 0;
  for (const post of posts) {
    insUser.run(String(post.author.user_id), post.author.username);
    insCat.run(String(post.category.category_id), post.category.name);
    insPost.run(String(post._id), post.title, String(post.author.user_id), String(post.category.category_id), post.statistics.views, post.statistics.likes);
    for (const tag of post.tags || []) insTag.run(String(post._id), tag);
    for (const comment of post.comments || []) {
      insUser.run(String(comment.author.user_id), comment.author.username);
      insComment.run(String(comment.comment_id), String(post._id), comment.author.username, comment.status, null);
      commentRows++;
      for (const reply of comment.replies || []) {
        insComment.run(String(reply.comment_id), String(post._id), reply.author.username, reply.status, String(comment.comment_id));
        commentRows++;
      }
    }
  }

  const sqlOne = sqlite.prepare(`
    SELECT p.title, u.username AS author, c.name AS category,
           GROUP_CONCAT(DISTINCT t.tag) AS tags,
           COUNT(DISTINCT cm.comment_id) AS comments_count,
           p.views, p.likes
    FROM posts p
    JOIN users u ON u.user_id = p.user_id
    JOIN categories c ON c.category_id = p.category_id
    LEFT JOIN post_tags t ON t.post_id = p.post_id
    LEFT JOIN comments cm ON cm.post_id = p.post_id
    WHERE p.post_id = ?
    GROUP BY p.post_id
  `);
  const sqlTop = sqlite.prepare(`
    SELECT u.username, COUNT(p.post_id) AS posts_count, SUM(p.views) AS total_views
    FROM posts p JOIN users u ON u.user_id = p.user_id
    GROUP BY u.username
    ORDER BY posts_count DESC, total_views DESC
    LIMIT 10
  `);

  const mongoRead = await timeAsync(300, () => db.collection("posts").findOne({ _id: sampleId }));
  const sqliteRead = timeSync(300, () => sqlOne.get(String(sampleId)));
  const mongoTop = await timeAsync(100, () => db.collection("posts").aggregate([
    { $match: { status: "published" } },
    { $group: { _id: "$author.username", posts_count: { $sum: 1 }, total_views: { $sum: "$statistics.views" } } },
    { $sort: { posts_count: -1, total_views: -1 } },
    { $limit: 10 }
  ]).toArray());
  const sqliteTop = timeSync(100, () => sqlTop.all());

  const mongoDoc = await db.collection("posts").findOne({ _id: sampleId });
  const sqliteDoc = sqlOne.get(String(sampleId));

  const result = {
    engine_note: "SQLite in-memory через node:sqlite. Той самий набір постів і коментарів. PostgreSQL на 5432 не чіпався.",
    dataset: {
      posts: posts.length,
      sqlite_comment_rows: commentRows,
      sqlite_users: sqlite.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      sqlite_categories: sqlite.prepare("SELECT COUNT(*) AS n FROM categories").get().n
    },
    sample_title: mongoDoc.title,
mongo_comment_nodes: (mongoDoc.comments || []).reduce((sum, comment) => sum + 1 + ((comment.replies || []).length), 0),
  sqlite_joined_comments: sqliteDoc.comments_count,
    avg_ms: {
      mongo_find_one_post_with_embedded_comments: mongoRead,
      sqlite_join_post_author_category_tags_comments: sqliteRead,
      mongo_top_authors_aggregate: mongoTop,
      sqlite_top_authors_group_by: sqliteTop
    },
    repeats: { read: 300, top: 100 }
  };

  const out = path.join(__dirname, "output", "compare.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
  sqlite.close();
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
