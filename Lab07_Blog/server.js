// Лабораторна робота 07. REST API і сторінки блогу.
// Пінкевич Артем Романович, ІПЗ-32, Луцьк, 2026.

const express = require("express");
const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const { ukTokens, textSearchQuery } = require("./lib/text");

const PORT = Number(process.env.PORT || 3017);
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/?directConnection=true";
const app = express();
const cache = new Map();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function cached(key, ttlMs, producer) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) {
    return Promise.resolve({ cache: "HIT", age_ms: now - hit.stored, data: hit.data });
  }
  const started = Date.now();
  return producer().then((data) => {
    cache.set(key, { data, expires: Date.now() + ttlMs, stored: Date.now() });
    return { cache: "MISS", query_ms: Date.now() - started, data };
  });
}

function invalidate(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

function oid(value) {
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

function slugify(title) {
  const map = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye", ж: "zh", з: "z",
    и: "y", і: "i", ї: "yi", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
    р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
    ь: "", ю: "yu", я: "ya", "'": "", "’": ""
  };
  const lower = String(title || "").toLowerCase();
  let out = "";
  for (const ch of lower) out += Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch;
  out = out.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return out || "post";
}

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db("blog");
  const posts = db.collection("posts");
  const users = db.collection("users");
  const categories = db.collection("categories");
  const notifications = db.collection("notifications");

  const listProjection = {
    content: 0,
    comments: 0,
    edit_history: 0,
    uk_tokens: 0,
    liked_by: 0,
    disliked_by: 0
  };

  app.get("/api/health", async (req, res) => {
    const hello = await db.command({ hello: 1 });
    res.json({
      ok: true,
      db: "blog",
      posts: await posts.countDocuments(),
      users: await users.countDocuments(),
      categories: await categories.countDocuments(),
      primary: hello.primary || hello.me,
      setName: hello.setName || null
    });
  });

  app.get("/api/posts", async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || "6", 10) || 6));
      const match = { status: "published" };
      if (req.query.category) match["category.slug"] = String(req.query.category);
      if (req.query.author) match["author.username"] = String(req.query.author);
      if (req.query.tags) {
        const tags = String(req.query.tags).split(",").map((tag) => tag.trim()).filter(Boolean);
        if (tags.length) match.tags = { $all: tags };
      }
      const rows = await posts.aggregate([
        { $match: match },
        { $sort: { published_at: -1, _id: -1 } },
        {
          $facet: {
            items: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              { $project: listProjection }
            ],
            total: [{ $count: "count" }]
          }
        }
      ]).toArray();
      const facet = rows[0] || { items: [], total: [] };
      res.json({
        page,
        limit,
        total: facet.total[0] ? facet.total[0].count : 0,
        items: facet.items
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/posts/near", async (req, res, next) => {
    try {
      const lng = Number(req.query.lng);
      const lat = Number(req.query.lat);
      const meters = Math.min(500000, Math.max(100, Number(req.query.meters || 15000)));
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return res.status(400).json({ error: "Потрібні числові lng і lat" });
      }
      const items = await posts.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distance_m",
            maxDistance: meters,
            spherical: true,
            query: { status: "published" }
          }
        },
        { $limit: 50 },
        {
            $project: {
              title: 1, slug: 1, excerpt: 1, author: 1, category: 1, tags: 1,
              statistics: 1, location: 1, published_at: 1,
              distance_m: { $round: ["$distance_m", 1] }
            }
          }
      ]).toArray();
      res.json({ lng, lat, meters, count: items.length, items });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/posts/:id", async (req, res, next) => {
    try {
      const _id = oid(req.params.id);
      if (!_id) return res.status(400).json({ error: "Некоректний id" });
      const post = await posts.findOneAndUpdate(
        { _id },
        { $inc: { "statistics.views": 1 } },
        { returnDocument: "after" }
      );
      if (!post) return res.status(404).json({ error: "Пост не знайдено" });
      res.json(post);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/posts/:id/history", async (req, res, next) => {
    try {
      const _id = oid(req.params.id);
      if (!_id) return res.status(400).json({ error: "Некоректний id" });
      const post = await posts.findOne(
        { _id },
        { projection: { title: 1, version: 1, edit_history: 1, updated_at: 1 } }
      );
      if (!post) return res.status(404).json({ error: "Пост не знайдено" });
      res.json(post);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/posts", async (req, res, next) => {
    try {
      const title = String(req.body.title || "").trim();
      const content = String(req.body.content || "").trim();
      const username = String(req.body.author || "").trim();
      const categorySlug = String(req.body.category || "").trim();
      const tags = String(req.body.tags || "").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      if (title.length < 3 || title.length > 200) return res.status(400).json({ error: "Назва має містити від 3 до 200 символів" });
      if (content.length < 100) return res.status(400).json({ error: "Текст має містити щонайменше 100 символів" });
      const author = await users.findOne({ username, role: { $in: ["author", "admin"] } });
      const category = await categories.findOne({ slug: categorySlug });
      if (!author) return res.status(400).json({ error: "Автора не знайдено" });
      if (!category) return res.status(400).json({ error: "Категорію не знайдено" });
      let slug = slugify(title);
      if (await posts.findOne({ slug })) slug = slug + "-" + Date.now().toString(36);
      const created = new Date();
      const doc = {
        title,
        slug,
        content,
        excerpt: content.slice(0, 160),
        author: { user_id: author._id, username: author.username },
        category: { category_id: category._id, name: category.name, slug: category.slug },
        tags: Array.from(new Set(tags)).slice(0, 8),
        status: "published",
        comments: [],
        statistics: { views: 0, likes: 0, dislikes: 0, comments_count: 0 },
        liked_by: [],
        disliked_by: [],
        location: {
          type: "Point",
          coordinates: [Number(req.body.lng || 25.3254), Number(req.body.lat || 50.7472)],
          city: String(req.body.city || "Луцьк")
        },
        edit_history: [],
        uk_tokens: ukTokens([title, content, tags.join(" ")].join(" ")),
        version: 1,
        created_at: created,
        updated_at: created,
        published_at: created
      };
      const result = await posts.insertOne(doc);
      await categories.updateOne({ _id: category._id }, { $inc: { "statistics.posts_count": 1 } });
      await users.updateOne({ _id: author._id }, { $inc: { "statistics.posts_count": 1 } });
      invalidate("top-authors");
      res.status(201).json({ id: result.insertedId, slug });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/posts/:id", async (req, res, next) => {
    try {
      const _id = oid(req.params.id);
      if (!_id) return res.status(400).json({ error: "Некоректний id" });
      const title = String(req.body.title || "").trim();
      const content = String(req.body.content || "").trim();
      const editor = String(req.body.editor || "admin_lutsk").trim();
      if (title.length < 3 || content.length < 100) {
        return res.status(400).json({ error: "Назва або текст не проходять обмеження схеми" });
      }
      const current = await posts.findOne({ _id });
      if (!current) return res.status(404).json({ error: "Пост не знайдено" });
      const version = current.version || 1;
      await posts.updateOne({ _id }, {
        $set: {
          title,
          content,
          excerpt: content.slice(0, 160),
          updated_at: new Date(),
          uk_tokens: ukTokens([title, content, (current.tags || []).join(" ")].join(" "))
        },
        $inc: { version: 1 },
        $push: {
          edit_history: {
            version,
            title: current.title,
            content: current.content,
            editor,
            edited_at: new Date()
          }
        }
      });
      const updated = await posts.findOne({ _id }, { projection: { title: 1, version: 1, edit_history: 1 } });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  async function react(req, res, next, field, listField) {
    try {
      const _id = oid(req.params.id);
      const username = String((req.body && req.body.username) || "guest").trim();
      if (!_id || !username) return res.status(400).json({ error: "Некоректні дані" });
      const result = await posts.updateOne(
        { _id, [listField]: { $ne: username } },
        { $inc: { [field]: 1 }, $addToSet: { [listField]: username } }
      );
      const post = await posts.findOne({ _id }, { projection: { statistics: 1 } });
      if (!post) return res.status(404).json({ error: "Пост не знайдено" });
      res.json({ updated: result.modifiedCount === 1, statistics: post.statistics });
    } catch (error) {
      next(error);
    }
  }

  app.post("/api/posts/:id/like", (req, res, next) => react(req, res, next, "statistics.likes", "liked_by"));
  app.post("/api/posts/:id/dislike", (req, res, next) => react(req, res, next, "statistics.dislikes", "disliked_by"));

  app.post("/api/posts/:id/comments", async (req, res, next) => {
    try {
      const _id = oid(req.params.id);
      const username = String(req.body.username || "").trim();
      const text = String(req.body.text || "").trim();
      if (!_id || text.length < 1) return res.status(400).json({ error: "Порожній коментар" });
      const user = await users.findOne({ username });
      const post = await posts.findOne({ _id }, { projection: { title: 1, author: 1 } });
      if (!user || !post) return res.status(404).json({ error: "Користувача або пост не знайдено" });
      const comment = {
        comment_id: new ObjectId(),
        parent_id: null,
        author: { user_id: user._id, username: user.username },
        text,
        created_at: new Date(),
        status: "pending",
        likes: 0,
        replies: []
      };
      await posts.updateOne({ _id }, { $push: { comments: comment }, $inc: { "statistics.comments_count": 1 } });
      await notifications.insertOne({
        recipient: { user_id: post.author.user_id, username: post.author.username },
        type: "new_comment",
        post_id: _id,
        message: user.username + " залишив коментар до «" + post.title + "»",
        read: false,
        created_at: new Date()
      });
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/posts/:id/comments/:commentId/replies", async (req, res, next) => {
    try {
      const _id = oid(req.params.id);
      const commentId = oid(req.params.commentId);
      const username = String(req.body.username || "").trim();
      const text = String(req.body.text || "").trim();
      if (!_id || !commentId || text.length < 1) return res.status(400).json({ error: "Некоректні дані відповіді" });
      const user = await users.findOne({ username });
      const post = await posts.findOne({ _id }, { projection: { title: 1, author: 1 } });
      if (!user || !post) return res.status(404).json({ error: "Користувача або пост не знайдено" });
      const reply = {
        comment_id: new ObjectId(),
        parent_id: commentId,
        author: { user_id: user._id, username: user.username },
        text,
        created_at: new Date(),
        status: "pending",
        likes: 0,
        replies: []
      };
      const result = await posts.updateOne(
        { _id, "comments.comment_id": commentId },
        { $push: { "comments.$.replies": reply }, $inc: { "statistics.comments_count": 1 } }
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: "Батьківський коментар не знайдено" });
      await notifications.insertOne({
        recipient: { user_id: post.author.user_id, username: post.author.username },
        type: "new_reply",
        post_id: _id,
        message: user.username + " відповів у коментарях до «" + post.title + "»",
        read: false,
        created_at: new Date()
      });
      res.status(201).json(reply);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/posts/:id/comments/:commentId", async (req, res, next) => {
    try {
      const _id = oid(req.params.id);
      const commentId = oid(req.params.commentId);
      const status = String(req.body.status || "");
      const parentId = req.body.parent_id ? oid(req.body.parent_id) : null;
      if (!_id || !commentId || !["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Статус має бути pending, approved або rejected" });
      }
      let result;
      if (parentId) {
        result = await posts.updateOne(
          { _id },
          { $set: { "comments.$[parent].replies.$[reply].status": status } },
          { arrayFilters: [{ "parent.comment_id": parentId }, { "reply.comment_id": commentId }] }
        );
      } else {
        result = await posts.updateOne(
          { _id, "comments.comment_id": commentId },
          { $set: { "comments.$.status": status } }
        );
      }
      if (!result.matchedCount) return res.status(404).json({ error: "Коментар не знайдено" });
      res.json({ status, modified: result.modifiedCount });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/search", async (req, res, next) => {
    try {
      const raw = String(req.query.q || "").trim();
      const query = textSearchQuery(raw);
      if (!query) return res.json({ query: raw, normalized: "", items: [] });
      const items = await posts.find(
        { $text: { $search: query }, status: "published" },
        {
          projection: {
            title: 1, slug: 1, excerpt: 1, author: 1, category: 1, tags: 1,
            statistics: 1, location: 1, published_at: 1,
            score: { $meta: "textScore" }
          }
        }
      ).sort({ score: { $meta: "textScore" } }).limit(15).toArray();
      res.json({
        query: raw,
        normalized: query,
        count: items.length,
        items: items.map((item) => Object.assign({}, item, { score: Number(item.score.toFixed(4)) }))
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/categories", async (req, res, next) => {
    try {
      const items = await categories.find({}, { projection: { name: 1, slug: 1, description: 1, statistics: 1 } }).sort({ name: 1 }).toArray();
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users", async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.role) filter.role = String(req.query.role);
      const items = await users.find(filter, {
        projection: { password_hash: 0 }
      }).sort({ username: 1 }).toArray();
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stats/top-authors", async (req, res, next) => {
    try {
      const result = await cached("top-authors", 20000, () => posts.aggregate([
        { $match: { status: "published" } },
        {
          $group: {
            _id: "$author.user_id",
            username: { $first: "$author.username" },
            posts_count: { $sum: 1 },
            total_views: { $sum: "$statistics.views" },
            total_likes: { $sum: "$statistics.likes" }
          }
        },
        { $sort: { posts_count: -1, total_views: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            username: 1,
            posts_count: 1,
            total_views: 1,
            total_likes: 1,
            avg_views_per_post: { $round: [{ $divide: ["$total_views", "$posts_count"] }, 1] }
          }
        }
      ]).toArray());
      res.set("X-Cache", result.cache);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stats/categories", async (req, res, next) => {
    try {
      const items = await posts.aggregate([
        { $match: { status: "published" } },
        {
          $group: {
            _id: "$category.slug",
            category_name: { $first: "$category.name" },
            posts_count: { $sum: 1 },
            total_views: { $sum: "$statistics.views" },
            avg_likes: { $avg: "$statistics.likes" }
          }
        },
        { $sort: { posts_count: -1 } },
        { $project: { _id: 0, category_name: 1, slug: "$_id", posts_count: 1, total_views: 1, avg_likes: { $round: ["$avg_likes", 2] } } }
      ]).toArray();
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stats/comments", async (req, res, next) => {
    try {
      const items = await posts.aggregate([
        { $match: { status: "published" } },
        {
          $group: {
            _id: null,
            total_posts: { $sum: 1 },
            total_comments: { $sum: "$statistics.comments_count" },
            avg_comments_per_post: { $avg: "$statistics.comments_count" },
            max_comments: { $max: "$statistics.comments_count" }
          }
        },
        { $project: { _id: 0, total_posts: 1, total_comments: 1, avg_comments_per_post: { $round: ["$avg_comments_per_post", 2] }, max_comments: 1 } }
      ]).toArray();
      res.json(items[0] || {});
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/analytics", async (req, res, next) => {
    try {
      const [authors, cats, comments, moderation, cities] = await Promise.all([
        posts.aggregate([
          { $match: { status: "published" } },
          { $group: { _id: "$author.username", posts_count: { $sum: 1 }, views: { $sum: "$statistics.views" } } },
          { $sort: { posts_count: -1, views: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, username: "$_id", posts_count: 1, views: 1 } }
        ]).toArray(),
        posts.aggregate([
          { $match: { status: "published" } },
          { $group: { _id: "$category.name", posts_count: { $sum: 1 } } },
          { $sort: { posts_count: -1 } },
          { $project: { _id: 0, name: "$_id", posts_count: 1 } }
        ]).toArray(),
        posts.aggregate([
          { $match: { status: "published" } },
          { $group: { _id: null, total_posts: { $sum: 1 }, total_comments: { $sum: "$statistics.comments_count" }, avg_comments_per_post: { $avg: "$statistics.comments_count" } } },
          { $project: { _id: 0, total_posts: 1, total_comments: 1, avg_comments_per_post: { $round: ["$avg_comments_per_post", 2] } } }
        ]).toArray(),
        posts.aggregate([
          { $unwind: "$comments" },
          { $project: { items: { $concatArrays: [["$comments"], { $ifNull: ["$comments.replies", []] }] } } },
          { $unwind: "$items" },
          { $group: { _id: "$items.status", count: { $sum: 1 } } },
          { $project: { _id: 0, status: "$_id", count: 1 } }
        ]).toArray(),
        posts.aggregate([
          { $group: { _id: "$location.city", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, city: "$_id", count: 1 } }
        ]).toArray()
      ]);
      res.json({ authors, categories: cats, comments: comments[0] || {}, moderation, cities });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notifications", async (req, res, next) => {
    try {
      const username = String(req.query.username || "").trim();
      if (!username) return res.status(400).json({ error: "Потрібен username" });
      const items = await notifications.find({ "recipient.username": username }).sort({ created_at: -1 }).limit(20).toArray();
      const unread = await notifications.countDocuments({ "recipient.username": username, read: false });
      res.json({ username, unread, items });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/compare", (req, res) => {
    const file = path.join(__dirname, "output", "compare.json");
    if (!fs.existsSync(file)) return res.status(404).json({ error: "Порівняння ще не пораховане" });
    res.type("json").send(fs.readFileSync(file, "utf8"));
  });

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: error.message || "Помилка сервера" });
  });

  app.listen(PORT, () => {
    console.log("Blog server http://localhost:" + PORT);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
