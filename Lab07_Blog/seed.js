// Лабораторна робота 07. Наповнення бази blog.
// Пінкевич Артем Романович, ІПЗ-32, Луцьк, 2026.

const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const { ukTokens } = require("./lib/text");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/?directConnection=true";
const OUT = path.join(__dirname, "output");

const people = [
  ["admin_lutsk", "Адміністратор Блогу", "admin"],
  ["ivan_koval", "Іван Коваль", "author"],
  ["maria_shevchuk", "Марія Шевчук", "author"],
  ["oleh_bondar", "Олег Бондар", "author"],
  ["anna_melnyk", "Анна Мельник", "author"],
  ["dmytro_tkach", "Дмитро Ткач", "author"],
  ["sofia_kravchuk", "Софія Кравчук", "author"],
  ["taras_lysenko", "Тарас Лисенко", "author"],
  ["olena_marchuk", "Олена Марчук", "author"],
  ["bohdan_savchuk", "Богдан Савчук", "author"],
  ["yulia_petrenko", "Юлія Петренко", "author"],
  ["nazar_hrytsuk", "Назар Грицук", "author"],
  ["viktoria_romanuk", "Вікторія Романюк", "author"],
  ["petro_ivanov", "Петро Іванов", "reader"],
  ["halyna_symonenko", "Галина Симоненко", "reader"],
  ["andrii_pavlyuk", "Андрій Павлюк", "reader"],
  ["iryna_klimchuk", "Ірина Клімчук", "reader"],
  ["maksym_dorosh", "Максим Дорош", "reader"],
  ["lesia_fedchuk", "Леся Федчук", "reader"],
  ["roman_ostapuk", "Роман Остапук", "reader"]
];

const categorySeeds = [
  ["Веброзробка", "web-development", "Статті про веброзробку"],
  ["Мобільні додатки", "mobile-apps", "Розробка мобільних додатків"],
  ["Бази даних", "databases", "NoSQL та SQL бази даних"],
  ["DevOps", "devops", "Автоматизація та CI/CD"],
  ["Штучний інтелект", "ai", "ML та AI технології"],
  ["Хмарні технології", "cloud", "AWS, Azure, Google Cloud"],
  ["Безпека", "security", "Кібербезпека та захист даних"],
  ["UX/UI", "ux-ui", "Дизайн інтерфейсів"],
  ["Архітектура ПЗ", "architecture", "Patterns та best practices"],
  ["Тестування", "testing", "Методології тестування"]
];

const tagList = ["javascript", "python", "mongodb", "react", "nodejs", "docker", "kubernetes", "sql", "nosql", "lutsk"];
const topics = [
  "Індекси MongoDB",
  "Агрегація pipeline",
  "JSON Schema",
  "Геозапити",
  "Повнотекстовий пошук",
  "Вкладені коментарі",
  "Кешування запитів",
  "Реплікація",
  "Пагінація",
  "Express і MongoDB"
];
const commentPhrases = [
  "Цікаве пояснення, дякую за приклад.",
  "Є питання щодо складеного індексу.",
  "Спробував на локальному Docker - працює.",
  "Варто додати ще один приклад агрегації.",
  "Корисний матеріал для лабораторної в Луцьку."
];
const statuses = ["approved", "approved", "approved", "approved", "approved", "approved", "pending", "pending", "rejected", "approved"];

function num(schema) {
  schema.bsonType = ["int", "long", "double"];
  return schema;
}

function commentSchema(withReplies) {
  const properties = {
    comment_id: { bsonType: "objectId" },
    parent_id: { bsonType: ["objectId", "null"] },
    author: {
      bsonType: "object",
      required: ["user_id", "username"],
      properties: {
        user_id: { bsonType: "objectId" },
        username: { bsonType: "string" }
      }
    },
    text: { bsonType: "string", minLength: 1 },
    created_at: { bsonType: "date" },
    status: { enum: ["pending", "approved", "rejected"] },
    likes: num({})
  };
  if (withReplies) properties.replies = { bsonType: "array", items: commentSchema(false) };
  return {
    bsonType: "object",
    required: ["comment_id", "author", "text", "created_at", "status"],
    properties
  };
}

async function createSchema(db) {
  await db.createCollection("users", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["username", "email", "password_hash", "role", "created_at", "status"],
        properties: {
          username: { bsonType: "string", minLength: 3, maxLength: 30 },
          email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
          password_hash: { bsonType: "string", minLength: 60 },
          role: { enum: ["admin", "author", "reader"] },
          status: { enum: ["active", "suspended", "deleted"] },
          created_at: { bsonType: "date" },
          profile: { bsonType: "object" },
          statistics: { bsonType: "object" }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });

  await db.createCollection("categories", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "slug", "created_at"],
        properties: {
          name: { bsonType: "string", minLength: 2, maxLength: 50 },
          slug: { bsonType: "string", pattern: "^[a-z0-9-]+$" },
          description: { bsonType: "string" },
          created_at: { bsonType: "date" },
          statistics: { bsonType: "object" }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });

  await db.createCollection("posts", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["title", "slug", "content", "author", "category", "status", "created_at", "comments", "tags"],
        properties: {
          title: { bsonType: "string", minLength: 3, maxLength: 200 },
          slug: { bsonType: "string", pattern: "^[a-z0-9-]+$" },
          content: { bsonType: "string", minLength: 100 },
          excerpt: { bsonType: "string" },
          author: {
            bsonType: "object",
            required: ["user_id", "username"],
            properties: {
              user_id: { bsonType: "objectId" },
              username: { bsonType: "string" }
            }
          },
          category: {
            bsonType: "object",
            required: ["category_id", "name", "slug"],
            properties: {
              category_id: { bsonType: "objectId" },
              name: { bsonType: "string" },
              slug: { bsonType: "string" }
            }
          },
          tags: { bsonType: "array", items: { bsonType: "string" } },
          status: { enum: ["draft", "published", "archived"] },
          comments: { bsonType: "array", items: commentSchema(true) },
          statistics: { bsonType: "object" },
          location: {
            bsonType: "object",
            required: ["type", "coordinates", "city"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array", minItems: 2, maxItems: 2 },
              city: { bsonType: "string" }
            }
          },
          edit_history: { bsonType: "array" },
          created_at: { bsonType: "date" }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });

  await db.createCollection("notifications", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["recipient", "type", "message", "created_at", "read"],
        properties: {
          recipient: { bsonType: "object" },
          type: { bsonType: "string" },
          message: { bsonType: "string" },
          read: { bsonType: "bool" },
          created_at: { bsonType: "date" }
        }
      }
    },
    validationLevel: "strict",
    validationAction: "error"
  });
}

function locationFor(i) {
  if (i % 17 === 0) return { type: "Point", city: "Ковель", coordinates: [24.7086, 51.2036] };
  if (i % 17 === 1) return { type: "Point", city: "Рівне", coordinates: [26.2516, 50.6199] };
  const lng = 25.3254 + ((i % 5) - 2) * 0.008;
  const lat = 50.7472 + ((i % 3) - 1) * 0.006;
  return { type: "Point", city: "Луцьк", coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))] };
}

function countNodes(comments) {
  return comments.reduce((sum, comment) => sum + 1 + (comment.replies ? comment.replies.length : 0), 0);
}

function explainBrief(exp) {
  const stages = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.stage) stages.push(node.stage + (node.indexName ? "(" + node.indexName + ")" : ""));
    if (node.inputStage) walk(node.inputStage);
    if (Array.isArray(node.inputStages)) node.inputStages.forEach(walk);
  }
  walk(exp.queryPlanner && exp.queryPlanner.winningPlan);
  walk(exp.executionStats && exp.executionStats.executionStages);
  const es = exp.executionStats || {};
  return {
    plan: Array.from(new Set(stages)).join(" -> "),
    nReturned: es.nReturned,
    totalDocsExamined: es.totalDocsExamined,
    totalKeysExamined: es.totalKeysExamined,
    executionTimeMillis: es.executionTimeMillis
  };
}

async function main() {
  if (people.length !== 20) throw new Error("Очікувалось 20 користувачів, є " + people.length);
  fs.mkdirSync(OUT, { recursive: true });
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db("blog");
  await db.dropDatabase();
  await createSchema(db);

  const validation = {};
  try {
    await db.collection("users").insertOne({ username: "x", email: "bad", role: "superuser" });
    validation.rejected = false;
  } catch (error) {
    validation.rejected = true;
    validation.code = error.code;
    validation.message = String(error.message).split("\n")[0];
  }

  const now = new Date("2026-10-01T10:00:00Z");
  const passwordHash = "$2b$10$" + "a".repeat(53);
  const users = people.map(([username, fullName, role], index) => ({
    username,
    email: username + "@blog.lutsk",
    password_hash: passwordHash,
    role,
    status: "active",
    profile: {
      full_name: fullName,
      bio: role === "author" ? "Автор навчального блогу, Луцьк." : "Читач навчального блогу.",
      city: "Луцьк",
      group: "ІПЗ-32"
    },
    statistics: { posts_count: 0, comments_count: 0 },
    created_at: new Date(now.getTime() - (index + 30) * 86400000),
    last_login: now
  }));
  await db.collection("users").insertMany(users);
  const userDocs = await db.collection("users").find().sort({ username: 1 }).toArray();
  const byUsername = new Map(userDocs.map((user) => [user.username, user]));
  const authors = people.filter((p) => p[2] === "author").map((p) => byUsername.get(p[0]));

  const categories = categorySeeds.map(([name, slug, description]) => ({
    name,
    slug,
    description,
    statistics: { posts_count: 0 },
    created_at: now
  }));
  await db.collection("categories").insertMany(categories);
  const categoryDocs = await db.collection("categories").find().toArray();
  const categoryBySlug = new Map(categoryDocs.map((cat) => [cat.slug, cat]));
  const orderedCategories = categorySeeds.map((row) => categoryBySlug.get(row[1]));

  const posts = [];
  const notifications = [];
  let commentNodes = 0;
  for (let i = 0; i < 50; i++) {
    const author = authors[i % authors.length];
    const catIndex = i < 40 ? i % 6 : 6 + ((i - 40) % 4);
    const category = orderedCategories[catIndex];
    const tags = Array.from(new Set([tagList[i % tagList.length], tagList[(i + 3) % tagList.length]]));
    const topic = topics[i % topics.length];
    const title = topic + ": нотатка " + (i + 1) + " з Луцька";
    const content = "Стаття " + (i + 1) + " присвячена темі «" + topic + "». Матеріал підготовлено для лабораторної роботи з MongoDB у Луцьку, група ІПЗ-32. " +
      "Документна модель зберігає пост, коментарі, теги, лічильники та геодані разом, тому типова сторінка блогу читається одним запитом. " +
      "Текст навмисно довший за 100 символів, щоб пройти валідацію JSON Schema.";
    const excerpt = "Коротка нотатка " + (i + 1) + " про «" + topic + "» для блогу ІПЗ-32.";
    const created = new Date(Date.UTC(2026, 3, 1) - i * 36 * 3600 * 1000);
    const topCount = 3 + (i % 4);
    const comments = [];
    for (let j = 0; j < topCount; j++) {
      const commentAuthor = userDocs[(i + j + 1) % userDocs.length];
      const replies = [];
      if (j === 0) {
        const replyCount = i % 3 === 0 ? 2 : 1;
        for (let r = 0; r < replyCount; r++) {
          const replyAuthor = userDocs[(i + r + 5) % userDocs.length];
          replies.push({
            comment_id: new ObjectId(),
            parent_id: null,
            author: { user_id: replyAuthor._id, username: replyAuthor.username },
            text: "Відповідь " + (r + 1) + ": " + commentPhrases[(i + r) % commentPhrases.length],
            created_at: new Date(created.getTime() + (j + r + 2) * 3600 * 1000),
            status: "approved",
            likes: (i + r) % 6,
            replies: []
          });
        }
      }
      const commentId = new ObjectId();
      replies.forEach((reply) => { reply.parent_id = commentId; });
      const status = statuses[(i + j) % statuses.length];
      comments.push({
        comment_id: commentId,
        parent_id: null,
        author: { user_id: commentAuthor._id, username: commentAuthor.username },
        text: commentPhrases[(i + j) % commentPhrases.length] + " Коментар " + (j + 1) + " до нотатки " + (i + 1) + ".",
        created_at: new Date(created.getTime() + (j + 1) * 3600 * 1000),
        status,
        likes: (i + j) % 8,
        replies
      });
      notifications.push({
        recipient: { user_id: author._id, username: author.username },
        type: "new_comment",
        post_slug: "note-" + (i + 1),
        message: commentAuthor.username + " залишив коментар до «" + title + "»",
        read: (i + j) % 4 === 0,
        created_at: new Date(created.getTime() + (j + 1) * 3600 * 1000)
      });
    }
    commentNodes += countNodes(comments);
    const editHistory = i < 3 ? [{
      version: 1,
      title: "Чернетка: " + title,
      content,
      editor: "admin_lutsk",
      edited_at: new Date(created.getTime() - 86400000)
    }] : [];
    posts.push({
      title,
      slug: "note-" + (i + 1),
      content,
      excerpt,
      author: { user_id: author._id, username: author.username },
      category: { category_id: category._id, name: category.name, slug: category.slug },
      tags,
      status: "published",
      comments,
      statistics: {
        views: 20 + (i * 17) % 400,
        likes: (i * 3) % 40,
        dislikes: i % 5,
        comments_count: countNodes(comments)
      },
      liked_by: [],
      disliked_by: [],
      location: locationFor(i),
      edit_history: editHistory,
      uk_tokens: ukTokens([title, excerpt, content, tags.join(" ")].join(" ")),
      version: i < 3 ? 2 : 1,
      created_at: created,
      updated_at: created,
      published_at: created
    });
  }

  await db.collection("posts").insertMany(posts);
  await db.collection("notifications").insertMany(notifications);

  const postsColl = db.collection("posts");
  const explainBefore = explainBrief(await postsColl.find({ "author.username": "ivan_koval" }).explain("executionStats"));

  await db.collection("users").createIndex({ username: 1 }, { unique: true, name: "username_1" });
  await db.collection("users").createIndex({ email: 1 }, { unique: true, name: "email_1" });
  await postsColl.createIndex({ slug: 1 }, { unique: true, name: "slug_1" });
  await postsColl.createIndex({ "author.user_id": 1, published_at: -1 }, { name: "author_date" });
  await postsColl.createIndex({ "author.username": 1 }, { name: "author_username" });
  await postsColl.createIndex({ "category.category_id": 1, published_at: -1 }, { name: "category_date" });
  await postsColl.createIndex({ "category.slug": 1 }, { name: "category_slug" });
  await postsColl.createIndex({ published_at: -1 }, { name: "published_at_-1" });
  await postsColl.createIndex({ tags: 1 }, { name: "tags_1" });
  await postsColl.createIndex(
    { title: "text", content: "text", excerpt: "text", uk_tokens: "text" },
    { name: "posts_text", default_language: "none", language_override: "text_lang" }
  );
  await postsColl.createIndex({ location: "2dsphere" }, { name: "location_2dsphere" });
  await db.collection("categories").createIndex({ slug: 1 }, { unique: true, name: "slug_1" });
  await db.collection("categories").createIndex({ name: 1 }, { unique: true, name: "name_1" });
  await db.collection("notifications").createIndex({ "recipient.username": 1, created_at: -1 }, { name: "recipient_date" });

  const explainAfter = explainBrief(await postsColl.find({ "author.username": "ivan_koval" }).explain("executionStats"));

  const catCounts = await postsColl.aggregate([
    { $group: { _id: "$category.category_id", posts_count: { $sum: 1 } } }
  ]).toArray();
  for (const row of catCounts) {
    await db.collection("categories").updateOne({ _id: row._id }, { $set: { "statistics.posts_count": row.posts_count } });
  }
  const authorCounts = await postsColl.aggregate([
    { $group: { _id: "$author.user_id", posts_count: { $sum: 1 } } }
  ]).toArray();
  for (const row of authorCounts) {
    await db.collection("users").updateOne({ _id: row._id }, { $set: { "statistics.posts_count": row.posts_count } });
  }

  const topAuthors = await postsColl.aggregate([
    { $match: { status: "published" } },
    { $group: { _id: "$author.user_id", username: { $first: "$author.username" }, posts_count: { $sum: 1 }, total_views: { $sum: "$statistics.views" }, total_likes: { $sum: "$statistics.likes" } } },
    { $sort: { posts_count: -1, username: 1 } },
    { $limit: 10 },
    { $project: { _id: 0, username: 1, posts_count: 1, total_views: 1, total_likes: 1, avg_views_per_post: { $round: [{ $divide: ["$total_views", "$posts_count"] }, 1] } } }
  ]).toArray();

  const popularCategories = await postsColl.aggregate([
    { $match: { status: "published" } },
    { $group: { _id: "$category.slug", category_name: { $first: "$category.name" }, posts_count: { $sum: 1 }, total_views: { $sum: "$statistics.views" }, avg_likes: { $avg: "$statistics.likes" } } },
    { $sort: { posts_count: -1, category_name: 1 } },
    { $project: { _id: 0, category_name: 1, slug: "$_id", posts_count: 1, total_views: 1, avg_likes: { $round: ["$avg_likes", 2] } } }
  ]).toArray();

  const commentStats = await postsColl.aggregate([
    { $match: { status: "published" } },
    { $group: { _id: null, total_posts: { $sum: 1 }, total_comments: { $sum: "$statistics.comments_count" }, avg_comments_per_post: { $avg: "$statistics.comments_count" }, max_comments: { $max: "$statistics.comments_count" } } },
    { $project: { _id: 0, total_posts: 1, total_comments: 1, avg_comments_per_post: { $round: ["$avg_comments_per_post", 2] }, max_comments: 1 } }
  ]).toArray();

  const tagStats = await postsColl.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", posts_count: { $sum: 1 } } },
    { $sort: { posts_count: -1, _id: 1 } },
    { $project: { _id: 0, tag: "$_id", posts_count: 1 } }
  ]).toArray();

  const moderation = await postsColl.aggregate([
    { $unwind: "$comments" },
    { $project: { items: { $concatArrays: [["$comments"], { $ifNull: ["$comments.replies", []] }] } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  const nearLutsk = await postsColl.aggregate([
    { $geoNear: { near: { type: "Point", coordinates: [25.3254, 50.7472] }, distanceField: "distance_m", maxDistance: 15000, spherical: true, query: { status: "published" } } },
    { $group: { _id: "$location.city", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  const bothTags = await postsColl.countDocuments({ tags: { $all: ["mongodb", "docker"] }, status: "published" });
  const textHits = await postsColl.find(
    { $text: { $search: ukTokens("Луцьку коментарі").join(" ") } },
    { projection: { title: 1, score: { $meta: "textScore" } } }
  ).sort({ score: { $meta: "textScore" } }).limit(5).toArray();

  const roleCounts = await db.collection("users").aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();

  const summary = {
    users: await db.collection("users").countDocuments(),
    authors: authors.length,
    categories: await db.collection("categories").countDocuments(),
    posts: await postsColl.countDocuments(),
    notifications: await db.collection("notifications").countDocuments(),
    comment_nodes_built: commentNodes,
    comment_stats: commentStats[0],
    roles: roleCounts,
    top_authors: topAuthors,
    popular_categories: popularCategories,
    tags: tagStats,
    moderation,
    near_lutsk_15km: nearLutsk,
    posts_with_mongodb_and_docker: bothTags,
    text_sample: textHits.map((row) => ({ title: row.title, score: Number(row.score.toFixed(4)) })),
    explain_author_before: explainBefore,
    explain_author_after: explainAfter,
    validation,
    indexes: {
      posts: (await postsColl.indexes()).map((idx) => idx.name),
      users: (await db.collection("users").indexes()).map((idx) => idx.name)
    }
  };

  fs.writeFileSync(path.join(OUT, "seed-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT, "analytics.json"), JSON.stringify({
    categories: popularCategories,
    authors: topAuthors,
    moderation
  }, null, 2), "utf8");
  console.log(JSON.stringify({
    users: summary.users,
    posts: summary.posts,
    categories: summary.categories,
    notifications: summary.notifications,
    comment_nodes_built: summary.comment_nodes_built,
    comment_stats: summary.comment_stats,
    validation: summary.validation,
    explain_before: explainBefore,
    explain_after: explainAfter,
    near_lutsk_15km: nearLutsk,
    both_tags: bothTags
  }, null, 2));
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
